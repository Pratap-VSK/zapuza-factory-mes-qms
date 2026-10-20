from decimal import Decimal
from django.utils import timezone
from core.exceptions import ShopfloorInterlockException
from apps.pdi_templates.models import BlueprintPin
from apps.plant_master.services.calibration_guard import ToolCalibrationGuardService
from apps.shopfloor_quality.models import InspectionSession, ParameterMeasurement
from apps.production_routing.models import DigitalTraveler, ProcessRouteStep


class ToleranceEvaluatorService:
    """
    Sections 4.3, 5.2, 5.3, 5.4:
    - Evaluates GREEN vs RED tolerances in real time.
    - Forces 2 defect photos on any out-of-tolerance reading.
    - Freezes checklist, blocks concessions, and triggers Quality Head alert on CTQ failure.
    """
    @staticmethod
    def evaluate_pin_value(pin: BlueprintPin, numeric_val=None, visual_pass=None) -> bool:
        if pin.inspection_type == BlueprintPin.InspectionType.VISUAL_PASS_FAIL:
            return bool(visual_pass)

        if numeric_val is None:
            return False

        val = Decimal(str(numeric_val))
        min_lim = pin.min_allowed_limit
        max_lim = pin.max_allowed_limit

        if min_lim is not None and val < min_lim:
            return False
        if max_lim is not None and val > max_lim:
            return False
        return True

    @staticmethod
    def record_and_submit_checklist(
        session: InspectionSession,
        readings_list: list,
        inspector_remarks: str = '',
        synced_offline: bool = False
    ) -> InspectionSession:
        required_pins = list(session.template.pins.all())
        submitted_pin_ids = {str(item.get('pin_id')) for item in readings_list}

        # Section 5.2: Locked Step-by-Step Inspection (Cannot skip required dimensions)
        for req_pin in required_pins:
            if str(req_pin.id) not in submitted_pin_ids:
                raise ShopfloorInterlockException(
                    detail=(
                        f"Incomplete Checklist Lock: Pin #{req_pin.pin_number} ({req_pin.parameter_name}) "
                        f"was skipped. All parameters must be measured and entered before completing inspection."
                    ),
                    interlock_type="INCOMPLETE_CHECKLIST_FIELDS"
                )

        has_any_failure = False
        has_ctq_failure = False

        for item in readings_list:
            pin = BlueprintPin.objects.get(id=item['pin_id'])
            gauge = None
            if pin.inspection_type != BlueprintPin.InspectionType.VISUAL_PASS_FAIL:
                gauge_serial = item.get('gauge_serial', '')
                gauge = ToolCalibrationGuardService.verify_gauge_calibration(
                    gauge_serial_or_id=gauge_serial,
                    required_gauge_type=pin.required_gauge_type
                )

            num_val = item.get('measured_numeric_value')
            vis_val = item.get('visual_pass')
            in_tol = ToleranceEvaluatorService.evaluate_pin_value(pin, num_val, vis_val)

            photo_1 = (item.get('defect_photo_1_url') or '').strip()
            photo_2 = (item.get('defect_photo_2_url') or '').strip()

            # Section 5.4: Mandatory minimum 2 clear defect photos on out-of-tolerance value
            if not in_tol:
                has_any_failure = True
                if not photo_1 or not photo_2:
                    raise ShopfloorInterlockException(
                        detail=(
                            f"Mandatory Photo Capture Lock: Pin #{pin.pin_number} ({pin.parameter_name}) "
                            f"is OUT OF TOLERANCE (RED). Inspector must capture at least 2 clear defect photos "
                            f"using the tablet camera before proceeding."
                        ),
                        interlock_type="MANDATORY_DEFECT_PHOTOS_MISSING",
                        extra_data={"pin_number": pin.pin_number, "parameter_name": pin.parameter_name}
                    )
                if pin.is_ctq:
                    has_ctq_failure = True

            ParameterMeasurement.objects.update_or_create(
                session=session,
                pin=pin,
                defaults={
                    'gauge_used': gauge,
                    'measured_numeric_value': num_val if num_val not in ['', None] else None,
                    'visual_pass': vis_val,
                    'is_within_tolerance': in_tol,
                    'indicator_color': 'GREEN' if in_tol else 'RED',
                    'defect_photo_1_url': photo_1,
                    'defect_photo_2_url': photo_2,
                }
            )

        session.inspector_remarks = inspector_remarks
        session.submitted_at = timezone.now()
        session.is_locked_on_tablet = False
        session.synced_from_offline_cache = synced_offline
        session.has_ctq_failure = has_ctq_failure

        # Section 4.3: CTQ Failure freezes checklist, blocks concessions, and quarantines traveler
        if has_ctq_failure:
            session.overall_result = InspectionSession.OverallResult.FAILED_CTQ_FROZEN
            session.approval_status = InspectionSession.ApprovalStatus.QUARANTINED_MRB
            session.traveler.is_quarantined = True
            session.traveler.status = DigitalTraveler.TravelerStatus.QUARANTINED
            session.traveler.quarantine_reason = f"CTQ Failure on Checklist {session.session_code}. Alert sent to Quality Head."
            session.traveler.save()
        elif has_any_failure:
            session.overall_result = InspectionSession.OverallResult.FAILED_NON_CTQ
            session.approval_status = InspectionSession.ApprovalStatus.PENDING_SUPERVISOR
        else:
            session.overall_result = InspectionSession.OverallResult.PASSED
            session.approval_status = InspectionSession.ApprovalStatus.PENDING_SUPERVISOR

            # Auto-unlock First-Piece or Hourly check if 100% passed
            if session.operation_step.status == ProcessRouteStep.StepStatus.SETUP_FIRST_PIECE:
                session.operation_step.first_piece_approved = True
                session.operation_step.status = ProcessRouteStep.StepStatus.IN_PROGRESS
                session.operation_step.save(update_fields=['first_piece_approved', 'status'])
            session.operation_step.last_hourly_check_at = timezone.now()
            session.operation_step.save(update_fields=['last_hourly_check_at'])

        session.save()
        return session
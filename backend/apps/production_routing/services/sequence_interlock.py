from django.utils import timezone
from datetime import timedelta
from core.exceptions import ShopfloorInterlockException
from apps.production_routing.models import DigitalTraveler, ProcessRouteStep
from apps.plant_master.services.machine_pm_lock import MachinePMInterlockService
from apps.material_intake.models import RawMaterialIntake


class ProcessSequenceInterlockService:
    """
    Sections 7.1, 8.2, 9.1: Enforces strict sequential operation sign-offs,
    mandatory cooling hold countdowns, and first-piece setup locks.
    """
    @staticmethod
    def validate_can_access_operation(step: ProcessRouteStep):
        traveler = step.traveler

        # 1. Verify Raw Material Lot is not quarantined (Section 3.3)
        if traveler.work_order.raw_material_lot.status != RawMaterialIntake.IntakeStatus.APPROVED_STOCK:
            raise ShopfloorInterlockException(
                detail="Raw Material Quarantine Lock: Assigned Heat Lot is not cleared for production.",
                interlock_type="RAW_MATERIAL_QUARANTINED"
            )

        # 2. Verify Traveler is not in Rejection Holding Area (Section 6.1)
        if traveler.is_quarantined or traveler.status == DigitalTraveler.TravelerStatus.QUARANTINED:
            raise ShopfloorInterlockException(
                detail=(
                    f"Quarantine Lock Active: Job Traveler {traveler.traveler_barcode} is in the "
                    f"Digital Rejection Holding Area awaiting MRB disposition. Reason: {traveler.quarantine_reason}"
                ),
                interlock_type="TRAVELER_QUARANTINED"
            )

        # 3. Verify Machine Daily PM Check is valid (Section 2.2)
        MachinePMInterlockService.enforce_station_pm_ready(step.assigned_workstation)

        # 4. Verify all preceding operations are 100% completed AND their cooling hold timers have expired (Sections 7.1 & 8.2)
        previous_steps = traveler.operations.filter(sequence_number__lt=step.sequence_number)
        for prev in previous_steps:
            if prev.status not in [ProcessRouteStep.StepStatus.COMPLETED, ProcessRouteStep.StepStatus.HOLD_COOLING]:
                raise ShopfloorInterlockException(
                    detail=(
                        f"Sequential Routing Lock: Cannot start Op {step.sequence_number} ({step.operation_name}) "
                        f"because previous Op {prev.sequence_number} ({prev.operation_name}) is '{prev.status}'."
                    ),
                    interlock_type="PREVIOUS_OPERATION_INCOMPLETE",
                    extra_data={
                        "blocked_by_op": prev.sequence_number,
                        "blocked_by_name": prev.operation_name,
                        "blocked_status": prev.status,
                    }
                )

            if prev.remaining_hold_seconds > 0:
                rem_mins = prev.remaining_hold_seconds // 60
                hrs, mins = divmod(rem_mins, 60)
                raise ShopfloorInterlockException(
                    detail=(
                        f"Mandatory Cooling Hold Active ({hrs} hr {mins} min remaining) from "
                        f"Op {prev.sequence_number} ({prev.operation_name}). Downstream machining is locked."
                    ),
                    interlock_type="MANDATORY_COOLING_HOLD_ACTIVE",
                    extra_data={
                        "hold_source_op": prev.sequence_number,
                        "hold_source_name": prev.operation_name,
                        "remaining_seconds": prev.remaining_hold_seconds,
                        "hold_expires_at": prev.hold_expires_at,
                    }
                )
            elif prev.status == ProcessRouteStep.StepStatus.HOLD_COOLING:
                prev.status = ProcessRouteStep.StepStatus.COMPLETED
                prev.save(update_fields=['status'])

        return True

    @staticmethod
    def clock_in_operation(step: ProcessRouteStep, operator_user) -> ProcessRouteStep:
        ProcessSequenceInterlockService.validate_can_access_operation(step)

        if not step.started_at:
            step.started_at = timezone.now()
        step.operator = operator_user

        # Section 9.1: Lock station in Setup Mode until First-Piece QA Sign-Off
        if step.requires_first_piece_inspection and not step.first_piece_approved:
            step.status = ProcessRouteStep.StepStatus.SETUP_FIRST_PIECE
        else:
            step.status = ProcessRouteStep.StepStatus.IN_PROGRESS

        step.save()
        step.traveler.current_operation_sequence = step.sequence_number
        step.traveler.status = DigitalTraveler.TravelerStatus.IN_PROGRESS
        step.traveler.save(update_fields=['current_operation_sequence', 'status'])
        return step

    @staticmethod
    def complete_operation(step: ProcessRouteStep, operator_user, parts_produced: int = None) -> ProcessRouteStep:
        ProcessSequenceInterlockService.validate_can_access_operation(step)

        if step.requires_first_piece_inspection and not step.first_piece_approved:
            raise ShopfloorInterlockException(
                detail=(
                    f"First-Piece Lock Active: Station is locked in Setup Mode for Op {step.sequence_number}. "
                    f"QA Inspector must sign off on the First-Piece Quality Inspection before completing lot."
                ),
                interlock_type="FIRST_PIECE_SIGN_OFF_REQUIRED"
            )

        now = timezone.now()
        step.completed_at = now
        step.operator = operator_user

        if parts_produced is not None:
            step.traveler.produced_quantity = parts_produced

        # Section 8.2: Start automated countdown timer if operation has a mandatory cooling/curing hold
        if step.mandatory_hold_minutes > 0:
            step.status = ProcessRouteStep.StepStatus.HOLD_COOLING
            step.hold_started_at = now
            step.hold_expires_at = now + timedelta(minutes=step.mandatory_hold_minutes)
            step.traveler.status = DigitalTraveler.TravelerStatus.COOLING_HOLD
        else:
            step.status = ProcessRouteStep.StepStatus.COMPLETED

        step.save()

        next_step = step.traveler.operations.filter(sequence_number__gt=step.sequence_number).order_by('sequence_number').first()
        if next_step:
            step.traveler.current_operation_sequence = next_step.sequence_number
        else:
            step.traveler.status = DigitalTraveler.TravelerStatus.READY_FOR_PDI

        step.traveler.save()
        return step
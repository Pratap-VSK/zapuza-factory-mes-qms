import uuid
from django.utils import timezone
from core.exceptions import ShopfloorInterlockException
from apps.shopfloor_quality.models import InspectionSession, MRBDisposition
from apps.production_routing.models import DigitalTraveler, ProcessRouteStep


class SupervisorAndMRBService:
    """
    Sections 6.1 & 6.3: Handles Shift Supervisor Approvals, Conditional Concessions
    (blocked on CTQ failures), and Material Review Board (MRB) Dispositions.
    """
    @staticmethod
    def supervisor_decision(
        session: InspectionSession,
        supervisor_user,
        decision: str,
        concession_reason_code: str = '',
        engineering_justification: str = ''
    ) -> InspectionSession:
        session.reviewed_by_supervisor = supervisor_user
        session.reviewed_at = timezone.now()

        if decision == 'APPROVE':
            if session.has_ctq_failure:
                raise ShopfloorInterlockException(
                    detail="CTQ Safeguard: Cannot approve a checklist with an out-of-spec Critical-to-Quality (CTQ) parameter.",
                    interlock_type="CTQ_APPROVAL_BLOCKED"
                )
            session.approval_status = InspectionSession.ApprovalStatus.APPROVED
            session.traveler.is_quarantined = False
            session.traveler.save(update_fields=['is_quarantined'])

        elif decision == 'CONCESSION':
            # Section 4.3 & 6.1: Out-of-spec entries on CTQ items prevent conditional supervisor concessions
            if session.has_ctq_failure:
                raise ShopfloorInterlockException(
                    detail=(
                        "CTQ Priority Lock (Section 4.3): Conditional concessions are strictly prohibited "
                        "for Critical-to-Quality (CTQ) failures. Lot must go to MRB Quarantine."
                    ),
                    interlock_type="CTQ_CONCESSION_PROHIBITED"
                )
            if not concession_reason_code.strip() or not engineering_justification.strip():
                raise ShopfloorInterlockException(
                    detail="Concession Safeguard: Detailed engineering justification and reason code are mandatory.",
                    interlock_type="MISSING_CONCESSION_JUSTIFICATION"
                )
            session.approval_status = InspectionSession.ApprovalStatus.CONCESSION_RELEASED
            session.concession_reason_code = concession_reason_code
            session.concession_engineering_justification = engineering_justification
            session.traveler.is_quarantined = False
            session.traveler.save(update_fields=['is_quarantined'])

        elif decision == 'REJECT_QUARANTINE':
            session.approval_status = InspectionSession.ApprovalStatus.QUARANTINED_MRB
            session.traveler.is_quarantined = True
            session.traveler.status = DigitalTraveler.TravelerStatus.QUARANTINED
            session.traveler.quarantine_reason = engineering_justification or f"Rejected by Supervisor on {session.session_code}"
            session.traveler.save()

        session.save()
        return session

    @staticmethod
    def execute_mrb_disposition(
        session: InspectionSession,
        authorized_user,
        disposition_action: str,
        engineering_directive: str,
        scrap_cost_code: str = '',
        customer_approval_ref: str = ''
    ) -> MRBDisposition:
        traveler = session.traveler
        mrb_code = f"MRB-{traveler.traveler_barcode}-{str(uuid.uuid4())[:4].upper()}"

        mrb, _ = MRBDisposition.objects.update_or_create(
            inspection_session=session,
            defaults={
                'mrb_code': mrb_code,
                'traveler': traveler,
                'disposition_action': disposition_action,
                'engineering_directive': engineering_directive,
                'scrap_cost_code': scrap_cost_code,
                'customer_written_approval_ref': customer_approval_ref,
                'authorized_by': authorized_user,
            }
        )

        if disposition_action == MRBDisposition.DispositionChoice.REWORK_ORDER:
            # Generate dedicated rework routing step and release quarantine
            traveler.is_quarantined = False
            traveler.status = DigitalTraveler.TravelerStatus.IN_PROGRESS
            traveler.quarantine_reason = ""
            traveler.save()
            ProcessRouteStep.objects.update_or_create(
                traveler=traveler,
                sequence_number=session.operation_step.sequence_number + 5,
                defaults={
                    'operation_code': f"RWK-{session.operation_step.operation_code}",
                    'operation_name': f"MRB Corrective Rework ({engineering_directive[:40]})",
                    'assigned_workstation': session.workstation,
                    'requires_first_piece_inspection': True,
                    'status': ProcessRouteStep.StepStatus.PENDING,
                }
            )
        elif disposition_action == MRBDisposition.DispositionChoice.SCRAP_DISPOSITION:
            traveler.status = DigitalTraveler.TravelerStatus.SCRAPPED
            traveler.scrap_quantity = traveler.batch_quantity
            traveler.save()
        elif disposition_action == MRBDisposition.DispositionChoice.CUSTOMER_SPECIAL_CONCESSION:
            if customer_approval_ref:
                traveler.is_quarantined = False
                traveler.status = DigitalTraveler.TravelerStatus.READY_FOR_PDI
                session.approval_status = InspectionSession.ApprovalStatus.CONCESSION_RELEASED
                session.save(update_fields=['approval_status'])
                traveler.save()

        return mrb
import uuid
from core.exceptions import ShopfloorInterlockException
from apps.production_routing.models import DigitalTraveler, ProcessRouteStep
from apps.shopfloor_quality.models import InspectionSession
from apps.dispatch_clearance.models import DispatchManifest


class ShippingGateInterlockService:
    """
    Section 10.1 & 10.2: Automated Shipping Interlock & Gate Pass Lockout.
    Checks three mandatory rules before unlocking packing slips, gate passes, or QR labels:
      a) 100% of all required machining and manufacturing operations are signed off as complete.
      b) All process aging and hold-time requirements have been fulfilled without quality holds.
      c) Final Pre-Dispatch Inspection (PDI) checklist is signed and Approved by Quality.
    """
    @staticmethod
    def evaluate_3_point_clearance(traveler: DigitalTraveler) -> dict:
        ops = list(traveler.operations.all())
        incomplete_ops = [
            f"Op {op.sequence_number} ({op.operation_name}) is {op.status}"
            for op in ops
            if op.status != ProcessRouteStep.StepStatus.COMPLETED
        ]
        rule_a_ops_complete = len(ops) > 0 and len(incomplete_ops) == 0

        active_cooling = [
            f"Op {op.sequence_number} ({op.operation_name}) has {op.remaining_hold_seconds // 60} mins hold remaining"
            for op in ops
            if op.remaining_hold_seconds > 0
        ]
        rule_b_holds_clear = (not traveler.is_quarantined) and (len(active_cooling) == 0)

        approved_pdi = traveler.inspections.filter(
            approval_status__in=[
                InspectionSession.ApprovalStatus.APPROVED,
                InspectionSession.ApprovalStatus.CONCESSION_RELEASED,
            ]
        ).exists()
        rule_c_pdi_approved = approved_pdi

        unfulfilled_reasons = []
        if not rule_a_ops_complete:
            unfulfilled_reasons.extend(incomplete_ops or ["No manufacturing operations completed."])
        if traveler.is_quarantined:
            unfulfilled_reasons.append(f"Lot is Quarantined in Digital Rejection Holding Area: {traveler.quarantine_reason}")
        if active_cooling:
            unfulfilled_reasons.extend(active_cooling)
        if not rule_c_pdi_approved:
            unfulfilled_reasons.append("Final Pre-Dispatch Inspection (PDI) checklist is not yet Approved by Supervisor/Quality.")

        return {
            "traveler_id": str(traveler.id),
            "traveler_barcode": traveler.traveler_barcode,
            "serial_number": traveler.serial_number,
            "is_unlocked_for_dispatch": (rule_a_ops_complete and rule_b_holds_clear and rule_c_pdi_approved),
            "rule_a_100_percent_ops_complete": rule_a_ops_complete,
            "rule_b_all_holds_and_quarantines_clear": rule_b_holds_clear,
            "rule_c_final_pdi_approved": rule_c_pdi_approved,
            "lockout_warnings": unfulfilled_reasons,
        }

    @staticmethod
    def issue_gate_pass_and_manifest(
        traveler: DigitalTraveler,
        clerk_user,
        transport_vehicle_number: str,
        driver_contact: str = ''
    ) -> DispatchManifest:
        status_check = ShippingGateInterlockService.evaluate_3_point_clearance(traveler)
        if not status_check["is_unlocked_for_dispatch"]:
            raise ShopfloorInterlockException(
                detail="Electronic Shipping Interlock Active: Gate pass and packing slip printing is strictly locked.",
                interlock_type="SHIPPING_GATE_INTERLOCK_LOCKED",
                extra_data=status_check
            )

        suffix = str(uuid.uuid4())[:5].upper()
        manifest = DispatchManifest.objects.create(
            manifest_number=f"MNF-{traveler.serial_number}-{suffix}",
            gate_pass_number=f"GP-{traveler.serial_number}-{suffix}",
            traveler=traveler,
            customer_po_number=traveler.work_order.customer_po_number,
            shipped_quantity=traveler.produced_quantity or traveler.batch_quantity,
            transport_vehicle_number=transport_vehicle_number,
            driver_contact=driver_contact,
            all_operations_completed=True,
            all_hold_timers_fulfilled=True,
            final_pdi_approved=True,
            issued_by=clerk_user,
        )
        traveler.status = DigitalTraveler.TravelerStatus.CLEARED_FOR_DISPATCH
        traveler.save(update_fields=['status'])
        return manifest
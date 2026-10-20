from apps.material_intake.models import RawMaterialIntake
from apps.production_routing.models import DigitalTraveler
from apps.plant_master.serializers import PartMasterSerializer
from apps.material_intake.serializers import RawMaterialIntakeSerializer


class PartLineageTraceService:
    """
    Section 7.2: Complete Part Lineage & Forward/Backward Traceability Engine.
    - Forward Recall: Heat # -> All Work Orders, Machined Parts, Travelers & Shipping Crates.
    - Backward Field Traceability: Serial # / Traveler Barcode -> Full Manufacturing Birth Certificate.
    """
    @staticmethod
    def trace_forward_by_heat_number(heat_query: str) -> dict:
        lots = RawMaterialIntake.objects.filter(heat_number__icontains=heat_query.strip())
        results = []
        for lot in lots:
            work_orders = lot.work_orders.select_related('part').prefetch_related(
                'travelers__operations__assigned_workstation',
                'travelers__inspections',
                'travelers__dispatch_manifests'
            )
            wo_list = []
            for wo in work_orders:
                for trav in wo.travelers.all():
                    crates = [
                        {
                            "manifest_number": m.manifest_number,
                            "customer_po": m.customer_po_number,
                            "vehicle_number": m.transport_vehicle_number,
                            "crate_qr": m.crate_qr_token,
                        }
                        for m in getattr(trav, 'dispatch_manifests', []).all()
                    ] if hasattr(trav, 'dispatch_manifests') else []

                    wo_list.append({
                        "work_order_number": wo.work_order_number,
                        "part_number": wo.part.part_number,
                        "part_name": wo.part.part_name,
                        "traveler_barcode": trav.traveler_barcode,
                        "serial_number": trav.serial_number,
                        "batch_quantity": trav.batch_quantity,
                        "status": trav.status,
                        "shipping_crates": crates,
                    })
            results.append({
                "raw_material_lot": RawMaterialIntakeSerializer(lot).data,
                "affected_batches": wo_list,
            })
        return {"query_type": "FORWARD_HEAT_RECALL", "query": heat_query, "results": results}

    @staticmethod
    def trace_backward_birth_certificate(serial_or_barcode: str) -> dict:
        q = serial_or_barcode.strip()
        traveler = (
            DigitalTraveler.objects.select_related('work_order__part', 'work_order__raw_material_lot')
            .prefetch_related(
                'operations__assigned_workstation',
                'operations__operator',
                'inspections__inspector',
                'inspections__measurements__gauge_used',
                'inspections__measurements__pin',
            )
            .filter(models_q_serial_or_barcode(q))
            .first()
        )
        if not traveler:
            return {"query_type": "BACKWARD_BIRTH_CERTIFICATE", "found": False, "query": q}

        ops_data = [
            {
                "sequence": op.sequence_number,
                "operation_code": op.operation_code,
                "operation_name": op.operation_name,
                "machine_code": op.assigned_workstation.station_code,
                "machine_name": op.assigned_workstation.name,
                "operator": op.operator.username if op.operator else "N/A",
                "status": op.status,
                "first_piece_approved": op.first_piece_approved,
                "started_at": op.started_at,
                "completed_at": op.completed_at,
                "hold_minutes": op.mandatory_hold_minutes,
            }
            for op in traveler.operations.all()
        ]

        inspections_data = []
        for insp in traveler.inspections.all():
            readings = [
                {
                    "pin_number": m.pin.pin_number,
                    "parameter_name": m.pin.parameter_name,
                    "is_ctq": m.pin.is_ctq,
                    "nominal": str(m.pin.nominal_value),
                    "measured_value": str(m.measured_numeric_value) if m.measured_numeric_value is not None else ("PASS" if m.visual_pass else "FAIL"),
                    "unit": m.pin.measurement_unit,
                    "is_within_tolerance": m.is_within_tolerance,
                    "gauge_serial": m.gauge_used.gauge_serial if m.gauge_used else "VISUAL",
                    "gauge_calibration_expiry": str(m.gauge_used.calibration_expiry_date) if m.gauge_used else None,
                }
                for m in insp.measurements.all()
            ]
            inspections_data.append({
                "session_code": insp.session_code,
                "stage_type": insp.template.stage_type,
                "inspector": insp.inspector.username,
                "station_code": insp.workstation.station_code,
                "overall_result": insp.overall_result,
                "approval_status": insp.approval_status,
                "submitted_at": insp.submitted_at,
                "measurements": readings,
            })

        return {
            "query_type": "BACKWARD_BIRTH_CERTIFICATE",
            "found": True,
            "serial_number": traveler.serial_number,
            "traveler_barcode": traveler.traveler_barcode,
            "status": traveler.status,
            "part_details": PartMasterSerializer(traveler.work_order.part).data,
            "raw_material_origin": RawMaterialIntakeSerializer(traveler.work_order.raw_material_lot).data,
            "manufacturing_routing_history": ops_data,
            "quality_inspection_records": inspections_data,
        }


def models_q_serial_or_barcode(q: str):
    from django.db.models import Q
    return Q(serial_number__iexact=q) | Q(traveler_barcode__iexact=q)
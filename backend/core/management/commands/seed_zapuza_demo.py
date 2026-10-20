from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import CustomUser
from apps.plant_master.models import FactorySite, Workstation, PartMaster, MeasuringGauge, PMChecklistLog
from apps.material_intake.models import RawMaterialIntake, SupplierNCR
from apps.pdi_templates.models import InspectionTemplate, BlueprintPin
from apps.production_routing.models import WorkOrder, DigitalTraveler, ProcessRouteStep
from apps.shift_handover.models import ShiftHandoverLog


class Command(BaseCommand):
    help = "Seeds complete Zapuza Factory MES/QMS production data matching all 14 BRD sections."

    def handle(self, *args, **options):
        today = timezone.localdate()
        now = timezone.now()

        # 1. Create Users for all Plant Roles (Section 12)
        roles = [
            ('plant_mgr', 'EMP-001', CustomUser.PlantRole.PLANT_MANAGER, 'BADGE-PM-01'),
            ('qe_rahul', 'EMP-002', CustomUser.PlantRole.QUALITY_ENGINEER, 'BADGE-QE-02'),
            ('qm_vikram', 'EMP-003', CustomUser.PlantRole.QUALITY_MANAGER, 'BADGE-QM-03'),
            ('sup_amit', 'EMP-004', CustomUser.PlantRole.SHIFT_SUPERVISOR, 'BADGE-SUP-04'),
            ('insp_rohit', 'EMP-005', CustomUser.PlantRole.QA_INSPECTOR, 'BADGE-INSP-05'),
            ('op_suresh', 'EMP-006', CustomUser.PlantRole.MACHINE_OPERATOR, 'BADGE-OP-06'),
            ('dock_kiran', 'EMP-007', CustomUser.PlantRole.DOCK_CLERK, 'BADGE-DOCK-07'),
        ]
        users = {}
        for uname, emp_code, role, badge in roles:
            user, created = CustomUser.objects.get_or_create(
                username=uname,
                defaults={
                    'employee_code': emp_code,
                    'role': role,
                    'badge_qr_token': badge,
                    'department_name': 'Main Machining & QA Shop',
                }
            )
            if created:
                user.set_password('zapuza123')
                user.save()
            users[role] = user

        # 2. Factory Sites & Workstations (Section 2)
        site_machining, _ = FactorySite.objects.get_or_create(
            site_code='PLANT-PUNE-01',
            defaults={'name': 'Main Machining & Grinding Shop', 'department_type': 'Main Machining Shop'}
        )
        site_heat, _ = FactorySite.objects.get_or_create(
            site_code='PLANT-PUNE-HT',
            defaults={'name': 'Thermal Heat Treatment Bay', 'department_type': 'Heat Treatment Bay'}
        )

        st_lathe, _ = Workstation.objects.get_or_create(
            station_code='CNC-LATHE-04',
            defaults={'name': 'CNC Lathe #04 (Mazak)', 'factory_site': site_machining, 'machine_type': 'CNC Turning Center'}
        )
        st_oven, _ = Workstation.objects.get_or_create(
            station_code='HT-OVEN-01',
            defaults={'name': 'Heat Treat Oven #01', 'factory_site': site_heat, 'machine_type': 'Induction Hardening Furnace'}
        )
        st_grind, _ = Workstation.objects.get_or_create(
            station_code='GRIND-VMC-02',
            defaults={'name': 'Precision Cylindrical Grinder #02', 'factory_site': site_machining, 'machine_type': 'Precision Grinder'}
        )

        # Complete Daily PM for CNC-LATHE-04 & HT-OVEN-01, leave GRIND-VMC-02 with PM Active too
        for st in [st_lathe, st_oven, st_grind]:
            PMChecklistLog.objects.get_or_create(
                workstation=st,
                operator=users[CustomUser.PlantRole.MACHINE_OPERATOR],
                shift='MORNING',
                defaults={
                    'zero_point_verified': True,
                    'coolant_level_ok': True,
                    'lubrication_pressure_ok': True,
                    'safety_interlocks_tested': True,
                    'tooling_wear_inspected': True,
                    'remarks': 'Daily shift zero-point & PM verified.',
                }
            )

        # 3. Measuring Gauges (Section 2.3: Valid vs Expired Calibration)
        MeasuringGauge.objects.update_or_create(
            gauge_serial='VC-104',
            defaults={
                'gauge_name': 'Mitutoyo Digital Vernier Caliper 0-150mm',
                'gauge_type': MeasuringGauge.GaugeType.VERNIER_CALIPER,
                'last_calibrated_date': today - timedelta(days=30),
                'calibration_expiry_date': today + timedelta(days=150),
                'calibration_certificate_ref': 'NABL-CAL-2026-8841',
                'assigned_station': st_lathe,
            }
        )
        MeasuringGauge.objects.update_or_create(
            gauge_serial='PG-04',
            defaults={
                'gauge_name': 'M24x2.0 GO/NO-GO Thread Plug Gauge',
                'gauge_type': MeasuringGauge.GaugeType.THREAD_PLUG_GAUGE,
                'last_calibrated_date': today - timedelta(days=20),
                'calibration_expiry_date': today + timedelta(days=160),
                'calibration_certificate_ref': 'NABL-CAL-2026-9012',
                'assigned_station': st_lathe,
            }
        )
        MeasuringGauge.objects.update_or_create(
            gauge_serial='VC-EXPIRED-99',
            defaults={
                'gauge_name': 'Shopfloor Vernier Caliper (EXPIRED DEMO)',
                'gauge_type': MeasuringGauge.GaugeType.VERNIER_CALIPER,
                'last_calibrated_date': today - timedelta(days=400),
                'calibration_expiry_date': today - timedelta(days=15),  # Expired 15 days ago!
                'calibration_certificate_ref': 'NABL-EXP-2025-1102',
                'assigned_station': st_lathe,
            }
        )

        # 4. Part Master & Raw Material Intake (Section 3: Heat #H-8042 + Quarantined Lot)
        part_shaft, _ = PartMaster.objects.get_or_create(
            part_number='ZPZ-SHF-4140',
            defaults={
                'part_name': 'High-Torque Transmission Drive Shaft',
                'customer_name': 'Bharat Forge / Automotive Tier-1',
                'drawing_number': 'DRW-SHF-4140-REV-A',
                'material_grade_spec': 'AISI 4140 / EN19 Alloy Steel',
                'approved_cnc_program': 'O4140_ROUGH_FINISH.NC',
                'fixture_setup_code': 'FIX-HYD-CHUCK-04',
            }
        )

        lot_approved, _ = RawMaterialIntake.objects.update_or_create(
            lot_tracking_number='RM-LOT-2026-001',
            defaults={
                'supplier_name': 'Kalyani Steels Ltd.',
                'purchase_order_number': 'PO-STEEL-9920',
                'material_grade': 'AISI 4140',
                'heat_number': 'H-8042',
                'quantity_received': Decimal('2400.00'),
                'mtc_reference_number': 'MTC-KSL-8042-CERT',
                'carbon_percentage': Decimal('0.410'),
                'manganese_percentage': Decimal('0.880'),
                'silicon_percentage': Decimal('0.240'),
                'yield_strength_mpa': Decimal('655.00'),
                'tensile_strength_mpa': Decimal('980.00'),
                'hardness_hb': Decimal('285.00'),
                'requires_spectro_lab_test': True,
                'spectro_lab_passed': True,
                'physical_dimensions_ok': True,
                'status': RawMaterialIntake.IntakeStatus.APPROVED_STOCK,
                'received_by': users[CustomUser.PlantRole.DOCK_CLERK],
                'verified_by_qa': users[CustomUser.PlantRole.QUALITY_MANAGER],
            }
        )
        lot_approved.generate_weather_resistant_barcode()

        lot_quarantined, _ = RawMaterialIntake.objects.update_or_create(
            lot_tracking_number='RM-LOT-2026-002',
            defaults={
                'supplier_name': 'Apex Metal Forgings',
                'purchase_order_number': 'PO-STEEL-9954',
                'material_grade': 'EN24',
                'heat_number': 'H-9105-FAIL',
                'quantity_received': Decimal('850.00'),
                'mtc_reference_number': 'MTC-APEX-9105',
                'carbon_percentage': Decimal('0.210'),  # Out of spec low carbon
                'requires_spectro_lab_test': True,
                'spectro_lab_passed': False,
                'status': RawMaterialIntake.IntakeStatus.SUPPLIER_QUARANTINE,
                'received_by': users[CustomUser.PlantRole.DOCK_CLERK],
                'verified_by_qa': users[CustomUser.PlantRole.QUALITY_MANAGER],
            }
        )
        SupplierNCR.objects.get_or_create(
            raw_material_intake=lot_quarantined,
            defaults={
                'sncr_number': 'SNCR-H-9105-FAIL',
                'failure_category': 'SPECTRO_CHEMICAL_MISMATCH',
                'detailed_reason': 'Spectro Lab test detected Carbon at 0.21% against required 0.36-0.44% for EN24.',
                'raised_by': users[CustomUser.PlantRole.QUALITY_MANAGER],
            }
        )

        # 5. PDI Inspection Template with Interactive Blueprint Pins & CTQ Flag (Section 4)
        template, _ = InspectionTemplate.objects.update_or_create(
            template_code='TPL-SHF-4140-PDI',
            revision_number='Rev A',
            defaults={
                'title': 'Drive Shaft Final PDI & In-Process Dimensional Blueprint',
                'part': part_shaft,
                'operation_step_code': 'OP-10',
                'stage_type': InspectionTemplate.StageType.FINAL_PDI,
                'blueprint_image_url': '/blueprint-shaft-cad.svg',
                'status': InspectionTemplate.ApprovalStatus.APPROVED_ACTIVE,
                'created_by': users[CustomUser.PlantRole.QUALITY_ENGINEER],
                'approved_by_qm': users[CustomUser.PlantRole.QUALITY_MANAGER],
                'approved_at': now,
            }
        )

        pins_spec = [
            (1, 'Primary Bearing Journal OD (CTQ)', Decimal('28.00'), Decimal('42.00'),
             BlueprintPin.InspectionType.DIMENSIONAL_TOLERANCE, Decimal('25.0000'), Decimal('0.0500'), Decimal('-0.0200'),
             'mm', MeasuringGauge.GaugeType.VERNIER_CALIPER, True),
            (2, 'M24x2.0 External Thread Pitch', Decimal('68.00'), Decimal('42.00'),
             BlueprintPin.InspectionType.DIMENSIONAL_TOLERANCE, Decimal('24.0000'), Decimal('0.0200'), Decimal('-0.0200'),
             'mm', MeasuringGauge.GaugeType.THREAD_PLUG_GAUGE, False),
            (3, 'Deburred Edges & Rust Preventative Coating', Decimal('50.00'), Decimal('75.00'),
             BlueprintPin.InspectionType.VISUAL_PASS_FAIL, None, None, None,
             'visual', MeasuringGauge.GaugeType.VERNIER_CALIPER, False),
        ]
        for p_num, p_name, x_c, y_c, i_type, nom, up_t, low_t, unit, g_type, ctq in pins_spec:
            BlueprintPin.objects.update_or_create(
                template=template,
                pin_number=p_num,
                defaults={
                    'parameter_name': p_name,
                    'x_coord_percent': x_c,
                    'y_coord_percent': y_c,
                    'inspection_type': i_type,
                    'nominal_value': nom,
                    'upper_tolerance': up_t,
                    'lower_tolerance': low_t,
                    'measurement_unit': unit,
                    'required_gauge_type': g_type,
                    'is_ctq': ctq,
                }
            )

        # 6. Work Order & Digital Travelers (Sections 7, 8, 9)
        wo, _ = WorkOrder.objects.get_or_create(
            work_order_number='WO-2026-8801',
            defaults={
                'customer_po_number': 'PO-BF-2026-554',
                'part': part_shaft,
                'raw_material_lot': lot_approved,
                'planned_quantity': 50,
                'released_by': users[CustomUser.PlantRole.PLANT_MANAGER],
            }
        )

        # Traveler 1: Active on CNC-LATHE-04 ready for Tablet QR Scan & PDI Inspection
        trav_1, _ = DigitalTraveler.objects.update_or_create(
            traveler_barcode='TRV-8801-A',
            defaults={
                'serial_number': 'SN-ZPZ-2026-001',
                'work_order': wo,
                'batch_quantity': 25,
                'produced_quantity': 25,
                'current_operation_sequence': 10,
                'status': DigitalTraveler.TravelerStatus.IN_PROGRESS,
            }
        )
        ProcessRouteStep.objects.update_or_create(
            traveler=trav_1,
            sequence_number=10,
            defaults={
                'operation_code': 'OP-10',
                'operation_name': 'CNC Precision Turning & Threading',
                'assigned_workstation': st_lathe,
                'requires_first_piece_inspection': True,
                'first_piece_approved': True,
                'mandatory_hold_minutes': 0,
                'status': ProcessRouteStep.StepStatus.COMPLETED,
                'started_at': now - timedelta(hours=2),
                'completed_at': now - timedelta(minutes=15),
                'operator': users[CustomUser.PlantRole.MACHINE_OPERATOR],
            }
        )

        # Traveler 2: Locked in Mandatory 4-Hour Heat Treatment Cooling Hold (Section 8.2 Demo)
        trav_2, _ = DigitalTraveler.objects.update_or_create(
            traveler_barcode='TRV-8801-HOLD',
            defaults={
                'serial_number': 'SN-ZPZ-2026-002',
                'work_order': wo,
                'batch_quantity': 25,
                'produced_quantity': 25,
                'current_operation_sequence': 30,
                'status': DigitalTraveler.TravelerStatus.COOLING_HOLD,
            }
        )
        ProcessRouteStep.objects.update_or_create(
            traveler=trav_2,
            sequence_number=20,
            defaults={
                'operation_code': 'OP-20',
                'operation_name': 'Induction Heat Treatment Discharge',
                'assigned_workstation': st_oven,
                'requires_first_piece_inspection': False,
                'first_piece_approved': True,
                'mandatory_hold_minutes': 120,
                'hold_started_at': now - timedelta(minutes=38),
                'hold_expires_at': now + timedelta(minutes=82),  # 1 hr 22 min remaining (matches BRD Section 8.2!)
                'status': ProcessRouteStep.StepStatus.HOLD_COOLING,
                'started_at': now - timedelta(hours=3),
                'completed_at': now - timedelta(minutes=38),
                'operator': users[CustomUser.PlantRole.MACHINE_OPERATOR],
            }
        )
        ProcessRouteStep.objects.update_or_create(
            traveler=trav_2,
            sequence_number=30,
            defaults={
                'operation_code': 'OP-30',
                'operation_name': 'Precision Cylindrical Grinding',
                'assigned_workstation': st_grind,
                'requires_first_piece_inspection': True,
                'status': ProcessRouteStep.StepStatus.PENDING,
            }
        )

        # 7. Shift Handover Log (Section 12.2)
        ShiftHandoverLog.objects.get_or_create(
            workstation=st_lathe,
            outgoing_shift='MORNING',
            incoming_shift='EVENING',
            outgoing_operator=users[CustomUser.PlantRole.MACHINE_OPERATOR],
            defaults={
                'active_job_traveler_barcode': 'TRV-8801-A',
                'total_parts_produced_in_shift': 25,
                'current_scrap_count': 0,
                'open_quality_alerts': 'Verify Pin #1 CTQ Bearing Journal OD with Caliper VC-104.',
                'pending_pdi_reviews': 1,
                'tool_wear_status': 'CNMG Turning Insert changed at 10:30 AM - 90% life remaining.',
                'machine_health_notes': 'Zero-point verified, hydraulic chuck pressure steady at 35 bar.',
            }
        )

        self.stdout.write(self.style.SUCCESS("✅ Zapuza MES/QMS Demo Data Seeded Successfully!"))
        self.stdout.write(self.style.WARNING("👉 Login Credentials: username='qm_vikram' or 'insp_rohit', password='zapuza123'"))
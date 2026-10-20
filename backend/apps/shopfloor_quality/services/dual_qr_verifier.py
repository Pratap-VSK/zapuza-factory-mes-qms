import uuid
from core.exceptions import ShopfloorInterlockException
from core.crypto.qr_signer import TamperProofQRSigner
from apps.plant_master.models import Workstation
from apps.production_routing.models import DigitalTraveler, ProcessRouteStep
from apps.production_routing.services.sequence_interlock import ProcessSequenceInterlockService
from apps.pdi_templates.models import InspectionTemplate
from apps.shopfloor_quality.models import InspectionSession


class DualQRPresenceService:
    """
    Section 5.1: Station QR Code Scanning & Physical Presence Rule.
    Manual keyboard searching for stations or jobs is strictly disabled on inspector tablets.
    Must scan both Station Frame QR and Traveler Barcode.
    """
    @staticmethod
    def start_locked_inspection_session(
        station_qr_input: str,
        traveler_qr_input: str,
        inspector_user,
        stage_type: str = 'FINAL_PDI'
    ) -> InspectionSession:
        # 1. Verify Station QR (Supports cryptographic ZPZ token or station_code)
        station = None
        if station_qr_input.startswith('ZPZ.'):
            payload = TamperProofQRSigner.verify_signed_token(station_qr_input, expected_type="STATION")
            station = Workstation.objects.filter(id=payload['id']).first()
        else:
            station = Workstation.objects.filter(station_code__iexact=station_qr_input.strip()).first()

        if not station:
            raise ShopfloorInterlockException(
                detail="Physical Presence Lock: Invalid or unrecognized Workstation Frame QR Code scanned.",
                interlock_type="INVALID_STATION_QR"
            )

        # 2. Verify Traveler QR / Barcode
        traveler = None
        if traveler_qr_input.startswith('ZPZ.'):
            payload = TamperProofQRSigner.verify_signed_token(traveler_qr_input, expected_type="TRAVELER")
            traveler = DigitalTraveler.objects.filter(id=payload['id']).first()
        else:
            traveler = DigitalTraveler.objects.filter(traveler_barcode__iexact=traveler_qr_input.strip()).first()

        if not traveler:
            raise ShopfloorInterlockException(
                detail="Physical Presence Lock: Invalid or unrecognized Job Traveler Barcode scanned.",
                interlock_type="INVALID_TRAVELER_QR"
            )

        # 3. Match active operation on this station
        operation_step = (
            traveler.operations.filter(assigned_workstation=station)
            .order_by('sequence_number')
            .first()
        ) or traveler.operations.filter(sequence_number=traveler.current_operation_sequence).first()

        if not operation_step:
            raise ShopfloorInterlockException(
                detail=f"Routing Mismatch: Traveler {traveler.traveler_barcode} has no routed operation at {station.station_code}.",
                interlock_type="STATION_ROUTING_MISMATCH"
            )

        # 4. Run full Process Sequence, Machine PM, and Cooling Hold Interlocks
        ProcessSequenceInterlockService.validate_can_access_operation(operation_step)

        # 5. Fetch active QM-Approved Inspection Template
        template = (
            InspectionTemplate.objects.filter(
                part=traveler.work_order.part,
                status=InspectionTemplate.ApprovalStatus.APPROVED_ACTIVE
            )
            .order_by('-created_at')
            .first()
        )
        if not template:
            raise ShopfloorInterlockException(
                detail=(
                    f"Missing Approved Template: No QM-Approved PDI Template found for Part "
                    f"{traveler.work_order.part.part_number}."
                ),
                interlock_type="NO_APPROVED_TEMPLATE"
            )

        session_code = f"INSP-{traveler.traveler_barcode}-{str(uuid.uuid4())[:5].upper()}"
        session = InspectionSession.objects.create(
            session_code=session_code,
            traveler=traveler,
            operation_step=operation_step,
            workstation=station,
            template=template,
            inspector=inspector_user,
            station_qr_verified=True,
            traveler_qr_verified=True,
            is_locked_on_tablet=True,
        )
        return session
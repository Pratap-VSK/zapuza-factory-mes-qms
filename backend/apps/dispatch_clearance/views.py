from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import DispatchManifest
from .serializers import DispatchManifestSerializer
from .services.shipping_interlock import ShippingGateInterlockService
from apps.production_routing.models import DigitalTraveler
from apps.production_routing.services.trace_lineage import PartLineageTraceService


class DispatchManifestViewSet(viewsets.ModelViewSet):
    queryset = DispatchManifest.objects.select_related(
        'traveler__work_order__part', 'traveler__work_order__raw_material_lot', 'issued_by'
    ).all()
    serializer_class = DispatchManifestSerializer

    @action(detail=False, methods=['get'])
    def check_interlock(self, request):
        traveler_id = request.query_params.get('traveler_id')
        traveler = DigitalTraveler.objects.filter(id=traveler_id).first()
        if not traveler:
            return Response({"error": "Traveler not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ShippingGateInterlockService.evaluate_3_point_clearance(traveler))

    @action(detail=False, methods=['post'])
    def generate_gate_pass(self, request):
        traveler_id = request.data.get('traveler_id')
        vehicle_no = request.data.get('transport_vehicle_number', 'MH-12-ZP-2026')
        driver_contact = request.data.get('driver_contact', '')
        traveler = DigitalTraveler.objects.get(id=traveler_id)
        manifest = ShippingGateInterlockService.issue_gate_pass_and_manifest(
            traveler=traveler,
            clerk_user=request.user,
            transport_vehicle_number=vehicle_no,
            driver_contact=driver_contact
        )
        return Response(DispatchManifestSerializer(manifest).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def public_verify_coa(self, request):
        """
        Section 11.3: Public Customer Verification endpoint when scanning Crate QR label.
        Returns certified Digital Certificate of Analysis (CoA), measured PDI values, and MTC data.
        """
        token = request.query_params.get('token', '').strip()
        manifest = (
            DispatchManifest.objects.filter(crate_qr_token=token).first()
            or DispatchManifest.objects.filter(manifest_number__iexact=token).first()
        )
        if not manifest:
            return Response({"verified": False, "error": "Invalid or unrecognized Crate QR signature."}, status=status.HTTP_404_NOT_FOUND)

        lineage = PartLineageTraceService.trace_backward_birth_certificate(manifest.traveler.serial_number)
        return Response({
            "verified": True,
            "manifest": DispatchManifestSerializer(manifest).data,
            "digital_coa_certificate": lineage,
        })
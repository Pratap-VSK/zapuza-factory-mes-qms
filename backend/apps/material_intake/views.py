from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import RawMaterialIntake, SupplierNCR
from .serializers import RawMaterialIntakeSerializer, SupplierNCRSerializer
from .services.quarantine_engine import MaterialQuarantineService


class RawMaterialIntakeViewSet(viewsets.ModelViewSet):
    queryset = RawMaterialIntake.objects.select_related('received_by', 'verified_by_qa').all()
    serializer_class = RawMaterialIntakeSerializer
    filterset_fields = ['status', 'material_grade', 'heat_number']
    search_fields = ['lot_tracking_number', 'heat_number', 'supplier_name', 'purchase_order_number']

    def perform_create(self, serializer):
        initial_status = (
            RawMaterialIntake.IntakeStatus.IN_LAB_TESTING
            if serializer.validated_data.get('requires_spectro_lab_test', True)
            else RawMaterialIntake.IntakeStatus.PENDING_MTC_REVIEW
        )
        serializer.save(received_by=self.request.user, status=initial_status)

    @action(detail=True, methods=['post'])
    def approve_lot(self, request, pk=None):
        intake = self.get_object()
        if 'spectro_lab_passed' in request.data:
            intake.spectro_lab_passed = bool(request.data.get('spectro_lab_passed'))
            intake.save(update_fields=['spectro_lab_passed'])
        approved_intake = MaterialQuarantineService.approve_and_tag_lot(intake, request.user)
        return Response(RawMaterialIntakeSerializer(approved_intake).data)

    @action(detail=True, methods=['post'])
    def reject_intake(self, request, pk=None):
        intake = self.get_object()
        failure_category = request.data.get('failure_category', 'SPECTRO_CHEMICAL_MISMATCH')
        detailed_reason = request.data.get('detailed_reason', 'Failed receiving inspection / MTC mismatch.')
        sncr = MaterialQuarantineService.reject_to_supplier_quarantine(
            intake=intake,
            user=request.user,
            failure_category=failure_category,
            detailed_reason=detailed_reason
        )
        return Response(SupplierNCRSerializer(sncr).data, status=status.HTTP_201_CREATED)


class SupplierNCRViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SupplierNCR.objects.select_related('raw_material_intake', 'raised_by').all()
    serializer_class = SupplierNCRSerializer
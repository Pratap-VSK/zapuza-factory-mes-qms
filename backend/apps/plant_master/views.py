from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import FactorySite, Workstation, PartMaster, MeasuringGauge, PMChecklistLog
from .serializers import (
    FactorySiteSerializer,
    WorkstationSerializer,
    PartMasterSerializer,
    MeasuringGaugeSerializer,
    PMChecklistLogSerializer,
)
from .services.calibration_guard import ToolCalibrationGuardService


class FactorySiteViewSet(viewsets.ModelViewSet):
    queryset = FactorySite.objects.all()
    serializer_class = FactorySiteSerializer


class WorkstationViewSet(viewsets.ModelViewSet):
    queryset = Workstation.objects.select_related('factory_site').all()
    serializer_class = WorkstationSerializer
    filterset_fields = ['factory_site', 'status']


class PartMasterViewSet(viewsets.ModelViewSet):
    queryset = PartMaster.objects.all()
    serializer_class = PartMasterSerializer
    search_fields = ['part_number', 'part_name', 'customer_name']


class MeasuringGaugeViewSet(viewsets.ModelViewSet):
    queryset = MeasuringGauge.objects.select_related('assigned_station').all()
    serializer_class = MeasuringGaugeSerializer
    filterset_fields = ['gauge_type', 'assigned_station', 'is_blocked']
    search_fields = ['gauge_serial', 'gauge_name']

    @action(detail=False, methods=['post'])
    def verify_tool(self, request):
        """Tablet endpoint to verify gauge calibration before recording measurement."""
        gauge_serial = request.data.get('gauge_serial', '')
        required_type = request.data.get('required_gauge_type')
        gauge = ToolCalibrationGuardService.verify_gauge_calibration(gauge_serial, required_type)
        return Response(MeasuringGaugeSerializer(gauge).data, status=status.HTTP_200_OK)


class PMChecklistLogViewSet(viewsets.ModelViewSet):
    queryset = PMChecklistLog.objects.select_related('workstation', 'operator').all()
    serializer_class = PMChecklistLogSerializer
    filterset_fields = ['workstation', 'is_passed']

    def perform_create(self, serializer):
        serializer.save(operator=self.request.user)
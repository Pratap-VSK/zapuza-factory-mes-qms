from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import WorkOrder, DigitalTraveler, ProcessRouteStep
from .serializers import WorkOrderSerializer, DigitalTravelerSerializer, ProcessRouteStepSerializer
from .services.sequence_interlock import ProcessSequenceInterlockService
from .services.trace_lineage import PartLineageTraceService


class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.select_related('part', 'raw_material_lot').prefetch_related('travelers__operations').all()
    serializer_class = WorkOrderSerializer

    def perform_create(self, serializer):
        serializer.save(released_by=self.request.user)


class DigitalTravelerViewSet(viewsets.ModelViewSet):
    queryset = (
        DigitalTraveler.objects.select_related('work_order__part', 'work_order__raw_material_lot')
        .prefetch_related('operations__assigned_workstation')
        .all()
    )
    serializer_class = DigitalTravelerSerializer
    filterset_fields = ['status', 'is_quarantined', 'work_order']
    search_fields = ['traveler_barcode', 'serial_number']

    @action(detail=False, methods=['get'])
    def trace_lineage(self, request):
        mode = request.query_params.get('mode', 'backward')
        query = request.query_params.get('q', '')
        if not query:
            return Response({"error": "Query parameter 'q' is required."}, status=status.HTTP_400_BAD_REQUEST)

        if mode == 'forward':
            data = PartLineageTraceService.trace_forward_by_heat_number(query)
        else:
            data = PartLineageTraceService.trace_backward_birth_certificate(query)
        return Response(data)


class ProcessRouteStepViewSet(viewsets.ModelViewSet):
    queryset = ProcessRouteStep.objects.select_related('traveler', 'assigned_workstation', 'operator').all()
    serializer_class = ProcessRouteStepSerializer
    filterset_fields = ['traveler', 'assigned_workstation', 'status']

    @action(detail=True, methods=['post'])
    def clock_in(self, request, pk=None):
        step = self.get_object()
        updated = ProcessSequenceInterlockService.clock_in_operation(step, request.user)
        return Response(ProcessRouteStepSerializer(updated).data)

    @action(detail=True, methods=['post'])
    def complete_step(self, request, pk=None):
        step = self.get_object()
        parts_produced = request.data.get('parts_produced')
        updated = ProcessSequenceInterlockService.complete_operation(step, request.user, parts_produced)
        return Response(ProcessRouteStepSerializer(updated).data)
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ShiftHandoverLog
from .serializers import ShiftHandoverLogSerializer


class ShiftHandoverLogViewSet(viewsets.ModelViewSet):
    queryset = ShiftHandoverLog.objects.select_related(
        'workstation', 'outgoing_operator', 'incoming_operator'
    ).all()
    serializer_class = ShiftHandoverLogSerializer
    filterset_fields = ['workstation', 'is_acknowledged_by_incoming']

    def perform_create(self, serializer):
        serializer.save(outgoing_operator=self.request.user)

    @action(detail=True, methods=['post'])
    def acknowledge_handover(self, request, pk=None):
        log = self.get_object()
        log.incoming_operator = request.user
        log.is_acknowledged_by_incoming = True
        log.acknowledged_at = timezone.now()
        log.save(update_fields=['incoming_operator', 'is_acknowledged_by_incoming', 'acknowledged_at'])
        return Response(ShiftHandoverLogSerializer(log).data)
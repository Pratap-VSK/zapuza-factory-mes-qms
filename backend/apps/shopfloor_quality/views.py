from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import InspectionSession, MRBDisposition
from .serializers import InspectionSessionSerializer, MRBDispositionSerializer
from .services.dual_qr_verifier import DualQRPresenceService
from .services.tolerance_evaluator import ToleranceEvaluatorService
from .services.mrb_workflow import SupervisorAndMRBService


class InspectionSessionViewSet(viewsets.ModelViewSet):
    queryset = (
        InspectionSession.objects.select_related(
            'traveler__work_order__part', 'workstation', 'template', 'inspector', 'operation_step'
        )
        .prefetch_related('measurements__pin', 'measurements__gauge_used', 'template__pins')
        .all()
    )
    serializer_class = InspectionSessionSerializer
    filterset_fields = ['approval_status', 'overall_result', 'has_ctq_failure', 'traveler']

    @action(detail=False, methods=['post'])
    def dual_qr_unlock(self, request):
        """Section 5.1: Requires both physical Station QR and Traveler Barcode scan."""
        station_qr = request.data.get('station_qr', '')
        traveler_qr = request.data.get('traveler_qr', '')
        stage_type = request.data.get('stage_type', 'FINAL_PDI')
        session = DualQRPresenceService.start_locked_inspection_session(
            station_qr_input=station_qr,
            traveler_qr_input=traveler_qr,
            inspector_user=request.user,
            stage_type=stage_type
        )
        return Response(InspectionSessionSerializer(session).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def submit_checklist(self, request, pk=None):
        """Sections 5.2-5.4: Evaluates all readings, checks gauge expiry, and enforces 2 photos on failure."""
        session = self.get_object()
        readings = request.data.get('readings', [])
        remarks = request.data.get('inspector_remarks', '')
        synced_offline = bool(request.data.get('synced_from_offline_cache', False))
        updated = ToleranceEvaluatorService.record_and_submit_checklist(
            session=session,
            readings_list=readings,
            inspector_remarks=remarks,
            synced_offline=synced_offline
        )
        return Response(InspectionSessionSerializer(updated).data)

    @action(detail=True, methods=['post'])
    def supervisor_review(self, request, pk=None):
        """Section 6.1: Shift Supervisor Approve / Conditional Concession / Quarantine decision."""
        session = self.get_object()
        decision = request.data.get('decision', 'APPROVE')
        reason_code = request.data.get('concession_reason_code', '')
        justification = request.data.get('concession_engineering_justification', '')
        updated = SupervisorAndMRBService.supervisor_decision(
            session=session,
            supervisor_user=request.user,
            decision=decision,
            concession_reason_code=reason_code,
            engineering_justification=justification
        )
        return Response(InspectionSessionSerializer(updated).data)

    @action(detail=True, methods=['post'])
    def mrb_disposition(self, request, pk=None):
        """Section 6.3: Execute MRB Disposition (Rework, Scrap, RTV, Customer Concession)."""
        session = self.get_object()
        mrb = SupervisorAndMRBService.execute_mrb_disposition(
            session=session,
            authorized_user=request.user,
            disposition_action=request.data.get('disposition_action', 'REWORK_ORDER'),
            engineering_directive=request.data.get('engineering_directive', ''),
            scrap_cost_code=request.data.get('scrap_cost_code', ''),
            customer_approval_ref=request.data.get('customer_written_approval_ref', '')
        )
        return Response(MRBDispositionSerializer(mrb).data, status=status.HTTP_201_CREATED)


class MRBDispositionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MRBDisposition.objects.select_related('traveler', 'authorized_by', 'inspection_session').all()
    serializer_class = MRBDispositionSerializer
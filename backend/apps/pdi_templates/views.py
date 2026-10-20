from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import InspectionTemplate, BlueprintPin
from .serializers import InspectionTemplateSerializer, BlueprintPinSerializer
from .services.revision_control import TemplateRevisionService


class InspectionTemplateViewSet(viewsets.ModelViewSet):
    queryset = InspectionTemplate.objects.select_related('part', 'created_by', 'approved_by_qm').prefetch_related('pins').all()
    serializer_class = InspectionTemplateSerializer
    filterset_fields = ['part', 'operation_step_code', 'stage_type', 'status']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def approve_deployment(self, request, pk=None):
        template = self.get_object()
        approved = TemplateRevisionService.approve_template_by_qm(template, request.user)
        return Response(InspectionTemplateSerializer(approved).data)

    @action(detail=True, methods=['post'])
    def create_revision(self, request, pk=None):
        old_template = self.get_object()
        new_rev = request.data.get('revision_number', 'Rev B')
        cloned = TemplateRevisionService.clone_new_revision(old_template, new_rev, request.user)
        return Response(InspectionTemplateSerializer(cloned).data, status=status.HTTP_201_CREATED)


class BlueprintPinViewSet(viewsets.ModelViewSet):
    queryset = BlueprintPin.objects.select_related('template').all()
    serializer_class = BlueprintPinSerializer
    filterset_fields = ['template', 'is_ctq']

    def perform_create(self, serializer):
        template = serializer.validated_data['template']
        TemplateRevisionService.ensure_template_editable(template)
        serializer.save()

    def perform_update(self, serializer):
        template = serializer.instance.template
        TemplateRevisionService.ensure_template_editable(template)
        serializer.save()

    def perform_destroy(self, instance):
        TemplateRevisionService.ensure_template_editable(instance.template)
        instance.delete()
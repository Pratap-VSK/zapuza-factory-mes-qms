from rest_framework import serializers
from .models import InspectionTemplate, BlueprintPin


class BlueprintPinSerializer(serializers.ModelSerializer):
    min_allowed_limit = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)
    max_allowed_limit = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)

    class Meta:
        model = BlueprintPin
        fields = '__all__'


class InspectionTemplateSerializer(serializers.ModelSerializer):
    pins = BlueprintPinSerializer(many=True, read_only=True)
    part_number = serializers.CharField(source='part.part_number', read_only=True)
    part_name = serializers.CharField(source='part.part_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    approved_by_qm_name = serializers.CharField(source='approved_by_qm.username', read_only=True)
    is_locked_for_editing = serializers.BooleanField(read_only=True)

    class Meta:
        model = InspectionTemplate
        fields = '__all__'
        read_only_fields = ['created_by', 'approved_by_qm', 'approved_at']
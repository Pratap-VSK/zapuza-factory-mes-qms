from rest_framework import serializers
from .models import InspectionSession, ParameterMeasurement, MRBDisposition
from apps.pdi_templates.serializers import InspectionTemplateSerializer


class ParameterMeasurementSerializer(serializers.ModelSerializer):
    pin_number = serializers.IntegerField(source='pin.pin_number', read_only=True)
    parameter_name = serializers.CharField(source='pin.parameter_name', read_only=True)
    is_ctq = serializers.BooleanField(source='pin.is_ctq', read_only=True)
    gauge_serial = serializers.CharField(source='gauge_used.gauge_serial', read_only=True)

    class Meta:
        model = ParameterMeasurement
        fields = '__all__'


class MRBDispositionSerializer(serializers.ModelSerializer):
    authorized_by_name = serializers.CharField(source='authorized_by.username', read_only=True)
    traveler_barcode = serializers.CharField(source='traveler.traveler_barcode', read_only=True)

    class Meta:
        model = MRBDisposition
        fields = '__all__'
        read_only_fields = ['mrb_code', 'authorized_by']


class InspectionSessionSerializer(serializers.ModelSerializer):
    measurements = ParameterMeasurementSerializer(many=True, read_only=True)
    template_details = InspectionTemplateSerializer(source='template', read_only=True)
    mrb_disposition = MRBDispositionSerializer(read_only=True)
    traveler_barcode = serializers.CharField(source='traveler.traveler_barcode', read_only=True)
    serial_number = serializers.CharField(source='traveler.serial_number', read_only=True)
    part_number = serializers.CharField(source='traveler.work_order.part.part_number', read_only=True)
    station_code = serializers.CharField(source='workstation.station_code', read_only=True)
    inspector_name = serializers.CharField(source='inspector.username', read_only=True)

    class Meta:
        model = InspectionSession
        fields = '__all__'
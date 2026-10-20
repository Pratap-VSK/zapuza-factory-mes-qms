from rest_framework import serializers
from .models import FactorySite, Workstation, PartMaster, MeasuringGauge, PMChecklistLog


class FactorySiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FactorySite
        fields = '__all__'


class WorkstationSerializer(serializers.ModelSerializer):
    factory_site_name = serializers.CharField(source='factory_site.name', read_only=True)
    is_pm_valid_for_today = serializers.BooleanField(read_only=True)

    class Meta:
        model = Workstation
        fields = '__all__'


class PartMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = PartMaster
        fields = '__all__'


class MeasuringGaugeSerializer(serializers.ModelSerializer):
    is_calibration_expired = serializers.BooleanField(read_only=True)
    assigned_station_code = serializers.CharField(source='assigned_station.station_code', read_only=True)

    class Meta:
        model = MeasuringGauge
        fields = '__all__'


class PMChecklistLogSerializer(serializers.ModelSerializer):
    operator_name = serializers.CharField(source='operator.username', read_only=True)
    station_code = serializers.CharField(source='workstation.station_code', read_only=True)

    class Meta:
        model = PMChecklistLog
        fields = '__all__'
        read_only_fields = ['operator', 'is_passed']
from rest_framework import serializers
from .models import WorkOrder, DigitalTraveler, ProcessRouteStep


class ProcessRouteStepSerializer(serializers.ModelSerializer):
    station_code = serializers.CharField(source='assigned_workstation.station_code', read_only=True)
    station_name = serializers.CharField(source='assigned_workstation.name', read_only=True)
    operator_name = serializers.CharField(source='operator.username', read_only=True)
    remaining_hold_seconds = serializers.IntegerField(read_only=True)
    is_hourly_inspection_due = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProcessRouteStep
        fields = '__all__'


class DigitalTravelerSerializer(serializers.ModelSerializer):
    operations = ProcessRouteStepSerializer(many=True, read_only=True)
    work_order_number = serializers.CharField(source='work_order.work_order_number', read_only=True)
    part_number = serializers.CharField(source='work_order.part.part_number', read_only=True)
    part_name = serializers.CharField(source='work_order.part.part_name', read_only=True)
    heat_number = serializers.CharField(source='work_order.raw_material_lot.heat_number', read_only=True)

    class Meta:
        model = DigitalTraveler
        fields = '__all__'


class WorkOrderSerializer(serializers.ModelSerializer):
    travelers = DigitalTravelerSerializer(many=True, read_only=True)
    part_number = serializers.CharField(source='part.part_number', read_only=True)
    heat_number = serializers.CharField(source='raw_material_lot.heat_number', read_only=True)

    class Meta:
        model = WorkOrder
        fields = '__all__'
        read_only_fields = ['released_by']
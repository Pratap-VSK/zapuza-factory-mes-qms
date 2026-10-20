from rest_framework import serializers
from .models import ShiftHandoverLog


class ShiftHandoverLogSerializer(serializers.ModelSerializer):
    station_code = serializers.CharField(source='workstation.station_code', read_only=True)
    station_name = serializers.CharField(source='workstation.name', read_only=True)
    outgoing_operator_name = serializers.CharField(source='outgoing_operator.username', read_only=True)
    incoming_operator_name = serializers.CharField(source='incoming_operator.username', read_only=True)

    class Meta:
        model = ShiftHandoverLog
        fields = '__all__'
        read_only_fields = ['outgoing_operator', 'incoming_operator', 'acknowledged_at']
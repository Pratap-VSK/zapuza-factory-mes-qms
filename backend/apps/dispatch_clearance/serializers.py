from rest_framework import serializers
from .models import DispatchManifest


class DispatchManifestSerializer(serializers.ModelSerializer):
    traveler_barcode = serializers.CharField(source='traveler.traveler_barcode', read_only=True)
    serial_number = serializers.CharField(source='traveler.serial_number', read_only=True)
    part_number = serializers.CharField(source='traveler.work_order.part.part_number', read_only=True)
    part_name = serializers.CharField(source='traveler.work_order.part.part_name', read_only=True)
    customer_name = serializers.CharField(source='traveler.work_order.part.customer_name', read_only=True)
    heat_number = serializers.CharField(source='traveler.work_order.raw_material_lot.heat_number', read_only=True)
    issued_by_name = serializers.CharField(source='issued_by.username', read_only=True)

    class Meta:
        model = DispatchManifest
        fields = '__all__'
        read_only_fields = ['manifest_number', 'gate_pass_number', 'crate_qr_token', 'issued_by']
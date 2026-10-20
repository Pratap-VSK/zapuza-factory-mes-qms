from rest_framework import serializers
from .models import RawMaterialIntake, SupplierNCR


class SupplierNCRSerializer(serializers.ModelSerializer):
    heat_number = serializers.CharField(source='raw_material_intake.heat_number', read_only=True)
    supplier_name = serializers.CharField(source='raw_material_intake.supplier_name', read_only=True)
    raised_by_name = serializers.CharField(source='raised_by.username', read_only=True)

    class Meta:
        model = SupplierNCR
        fields = '__all__'
        read_only_fields = ['sncr_number', 'raised_by']


class RawMaterialIntakeSerializer(serializers.ModelSerializer):
    received_by_name = serializers.CharField(source='received_by.username', read_only=True)
    verified_by_qa_name = serializers.CharField(source='verified_by_qa.username', read_only=True)
    sncr_report = SupplierNCRSerializer(read_only=True)

    class Meta:
        model = RawMaterialIntake
        fields = '__all__'
        read_only_fields = ['received_by', 'verified_by_qa', 'bundle_barcode_token']
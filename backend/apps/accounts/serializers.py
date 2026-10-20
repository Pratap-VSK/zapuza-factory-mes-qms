from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import CustomUser, TabletDeviceRegistry
from core.models import ImmutableAuditLog


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'full_name', 'first_name', 'last_name',
            'email', 'employee_code', 'role', 'assigned_shift',
            'department_name', 'badge_qr_token', 'phone_number', 'is_active'
        ]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class TabletDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TabletDeviceRegistry
        fields = '__all__'


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True, default='System')

    class Meta:
        model = ImmutableAuditLog
        fields = '__all__'
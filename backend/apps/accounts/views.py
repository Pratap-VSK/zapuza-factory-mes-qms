from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser, TabletDeviceRegistry
from .serializers import (
    UserSerializer,
    CustomTokenObtainPairSerializer,
    TabletDeviceSerializer,
    AuditLogSerializer,
)
from core.models import ImmutableAuditLog


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all().order_by('employee_code')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def badge_login(self, request):
        """
        Allows shopfloor operators/inspectors to log into industrial tablets
        by scanning their Employee Badge QR code.
        """
        badge_token = request.data.get('badge_qr_token')
        if not badge_token:
            return Response({'error': 'Badge QR token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = CustomUser.objects.filter(badge_qr_token=badge_token, is_active=True).first()
        if not user:
            return Response({'error': 'Invalid or inactive employee badge QR.'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })


class TabletDeviceViewSet(viewsets.ModelViewSet):
    queryset = TabletDeviceRegistry.objects.all()
    serializer_class = TabletDeviceSerializer
    permission_classes = [permissions.IsAuthenticated]


class ImmutableAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-Only endpoint for Section 13.3 Tamper-Proof Audit Trail.
    No POST/PUT/DELETE allowed.
    """
    queryset = ImmutableAuditLog.objects.select_related('user').all()[:500]
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['user_role', 'device_serial', 'http_method', 'entity_type']
    search_fields = ['endpoint', 'action', 'device_serial']
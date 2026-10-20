from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RawMaterialIntakeViewSet, SupplierNCRViewSet

router = DefaultRouter()
router.register(r'lots', RawMaterialIntakeViewSet, basename='raw-material-lots')
router.register(r'sncr', SupplierNCRViewSet, basename='supplier-ncr')

urlpatterns = [
    path('', include(router.urls)),
]
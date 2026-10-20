from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FactorySiteViewSet,
    WorkstationViewSet,
    PartMasterViewSet,
    MeasuringGaugeViewSet,
    PMChecklistLogViewSet,
)

router = DefaultRouter()
router.register(r'sites', FactorySiteViewSet, basename='sites')
router.register(r'workstations', WorkstationViewSet, basename='workstations')
router.register(r'parts', PartMasterViewSet, basename='parts')
router.register(r'gauges', MeasuringGaugeViewSet, basename='gauges')
router.register(r'pm-logs', PMChecklistLogViewSet, basename='pm-logs')

urlpatterns = [
    path('', include(router.urls)),
]
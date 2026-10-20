from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkOrderViewSet, DigitalTravelerViewSet, ProcessRouteStepViewSet

router = DefaultRouter()
router.register(r'work-orders', WorkOrderViewSet, basename='work-orders')
router.register(r'travelers', DigitalTravelerViewSet, basename='travelers')
router.register(r'operations', ProcessRouteStepViewSet, basename='operations')

urlpatterns = [
    path('', include(router.urls)),
]
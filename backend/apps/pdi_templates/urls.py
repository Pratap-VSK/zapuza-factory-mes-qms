from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InspectionTemplateViewSet, BlueprintPinViewSet

router = DefaultRouter()
router.register(r'templates', InspectionTemplateViewSet, basename='inspection-templates')
router.register(r'pins', BlueprintPinViewSet, basename='blueprint-pins')

urlpatterns = [
    path('', include(router.urls)),
]
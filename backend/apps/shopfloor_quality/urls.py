from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InspectionSessionViewSet, MRBDispositionViewSet

router = DefaultRouter()
router.register(r'sessions', InspectionSessionViewSet, basename='inspection-sessions')
router.register(r'mrb', MRBDispositionViewSet, basename='mrb-dispositions')

urlpatterns = [
    path('', include(router.urls)),
]
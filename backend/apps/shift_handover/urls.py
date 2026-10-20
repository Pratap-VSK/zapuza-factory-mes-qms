from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShiftHandoverLogViewSet

router = DefaultRouter()
router.register(r'logs', ShiftHandoverLogViewSet, basename='shift-handover-logs')

urlpatterns = [
    path('', include(router.urls)),
]
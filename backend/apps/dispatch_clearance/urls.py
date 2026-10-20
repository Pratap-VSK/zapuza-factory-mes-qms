from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DispatchManifestViewSet

router = DefaultRouter()
router.register(r'manifests', DispatchManifestViewSet, basename='dispatch-manifests')

urlpatterns = [
    path('', include(router.urls)),
]
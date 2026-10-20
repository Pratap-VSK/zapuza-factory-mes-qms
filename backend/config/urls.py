from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/accounts/', include('apps.accounts.urls')),
    path('api/v1/plant-master/', include('apps.plant_master.urls')),
    path('api/v1/material-intake/', include('apps.material_intake.urls')),
    path('api/v1/pdi-templates/', include('apps.pdi_templates.urls')),
    path('api/v1/routing/', include('apps.production_routing.urls')),
    path('api/v1/quality/', include('apps.shopfloor_quality.urls')),
    path('api/v1/dispatch/', include('apps.dispatch_clearance.urls')),
    path('api/v1/shift-handover/', include('apps.shift_handover.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
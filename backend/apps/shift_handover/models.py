from django.db import models
from django.conf import settings
from core.models import BaseTimestampModel
from apps.plant_master.models import Workstation


class ShiftHandoverLog(BaseTimestampModel):
    """
    Section 12.2: Mandatory Digital Shift Handover Logbook between outgoing
    and incoming operators/supervisors.
    """
    workstation = models.ForeignKey(Workstation, on_delete=models.CASCADE, related_name='handover_logs')
    outgoing_shift = models.CharField(max_length=20)
    incoming_shift = models.CharField(max_length=20)
    outgoing_operator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='outgoing_handovers'
    )
    incoming_operator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='incoming_handovers'
    )

    active_job_traveler_barcode = models.CharField(max_length=80, blank=True)
    total_parts_produced_in_shift = models.PositiveIntegerField(default=0)
    current_scrap_count = models.PositiveIntegerField(default=0)
    open_quality_alerts = models.TextField(blank=True)
    pending_pdi_reviews = models.PositiveIntegerField(default=0)
    tool_wear_status = models.CharField(max_length=150, default="Insert edges normal - 70% life remaining")
    machine_health_notes = models.TextField(default="Spindle & coolant pressure normal.")

    is_acknowledged_by_incoming = models.BooleanField(default=False, db_index=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Handover {self.workstation.station_code}: {self.outgoing_shift} -> {self.incoming_shift}"
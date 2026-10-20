from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from core.models import BaseTimestampModel
from core.crypto.qr_signer import TamperProofQRSigner
from apps.plant_master.models import PartMaster, Workstation
from apps.material_intake.models import RawMaterialIntake


class WorkOrder(BaseTimestampModel):
    """Section 7.1: Master production work order linked to approved raw material heat lot."""
    work_order_number = models.CharField(max_length=60, unique=True, db_index=True)
    customer_po_number = models.CharField(max_length=80, db_index=True)
    part = models.ForeignKey(PartMaster, on_delete=models.PROTECT, related_name='work_orders')
    raw_material_lot = models.ForeignKey(
        RawMaterialIntake, on_delete=models.PROTECT, related_name='work_orders'
    )
    planned_quantity = models.PositiveIntegerField(default=50)
    priority = models.CharField(max_length=20, default='HIGH')
    released_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.work_order_number} ({self.part.part_number})"


class DigitalTraveler(BaseTimestampModel):
    """
    Section 7.1 & 7.2: Digital Job Traveler linking raw material heat numbers
    to operations, finished part serial numbers, and shipping crates.
    """
    class TravelerStatus(models.TextChoices):
        CREATED = 'CREATED', 'Released to Shopfloor'
        IN_PROGRESS = 'IN_PROGRESS', 'In Active Production'
        COOLING_HOLD = 'COOLING_HOLD', 'Mandatory Process Cooling/Curing Hold'
        QUARANTINED = 'QUARANTINED', 'Quarantined - Digital Rejection Holding Area'
        READY_FOR_PDI = 'READY_FOR_PDI', 'Operations Complete - Awaiting Final PDI'
        CLEARED_FOR_DISPATCH = 'CLEARED_FOR_DISPATCH', '100% Verified & Cleared for Dispatch'
        SCRAPPED = 'SCRAPPED', 'Scrapped by MRB'

    traveler_barcode = models.CharField(max_length=80, unique=True, db_index=True)
    serial_number = models.CharField(max_length=80, unique=True, db_index=True)
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='travelers')
    batch_quantity = models.PositiveIntegerField(default=25)
    produced_quantity = models.PositiveIntegerField(default=0)
    scrap_quantity = models.PositiveIntegerField(default=0)

    current_operation_sequence = models.PositiveIntegerField(default=10)
    status = models.CharField(
        max_length=30, choices=TravelerStatus.choices, default=TravelerStatus.CREATED, db_index=True
    )
    is_quarantined = models.BooleanField(default=False, db_index=True)
    quarantine_reason = models.TextField(blank=True)
    qr_signed_token = models.CharField(max_length=500, unique=True, blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.qr_signed_token:
            token = TamperProofQRSigner.generate_signed_token(
                entity_type="TRAVELER",
                entity_id=str(self.id),
                metadata={"barcode": self.traveler_barcode, "serial": self.serial_number}
            )
            DigitalTraveler.objects.filter(pk=self.pk).update(qr_signed_token=token)
            self.qr_signed_token = token

    def __str__(self):
        return f"{self.traveler_barcode} | SN: {self.serial_number} ({self.status})"


class ProcessRouteStep(BaseTimestampModel):
    """
    Sections 7.1, 8.1, 9.1: Individual operation steps in strict numerical sequence
    (e.g., Op 10 Sawing -> Op 20 CNC Turning -> Op 30 Heat Treat -> Op 40 Grinding -> Op 50 Final PDI).
    """
    class StepStatus(models.TextChoices):
        PENDING = 'PENDING', 'Locked / Pending Previous Op'
        SETUP_FIRST_PIECE = 'SETUP_FIRST_PIECE', 'Locked in Setup Mode - Awaiting First-Piece QA Sign-Off'
        IN_PROGRESS = 'IN_PROGRESS', 'Active Machining / Processing'
        HOLD_COOLING = 'HOLD_COOLING', 'Completed - Mandatory Cooling/Aging Timer Active'
        COMPLETED = 'COMPLETED', 'Completed & Signed Off'
        QUARANTINED = 'QUARANTINED', 'Frozen due to Quality Rejection'

    traveler = models.ForeignKey(DigitalTraveler, on_delete=models.CASCADE, related_name='operations')
    sequence_number = models.PositiveIntegerField(help_text="e.g., 10, 20, 30, 40, 50")
    operation_code = models.CharField(max_length=30, help_text="e.g., OP-10, OP-20, OP-30")
    operation_name = models.CharField(
        max_length=120,
        help_text="e.g., Raw Material Cutting, CNC Rough Turning, Heat Treatment, Precision Grinding, Final PDI"
    )
    assigned_workstation = models.ForeignKey(
        Workstation, on_delete=models.PROTECT, related_name='routed_operations'
    )

    requires_first_piece_inspection = models.BooleanField(default=True)
    first_piece_approved = models.BooleanField(default=False)
    hourly_sampling_interval_minutes = models.PositiveIntegerField(
        default=60, help_text="Section 9.2: Frequency-based hourly inspection prompt"
    )
    last_hourly_check_at = models.DateTimeField(null=True, blank=True)

    # Section 8.1 & 8.2: Mandatory Curing, Cooling, and Chemical Hold Times
    mandatory_hold_minutes = models.PositiveIntegerField(
        default=0, help_text="e.g., 240 mins (4 hours) after Heat Treatment before Grinding"
    )
    hold_started_at = models.DateTimeField(null=True, blank=True)
    hold_expires_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=30, choices=StepStatus.choices, default=StepStatus.PENDING)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        unique_together = ('traveler', 'sequence_number')
        ordering = ['sequence_number']

    @property
    def remaining_hold_seconds(self) -> int:
        if self.hold_expires_at and timezone.now() < self.hold_expires_at:
            return int((self.hold_expires_at - timezone.now()).total_seconds())
        return 0

    @property
    def is_hourly_inspection_due(self) -> bool:
        if self.status != self.StepStatus.IN_PROGRESS or not self.started_at:
            return False
        reference_time = self.last_hourly_check_at or self.started_at
        return timezone.now() >= (reference_time + timedelta(minutes=self.hourly_sampling_interval_minutes))

    def __str__(self):
        return f"{self.traveler.traveler_barcode} - Op {self.sequence_number}: {self.operation_name}"
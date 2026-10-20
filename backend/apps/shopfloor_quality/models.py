from django.db import models
from django.conf import settings
from django.core.exceptions import PermissionDenied
from core.models import BaseTimestampModel
from apps.plant_master.models import Workstation, MeasuringGauge
from apps.pdi_templates.models import InspectionTemplate, BlueprintPin
from apps.production_routing.models import DigitalTraveler, ProcessRouteStep


class InspectionSession(BaseTimestampModel):
    """
    Sections 5 & 6: Tablet-based guided inspection session locked to a verified
    Workstation QR and Traveler Barcode.
    """
    class OverallResult(models.TextChoices):
        IN_PROGRESS = 'IN_PROGRESS', 'Locked on Tablet - Inspection In Progress'
        PASSED = 'PASSED', '100% In Tolerance (GREEN)'
        FAILED_NON_CTQ = 'FAILED_NON_CTQ', 'Out of Tolerance - Eligible for Supervisor Review'
        FAILED_CTQ_FROZEN = 'FAILED_CTQ_FROZEN', 'CRITICAL (CTQ) Failure - Frozen & Quarantined'

    class ApprovalStatus(models.TextChoices):
        AWAITING_SUBMISSION = 'AWAITING_SUBMISSION', 'Open on Floor Tablet'
        PENDING_SUPERVISOR = 'PENDING_SUPERVISOR', 'Awaiting Shift Supervisor Review'
        APPROVED = 'APPROVED', 'Approved by Supervisor'
        CONCESSION_RELEASED = 'CONCESSION_RELEASED', 'Conditional Concession Granted'
        QUARANTINED_MRB = 'QUARANTINED_MRB', 'Rejected to Digital Rejection Holding Area (MRB)'

    session_code = models.CharField(max_length=60, unique=True, db_index=True)
    traveler = models.ForeignKey(DigitalTraveler, on_delete=models.CASCADE, related_name='inspections')
    operation_step = models.ForeignKey(ProcessRouteStep, on_delete=models.CASCADE, related_name='inspections')
    workstation = models.ForeignKey(Workstation, on_delete=models.PROTECT)
    template = models.ForeignKey(InspectionTemplate, on_delete=models.PROTECT)
    inspector = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='conducted_inspections'
    )

    station_qr_verified = models.BooleanField(default=False)
    traveler_qr_verified = models.BooleanField(default=False)
    is_locked_on_tablet = models.BooleanField(default=True)
    has_ctq_failure = models.BooleanField(default=False)
    overall_result = models.CharField(
        max_length=30, choices=OverallResult.choices, default=OverallResult.IN_PROGRESS
    )
    approval_status = models.CharField(
        max_length=30, choices=ApprovalStatus.choices, default=ApprovalStatus.AWAITING_SUBMISSION, db_index=True
    )

    inspector_remarks = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    synced_from_offline_cache = models.BooleanField(default=False)

    # Section 6.1: Supervisor Review & Conditional Concession fields
    reviewed_by_supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_inspections'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    concession_reason_code = models.CharField(max_length=80, blank=True)
    concession_engineering_justification = models.TextField(blank=True)

    def __str__(self):
        return f"{self.session_code} - {self.traveler.traveler_barcode} ({self.approval_status})"


class ParameterMeasurement(BaseTimestampModel):
    """
    Section 5.2 - 5.4: Individual pin measurement with instant tolerance evaluation,
    gauge calibration binding, and mandatory 2-photo defect evidence.
    """
    session = models.ForeignKey(InspectionSession, on_delete=models.CASCADE, related_name='measurements')
    pin = models.ForeignKey(BlueprintPin, on_delete=models.PROTECT)
    gauge_used = models.ForeignKey(MeasuringGauge, on_delete=models.PROTECT, null=True, blank=True)

    measured_numeric_value = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    visual_pass = models.BooleanField(null=True, blank=True)
    is_within_tolerance = models.BooleanField(default=True)
    indicator_color = models.CharField(max_length=10, default='GREEN', help_text="GREEN or RED")

    # Section 5.4: Mandatory minimum 2 defect photos when out of tolerance
    defect_photo_1_url = models.TextField(blank=True)
    defect_photo_2_url = models.TextField(blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('session', 'pin')
        ordering = ['pin__pin_number']

    def delete(self, *args, **kwargs):
        raise PermissionDenied("Section 12/13 Safeguard: Submitted inspection measurements cannot be deleted.")


class MRBDisposition(BaseTimestampModel):
    """
    Section 6.3: Material Review Board (MRB) Disposition Options for Quarantined Lots.
    """
    class DispositionChoice(models.TextChoices):
        REWORK_ORDER = 'REWORK_ORDER', 'Rework Order Generation (Corrective Machining)'
        SCRAP_DISPOSITION = 'SCRAP_DISPOSITION', 'Scrap Disposition (Write-off & Bin Verification)'
        RETURN_TO_VENDOR = 'RETURN_TO_VENDOR', 'Return to Vendor (RTV & Debit Note)'
        CUSTOMER_SPECIAL_CONCESSION = 'CUSTOMER_SPECIAL_CONCESSION', 'Customer Special Written Concession'

    mrb_code = models.CharField(max_length=60, unique=True, db_index=True)
    inspection_session = models.OneToOneField(
        InspectionSession, on_delete=models.CASCADE, related_name='mrb_disposition'
    )
    traveler = models.ForeignKey(DigitalTraveler, on_delete=models.CASCADE, related_name='mrb_records')
    disposition_action = models.CharField(max_length=40, choices=DispositionChoice.choices)
    engineering_directive = models.TextField(help_text="Rework routing instructions, scrap cost code, or customer approval ref")
    scrap_cost_code = models.CharField(max_length=60, blank=True)
    customer_written_approval_ref = models.CharField(max_length=120, blank=True)
    authorized_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    def __str__(self):
        return f"{self.mrb_code} -> {self.disposition_action}"
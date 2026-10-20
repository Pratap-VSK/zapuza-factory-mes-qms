from django.db import models
from django.conf import settings
from core.models import BaseTimestampModel
from apps.plant_master.models import PartMaster, MeasuringGauge


class InspectionTemplate(BaseTimestampModel):
    """
    Section 4.1: Central Template Design Studio with strict version control (Rev A, Rev B)
    and mandatory Quality Manager approval before shopfloor deployment.
    """
    class StageType(models.TextChoices):
        FIRST_PIECE = 'FIRST_PIECE', 'First-Piece Setup Inspection'
        HOURLY_IN_PROCESS = 'HOURLY_IN_PROCESS', 'Periodic Hourly In-Process Inspection'
        FINAL_PDI = 'FINAL_PDI', 'Final Pre-Dispatch Inspection (PDI)'

    class ApprovalStatus(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft - In Engineering Setup'
        PENDING_QM_APPROVAL = 'PENDING_QM_APPROVAL', 'Pending Quality Manager Approval'
        APPROVED_ACTIVE = 'APPROVED_ACTIVE', 'Approved & Deployed to Shopfloor'
        SUPERSEDED = 'SUPERSEDED', 'Superseded by Newer Revision'

    template_code = models.CharField(max_length=60, db_index=True)
    title = models.CharField(max_length=150)
    part = models.ForeignKey(PartMaster, on_delete=models.CASCADE, related_name='inspection_templates')
    operation_step_code = models.CharField(max_length=30, help_text="e.g., OP-10, OP-20, OP-50")
    stage_type = models.CharField(max_length=30, choices=StageType.choices, default=StageType.FINAL_PDI)
    revision_number = models.CharField(max_length=20, default='Rev A')

    blueprint_file = models.FileField(upload_to='blueprints/%Y/%m/', null=True, blank=True)
    blueprint_image_url = models.URLField(
        blank=True,
        help_text="High-res CAD/Blueprint image URL for interactive canvas pinning"
    )

    status = models.CharField(
        max_length=30, choices=ApprovalStatus.choices, default=ApprovalStatus.DRAFT, db_index=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='created_templates'
    )
    approved_by_qm = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_templates'
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('template_code', 'revision_number')
        ordering = ['-created_at']

    @property
    def is_locked_for_editing(self) -> bool:
        """Section 12 Safeguard: Quality Engineer cannot alter templates once released to active production."""
        return self.status in [self.ApprovalStatus.APPROVED_ACTIVE, self.ApprovalStatus.SUPERSEDED]

    def __str__(self):
        return f"{self.template_code} ({self.revision_number}) - {self.part.part_number}"


class BlueprintPin(BaseTimestampModel):
    """
    Section 4.1 & 4.3: Visual color-coded pins placed directly on blueprint drawings,
    linked to dimensional tolerances, required gauge types, and CTQ priority flags.
    """
    class InspectionType(models.TextChoices):
        DIMENSIONAL_TOLERANCE = 'DIMENSIONAL_TOLERANCE', 'Dimension with Plus/Minus Tolerance'
        MAX_THRESHOLD = 'MAX_THRESHOLD', 'Maximum Allowable Threshold (MAX)'
        MIN_THRESHOLD = 'MIN_THRESHOLD', 'Minimum Allowable Threshold (MIN)'
        VISUAL_PASS_FAIL = 'VISUAL_PASS_FAIL', 'Visual Pass/Fail Check (Yes/No)'

    template = models.ForeignKey(InspectionTemplate, on_delete=models.CASCADE, related_name='pins')
    pin_number = models.PositiveIntegerField(help_text="Sequential callout number on drawing (1, 2, 3...)")
    parameter_name = models.CharField(max_length=120, help_text="e.g., Shaft OD Diameter, Thread Pitch, Surface Roughness")

    # Relative Percentage Coordinates on Blueprint Canvas (0.00% to 100.00%)
    x_coord_percent = models.DecimalField(max_digits=5, decimal_places=2)
    y_coord_percent = models.DecimalField(max_digits=5, decimal_places=2)

    inspection_type = models.CharField(
        max_length=30, choices=InspectionType.choices, default=InspectionType.DIMENSIONAL_TOLERANCE
    )
    nominal_value = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    upper_tolerance = models.DecimalField(
        max_digits=10, decimal_places=4, null=True, blank=True, help_text="e.g., +0.05"
    )
    lower_tolerance = models.DecimalField(
        max_digits=10, decimal_places=4, null=True, blank=True, help_text="e.g., -0.02"
    )
    measurement_unit = models.CharField(max_length=20, default='mm')

    required_gauge_type = models.CharField(
        max_length=40,
        choices=MeasuringGauge.GaugeType.choices,
        default=MeasuringGauge.GaugeType.VERNIER_CALIPER
    )
    is_ctq = models.BooleanField(
        default=False,
        help_text="Section 4.3: Critical-to-Quality parameter (Orange highlight, freezes checklist on failure)"
    )

    class Meta:
        unique_together = ('template', 'pin_number')
        ordering = ['pin_number']

    @property
    def min_allowed_limit(self):
        if self.inspection_type == self.InspectionType.DIMENSIONAL_TOLERANCE and self.nominal_value is not None:
            return self.nominal_value + (self.lower_tolerance or 0)
        if self.inspection_type == self.InspectionType.MIN_THRESHOLD:
            return self.nominal_value
        return None

    @property
    def max_allowed_limit(self):
        if self.inspection_type == self.InspectionType.DIMENSIONAL_TOLERANCE and self.nominal_value is not None:
            return self.nominal_value + (self.upper_tolerance or 0)
        if self.inspection_type == self.InspectionType.MAX_THRESHOLD:
            return self.nominal_value
        return None

    def __str__(self):
        ctq_tag = " [CTQ]" if self.is_ctq else ""
        return f"Pin #{self.pin_number}: {self.parameter_name}{ctq_tag}"
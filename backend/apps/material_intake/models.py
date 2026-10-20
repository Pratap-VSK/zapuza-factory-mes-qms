from django.db import models
from django.conf import settings
from core.models import BaseTimestampModel
from core.crypto.qr_signer import TamperProofQRSigner


class RawMaterialIntake(BaseTimestampModel):
    """Section 3.1 & 3.2: Dock Receiving, Heat Lot Logging & MTC Verification."""
    class IntakeStatus(models.TextChoices):
        PENDING_MTC_REVIEW = 'PENDING_MTC_REVIEW', 'Pending QA MTC Verification'
        IN_LAB_TESTING = 'IN_LAB_TESTING', 'In Spectro Lab Testing'
        APPROVED_STOCK = 'APPROVED_STOCK', 'Cleared & Barcode Tagged for Production'
        SUPPLIER_QUARANTINE = 'SUPPLIER_QUARANTINE', 'Rejected - Supplier Quarantine (SNCR)'

    lot_tracking_number = models.CharField(max_length=50, unique=True, db_index=True)
    supplier_name = models.CharField(max_length=150)
    purchase_order_number = models.CharField(max_length=80, db_index=True)
    material_grade = models.CharField(max_length=80, help_text="e.g., EN24, AISI 4140")
    heat_number = models.CharField(max_length=80, db_index=True, help_text="e.g., H-8042")
    quantity_received = models.DecimalField(max_digits=10, decimal_places=2)
    unit_of_measure = models.CharField(max_length=20, default='KG')

    # Mandatory MTC Document & Certified Chemical/Mechanical Values (Section 3.2)
    mtc_document = models.FileField(upload_to='mtc_certificates/%Y/%m/', null=True, blank=True)
    mtc_reference_number = models.CharField(max_length=100)
    carbon_percentage = models.DecimalField(max_digits=5, decimal_places=3, null=True, blank=True)
    manganese_percentage = models.DecimalField(max_digits=5, decimal_places=3, null=True, blank=True)
    silicon_percentage = models.DecimalField(max_digits=5, decimal_places=3, null=True, blank=True)
    yield_strength_mpa = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    tensile_strength_mpa = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    hardness_hb = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    requires_spectro_lab_test = models.BooleanField(default=True)
    spectro_lab_passed = models.BooleanField(default=False)
    physical_dimensions_ok = models.BooleanField(default=True)

    status = models.CharField(
        max_length=30,
        choices=IntakeStatus.choices,
        default=IntakeStatus.PENDING_MTC_REVIEW,
        db_index=True
    )
    bundle_barcode_token = models.CharField(max_length=500, unique=True, blank=True)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='dock_intakes'
    )
    verified_by_qa = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_intakes'
    )

    def generate_weather_resistant_barcode(self):
        if not self.bundle_barcode_token:
            self.bundle_barcode_token = TamperProofQRSigner.generate_signed_token(
                entity_type="RAW_LOT",
                entity_id=str(self.id),
                metadata={"heat": self.heat_number, "grade": self.material_grade}
            )
            self.save(update_fields=['bundle_barcode_token'])

    def __str__(self):
        return f"{self.lot_tracking_number} | Heat: {self.heat_number} ({self.status})"


class SupplierNCR(BaseTimestampModel):
    """Section 3.3: Supplier Non-Conformance Report (SNCR) for Quarantined Stock."""
    sncr_number = models.CharField(max_length=50, unique=True, db_index=True)
    raw_material_intake = models.OneToOneField(
        RawMaterialIntake, on_delete=models.CASCADE, related_name='sncr_report'
    )
    failure_category = models.CharField(
        max_length=60,
        help_text="DIMENSION_FAILURE, SPECTRO_CHEMICAL_MISMATCH, MISSING_INVALID_MTC"
    )
    detailed_reason = models.TextField()
    raised_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    purchasing_notified = models.BooleanField(default=True)
    rtv_debit_note_issued = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.sncr_number} - Heat {self.raw_material_intake.heat_number}"
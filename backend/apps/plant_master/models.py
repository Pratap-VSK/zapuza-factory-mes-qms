from django.db import models
from django.conf import settings
from django.utils import timezone
from core.models import BaseTimestampModel
from core.crypto.qr_signer import TamperProofQRSigner


class FactorySite(BaseTimestampModel):
    """Section 2.1.1: Physical facility or plant floor section."""
    site_code = models.CharField(max_length=30, unique=True, db_index=True)
    name = models.CharField(max_length=120)
    department_type = models.CharField(
        max_length=60,
        help_text="e.g., Main Machining Shop, Heat Treatment Bay, Final Assembly Line"
    )
    location_description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.site_code} - {self.name}"


class Workstation(BaseTimestampModel):
    """Section 2.1.2 & 2.2: Individual production machinery & CNC stations."""
    class StationStatus(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active & Calibrated'
        PM_OVERDUE = 'PM_OVERDUE', 'Locked - Daily PM Overdue'
        MAINTENANCE = 'MAINTENANCE', 'Under Maintenance / Breakdown'

    station_code = models.CharField(max_length=40, unique=True, db_index=True)
    name = models.CharField(max_length=120, help_text="e.g., CNC Lathe #04, VMC Station #02")
    factory_site = models.ForeignKey(FactorySite, on_delete=models.CASCADE, related_name='workstations')
    machine_type = models.CharField(max_length=80)
    qr_code_token = models.CharField(max_length=500, unique=True, blank=True)
    status = models.CharField(max_length=30, choices=StationStatus.choices, default=StationStatus.PM_OVERDUE)
    last_pm_verified_at = models.DateTimeField(null=True, blank=True)
    last_pm_verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.qr_code_token:
            signed_qr = TamperProofQRSigner.generate_signed_token(
                entity_type="STATION",
                entity_id=str(self.id),
                metadata={"code": self.station_code}
            )
            Workstation.objects.filter(pk=self.pk).update(qr_code_token=signed_qr)
            self.qr_code_token = signed_qr

    @property
    def is_pm_valid_for_today(self) -> bool:
        if not self.last_pm_verified_at or self.status != self.StationStatus.ACTIVE:
            return False
        return self.last_pm_verified_at.date() == timezone.localdate()

    def __str__(self):
        return f"{self.station_code} ({self.name})"


class PartMaster(BaseTimestampModel):
    """Section 2.1.3: Physical hardware parts and manufactured components."""
    part_number = models.CharField(max_length=60, unique=True, db_index=True)
    part_name = models.CharField(max_length=150)
    customer_name = models.CharField(max_length=120)
    drawing_number = models.CharField(max_length=80)
    material_grade_spec = models.CharField(max_length=80, help_text="e.g., EN24, AISI 4140, SS316")
    approved_cnc_program = models.CharField(max_length=100, blank=True)
    fixture_setup_code = models.CharField(max_length=100, blank=True)
    standard_cycle_time_seconds = models.PositiveIntegerField(default=120)

    def __str__(self):
        return f"{self.part_number} - {self.part_name}"


class MeasuringGauge(BaseTimestampModel):
    """Section 2.1.4 & 2.3: Measuring Gauges & Equipment Register."""
    class GaugeType(models.TextChoices):
        VERNIER_CALIPER = 'VERNIER_CALIPER', 'Vernier Caliper'
        MICROMETER = 'MICROMETER', 'External/Internal Micrometer'
        HEIGHT_GAUGE = 'HEIGHT_GAUGE', 'Digital Height Gauge'
        THREAD_PLUG_GAUGE = 'THREAD_PLUG_GAUGE', 'Thread Plug / Ring Gauge'
        BORE_GAUGE = 'BORE_GAUGE', 'Dial Bore Gauge'
        CMM = 'CMM', 'Coordinate Measuring Machine (CMM)'
        ROUGHNESS_TESTER = 'ROUGHNESS_TESTER', 'Surface Roughness Tester'

    gauge_serial = models.CharField(max_length=60, unique=True, db_index=True, help_text="e.g., VC-104, PG-04")
    gauge_name = models.CharField(max_length=120)
    gauge_type = models.CharField(max_length=40, choices=GaugeType.choices)
    least_count = models.CharField(max_length=30, default="0.01 mm")
    last_calibrated_date = models.DateField()
    calibration_expiry_date = models.DateField(db_index=True)
    calibration_certificate_ref = models.CharField(max_length=100)
    assigned_station = models.ForeignKey(
        Workstation, on_delete=models.SET_NULL, null=True, blank=True, related_name='gauges'
    )
    is_blocked = models.BooleanField(default=False)

    @property
    def is_calibration_expired(self) -> bool:
        return self.is_blocked or (self.calibration_expiry_date < timezone.localdate())

    def __str__(self):
        return f"{self.gauge_serial} ({self.gauge_type}) - Exp: {self.calibration_expiry_date}"


class PMChecklistLog(BaseTimestampModel):
    """Section 2.2: Daily machine setup calibration and preventive maintenance sign-offs."""
    workstation = models.ForeignKey(Workstation, on_delete=models.CASCADE, related_name='pm_logs')
    operator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    shift = models.CharField(max_length=20)
    zero_point_verified = models.BooleanField(default=False)
    coolant_level_ok = models.BooleanField(default=False)
    lubrication_pressure_ok = models.BooleanField(default=False)
    safety_interlocks_tested = models.BooleanField(default=False)
    tooling_wear_inspected = models.BooleanField(default=False)
    remarks = models.TextField(blank=True)
    is_passed = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        self.is_passed = all([
            self.zero_point_verified,
            self.coolant_level_ok,
            self.lubrication_pressure_ok,
            self.safety_interlocks_tested,
            self.tooling_wear_inspected
        ])
        super().save(*args, **kwargs)
        if self.is_passed:
            self.workstation.status = Workstation.StationStatus.ACTIVE
            self.workstation.last_pm_verified_at = timezone.now()
            self.workstation.last_pm_verified_by = self.operator
            self.workstation.save(update_fields=['status', 'last_pm_verified_at', 'last_pm_verified_by'])
        else:
            self.workstation.status = Workstation.StationStatus.PM_OVERDUE
            self.workstation.save(update_fields=['status'])
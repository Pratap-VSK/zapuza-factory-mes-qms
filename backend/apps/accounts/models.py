from django.contrib.auth.models import AbstractUser
from django.db import models
from core.models import BaseTimestampModel


class CustomUser(AbstractUser, BaseTimestampModel):
    class PlantRole(models.TextChoices):
        PLANT_MANAGER = 'PLANT_MANAGER', 'Plant / General Manager'
        QUALITY_ENGINEER = 'QUALITY_ENGINEER', 'Quality Engineer'
        QUALITY_MANAGER = 'QUALITY_MANAGER', 'Quality Manager'
        SHIFT_SUPERVISOR = 'SHIFT_SUPERVISOR', 'Shift Supervisor'
        QA_INSPECTOR = 'QA_INSPECTOR', 'QA Floor Inspector'
        MACHINE_OPERATOR = 'MACHINE_OPERATOR', 'Machine Operator'
        DOCK_CLERK = 'DOCK_CLERK', 'Raw Material Dock & Dispatch Clerk'

    class ShiftChoices(models.TextChoices):
        MORNING = 'MORNING', 'Morning Shift (06:00 - 14:00)'
        EVENING = 'EVENING', 'Evening Shift (14:00 - 22:00)'
        NIGHT = 'NIGHT', 'Night Shift (22:00 - 06:00)'

    employee_code = models.CharField(max_length=40, unique=True, db_index=True)
    role = models.CharField(max_length=30, choices=PlantRole.choices, default=PlantRole.QA_INSPECTOR)
    assigned_shift = models.CharField(max_length=20, choices=ShiftChoices.choices, default=ShiftChoices.MORNING)
    department_name = models.CharField(max_length=100, blank=True)
    badge_qr_token = models.CharField(max_length=255, unique=True, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.employee_code} - {self.role})"


class TabletDeviceRegistry(BaseTimestampModel):
    """
    Registers rugged shopfloor tablets to specific plant departments.
    """
    device_serial = models.CharField(max_length=100, unique=True, db_index=True)
    device_name = models.CharField(max_length=100)
    assigned_department = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.device_name} [{self.device_serial}]"
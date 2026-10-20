import uuid
import hashlib
import json
from django.db import models
from django.conf import settings
from django.core.exceptions import PermissionDenied


class BaseTimestampModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ImmutableAuditLog(models.Model):
    """
    Section 13.3: Tamper-Proof System Audit Log.
    Records User ID, exact timestamp, IP address, device serial number,
    previous value, and new value. Cannot be updated or deleted.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='audit_entries'
    )
    user_role = models.CharField(max_length=50, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_serial = models.CharField(max_length=120, default='WEB-PORTAL', db_index=True)
    http_method = models.CharField(max_length=10)
    endpoint = models.CharField(max_length=255, db_index=True)
    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.CharField(max_length=100, blank=True, db_index=True)
    action = models.CharField(max_length=120)
    previous_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    status_code = models.PositiveSmallIntegerField(default=200)
    integrity_hash = models.CharField(max_length=64, editable=False, unique=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Immutable Audit Log'
        verbose_name_plural = 'Immutable Audit Logs'

    def save(self, *args, **kwargs):
        if self.pk and ImmutableAuditLog.objects.filter(pk=self.pk).exists():
            raise PermissionDenied("ISO/Aerospace Audit Safeguard: Past audit logs cannot be altered.")
        
        # Generate cryptographic hash chain
        prev_log = ImmutableAuditLog.objects.order_by('-timestamp').first()
        prev_hash = prev_log.integrity_hash if prev_log else 'GENESIS_ZAPUZA_QMS'
        payload = f"{prev_hash}|{self.user_id}|{self.device_serial}|{self.endpoint}|{json.dumps(self.new_value, sort_keys=True, default=str)}"
        self.integrity_hash = hashlib.sha256(payload.encode('utf-8')).hexdigest()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionDenied("ISO/Aerospace Audit Safeguard: Audit logs cannot be deleted.")
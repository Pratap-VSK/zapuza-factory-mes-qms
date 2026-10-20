from django.db import models
from django.conf import settings
from core.models import BaseTimestampModel
from core.crypto.qr_signer import TamperProofQRSigner
from apps.production_routing.models import DigitalTraveler


class DispatchManifest(BaseTimestampModel):
    """
    Sections 10 & 11: Shipping Gate Pass, Packing Slip & Printable Customer Verification QR Label.
    """
    manifest_number = models.CharField(max_length=60, unique=True, db_index=True)
    gate_pass_number = models.CharField(max_length=60, unique=True, db_index=True)
    traveler = models.ForeignKey(DigitalTraveler, on_delete=models.PROTECT, related_name='dispatch_manifests')
    customer_po_number = models.CharField(max_length=80)
    shipped_quantity = models.PositiveIntegerField()
    transport_vehicle_number = models.CharField(max_length=60)
    driver_contact = models.CharField(max_length=60, blank=True)

    # 3-Point Pre-Dispatch Verification Snapshot (Section 10.1)
    all_operations_completed = models.BooleanField(default=False)
    all_hold_timers_fulfilled = models.BooleanField(default=False)
    final_pdi_approved = models.BooleanField(default=False)

    crate_qr_token = models.CharField(max_length=500, unique=True, blank=True, db_index=True)
    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.crate_qr_token:
            token = TamperProofQRSigner.generate_signed_token(
                entity_type="CUSTOMER_COA_CRATE",
                entity_id=str(self.id),
                metadata={"manifest": self.manifest_number, "serial": self.traveler.serial_number}
            )
            DispatchManifest.objects.filter(pk=self.pk).update(crate_qr_token=token)
            self.crate_qr_token = token

    def __str__(self):
        return f"{self.manifest_number} | Gate Pass: {self.gate_pass_number}"
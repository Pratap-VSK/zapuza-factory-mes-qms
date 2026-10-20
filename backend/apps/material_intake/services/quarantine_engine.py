import uuid
from apps.material_intake.models import RawMaterialIntake, SupplierNCR
from core.exceptions import ShopfloorInterlockException


class MaterialQuarantineService:
    """
    Section 3.2 & 3.3: Enforces mandatory MTC verification, handles Spectro Lab clearances,
    and locks rejected stock into Supplier Quarantine with an automatic SNCR.
    """
    @staticmethod
    def approve_and_tag_lot(intake: RawMaterialIntake, qa_user) -> RawMaterialIntake:
        if not intake.mtc_reference_number:
            raise ShopfloorInterlockException(
                detail="MTC Verification Lock: Raw material lot cannot be cleared without a valid MTC reference and file.",
                interlock_type="MISSING_MTC_CERTIFICATE"
            )
        if intake.requires_spectro_lab_test and not intake.spectro_lab_passed:
            raise ShopfloorInterlockException(
                detail="Lab Hold Active: Material grade requires Spectro Lab clearance before barcode tagging.",
                interlock_type="SPECTRO_LAB_PENDING"
            )
        if not intake.physical_dimensions_ok:
            raise ShopfloorInterlockException(
                detail="Physical Dimension Failure: Cannot approve lot with failing physical receiving checks.",
                interlock_type="RECEIVING_DIMENSION_FAIL"
            )

        intake.status = RawMaterialIntake.IntakeStatus.APPROVED_STOCK
        intake.verified_by_qa = qa_user
        intake.save(update_fields=['status', 'verified_by_qa'])
        intake.generate_weather_resistant_barcode()
        return intake

    @staticmethod
    def reject_to_supplier_quarantine(
        intake: RawMaterialIntake, user, failure_category: str, detailed_reason: str
    ) -> SupplierNCR:
        intake.status = RawMaterialIntake.IntakeStatus.SUPPLIER_QUARANTINE
        intake.verified_by_qa = user
        intake.save(update_fields=['status', 'verified_by_qa'])

        sncr_code = f"SNCR-{intake.heat_number}-{str(uuid.uuid4())[:4].upper()}"
        sncr, _ = SupplierNCR.objects.update_or_create(
            raw_material_intake=intake,
            defaults={
                'sncr_number': sncr_code,
                'failure_category': failure_category,
                'detailed_reason': detailed_reason,
                'raised_by': user,
                'purchasing_notified': True,
            }
        )
        return sncr
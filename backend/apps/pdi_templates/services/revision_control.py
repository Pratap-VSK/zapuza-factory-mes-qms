from django.utils import timezone
from core.exceptions import ShopfloorInterlockException
from apps.pdi_templates.models import InspectionTemplate, BlueprintPin


class TemplateRevisionService:
    """
    Section 4.1 & 12: Enforces strict version control (Rev A -> Rev B) and prevents
    Quality Engineers from editing templates once deployed to active production.
    """
    @staticmethod
    def ensure_template_editable(template: InspectionTemplate):
        if template.is_locked_for_editing:
            raise ShopfloorInterlockException(
                detail=(
                    f"Revision Lock Active: Template {template.template_code} ({template.revision_number}) "
                    f"is already released to active production. Create a new revision (e.g., Rev B) to modify pins."
                ),
                interlock_type="TEMPLATE_REVISION_LOCKED"
            )

    @staticmethod
    def approve_template_by_qm(template: InspectionTemplate, qm_user) -> InspectionTemplate:
        if qm_user.role not in ['QUALITY_MANAGER', 'PLANT_MANAGER']:
            raise ShopfloorInterlockException(
                detail="Role Safeguard: Only a Quality Manager can approve templates for shopfloor deployment.",
                interlock_type="UNAUTHORIZED_QM_APPROVAL"
            )
        if not template.pins.exists():
            raise ShopfloorInterlockException(
                detail="Cannot approve an inspection template with zero blueprint pins configured.",
                interlock_type="EMPTY_BLUEPRINT_PINS"
            )

        # Mark older active revisions of the same template_code as SUPERSEDED
        InspectionTemplate.objects.filter(
            template_code=template.template_code,
            status=InspectionTemplate.ApprovalStatus.APPROVED_ACTIVE
        ).exclude(pk=template.pk).update(status=InspectionTemplate.ApprovalStatus.SUPERSEDED)

        template.status = InspectionTemplate.ApprovalStatus.APPROVED_ACTIVE
        template.approved_by_qm = qm_user
        template.approved_at = timezone.now()
        template.save(update_fields=['status', 'approved_by_qm', 'approved_at'])
        return template

    @staticmethod
    def clone_new_revision(old_template: InspectionTemplate, new_rev_label: str, qe_user) -> InspectionTemplate:
        new_template = InspectionTemplate.objects.create(
            template_code=old_template.template_code,
            title=old_template.title,
            part=old_template.part,
            operation_step_code=old_template.operation_step_code,
            stage_type=old_template.stage_type,
            revision_number=new_rev_label,
            blueprint_file=old_template.blueprint_file,
            blueprint_image_url=old_template.blueprint_image_url,
            status=InspectionTemplate.ApprovalStatus.DRAFT,
            created_by=qe_user,
        )
        for pin in old_template.pins.all():
            BlueprintPin.objects.create(
                template=new_template,
                pin_number=pin.pin_number,
                parameter_name=pin.parameter_name,
                x_coord_percent=pin.x_coord_percent,
                y_coord_percent=pin.y_coord_percent,
                inspection_type=pin.inspection_type,
                nominal_value=pin.nominal_value,
                upper_tolerance=pin.upper_tolerance,
                lower_tolerance=pin.lower_tolerance,
                measurement_unit=pin.measurement_unit,
                required_gauge_type=pin.required_gauge_type,
                is_ctq=pin.is_ctq,
            )
        return new_template
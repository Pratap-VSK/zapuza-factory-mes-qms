from django.utils import timezone
from core.exceptions import ShopfloorInterlockException
from apps.plant_master.models import MeasuringGauge


class ToolCalibrationGuardService:
    """
    Section 2.3: Cross-references the gauge serial against the master calibration register.
    If expired, blocks measurement entry and displays 'Expired Tool Calibration' error.
    """
    @staticmethod
    def verify_gauge_calibration(gauge_serial_or_id: str, required_gauge_type: str = None) -> MeasuringGauge:
        gauge = MeasuringGauge.objects.filter(
            gauge_serial__iexact=gauge_serial_or_id.strip()
        ).first() or MeasuringGauge.objects.filter(id=gauge_serial_or_id).first()

        if not gauge:
            raise ShopfloorInterlockException(
                detail=f"Unregistered Tool Error: Gauge '{gauge_serial_or_id}' not found in Master Calibration Register.",
                interlock_type="UNREGISTERED_GAUGE"
            )

        if gauge.is_calibration_expired:
            raise ShopfloorInterlockException(
                detail=(
                    f"Expired Tool Calibration: {gauge.gauge_serial} ({gauge.gauge_name}) expired on "
                    f"{gauge.calibration_expiry_date}. Measurement entry blocked. Obtain a calibrated tool from the tool crib."
                ),
                interlock_type="EXPIRED_TOOL_CALIBRATION",
                extra_data={
                    "gauge_serial": gauge.gauge_serial,
                    "gauge_type": gauge.gauge_type,
                    "expiry_date": str(gauge.calibration_expiry_date),
                    "today": str(timezone.localdate()),
                }
            )

        if required_gauge_type and gauge.gauge_type != required_gauge_type:
            raise ShopfloorInterlockException(
                detail=(
                    f"Incorrect Tool Type: Blueprint specifies '{required_gauge_type}', "
                    f"but scanned tool {gauge.gauge_serial} is '{gauge.gauge_type}'."
                ),
                interlock_type="GAUGE_TYPE_MISMATCH",
                extra_data={
                    "expected_type": required_gauge_type,
                    "scanned_type": gauge.gauge_type,
                }
            )

        return gauge
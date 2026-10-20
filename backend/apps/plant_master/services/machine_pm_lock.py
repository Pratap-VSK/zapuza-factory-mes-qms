from core.exceptions import ShopfloorInterlockException
from apps.plant_master.models import Workstation


class MachinePMInterlockService:
    """
    Section 2.2: Before an operator or inspector can select a job on their shopfloor tablet,
    verifies whether the machine's daily PM checklist and safety zero-point checks are completed.
    """
    @staticmethod
    def enforce_station_pm_ready(workstation: Workstation):
        if not workstation.is_pm_valid_for_today:
            raise ShopfloorInterlockException(
                detail=(
                    f"Station Lock Active: Daily Preventive Maintenance (PM) and Zero-Point Setup "
                    f"checks are overdue for {workstation.station_code} ({workstation.name}). "
                    f"Alert sent to Maintenance Supervisor."
                ),
                interlock_type="MACHINE_PM_OVERDUE",
                extra_data={
                    "station_id": str(workstation.id),
                    "station_code": workstation.station_code,
                    "status": workstation.status,
                    "last_pm_verified_at": workstation.last_pm_verified_at,
                }
            )
        return True
import { useEffect } from "react";
import { useAlertStore } from "@/stores/alertStore";
import { useDroneStore } from "@/stores/droneStore";
import { ARM_LABELS } from "@/utils/constants";

export function AlertHistory() {
  const alerts = useAlertStore((s) => s.alerts);
  const loadAlerts = useAlertStore((s) => s.loadAlerts);
  const selectedDrone = useDroneStore((s) => s.selectedDrone);

  useEffect(() => {
    loadAlerts(selectedDrone?.id);
  }, [selectedDrone, loadAlerts]);

  if (alerts.length === 0) {
    return <div className="text-gray-500 text-sm py-4">No alerts recorded</div>;
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-drone-panel rounded-lg p-3 border border-drone-border"
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-medium text-red-400">
                {alert.alert_type.replace("_", " ").toUpperCase()}
              </span>
              <p className="text-xs text-gray-400 mt-0.5">
                {ARM_LABELS[alert.arm_index]} — SF: {alert.safety_factor_value.toFixed(2)} / {alert.threshold}
              </p>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(alert.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

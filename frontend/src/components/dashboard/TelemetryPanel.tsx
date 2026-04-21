import { SafetyFactorGauge } from "@/components/dashboard/SafetyFactorGauge";
import { MaterialHealthBar } from "@/components/dashboard/MaterialHealthBar";
import { ThrustTorqueChart } from "@/components/dashboard/ThrustTorqueChart";
import type { DroneSnapshot, TelemetryPoint } from "@/types";
import { formatNewtons } from "@/utils/formatters";

interface TelemetryPanelProps {
  snapshot: DroneSnapshot | null;
  history: TelemetryPoint[];
}

export function TelemetryPanel({ snapshot, history }: TelemetryPanelProps) {
  if (!snapshot) {
    return (
      <div className="text-gray-500 text-center py-8">
        Esperando datos de telemetría...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Factor de Seguridad</h2>
        <div className="grid grid-cols-4 gap-3">
          {snapshot.arms.map((arm) => (
            <SafetyFactorGauge
              key={arm.arm_index}
              armIndex={arm.arm_index}
              value={arm.safety_factor}
            />
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Salud del Material</h2>
        <div className="grid grid-cols-4 gap-3">
          {snapshot.arms.map((arm) => (
            <MaterialHealthBar
              key={arm.arm_index}
              armIndex={arm.arm_index}
              degradation={arm.degradation_factor}
            />
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Salida de Motores</h2>
        <div className="grid grid-cols-2 gap-3">
          {snapshot.arms.map((arm) => (
            <div key={arm.arm_index} className="bg-drone-panel rounded-lg p-3 border border-drone-border">
              <span className="text-xs text-gray-400">Brazo {arm.arm_index}</span>
              <div className="flex gap-4 mt-1">
                <span className="text-sm text-blue-400">T: {formatNewtons(arm.thrust)}</span>
                <span className="text-sm text-amber-400">Q: {arm.torque.toFixed(4)} Nm</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ThrustTorqueChart data={history} armIndex={0} />
        <ThrustTorqueChart data={history} armIndex={1} />
      </div>
    </div>
  );
}

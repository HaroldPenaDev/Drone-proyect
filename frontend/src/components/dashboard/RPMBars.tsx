import { ARM_LABELS } from "@/utils/constants";
import type { ArmSnapshot } from "@/types";

interface RPMBarsProps {
  arms: ArmSnapshot[];
}

const MAX_RPM = 12000;

export function RPMBars({ arms }: RPMBarsProps) {
  return (
    <div className="bg-drone-panel rounded-lg p-4 border border-drone-border">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">RPM de Motores</h3>
      <div className="space-y-2">
        {arms.map((arm) => {
          const pct = Math.min((arm.rpm / MAX_RPM) * 100, 100);
          const color =
            pct > 80 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#22c55e";
          return (
            <div key={arm.arm_index}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">{ARM_LABELS[arm.arm_index]}</span>
                <span className="text-gray-200 font-mono">
                  {Math.round(arm.rpm)} RPM
                </span>
              </div>
              <div className="w-full h-3 bg-drone-dark rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-gray-500 mt-3 text-right">
        Máx: {MAX_RPM.toLocaleString()} RPM
      </div>
    </div>
  );
}

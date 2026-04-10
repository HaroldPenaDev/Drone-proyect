import { useState } from "react";
import { useDroneStore } from "@/stores/droneStore";
import { useTelemetry } from "@/hooks/useTelemetry";
import { ThrustTorqueChart } from "@/components/dashboard/ThrustTorqueChart";
import { DegradationChart } from "@/components/dashboard/DegradationChart";
import { AlertHistory } from "@/components/alerts/AlertHistory";

const TIME_RANGES = [
  { label: "1h", value: "-1h" },
  { label: "6h", value: "-6h" },
  { label: "24h", value: "-24h" },
  { label: "7d", value: "-7d" },
] as const;

export function HistoryPage() {
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const { history, loadHistory } = useTelemetry(selectedDrone?.id ?? null);
  const [selectedRange, setSelectedRange] = useState("-1h");
  const [selectedArm, setSelectedArm] = useState(0);

  const handleRangeChange = async (range: string) => {
    setSelectedRange(range);
    await loadHistory(range);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">History</h2>
        <div className="flex gap-2">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => handleRangeChange(range.value)}
              className={`px-3 py-1 text-xs rounded ${
                selectedRange === range.value
                  ? "bg-drone-primary text-white"
                  : "bg-drone-panel text-gray-400 border border-drone-border hover:text-white"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 mb-2">
        {[0, 1, 2, 3].map((arm) => (
          <button
            key={arm}
            onClick={() => setSelectedArm(arm)}
            className={`px-3 py-1 text-xs rounded ${
              selectedArm === arm
                ? "bg-drone-primary text-white"
                : "bg-drone-panel text-gray-400 border border-drone-border"
            }`}
          >
            Arm {arm}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ThrustTorqueChart data={history} armIndex={selectedArm} />
        <DegradationChart data={history} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          Alert History
        </h3>
        <AlertHistory />
      </div>
    </div>
  );
}

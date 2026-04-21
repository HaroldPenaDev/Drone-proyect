import { useEffect, useState } from "react";
import type { DroneKpis } from "@/types";
import { apiClient } from "@/api/client";

interface KPICardsProps {
  droneId: string | null;
}

const formatFlightTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

export function KPICards({ droneId }: KPICardsProps) {
  const [kpis, setKpis] = useState<DroneKpis | null>(null);

  useEffect(() => {
    if (!droneId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const response = await apiClient.get<DroneKpis>(`/kpis/${droneId}`);
        if (!cancelled) setKpis(response.data);
      } catch {
        /* silent */
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [droneId]);

  const cards = [
    {
      label: "Tiempo de vuelo",
      value: kpis ? formatFlightTime(kpis.flight_time_seconds) : "—",
      color: "text-blue-400",
    },
    {
      label: "Misiones completadas",
      value: kpis ? kpis.missions_completed.toString() : "—",
      color: "text-green-400",
    },
    {
      label: "Peor Safety Factor",
      value: kpis ? kpis.worst_safety_factor.toFixed(2) : "—",
      color:
        kpis && kpis.worst_safety_factor < 1.5
          ? "text-red-400"
          : kpis && kpis.worst_safety_factor < 3
          ? "text-amber-400"
          : "text-green-400",
    },
    {
      label: "Ciclos totales",
      value: kpis ? kpis.total_cycles.toLocaleString() : "—",
      color: "text-gray-200",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-drone-panel rounded-lg p-3 border border-drone-border"
        >
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {c.label}
          </div>
          <div className={`text-xl font-mono font-bold ${c.color} mt-1`}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

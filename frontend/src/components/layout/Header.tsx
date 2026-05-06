import { useDroneStore } from "@/stores/droneStore";
import { useAlertStore } from "@/stores/alertStore";
import type { Drone } from "@/types";

export function Header() {
  const drones = useDroneStore((s) => s.drones);
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const selectDrone = useDroneStore((s) => s.selectDrone);
  const unreadCount = useAlertStore((s) => s.unreadCount);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const drone = drones.find((d: Drone) => d.id === e.target.value) ?? null;
    selectDrone(drone);
  };

  return (
    <header className="h-14 bg-drone-panel border-b border-drone-border flex items-center justify-between px-6">
      <h1 className="text-lg font-bold text-white">Drone Digital Twin</h1>
      <div className="flex items-center gap-4">
        <select
          className="bg-drone-dark border border-drone-border rounded px-3 py-1 text-sm text-white"
          value={selectedDrone?.id ?? ""}
          onChange={handleSelect}
        >
          {drones.map((d: Drone) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <div className="relative">
          <span className="text-xl cursor-pointer">&#128276;</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-drone-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

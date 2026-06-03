import { Bell, ChevronDown, Plane } from "lucide-react";
import { useDroneStore } from "@/stores/droneStore";
import { useAlertStore } from "@/stores/alertStore";
import type { Drone } from "@/types";
import { Badge } from "@/components/ui";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useT, useLangStore } from "@/i18n";

export function Header() {
  const drones = useDroneStore((s) => s.drones);
  const selectedDrone = useDroneStore((s) => s.selectedDrone);
  const selectDrone = useDroneStore((s) => s.selectDrone);
  const unreadCount = useAlertStore((s) => s.unreadCount);
  const t = useT();
  const lang = useLangStore((s) => s.lang);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const drone = drones.find((d: Drone) => d.id === e.target.value) ?? null;
    selectDrone(drone);
  };

  return (
    <header className="h-14 border-b border-white/[0.06] bg-ink-50/40 backdrop-blur-md flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <Badge tone="good" pulse>
          {t("common.live")}
        </Badge>
        <div className="text-[11px] text-ink-500 font-mono">
          {new Date().toLocaleString(lang, {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {selectedDrone && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
            <Plane size={14} className="text-accent" strokeWidth={2} />
            <div className="text-[11px] leading-tight">
              <div className="text-ink-500 font-mono">
                {selectedDrone.mass_kg}kg · {(selectedDrone.arm_length_m * 100).toFixed(0)}cm
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <select
            className="appearance-none bg-white/[0.03] border border-white/5 hover:border-white/15 transition-colors rounded-lg pl-3 pr-8 py-1.5 text-[13px] text-white font-display font-medium focus:outline-none focus:border-accent/40"
            value={selectedDrone?.id ?? ""}
            onChange={handleSelect}
          >
            {drones.length === 0 && <option value="">{t("common.noDrones")}</option>}
            {drones.map((d: Drone) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none"
          />
        </div>

        <LanguageToggle />

        <button className="relative p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
          <Bell size={16} className="text-ink-500" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-crit text-white text-[9px] font-bold font-mono rounded-full flex items-center justify-center shadow-glow-crit">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

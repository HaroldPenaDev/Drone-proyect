import { safetyFactorToHex } from "@/components/drone-viewer/thermal";
import { useT } from "@/i18n";

const STOPS = [1.5, 2, 3, 5, 8, 10];

export function ThermalLegend() {
  const t = useT();
  return (
    <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="eyebrow-accent">{t("scene.thermal")}</span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, ${STOPS.map((s) => safetyFactorToHex(s)).join(", ")})`,
          }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[9px] font-mono text-ink-500">
        {STOPS.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>
    </div>
  );
}

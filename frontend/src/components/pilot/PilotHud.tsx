import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
import { useT } from "@/i18n";

interface PilotHudProps {
  onReset: () => void;
}

function Cap({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[26px] h-[26px] px-1.5 rounded-md bg-white/[0.06] border border-white/15 text-[11px] font-mono font-semibold text-white shadow-sm">
      {children}
    </span>
  );
}

/**
 * Superposición sobre la escena: ayuda de teclas y botón de reinicio.
 * Pensado para colocarse en un contenedor `relative`.
 */
export function PilotHud({ onReset }: PilotHudProps) {
  const t = useT();

  const rows: [ReactNode, string][] = [
    [
      <>
        <Cap>W</Cap>
        <Cap>S</Cap>
      </>,
      t("pilot.keys.pitch"),
    ],
    [
      <>
        <Cap>A</Cap>
        <Cap>D</Cap>
      </>,
      t("pilot.keys.roll"),
    ],
    [
      <>
        <Cap>↑</Cap>
        <Cap>↓</Cap>
      </>,
      t("pilot.keys.climb"),
    ],
    [
      <>
        <Cap>←</Cap>
        <Cap>→</Cap>
      </>,
      t("pilot.keys.yaw"),
    ],
    [<Cap>Space</Cap>, t("pilot.keys.stabilize")],
    [<Cap>R</Cap>, t("pilot.keys.reset")],
  ];

  return (
    <div className="absolute top-4 left-4 w-[208px] surface !bg-ink-50/70 backdrop-blur-md p-3.5 pointer-events-auto">
      <div className="flex items-center justify-between mb-2.5">
        <span className="eyebrow-accent">{t("pilot.keys.title")}</span>
      </div>
      <div className="space-y-1.5">
        {rows.map(([caps, label], i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex gap-1">{caps}</div>
            <span className="text-[11px] text-ink-500">{label}</span>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        icon={<RotateCcw size={13} />}
        onClick={onReset}
        className="w-full mt-3 justify-center"
      >
        {t("pilot.reset")}
      </Button>
    </div>
  );
}

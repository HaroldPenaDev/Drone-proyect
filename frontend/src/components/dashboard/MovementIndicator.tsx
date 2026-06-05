import {
  ArrowDown,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Pause,
  RotateCcw,
  RotateCw,
  type LucideIcon,
} from "lucide-react";
import { Surface } from "@/components/ui";
import { useT, type TranslationKey } from "@/i18n";

interface MovementIndicatorProps {
  movement: string;
  missionActive: boolean;
}

const MOVEMENT_LABEL_KEYS: Record<string, TranslationKey> = {
  hover: "move.hover",
  ascend: "move.ascend",
  descend: "move.descend",
  left: "move.left",
  right: "move.right",
  forward: "move.forward",
  backward: "move.backward",
  clockwise: "move.clockwise",
  counterclockwise: "move.counterclockwise",
};

const MOVEMENT_ICONS: Record<string, LucideIcon> = {
  hover: Pause,
  ascend: ArrowUp,
  descend: ArrowDown,
  left: ArrowLeft,
  right: ArrowRight,
  forward: ArrowUpRight,
  backward: ArrowDownLeft,
  clockwise: RotateCw,
  counterclockwise: RotateCcw,
};

export function MovementIndicator({
  movement,
  missionActive,
}: MovementIndicatorProps) {
  const t = useT();
  const labelKey = MOVEMENT_LABEL_KEYS[movement];
  
  let label = labelKey ? t(labelKey) : movement;
  let Icon = MOVEMENT_ICONS[movement] ?? Pause;

  if (!labelKey) {
    try {
      const parsed = JSON.parse(movement);
      if (parsed.type === "motor_test") {
        label = "Prueba de Motores";
        Icon = RotateCw; // or any suitable icon
      } else if (parsed.type === "flight_config") {
        label = t("status.flying");
        Icon = Pause;
      }
    } catch {
      // not JSON
    }
  }

  const tone = missionActive ? "good" : "default";

  return (
    <Surface tone={tone} padded>
      <div className="flex items-center gap-4">
        <div
          className={`relative flex items-center justify-center w-14 h-14 rounded-xl ${
            missionActive
              ? "bg-good/15 ring-1 ring-good/30"
              : "bg-white/[0.03] ring-1 ring-white/10"
          }`}
        >
          <Icon
            size={26}
            strokeWidth={1.75}
            className={missionActive ? "text-good" : "text-ink-500"}
          />
          {missionActive && (
            <span className="absolute inset-0 rounded-xl bg-good/20 animate-pulse-soft" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="eyebrow">{t("dashboard.movement.label")}</div>
          <div className="font-display text-xl font-semibold text-white mt-0.5">
            {label}
          </div>
        </div>
        <div className="shrink-0">
          {missionActive ? (
            <span className="badge badge-good">
              <span className="live-dot" />
              {t("status.flying")}
            </span>
          ) : (
            <span className="badge badge-neutral">{t("status.idle")}</span>
          )}
        </div>
      </div>
    </Surface>
  );
}

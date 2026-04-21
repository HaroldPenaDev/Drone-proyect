interface MovementIndicatorProps {
  movement: string;
  missionActive: boolean;
}

const MOVEMENT_LABELS: Record<string, string> = {
  hover: "Flotando",
  ascend: "Ascendiendo",
  descend: "Descendiendo",
  left: "Izquierda",
  right: "Derecha",
  forward: "Adelante",
  backward: "Atrás",
  clockwise: "Giro horario",
  counterclockwise: "Giro antihorario",
};

const MOVEMENT_ICONS: Record<string, string> = {
  hover: "⏸",
  ascend: "⬆",
  descend: "⬇",
  left: "⬅",
  right: "➡",
  forward: "↑",
  backward: "↓",
  clockwise: "↻",
  counterclockwise: "↺",
};

export function MovementIndicator({ movement, missionActive }: MovementIndicatorProps) {
  const label = MOVEMENT_LABELS[movement] ?? movement;
  const icon = MOVEMENT_ICONS[movement] ?? "•";
  const borderColor = missionActive ? "border-green-500" : "border-drone-border";
  const textColor = missionActive ? "text-green-400" : "text-gray-400";
  const bgColor = missionActive ? "bg-green-900/20" : "bg-drone-panel";
  const pulse = missionActive ? "animate-pulse" : "";

  return (
    <div
      className={`${bgColor} ${borderColor} ${pulse} border-2 rounded-lg p-4 flex items-center gap-4`}
    >
      <div className="text-4xl">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-gray-500 uppercase tracking-wide">
          Movimiento actual
        </div>
        <div className={`text-xl font-semibold ${textColor}`}>{label}</div>
      </div>
      <div
        className={`px-3 py-1 rounded text-xs font-medium ${
          missionActive
            ? "bg-green-800 text-green-200"
            : "bg-drone-dark text-gray-400"
        }`}
      >
        {missionActive ? "Misión en curso" : "Reposo"}
      </div>
    </div>
  );
}

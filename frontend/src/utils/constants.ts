export const SAFETY_FACTOR_THRESHOLD = 1.5;

export const ARM_LABELS: readonly string[] = [
  "Frontal-Derecho",
  "Frontal-Izquierdo",
  "Trasero-Izquierdo",
  "Trasero-Derecho",
];

export const STATUS_COLORS = {
  safe: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
} as const;

export const MAX_THRUST_NEWTONS = 8.0;
export const MAX_TORQUE_NM = 0.8;

export const CHART_HISTORY_POINTS = 120;

export const WEBSOCKET_RECONNECT_BASE_MS = 1000;
export const WEBSOCKET_RECONNECT_MAX_MS = 30000;

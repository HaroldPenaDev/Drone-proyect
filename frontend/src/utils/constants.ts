import type { TranslationKey } from "@/i18n";

export const SAFETY_FACTOR_THRESHOLD = 1.5;

/**
 * @deprecated Use ARM_LABEL_KEYS with `useT()` for localized labels.
 * Kept for back-compat; resolves to English position descriptors.
 */
export const ARM_LABELS: readonly string[] = [
  "Front-Right",
  "Front-Left",
  "Rear-Left",
  "Rear-Right",
];

/** Translation keys for arm labels, indexed by arm_index 0..3. */
export const ARM_LABEL_KEYS: readonly TranslationKey[] = [
  "arms.frontRight",
  "arms.frontLeft",
  "arms.rearLeft",
  "arms.rearRight",
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

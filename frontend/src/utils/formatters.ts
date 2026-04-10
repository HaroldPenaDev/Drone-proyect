import { SAFETY_FACTOR_THRESHOLD, STATUS_COLORS } from "@/utils/constants";

export function getSafetyColor(safetyFactor: number): string {
  if (safetyFactor >= SAFETY_FACTOR_THRESHOLD * 1.5) {
    return STATUS_COLORS.safe;
  }
  if (safetyFactor >= SAFETY_FACTOR_THRESHOLD) {
    return STATUS_COLORS.warning;
  }
  return STATUS_COLORS.danger;
}

export function formatNewtons(value: number): string {
  return `${value.toFixed(2)} N`;
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleTimeString();
}

/**
 * Utilidades para el formato de movimientos de misión "acción:segundos".
 * Retrocompatible: una acción sin ":" no tiene duración asignada (el
 * simulador usa su valor por defecto).
 */

export interface ParsedMovement {
  action: string;
  seconds: number | null;
}

export function parseMovement(raw: string): ParsedMovement {
  const idx = raw.indexOf(":");
  if (idx === -1) return { action: raw, seconds: null };
  const secs = Number(raw.slice(idx + 1));
  return {
    action: raw.slice(0, idx),
    seconds: Number.isFinite(secs) ? secs : null,
  };
}

/** "hover:3" -> "hover (3s)" ; "hover" -> "hover". */
export function formatMovement(raw: string): string {
  const { action, seconds } = parseMovement(raw);
  return seconds != null ? `${action} (${seconds}s)` : action;
}

export function encodeMovement(action: string, seconds: number): string {
  return `${action}:${seconds}`;
}

/** ¿El elemento es un token de configuración JSON (motor_test / flight_config)? */
export function isConfigToken(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw);
    return !!parsed && typeof parsed === "object" && "type" in parsed;
  } catch {
    return false;
  }
}

/** Devuelve solo las acciones reales, omitiendo un token de config inicial. */
export function actionMovements(movements: string[]): string[] {
  if (movements.length > 0 && isConfigToken(movements[0])) return movements.slice(1);
  return movements;
}

/** Perfil de eficiencia (%) embebido en la misión, o null si no hay. */
export function missionMotorProfile(movements: string[]): number[] | null {
  if (movements.length === 0) return null;
  try {
    const parsed = JSON.parse(movements[0]);
    if (parsed?.type === "flight_config" && Array.isArray(parsed.eff)) {
      return parsed.eff.map((e: number) => Math.round(Number(e) * 100));
    }
  } catch {
    /* no es config */
  }
  return null;
}

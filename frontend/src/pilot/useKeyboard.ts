import { useEffect, useRef } from "react";
import type { ControlInput } from "@/pilot/PilotEngine";

/**
 * Captura el teclado y mantiene un comando de control [-1..1] en un ref
 * (sin re-render por tecla). Mapeo estilo dron asistido:
 *
 *   W / S        adelante / atrás
 *   A / D        ladear izquierda / derecha
 *   ↑ / ↓        subir / bajar
 *   ← / →        girar (yaw)
 *   Espacio      estabilizar (suelta todos los ejes)
 *   R            reiniciar (vía onReset)
 *
 * Devuelve un ref al comando actual para que el loop de física lo lea.
 */
export function useKeyboard(onReset?: () => void) {
  const input = useRef<ControlInput>({ pitch: 0, roll: 0, yaw: 0, climb: 0 });
  const keys = useRef<Set<string>>(new Set());
  const resetRef = useRef<(() => void) | undefined>(onReset);
  resetRef.current = onReset;

  useEffect(() => {
    const recompute = () => {
      const k = keys.current;
      const space = k.has("Space");
      input.current = {
        pitch: space ? 0 : (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0),
        roll: space ? 0 : (k.has("KeyA") ? 1 : 0) - (k.has("KeyD") ? 1 : 0),
        yaw: space ? 0 : (k.has("ArrowLeft") ? 1 : 0) - (k.has("ArrowRight") ? 1 : 0),
        climb: space ? 0 : (k.has("ArrowUp") ? 1 : 0) - (k.has("ArrowDown") ? 1 : 0),
      };
    };

    const TRACKED = new Set([
      "KeyW", "KeyS", "KeyA", "KeyD",
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Space",
    ]);

    const down = (e: KeyboardEvent) => {
      if (e.code === "KeyR") {
        resetRef.current?.();
        return;
      }
      if (!TRACKED.has(e.code)) return;
      e.preventDefault(); // evita scroll con flechas/espacio
      keys.current.add(e.code);
      recompute();
    };
    const up = (e: KeyboardEvent) => {
      if (!TRACKED.has(e.code)) return;
      e.preventDefault();
      keys.current.delete(e.code);
      recompute();
    };
    // Si la ventana pierde foco, suelta todo (evita "teclas pegadas").
    const blur = () => {
      keys.current.clear();
      recompute();
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return input;
}

import { create } from "zustand";

/**
 * Estado del clima/viento del pilotaje. Lo configura el usuario con botones
 * (presets de clima + dirección) y el PilotEngine lo lee cada frame.
 *   dir   = grados hacia donde sopla el viento
 *   speed = m/s (magnitud base)
 *   gust  = 0..1 intensidad de ráfagas
 */
interface WindState {
  dir: number;
  speed: number;
  gust: number;
  setDir: (deg: number) => void;
  setWeather: (speed: number, gust: number) => void;
}

export const useWindStore = create<WindState>((set) => ({
  dir: 0,
  speed: 0,
  gust: 0,
  setDir: (dir) => set({ dir: ((dir % 360) + 360) % 360 }),
  setWeather: (speed, gust) => set({ speed, gust }),
}));

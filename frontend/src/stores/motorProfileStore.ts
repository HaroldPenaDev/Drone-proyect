import { create } from "zustand";

/**
 * Perfil de motores compartido: eficiencia/potencia (%) de cada motor, donde
 * 100 = motor sano. Persiste en localStorage para que NO se reinicie al
 * cambiar de pestaña ni al recargar. La Misión de Vuelo lo embebe para que la
 * simulación use motores desiguales (desgaste/desbalance realista).
 */

const STORAGE_KEY = "ddt.motorProfile";
const DEFAULT: number[] = [100, 100, 100, 100];

function clampPct(v: number): number {
  return Math.max(0, Math.min(150, Math.round(v)));
}

function persist(values: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    /* ignore */
  }
}

function load(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === 4) return arr.map((n) => clampPct(Number(n)));
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT];
}

interface MotorProfileState {
  efficiency: number[]; // % por motor (100 = sano)
  setMotor: (index: number, value: number) => void;
  setAll: (values: number[]) => void;
  reset: () => void;
}

export const useMotorProfileStore = create<MotorProfileState>((set, get) => ({
  efficiency: load(),
  setMotor: (index, value) => {
    const next = [...get().efficiency];
    next[index] = clampPct(value);
    persist(next);
    set({ efficiency: next });
  },
  setAll: (values) => {
    const next = values.map(clampPct);
    persist(next);
    set({ efficiency: next });
  },
  reset: () => {
    persist([...DEFAULT]);
    set({ efficiency: [...DEFAULT] });
  },
}));

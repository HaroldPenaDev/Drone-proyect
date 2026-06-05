/**
 * Grabador de vuelo del módulo de pilotaje. Acumula muestras de telemetría a
 * ~10 Hz mientras está activo, y genera CSV tanto legible (para descargar)
 * como en el formato que entiende el endpoint /ingest (para guardar en el
 * sistema y verlo en Análisis / Reproducción).
 */

export interface FlightSample {
  t: number; // segundos desde el inicio de la grabación
  altitude: number;
  x: number;
  z: number;
  vSpeed: number;
  gSpeed: number;
  roll: number; // rad
  pitch: number; // rad
  yaw: number; // rad
  throttle: number;
  totalThrust: number;
  worstSf: number;
  thrust: number[];
  rpm: number[];
  sf: number[];
}

const SAMPLE_INTERVAL_S = 0.1; // 10 Hz
const MAX_SAMPLES = 6000; // ~10 min

class FlightRecorder {
  recording = false;
  samples: FlightSample[] = [];
  private elapsed = 0;
  private lastSampleAt = -1;

  start(): void {
    this.recording = true;
    this.samples = [];
    this.elapsed = 0;
    this.lastSampleAt = -1;
  }

  stop(): void {
    this.recording = false;
  }

  /** Llamar cada frame; muestrea a ritmo fijo si está grabando. */
  tick(dt: number, build: (t: number) => FlightSample): void {
    if (!this.recording) return;
    this.elapsed += dt;
    if (this.elapsed - this.lastSampleAt >= SAMPLE_INTERVAL_S) {
      this.lastSampleAt = this.elapsed;
      this.samples.push(build(this.elapsed));
      if (this.samples.length > MAX_SAMPLES) this.samples.shift();
    }
  }

  get count(): number {
    return this.samples.length;
  }
  get duration(): number {
    return this.elapsed;
  }
}

export const flightRecorder = new FlightRecorder();

const toDeg = (r: number) => (r * 180) / Math.PI;

/** CSV legible para análisis humano (Excel): todos los datos, ángulos en grados. */
export function buildHumanCSV(samples: FlightSample[]): string {
  const header =
    "t_s,altitude_m,x_m,z_m,vspeed_ms,gspeed_ms,roll_deg,pitch_deg,yaw_deg," +
    "throttle_pct,total_thrust_N,worst_sf," +
    "thrust0,thrust1,thrust2,thrust3,rpm0,rpm1,rpm2,rpm3,sf0,sf1,sf2,sf3";
  const rows = samples.map((s) =>
    [
      s.t.toFixed(2),
      s.altitude.toFixed(3),
      s.x.toFixed(3),
      s.z.toFixed(3),
      s.vSpeed.toFixed(3),
      s.gSpeed.toFixed(3),
      toDeg(s.roll).toFixed(2),
      toDeg(s.pitch).toFixed(2),
      toDeg(s.yaw).toFixed(2),
      s.throttle.toFixed(1),
      s.totalThrust.toFixed(3),
      s.worstSf.toFixed(3),
      ...s.thrust.map((v) => v.toFixed(3)),
      ...s.rpm.map((v) => v.toFixed(0)),
      ...s.sf.map((v) => v.toFixed(3)),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

/** CSV en el formato del endpoint /ingest (thrust por motor + actitud en rad). */
export function buildIngestCSV(samples: FlightSample[], baseEpochSec: number): string {
  const header = "timestamp,thrust_0,thrust_1,thrust_2,thrust_3,altitude,roll,pitch,yaw";
  const rows = samples.map((s) =>
    [
      (baseEpochSec + s.t).toFixed(3),
      ...s.thrust.map((v) => v.toFixed(4)),
      s.altitude.toFixed(4),
      s.roll.toFixed(5),
      s.pitch.toFixed(5),
      s.yaw.toFixed(5),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

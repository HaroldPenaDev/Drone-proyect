import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useRef } from "react";

interface AltitudeCardProps {
  altitude: number;
  yaw: number;
  roll: number;
  pitch: number;
}

interface AltPoint {
  t: number;
  alt: number;
}

const MAX_POINTS = 60;
const altitudeHistory: AltPoint[] = [];

export function AltitudeCard({ altitude, yaw, roll, pitch }: AltitudeCardProps) {
  const counter = useRef(0);

  useEffect(() => {
    counter.current += 1;
    altitudeHistory.push({ t: counter.current, alt: Number(altitude.toFixed(2)) });
    if (altitudeHistory.length > MAX_POINTS) altitudeHistory.shift();
  }, [altitude]);

  return (
    <div className="bg-drone-panel rounded-lg p-4 border border-drone-border">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-300">Altitud y Orientación</h3>
          <div className="mt-2 text-3xl font-mono font-bold text-blue-400">
            {altitude.toFixed(2)} <span className="text-sm text-gray-500">m</span>
          </div>
        </div>
        <div className="text-right text-xs space-y-1">
          <div>
            <span className="text-gray-500">Yaw:</span>{" "}
            <span className="text-gray-200 font-mono">{(yaw * 57.2958).toFixed(1)}°</span>
          </div>
          <div>
            <span className="text-gray-500">Pitch:</span>{" "}
            <span className="text-gray-200 font-mono">{(pitch * 57.2958).toFixed(1)}°</span>
          </div>
          <div>
            <span className="text-gray-500">Roll:</span>{" "}
            <span className="text-gray-200 font-mono">{(roll * 57.2958).toFixed(1)}°</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={[...altitudeHistory]}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#94a3b8" }} hide />
          <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", fontSize: 11 }} />
          <Line type="monotone" dataKey="alt" stroke="#3b82f6" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

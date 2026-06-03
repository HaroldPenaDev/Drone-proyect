import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useRef } from "react";
import { Mountain } from "lucide-react";
import { Surface } from "@/components/ui";
import { useT } from "@/i18n";

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

const MAX_POINTS = 80;
const altitudeHistory: AltPoint[] = [];
const RAD_TO_DEG = 57.2958;

export function AltitudeCard({ altitude, yaw, roll, pitch }: AltitudeCardProps) {
  const counter = useRef(0);
  const t = useT();

  useEffect(() => {
    counter.current += 1;
    altitudeHistory.push({ t: counter.current, alt: Number(altitude.toFixed(2)) });
    if (altitudeHistory.length > MAX_POINTS) altitudeHistory.shift();
  }, [altitude]);

  return (
    <Surface padded>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="eyebrow flex items-center gap-1.5">
            <Mountain size={11} strokeWidth={1.75} />
            {t("dashboard.altitude.title")}
          </div>
          <div className="hero-number text-accent mt-1">
            {altitude.toFixed(2)}
            <span className="text-sm text-ink-500 ml-1">m</span>
          </div>
        </div>
        <div className="text-right text-[11px] space-y-0.5 font-mono">
          <div>
            <span className="text-ink-500 mr-1">YAW</span>
            <span className="text-white">{(yaw * RAD_TO_DEG).toFixed(1)}°</span>
          </div>
          <div>
            <span className="text-ink-500 mr-1">PITCH</span>
            <span className="text-white">{(pitch * RAD_TO_DEG).toFixed(1)}°</span>
          </div>
          <div>
            <span className="text-ink-500 mr-1">ROLL</span>
            <span className="text-white">{(roll * RAD_TO_DEG).toFixed(1)}°</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={[...altitudeHistory]}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1c2230" />
          <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#3a4254" }} hide />
          <YAxis
            tick={{ fontSize: 9, fill: "#3a4254" }}
            domain={["auto", "auto"]}
            width={28}
          />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="alt"
            stroke="#22d3ee"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Surface>
  );
}

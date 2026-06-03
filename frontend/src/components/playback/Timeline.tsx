import { useEffect, useRef } from "react";
import type { TelemetryPoint } from "@/types";
import { safetyFactorToHex } from "@/components/drone-viewer/thermal";

interface TimelineProps {
  duration: number; // seconds
  position: number; // 0..1
  onSeek: (position: number) => void;
  points: TelemetryPoint[];
  startTime: number; // ms epoch
}

export function Timeline({
  duration,
  position,
  onSeek,
  points,
  startTime,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Build markers: minimum SF per timeline bucket so the track tells a story.
  const buckets = 100;
  const trackData = useRef<number[]>([]);

  useEffect(() => {
    const arr = new Array(buckets).fill(10) as number[];
    if (duration > 0 && points.length > 0) {
      for (const p of points) {
        const tSec = (new Date(p.timestamp).getTime() - startTime) / 1000;
        if (tSec < 0 || tSec > duration) continue;
        const idx = Math.min(buckets - 1, Math.floor((tSec / duration) * buckets));
        arr[idx] = Math.min(arr[idx], p.safety_factor);
      }
    }
    trackData.current = arr;
  }, [points, duration, startTime]);

  const handlePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pct);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointer(e);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) handlePointer(e);
  };
  const onPointerUp = () => {
    draggingRef.current = false;
  };

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentSec = position * duration;

  return (
    <div className="space-y-2">
      <div
        ref={trackRef}
        className="relative h-12 bg-ink-50/80 rounded-lg border border-white/[0.06] cursor-pointer overflow-hidden select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Heat strip — buckets colored by SF */}
        <div className="absolute inset-0 flex">
          {trackData.current.map((sf, i) => (
            <div
              key={i}
              className="flex-1 h-full"
              style={{
                backgroundColor: sf < 10 ? safetyFactorToHex(sf) : "transparent",
                opacity: sf < 10 ? 0.3 : 0,
              }}
            />
          ))}
        </div>

        {/* Progress overlay */}
        <div
          className="absolute inset-y-0 left-0 bg-accent/10 border-r border-accent/40"
          style={{ width: `${position * 100}%` }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-accent shadow-[0_0_12px_rgba(34,211,238,0.8)]"
          style={{ left: `${position * 100}%` }}
        >
          <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-accent shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
          <div className="absolute -bottom-1 -left-1.5 w-3 h-3 rounded-full bg-accent shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
        </div>

        {/* Tick marks */}
        <div className="absolute inset-x-0 top-0 flex pointer-events-none">
          {[0.25, 0.5, 0.75].map((p) => (
            <div
              key={p}
              className="absolute top-0 bottom-0 w-px bg-white/[0.05]"
              style={{ left: `${p * 100}%` }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-between text-[10px] font-mono text-ink-500">
        <span>00:00</span>
        <span className="text-accent font-bold">{formatTime(currentSec)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

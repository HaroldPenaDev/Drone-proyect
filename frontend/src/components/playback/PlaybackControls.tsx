import { Pause, Play, Rewind, FastForward, RotateCcw } from "lucide-react";

interface PlaybackControlsProps {
  playing: boolean;
  speed: number;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onSeekRelative: (deltaSec: number) => void;
  onReset: () => void;
}

const SPEEDS = [0.5, 1, 2, 4, 8] as const;

export function PlaybackControls({
  playing,
  speed,
  onTogglePlay,
  onSpeedChange,
  onSeekRelative,
  onReset,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onReset}
        className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/15 transition-all"
        title="Reiniciar"
      >
        <RotateCcw size={14} className="text-ink-500" strokeWidth={2} />
      </button>

      <button
        onClick={() => onSeekRelative(-5)}
        className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/15 transition-all"
        title="−5s"
      >
        <Rewind size={14} className="text-ink-500" strokeWidth={2} />
      </button>

      <button
        onClick={onTogglePlay}
        className="p-3 rounded-lg bg-accent text-ink-50 hover:bg-accent/85 shadow-[0_4px_20px_-4px_rgba(34,211,238,0.5)] transition-all"
      >
        {playing ? (
          <Pause size={18} strokeWidth={2.5} />
        ) : (
          <Play size={18} strokeWidth={2.5} className="ml-0.5" />
        )}
      </button>

      <button
        onClick={() => onSeekRelative(5)}
        className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/15 transition-all"
        title="+5s"
      >
        <FastForward size={14} className="text-ink-500" strokeWidth={2} />
      </button>

      <div className="ml-2 flex items-center gap-1 px-1 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
              speed === s
                ? "bg-accent/15 text-accent ring-1 ring-accent/30"
                : "text-ink-500 hover:text-white"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

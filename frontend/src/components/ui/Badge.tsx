import type { ReactNode } from "react";

type Tone = "good" | "warn" | "crit" | "accent" | "neutral";

interface BadgeProps {
  tone?: Tone;
  pulse?: boolean;
  children: ReactNode;
}

const TONE: Record<Tone, string> = {
  good: "badge badge-good",
  warn: "badge badge-warn",
  crit: "badge badge-crit",
  accent: "badge badge-accent",
  neutral: "badge badge-neutral",
};

const DOT_COLOR: Record<Tone, string> = {
  good: "bg-good",
  warn: "bg-warn",
  crit: "bg-crit",
  accent: "bg-accent",
  neutral: "bg-ink-500",
};

export function Badge({ tone = "neutral", pulse = false, children }: BadgeProps) {
  return (
    <span className={TONE[tone]}>
      {pulse && (
        <span className="relative inline-flex h-1.5 w-1.5">
          <span
            className={`absolute inset-0 rounded-full ${DOT_COLOR[tone]} animate-live-pulse`}
          />
          <span className={`relative h-1.5 w-1.5 rounded-full ${DOT_COLOR[tone]}`} />
        </span>
      )}
      {children}
    </span>
  );
}

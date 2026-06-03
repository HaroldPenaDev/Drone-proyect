import type { HTMLAttributes, ReactNode } from "react";

type Tone = "default" | "good" | "warn" | "crit" | "accent";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  interactive?: boolean;
  padded?: boolean;
  children: ReactNode;
}

const TONE_CLASS: Record<Tone, string> = {
  default: "surface",
  good: "surface surface-good",
  warn: "surface surface-warn",
  crit: "surface surface-crit",
  accent: "surface surface-accent",
};

export function Surface({
  tone = "default",
  interactive = false,
  padded = true,
  className = "",
  children,
  ...rest
}: SurfaceProps) {
  return (
    <div
      className={[
        TONE_CLASS[tone],
        interactive ? "surface-interactive lift" : "",
        padded ? "p-5" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

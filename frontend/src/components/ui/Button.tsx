import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children?: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent text-ink-50 hover:bg-accent/85 shadow-[0_4px_20px_-4px_rgba(34,211,238,0.4)]",
  ghost: "bg-transparent text-ink-500 hover:text-white hover:bg-white/5",
  outline:
    "bg-white/[0.02] text-ink-500 border border-white/10 hover:border-white/25 hover:text-white",
  danger:
    "bg-crit/10 text-crit border border-crit/30 hover:bg-crit/20 hover:border-crit/50",
};

const SIZE: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-9 px-4 text-[13px]",
};

export function Button({
  variant = "outline",
  size = "md",
  icon,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center gap-1.5 rounded-lg font-display font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
        VARIANT[variant],
        SIZE[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

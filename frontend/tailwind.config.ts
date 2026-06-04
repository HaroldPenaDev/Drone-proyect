import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: ['Inter', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        // New palette — kept legacy "drone-*" aliases for back-compat.
        ink: {
          DEFAULT: "var(--color-ink-default)",
          50: "var(--color-ink-50)",
          100: "var(--color-ink-100)",
          200: "var(--color-ink-200)",
          300: "var(--color-ink-300)",
          400: "var(--color-ink-400)",
          500: "var(--color-ink-500)",
        },
        accent: {
          DEFAULT: "#22d3ee",
          50: "#ecfeff",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          glow: "rgba(34, 211, 238, 0.35)",
        },
        warn: {
          DEFAULT: "#f59e0b",
          glow: "rgba(245, 158, 11, 0.35)",
        },
        crit: {
          DEFAULT: "#ef4444",
          glow: "rgba(239, 68, 68, 0.45)",
        },
        good: {
          DEFAULT: "#10b981",
          glow: "rgba(16, 185, 129, 0.30)",
        },
        // Legacy aliases (do not use in new code)
        drone: {
          safe: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
          primary: "#22d3ee",
          dark: "#06070b",
          panel: "#11141c",
          border: "#262d3d",
        },
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at top, rgba(34,211,238,0.06), transparent 70%)",
        "surface-glow":
          "linear-gradient(135deg, rgba(34,211,238,0.04) 0%, rgba(255,255,255,0.01) 50%, transparent 100%)",
        "critical-glow":
          "linear-gradient(135deg, rgba(239,68,68,0.10) 0%, transparent 60%)",
        "warn-glow":
          "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, transparent 60%)",
        "good-glow":
          "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, transparent 60%)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,211,238,0.20), 0 8px 24px -8px rgba(34,211,238,0.25)",
        "glow-warn": "0 0 0 1px rgba(245,158,11,0.25), 0 8px 24px -8px rgba(245,158,11,0.30)",
        "glow-crit": "0 0 0 1px rgba(239,68,68,0.30), 0 8px 24px -8px rgba(239,68,68,0.40)",
        surface: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.04)",
      },
      animation: {
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "live-pulse": "live-pulse 1.6s ease-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "live-pulse": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

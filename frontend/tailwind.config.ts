import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        drone: {
          safe: "#22c55e",
          warning: "#f59e0b",
          danger: "#ef4444",
          primary: "#3b82f6",
          dark: "#0f172a",
          panel: "#1e293b",
          border: "#334155",
        },
      },
    },
  },
  plugins: [],
};

export default config;

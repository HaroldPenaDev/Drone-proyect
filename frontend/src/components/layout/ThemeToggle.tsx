import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-200 text-ink-500 hover:text-white dark:hover:text-white"
      title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {theme === "dark" ? (
        <Sun size={16} strokeWidth={1.75} className="text-accent animate-pulse-soft" />
      ) : (
        <Moon size={16} strokeWidth={1.75} className="text-amber-500" />
      )}
    </button>
  );
}

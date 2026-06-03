import { Globe } from "lucide-react";
import { useLangStore, type Lang } from "@/i18n";

const LANGS: { value: Lang; short: string; label: string }[] = [
  { value: "en", short: "EN", label: "English" },
  { value: "es", short: "ES", label: "Español" },
];

export function LanguageToggle() {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  return (
    <div className="flex items-center gap-1 px-1 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <Globe size={12} className="text-ink-500 ml-1.5" strokeWidth={2} />
      {LANGS.map((l) => (
        <button
          key={l.value}
          onClick={() => setLang(l.value)}
          title={l.label}
          className={`px-2 py-0.5 rounded-md text-[10px] font-display font-bold tracking-wider transition-all ${
            lang === l.value
              ? "bg-accent/15 text-accent ring-1 ring-accent/30"
              : "text-ink-500 hover:text-white"
          }`}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}

import { create } from "zustand";

export type Lang = "en" | "es";

const STORAGE_KEY = "ddt.lang";

const initialLang: Lang = (() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "es") return stored;
  } catch {
    /* ssr / disabled */
  }
  return "en";
})();

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: initialLang,
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute("lang", lang);
    set({ lang });
  },
}));

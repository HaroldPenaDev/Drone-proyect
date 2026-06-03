import { useMemo } from "react";
import { useLangStore } from "@/i18n/store";
import { translations, type TranslationKey } from "@/i18n/translations";

/**
 * Translation hook. Subscribes to the current language and returns a `t`
 * function that resolves keys to localized strings.
 *
 * Usage:
 *   const t = useT();
 *   <h1>{t("dashboard.title")}</h1>
 */
export function useT(): (key: TranslationKey) => string {
  const lang = useLangStore((s) => s.lang);
  return useMemo(
    () => (key: TranslationKey) => translations[lang][key] ?? key,
    [lang],
  );
}

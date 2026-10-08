import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LANGUAGE_KEY, localeFor, restoreLanguage, translate, type Language } from "@/lib/i18n";
import * as endurance from "@/lib/endurance";
import * as planner from "@/lib/planner";
import { readableFinish } from "@/lib/presentation";

const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void; storageError: boolean }>({ language: "de", setLanguage: () => {}, storageError: false });
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("de");
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try { setLanguage(restoreLanguage(localStorage.getItem(LANGUAGE_KEY))); } catch { setStorageError(true); }
    setLoaded(true);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    if (loaded) try { localStorage.setItem(LANGUAGE_KEY, language); } catch { setStorageError(true); }
  }, [language, loaded]);
  return <LanguageContext.Provider value={{ language, setLanguage, storageError }}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);
  const { language } = context;
  return {
    ...context,
    locale: localeFor(language),
    t: (key: string, params?: Record<string, string | number>) => translate(language, key, params),
    fmtPlain: (v: number, d = 2) => endurance.fmtPlain(v, d, language),
    fmtSuffix: (v: number, d = 3) => endurance.fmtSuffix(v, d, language),
    fmtDuration: (v: number) => endurance.fmtDuration(v, language),
    fmtFinish: (v: number, now: number) => readableFinish(v, now, language),
    fmtFinishExact: (v: number, now: number) => endurance.fmtFinish(v, now, language),
    naturalDuration: (v: number) => planner.naturalDuration(v, language),
    neighboringConversion: (v: planner.NumberUnit) => planner.neighboringConversion(v, language),
  };
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  return <div className="inline-flex shrink-0 items-center rounded-md border bg-secondary p-0.5" role="group" aria-label={t("Sprache")}>
    <Button size="sm" variant={language === "de" ? "default" : "ghost"} className="h-9 px-2 text-xs" aria-label="Deutsch" aria-pressed={language === "de"} onClick={() => setLanguage("de")}>DE</Button>
    <Button size="sm" variant={language === "en" ? "default" : "ghost"} className="h-9 px-2 text-xs" aria-label="English" aria-pressed={language === "en"} onClick={() => setLanguage("en")}>EN</Button>
  </div>;
}
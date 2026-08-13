import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { en } from "./en";
import { ru } from "./ru";
import { uz, type TranslationKey } from "./uz";

export type Locale = "uz" | "ru" | "en";

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = { uz, ru, en };

export const LOCALE_NAMES: Record<Locale, string> = { uz: "O'zbekcha", ru: "Русский", en: "English" };

const STORAGE_KEY = "lifecouch.locale";

function isLocale(value: string | null): value is Locale {
  return value === "uz" || value === "ru" || value === "en";
}

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return "uz";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isLocale(stored) ? stored : "uz";
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const value = useMemo<LocaleContextValue>(() => {
    const dict = DICTIONARIES[locale];
    return {
      locale,
      setLocale: (next: Locale) => {
        setLocaleState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
      },
      t: (key, vars) => {
        let text = dict[key] ?? uz[key];
        if (vars) {
          for (const [name, val] of Object.entries(vars)) {
            text = text.replaceAll(`{{${name}}}`, String(val));
          }
        }
        return text;
      },
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useTranslation faqat LocaleProvider ichida ishlatilishi kerak");
  }
  return ctx;
}

export type { TranslationKey };

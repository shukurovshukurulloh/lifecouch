import { LOCALE_NAMES, useTranslation, type Locale } from "./LocaleContext";

const LOCALES: Locale[] = ["uz", "ru", "en"];

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="language-switcher" role="group" aria-label="Til / Язык / Language">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          className={code === locale ? "active" : ""}
          onClick={() => setLocale(code)}
        >
          {LOCALE_NAMES[code]}
        </button>
      ))}
    </div>
  );
}

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "lifecouch.theme";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function readInitialTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isThemePreference(stored) ? stored : "system";
}

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(readInitialTheme);

  useEffect(() => {
    // "system" uchun atribut butunlay olib tashlanadi — App.css'dagi
    // prefers-color-scheme media query'si o'zi ishlaydi.
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  function setTheme(next: ThemePreference) {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme faqat ThemeProvider ichida ishlatilishi kerak");
  }
  return ctx;
}

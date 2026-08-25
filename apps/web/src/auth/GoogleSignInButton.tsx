import { useEffect, useRef } from "react";
import { useTheme } from "../theme/ThemeContext";
import { loadGoogleIdentityScript, type GoogleCredentialResponse } from "./googleIdentity";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

/** `AuthForms.tsx` "yoki" ajratuvchisini faqat Google tugmasi mavjud bo'lganda ko'rsatishi uchun. */
export const isGoogleSignInConfigured = Boolean(CLIENT_ID);

interface Props {
  onCredential: (credential: string) => void;
}

/**
 * VITE_GOOGLE_CLIENT_ID sozlanmagan bo'lsa umuman render qilinmaydi (Google
 * orqali kirish CLAUDE.md'dagi "tashqi xizmatlar konventsiyasi"ga mos —
 * kalit yo'qligida funksiya jim o'chiq turadi, soxta simulyatsiya qilinmaydi).
 */
export function GoogleSignInButton({ onCredential }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark =
    theme === "dark" || (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    if (!CLIENT_ID || !containerRef.current) return;
    let cancelled = false;

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response: GoogleCredentialResponse) => onCredential(response.credential),
        });
        containerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: isDark ? "filled_black" : "outline",
          size: "large",
          width: "320",
        });
      })
      .catch(() => {
        // Skript yuklanmasa (masalan tarmoq/adblock) tugma jim ko'rinmay qoladi —
        // email/parol bilan kirish har doim ishlaydi.
      });

    return () => {
      cancelled = true;
    };
  }, [isDark, onCredential]);

  if (!CLIENT_ID) return null;
  return <div ref={containerRef} className="google-signin" />;
}

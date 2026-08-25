/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Ixtiyoriy — bo'lmasa monitoring/sentry.ts xatolarni faqat konsolga yozadi (stub rejim).
  readonly VITE_SENTRY_DSN?: string;
  // Ixtiyoriy — bo'lmasa auth/GoogleSignInButton.tsx umuman render qilinmaydi.
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Ixtiyoriy — bo'lmasa monitoring/sentry.ts xatolarni faqat konsolga yozadi (stub rejim).
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import * as Sentry from "@sentry/react";

let configured = false;

/**
 * VITE_SENTRY_DSN topilmasa Sentry ishga tushmaydi — xatolar konsolga
 * yoziladi (dev muhitda shu yetarli). Kalit qo'shilganda captureError va
 * ErrorBoundary xuddi shu modul orqali haqiqiy Sentry'ga yuboradi —
 * chaqiruvchi tomon kodini o'zgartirish shart emas.
 */
export function initMonitoring(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.log("[monitoring] VITE_SENTRY_DSN topilmadi — xatolar faqat konsolga yoziladi (stub rejim).");
    return;
  }
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
  });
  configured = true;
  console.log("[monitoring] Sentry ishga tushirildi.");
}

export function isMonitoringConfigured(): boolean {
  return configured;
}

/** Xatoni har doim konsolga, sozlangan bo'lsa Sentry'ga ham yuboradi. */
export function captureError(err: unknown, label?: string): void {
  if (label) {
    console.error(label, err);
  } else {
    console.error(err);
  }
  if (configured) {
    Sentry.captureException(err, label ? { tags: { label } } : undefined);
  }
}

/**
 * React render xatolarini ushlaydi va foydalanuvchiga oq ekran o'rniga
 * do'stona xabar ko'rsatadi. Sentry sozlanmagan bo'lsa ham ishlayveradi —
 * bunda faqat lokal fallback ko'rinadi, tashqariga hech narsa yuborilmaydi.
 */
export const MonitoringErrorBoundary = Sentry.ErrorBoundary;

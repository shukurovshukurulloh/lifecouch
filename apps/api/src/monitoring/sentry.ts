import * as Sentry from "@sentry/node";
import type { Express } from "express";
import { env } from "../env.js";

let configured = false;

/**
 * SENTRY_DSN topilmasa Sentry ishga tushmaydi — xatolar shunchaki konsolga
 * yoziladi (dev muhitda shu yetarli). Kalit qo'shilganda captureError xuddi
 * shu funksiya orqali haqiqiy Sentry'ga yuboradi — chaqiruvchi tomon
 * (route/service) kodini o'zgartirish shart emas.
 *
 * `createApp()` boshida chaqiriladi, shuning uchun har bir test/ishga tushirish
 * uchun avtomatik ishlaydi; DSN yo'q joyda (masalan `lifecouch_test`) stub
 * rejimda qoladi.
 */
export function initMonitoring(): void {
  if (configured) {
    return;
  }
  if (!env.sentryDsn) {
    console.log("[monitoring] SENTRY_DSN topilmadi — xatolar faqat konsolga yoziladi (stub rejim).");
    return;
  }
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    // Xato kuzatish asosiy maqsad — production'da yengil performance-tracing yetarli.
    tracesSampleRate: env.nodeEnv === "production" ? 0.1 : 0,
  });
  configured = true;
  console.log("[monitoring] Sentry ishga tushirildi.");
}

export function isMonitoringConfigured(): boolean {
  return configured;
}

/**
 * Xatoni har doim konsolga, sozlangan bo'lsa Sentry'ga ham yuboradi.
 * `label` — qaysi modulda yuz berganini ajratish uchun qisqa yorliq
 * (masalan "[ai] javob generatsiya qilishda xato:").
 */
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

/** Express ilovasiga Sentry xato-ushlagichini ulaydi — faqat sozlangan bo'lsa. */
export function attachExpressErrorHandler(app: Express): void {
  if (configured) {
    Sentry.setupExpressErrorHandler(app);
  }
}

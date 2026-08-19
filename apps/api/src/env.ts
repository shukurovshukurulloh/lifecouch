function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Muhit o'zgaruvchisi topilmadi: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV ?? "development",
  // Stripe hali ulanmagan bo'lishi mumkin (dev muhitda) — shu sabab ixtiyoriy.
  // Bo'lmasa billing/stripeClient.ts checkout/webhook oqimini lokal stub bilan simulyatsiya qiladi.
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  // Claude API kaliti hali ulanmagan bo'lishi mumkin (dev muhitda) — shu sabab ixtiyoriy.
  // Bo'lmasa ai/client.ts AI coach javoblarini lokal stub bilan simulyatsiya qiladi.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
  // Sentry hali ulanmagan bo'lishi mumkin (dev muhitda) — shu sabab ixtiyoriy.
  // Bo'lmasa monitoring/sentry.ts xatolarni faqat konsolga yozadi (stub rejim).
  sentryDsn: process.env.SENTRY_DSN,
};

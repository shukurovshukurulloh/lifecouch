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
  // Beta-reliz bayrog'i — yoqilmagan bo'lsa (default) /auth/register hech qanday
  // cheklovsiz ishlayveradi. "true" bo'lsa, faqat admin yaratgan ishlatilmagan
  // taklifnoma kodiga ega odamlar ro'yxatdan o'ta oladi (auth/routes.ts). Boshqa
  // bayroqlardan farqli o'laroq getter sifatida yozilgan — modul yuklanganda bir
  // marta emas, har o'qishda process.env'dan olinadi, shu bilan integratsion
  // testlar uni process restart qilmasdan yoqib/o'chira oladi (test/inviteCodes.test.ts).
  get betaInviteRequired(): boolean {
    return process.env.BETA_INVITE_REQUIRED === "true";
  },
  // Google OAuth Client ID (Google Cloud Console). Ixtiyoriy — bo'lmasa
  // auth/googleClient.ts null qaytaradi va Google tugmasi frontend'da
  // ko'rsatilmaydi (VITE_GOOGLE_CLIENT_ID ham bo'sh qoladi). betaInviteRequired
  // kabi getter — testlarda (test/googleAuth.test.ts) process restart
  // qilmasdan yoqib/o'chirish uchun.
  get googleClientId(): string | undefined {
    return process.env.GOOGLE_CLIENT_ID;
  },
};

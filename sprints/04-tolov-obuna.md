# Sprint 04 — To'lov va obuna

**Holat:** tugadi
**Muddat:** Hafta 8–9

## Maqsad
Platforma pul ishlay boshlaydi — tariflar, to'lov va obuna holatini boshqarish.

## Vazifalar
- [x] Tarif rejalarini loyihalash (Free / Pro / Premium)
- [x] Stripe Checkout integratsiyasi
- [x] Webhook orqali obuna holatini bazada sinxronlash
- [x] Feature-gating — pullik funksiyalarni cheklash (paywall)
- [x] Billing tarixi va invoice sahifasi

## Qilingan ishlar
- 2026-08-08 — Prisma'ga `Invoice` modeli qo'shildi va migratsiya (`sprint04_billing_invoice`) real Postgres'da qo'llanildi.
- 2026-08-08 — Backend `src/billing/` moduli qo'shildi: tarif katalogi (`plans.ts`), Stripe klienti (`stripeClient.ts`), obuna xizmati (`service.ts`), paywall middleware (`gate.ts`) va route'lar (`GET /plans`, `GET /subscription`, `GET /invoices`, `POST /checkout`, `POST /cancel`, webhook).
- 2026-08-08 — Ro'yxatdan o'tishda foydalanuvchiga avtomatik FREE obuna yaratiladigan qilindi (`auth/routes.ts`, transaction ichida).
- 2026-08-08 — Feature-gating ulandi: FREE foydalanuvchi 3 tadan ortiq faol maqsad yarata olmaydi (`goals/routes.ts`), sessiya bron qilish faqat PRO/PREMIUM uchun ochiq (`sessions/routes.ts`, `requirePlan`).
- 2026-08-08 — Stripe webhook uchun `index.ts`da `express.json()`dan oldin alohida `express.raw()` route ulandi.
- 2026-08-08 — Frontend'da `BillingPage.tsx` (tarif kartalari, joriy reja, upgrade/cancel, to'lovlar tarixi) va "Tarif" tab qo'shildi; `lib/api.ts` va `packages/shared` billing DTO/funksiyalari bilan to'ldirildi.
- 2026-08-08 — Real Postgres bazasida va brauzerda uchidan-uchigacha tekshirildi: FREE limit, checkout stub orqali Pro'ga o'tish, invoice yaratilishi, cancel orqali Free'ga qaytish, noto'g'ri reja va webhook xatolarining to'g'ri qaytarilishi.

## Qarorlar
- 2026-08-08 — `STRIPE_SECRET_KEY` sozlanmagan (dev) holatda `billing/stripeClient.ts` `null` qaytaradi va `POST /billing/checkout` shu holatda to'lovni darhol muvaffaqiyatli deb simulyatsiya qilib Invoice yozadi (xuddi `mailer.ts`/`video.ts` stub'lari kabi). Kalit qo'shilganda xuddi shu endpoint haqiqiy Stripe Checkout Session yaratadi — frontend yoki route kodini o'zgartirish shart emas.

## Natija
Foydalanuvchi Pro rejaga o'tadi, to'lov muvaffaqiyatli o'tsa qulflangan funksiyalar ochiladi.

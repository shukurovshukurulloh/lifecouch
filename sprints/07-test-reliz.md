# Sprint 07 — Test, xavfsizlik va relizga tayyorgarlik

**Holat:** kutilmoqda
**Muddat:** Hafta 14–15

## Maqsad
Platformani ishonchli va xavfsiz holda birinchi foydalanuvchilarga ochish.

## Vazifalar
- [x] Unit va integratsion testlar (Vitest/Jest) — kritik oqimlar qamrab olinadi
- [ ] Xavfsizlik tekshiruvi — input validatsiya, rate limiting, OWASP asoslari
- [ ] Production CI/CD pipeline va muhitlarni ajratish
- [ ] Monitoring va xatolarni kuzatish (Sentry, log'lar)
- [ ] Beta-reliz — cheklangan foydalanuvchilar guruhi bilan sinov

## Qilingan ishlar
- 2026-08-15 — `apps/api`: `src/index.ts` ikkiga ajratildi — `src/app.ts` (`createApp()`, Express ilovani quradi va qaytaradi) va `src/index.ts` (server bootstrap: listen, socket.io, cron), testlar ilovani port ochmasdan import qilishi uchun.
- 2026-08-15 — `apps/api`: Vitest + Supertest test infratuzilmasi qo'shildi — `vitest.config.ts` (alohida `lifecouch_test` Postgres bazasi, test env o'zgaruvchilari), `test/globalSetup.ts` (test bazasini yaratish/sxema push), `test/setup.ts` (har testdan oldin `TRUNCATE ... CASCADE`), `test/helpers.ts` (registerUser, createApprovedCoach, registerAdmin).
- 2026-08-15 — `apps/api`: unit testlar (`src/auth/hash.test.ts`, `src/auth/tokens.test.ts`, `src/goals/dates.test.ts`, `src/goals/progress.test.ts`, `src/billing/plans.test.ts`) va integratsion testlar (`test/auth.test.ts` — ro'yxatdan o'tish/kirish/refresh-rotatsiya/logout; `test/sessions.test.ts` — coach ariza→admin tasdiqlash→bron→bekor qilish, paywall 402; `test/billing.test.ts` — Stripe-stub checkout/cancel/invoice; `test/ai.test.ts` — AI chat-stub va kunlik limit) qo'shildi. Jami 53 ta test, barchasi o'tgan.
- 2026-08-15 — `apps/web`: Vitest + Testing Library test infratuzilmasi qo'shildi — `vite.config.ts`ga `test` bloki (jsdom), `test/setup.ts` (jest-dom matcherlari, cleanup), `src/lib/api.test.ts` (fetch wrapper testlari), `src/auth/AuthContext.test.tsx` (login/register/logout/refresh oqimlari, shu jumladan `refreshProfile()` `api.refresh()`ni chaqirishini tekshiruvchi test). Jami 12 ta test, barchasi o'tgan.
- 2026-08-15 — Root `package.json`ga `test: "pnpm -r test"` skripti qo'shildi; `pnpm test` orqali barcha 65 test o'tadi. `pnpm -r typecheck` va `apps/api` `build` toza.
- 2026-08-15 — Yon kashfiyot (tuzatilmagan, faqat qayd etish uchun): `apps/web`da `lint` skripti bor, lekin `eslint` `devDependencies`da yo'q — buyruq hozircha ishlamaydi.

## Qarorlar
- `apps/api`da Express ilovani qurish (`createApp()`, `src/app.ts`) va serverni ishga tushirish (`listen`, socket.io, cron, `src/index.ts`) ajratildi — testlar HTTP port ochmasdan, to'g'ridan-to'g'ri ilovani import qilib Supertest bilan ishlatishi uchun.
- Integratsion testlar mock'lar emas, haqiqiy Postgres'ga ulanadi, lekin alohida `lifecouch_test` bazasidan foydalanadi (dev bazasi `lifecouch`ga hech qachon tegilmaydi); baza `globalSetup.ts`da avtomatik yaratiladi/sxema bilan sinxronlanadi, har testdan oldin `setup.ts`da tozalanadi.

## Natija
Platforma production'da barqaror ishlaydi, birinchi haqiqiy foydalanuvchilar kira oladi.

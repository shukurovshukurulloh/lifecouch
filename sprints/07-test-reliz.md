# Sprint 07 — Test, xavfsizlik va relizga tayyorgarlik

**Holat:** jarayonda
**Muddat:** Hafta 14–15

## Maqsad
Platformani ishonchli va xavfsiz holda birinchi foydalanuvchilarga ochish.

## Vazifalar
- [x] Unit va integratsion testlar (Vitest/Jest) — kritik oqimlar qamrab olinadi
- [x] Xavfsizlik tekshiruvi — input validatsiya, rate limiting, OWASP asoslari
- [x] Production CI/CD pipeline va muhitlarni ajratish
- [ ] Monitoring va xatolarni kuzatish (Sentry, log'lar)
- [ ] Beta-reliz — cheklangan foydalanuvchilar guruhi bilan sinov

## Qilingan ishlar
- 2026-08-15 — `apps/api`: `src/index.ts` ikkiga ajratildi — `src/app.ts` (`createApp()`, Express ilovani quradi va qaytaradi) va `src/index.ts` (server bootstrap: listen, socket.io, cron), testlar ilovani port ochmasdan import qilishi uchun.
- 2026-08-15 — `apps/api`: Vitest + Supertest test infratuzilmasi qo'shildi — `vitest.config.ts` (alohida `lifecouch_test` Postgres bazasi, test env o'zgaruvchilari), `test/globalSetup.ts` (test bazasini yaratish/sxema push), `test/setup.ts` (har testdan oldin `TRUNCATE ... CASCADE`), `test/helpers.ts` (registerUser, createApprovedCoach, registerAdmin).
- 2026-08-15 — `apps/api`: unit testlar (`src/auth/hash.test.ts`, `src/auth/tokens.test.ts`, `src/goals/dates.test.ts`, `src/goals/progress.test.ts`, `src/billing/plans.test.ts`) va integratsion testlar (`test/auth.test.ts` — ro'yxatdan o'tish/kirish/refresh-rotatsiya/logout; `test/sessions.test.ts` — coach ariza→admin tasdiqlash→bron→bekor qilish, paywall 402; `test/billing.test.ts` — Stripe-stub checkout/cancel/invoice; `test/ai.test.ts` — AI chat-stub va kunlik limit) qo'shildi. Jami 53 ta test, barchasi o'tgan.
- 2026-08-15 — `apps/web`: Vitest + Testing Library test infratuzilmasi qo'shildi — `vite.config.ts`ga `test` bloki (jsdom), `test/setup.ts` (jest-dom matcherlari, cleanup), `src/lib/api.test.ts` (fetch wrapper testlari), `src/auth/AuthContext.test.tsx` (login/register/logout/refresh oqimlari, shu jumladan `refreshProfile()` `api.refresh()`ni chaqirishini tekshiruvchi test). Jami 12 ta test, barchasi o'tgan.
- 2026-08-15 — Root `package.json`ga `test: "pnpm -r test"` skripti qo'shildi; `pnpm test` orqali barcha 65 test o'tadi. `pnpm -r typecheck` va `apps/api` `build` toza.
- 2026-08-15 — Yon kashfiyot (tuzatilmagan, faqat qayd etish uchun): `apps/web`da `lint` skripti bor, lekin `eslint` `devDependencies`da yo'q — buyruq hozircha ishlamaydi.
- 2026-08-15 — Xavfsizlik tekshiruvi (qo'lda, kod o'zgarishisiz): `apps/api`ning butun manba kodi (auth, avtorizatsiya, to'lov, admin, chat, AI, cron) va `apps/web`ning maxfiy ma'lumot ekspozitsiyasi ko'rib chiqildi — JWT, refresh-token rotatsiyasi/xashlanishi, resurs egaligi tekshiruvlari/IDOR, zod validatsiya, Prisma parametrlangan so'rovlar, serializerlarda `passwordHash` oqmasligi, CORS, cookie bayroqlari, Stripe webhook imzo tekshiruvi. Yuqori/o'rta ishonchli haqiqiy zaiflik topilmadi. `pnpm audit`: production'da faqat 1 ta o'rta darajali (`uuid`, `node-cron` orqali tranzit, past real xavf), qolgan yuqori/kritik muammolar faqat dev-vositalarida (vitest/vite/postcss/nanoid).
- 2026-08-15 — CI pipeline qo'shildi: `.github/workflows/ci.yml` — `master`ga push va har qanday PR'da pnpm/Node 20 o'rnatish, `pnpm install --frozen-lockfile`, Prisma Client generatsiya, `pnpm typecheck`, `pnpm build`, `pnpm test` (Postgres 16 service container bilan) va `pnpm audit --audit-level=high` (ma'lumot uchun, continue-on-error). Concurrency guruhi bilan eski yugurishlar bekor qilinadi.
- 2026-08-15 — Render'ga deploy: `render.yaml` qo'shildi — bitta `lifecouch` web-service (Node, `pnpm install && prisma generate && web build && api build`, `preDeployCommand: prisma migrate deploy`) + `lifecouch-db` boshqariladigan Postgres (basic-1gb, Postgres 16). `DATABASE_URL`/`JWT_SECRET` avtomatik, `WEB_ORIGIN`/`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`ANTHROPIC_API_KEY` `sync: false` — birinchi deploy'dan keyin Dashboard'da qo'lda kiritiladi.
- 2026-08-15 — `apps/api/src/app.ts`: production muhitida (`NODE_ENV=production`) Express `apps/web/dist`ni statik xizmat qiladi va SPA fallback (`/api`, `/socket.io`, `/health` bo'lmagan yo'llar uchun `index.html`) qo'shdi; `apps/web/dist` topilmasa xato tashlamasdan ogohlantirib faqat API rejimida davom etadi. Mahalliy smoke-test: `GET /health` (200), `GET /` (200), `GET /goals` (200, SPA fallback), `GET /api/users/me` avtorizatsiyasiz (401) — hammasi kutilganidek.
- 2026-08-15 — Root `package.json`ga `"packageManager": "pnpm@9.15.9"` qo'shildi — CI (`pnpm/action-setup`) va Render (corepack) pnpm versiyasi mahalliy muhit bilan mos kelishi uchun.

## Qarorlar
- `apps/api`da Express ilovani qurish (`createApp()`, `src/app.ts`) va serverni ishga tushirish (`listen`, socket.io, cron, `src/index.ts`) ajratildi — testlar HTTP port ochmasdan, to'g'ridan-to'g'ri ilovani import qilib Supertest bilan ishlatishi uchun.
- Integratsion testlar mock'lar emas, haqiqiy Postgres'ga ulanadi, lekin alohida `lifecouch_test` bazasidan foydalanadi (dev bazasi `lifecouch`ga hech qachon tegilmaydi); baza `globalSetup.ts`da avtomatik yaratiladi/sxema bilan sinxronlanadi, har testdan oldin `setup.ts`da tozalanadi.
- Hosting arxitekturasi: Render (PaaS) tanlandi. Dastlab ikki alohida Render resursi (API web-service + statik sayt) ko'rib chiqilgan edi, lekin Render Blueprint'ning `fromService` xususiyati faqat PRIVATE tarmoq manzilini qaytarishi (brauzerga ochiq emas) va statik-sayt rewrite qoidalarining WebSocket'ni proksi qilishi hujjatlashtirilmaganligi aniqlandi (Render docs orqali tekshirildi) — shu sabab arxitektura soddalashtirildi: bitta Render web-service (Node) ham API'ni, ham build qilingan frontendni xizmat qiladi (`apps/api/src/app.ts`dagi production-only static-serving blok). Bu qaror tufayli frontendda (`lib/api.ts`, `lib/socket.ts`) hech qanday o'zgarish kerak bo'lmadi — nisbiy `/api` yo'llari va bir xil origin'dagi socket.io ulanishi o'zgarishsiz ishlayveradi. Kelajakda ikkinchi frontend xizmati yoki `VITE_API_ORIGIN` kabi narsa qo'shilsa, bu qaror va sababi CLAUDE.md'da ham qayd etilgan.

## Natija
Platforma production'da barqaror ishlaydi, birinchi haqiqiy foydalanuvchilar kira oladi.

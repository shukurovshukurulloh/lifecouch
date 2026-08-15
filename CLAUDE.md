# Lifecouch

Ko'p foydalanuvchili life-coaching SaaS platformasi. Monorepo (pnpm workspace):
`apps/web` (Vite + React + TypeScript), `apps/api` (Express + Prisma + PostgreSQL),
`packages/shared`. Ishlab chiqish sprintlarga bo'lingan — har birining tafsiloti va
ish jurnali `sprints/*.md` fayllarida, umumiy vizual holat `loyiha-panel.html`da.

## Git workflow qoidalari

- Har git commit'dan oldin majburiy `hisobotchi` agentini ishga tushir.
- Barcha commit xabarlari o'zbek tilida bo'lsin.

## Frontend konventsiyasi

- Foydalanuvchi roli o'zgaradigan har qanday amaldan keyin (masalan coach bo'lish)
  `AuthContext.refreshProfile()` chaqirilishi kerak, u `api.refresh()`dan foydalanadi
  — `api.fetchMe()` emas, chunki faqat `refresh` yangilangan `role` claim'li access
  token qaytaradi.

## Tashqi xizmatlar konventsiyasi

- Hali ulanmagan tashqi xizmat (email, video-konferensiya, to'lov va h.k.) uchun
  tegishli modul mos `.env` kaliti bo'lmasa avtomatik lokal stub'ga o'tishi kerak
  (masalan `mailer.ts`, `sessions/video.ts`, `billing/stripeClient.ts`). Kalit
  qo'shilganda xatti-harakat xuddi shu kod orqali haqiqiy xizmatga o'tishi kerak —
  chaqiruvchi tomon (route/service) kodini o'zgartirish shart bo'lmasligi kerak.

## Test konventsiyasi

- `apps/api`da Express ilovani qurish (`createApp()`, `src/app.ts`) va serverni
  ishga tushirish (`listen`, socket.io, cron — `src/index.ts`) ajratilgan. Yangi
  global middleware/route qo'shilganda `app.ts`ga yoziladi, `index.ts` faqat
  bootstrap uchun qoladi — bu testlarga ilovani port ochmasdan import qilish
  imkonini beradi.
- `apps/api` integratsion testlari haqiqiy Postgres'ga ulanadi, lekin har doim
  alohida `lifecouch_test` bazasidan foydalanadi (`vitest.config.ts` /
  `test/globalSetup.ts`) — dev bazasi `lifecouch`ga hech qachon tegilmaydi.
  Yangi testlar shu konventsiyaga rioya qilishi kerak.
- `pnpm test` (root) — barcha workspace paketlarning testlarini ishga tushiradi.

## Hosting va deploy konventsiyasi

- Production'da bitta Render web-service (`render.yaml`) ham API'ni, ham build
  qilingan frontendni (`apps/web/dist`) xizmat qiladi — alohida frontend
  xizmati/CDN yo'q. Bu `apps/api/src/app.ts`dagi production-only static-serving
  va SPA fallback bloki orqali amalga oshiriladi (`NODE_ENV=production`da
  faollashadi, lokal dev'da web o'z Vite serverida ishlayveradi). Sabab: brauzer
  nuqtai nazaridan hammasi bitta origin bo'lib qoladi, shu tufayli
  `apps/web/src/lib/api.ts` va `lib/socket.ts`dagi nisbiy `/api` va bir xil
  origin'dagi socket.io ulanishi hech qanday `VITE_API_ORIGIN` yoki cross-site
  CORS/cookie sozlamasisiz ishlayveradi. Agar kelajakda ikkinchi frontend
  xizmati yoki alohida API domeni qo'shish kerak bo'lsa, avval shu qarorni va
  sababini (`sprints/07-test-reliz.md`dagi "Qarorlar" bo'limi) ko'rib chiqing.

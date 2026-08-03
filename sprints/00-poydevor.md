# Sprint 00 — Poydevor

**Holat:** tugadi
**Muddat:** Hafta 1

## Maqsad
Qolgan barcha sprintlar tayanadigan repo, sxema va infratuzilma asoslarini tayyorlash.

## Vazifalar
- [x] Monorepo tuzilishi (apps/web, apps/api, packages/shared)
- [x] PostgreSQL sxemasini loyihalash (Prisma schema: User, Coach, Goal, Habit, CheckIn, Session, Message, Subscription)
- [x] Auth strategiyasini belgilash (JWT + refresh token, rol asosida ruxsat)
- [ ] CI asosiy bosqichi: lint, test, build (GitHub Actions)
- [ ] Dizayn tizimi asoslari — rang, tipografika, komponent kutubxonasi

## Qilingan ishlar
- 2026-08-03 — pnpm workspace monorepo yaratildi (`apps/web`, `apps/api`, `packages/shared`).
- 2026-08-03 — `apps/api/prisma/schema.prisma` yozildi: 8 model (User, Coach, Goal, Habit, CheckIn, Session, Message, Subscription).
- 2026-08-03 — `pnpm install`, `prisma validate`, `prisma generate` va uchala paketning `tsc --noEmit` tekshiruvi xatosiz o'tdi.
- 2026-08-03 — API server (`/health`) va web (`vite build`) real ishga tushirilib tasdiqlandi.

## Qarorlar
- Monorepo boshqaruvi: **pnpm workspace** (`apps/*`, `packages/*`).
- Backend: **Node.js + Express + Prisma + PostgreSQL**.
- Frontend: **Vite + React + TypeScript**.
- Auth strategiyasi: **JWT + refresh token** (amalga oshirilishi Sprint 01'da).

## Natija
Ikkala repo ishga tushadi, bazaga ulanadi, CI yashil, "Hello Lifecouch" sahifasi deploy qilingan.

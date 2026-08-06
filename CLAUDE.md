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

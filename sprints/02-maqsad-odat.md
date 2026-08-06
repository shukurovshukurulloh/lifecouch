# Sprint 02 — Maqsad va odat tracker

**Holat:** tugallangan
**Muddat:** Hafta 4–5

## Maqsad
Platformaning asosiy qadriyati — foydalanuvchi maqsad qo'yadi va kundalik progressini ko'radi.

## Vazifalar
- [x] Goals CRUD (nomi, muddati, kategoriyasi, holati) — kod tayyor
- [x] Habits + kunlik check-in (bajarildi/bajarilmadi) — kod tayyor
- [x] Streak (ketma-ket kunlar) hisoblash logikasi — kod tayyor
- [x] Progress dashboard — kod tayyor (grafik kutubxonasiz, 7 kunlik rang lentasi + streak)
- [x] Eslatmalar uchun cron job + email xabarnoma — kod tayyor (email hozircha konsolga chiqadi)
- [x] Real bazada uchidan-uchigacha tekshirish — bajarildi

## Qilingan ishlar
- 2026-08-03 — Backend: `goals/routes.ts` (Goals/Habits CRUD + check-in toggle), `goals/dates.ts` va `goals/progress.ts` (streak va 7-kunlik lenta hisoblash), `reminders/job.ts` (`node-cron` bilan kunlik 18:00'da bajarilmagan odatlar bo'yicha eslatma).
- 2026-08-03 — Frontend: `GoalsPage.tsx`, `HabitRow.tsx` — maqsad/odat qo'shish, kunlik belgilash, streak va 7 kunlik progress lentasi ko'rinadi. `App.tsx`ga "Maqsadlar/Profil" tab qo'shildi.
- 2026-08-03 — `packages/shared`ga `GoalWithHabits`, `HabitProgress`, `DayCell` tiplari qo'shildi.
- 2026-08-03 — Uchala paket typecheck va `vite build`dan xatosiz o'tdi.
- 2026-08-03 — Real bazada tekshirish Sprint 01'dagi bilan bir xil sababga ko'ra bloklangan (Postgres `lifecouch` roli parol xatosi).
- 2026-08-06 — Blokirovka Sprint 01'da hal qilingandan keyin `prisma migrate dev --name init` joriy to'liq schema.prisma'dan barcha jadvallarni (Goal, Habit, CheckIn, Coach, Session va h.k.) yaratdi.
- 2026-08-06 — API server real bazada ishga tushirilib uchidan-uchigacha sinaldi: POST /api/goals (201), POST /api/goals/:id/habits (201), POST /api/goals/habits/:habitId/check-ins (bugungi/kechagi kun uchun streak to'g'ri hisoblandi: 1, keyin 2), xuddi shu kunga qayta bosilganda toggle (completed true→false, streak 0'ga tushdi), GET /api/goals (streak va 7 kunlik rang lentasi to'g'ri qaytdi), PATCH /api/goals/:id (status: COMPLETED, 200), token'siz so'rov (401), boshqa foydalanuvchining goal'ini o'zgartirishga urinish (404 — egalik tekshiruvi ishlayapti), DELETE habit va DELETE goal (204).
- 2026-08-06 — `runDailyReminderCheck()` to'g'ridan-to'g'ri chaqirildi — bajarilmagan kunlik odat uchun `[mailer]` konsol stub'iga eslatma xabari kutilgandek chiqdi.
- 2026-08-06 — `pnpm -r typecheck` — `shared`, `api`, `web` xatosiz o'tdi.
- 2026-08-06 — Test uchun yaratilgan foydalanuvchilar va ularga tegishli goal/habit/check-in yozuvlari bazadan tozalandi.

## Qarorlar
- Progress dashboard uchun alohida chart kutubxonasi (masalan Recharts) qo'shilmadi — 7 kunlik holat CSS orqali rangli katakchalar bilan ko'rsatiladi, streak son sifatida chiqadi. Kutubxona real ehtiyoj tug'ilganda (masalan uzoq muddatli trend grafigi) qo'shiladi.
- Streak har so'rovda bazadan hisoblanadi (oxirgi 90 kunlik check-in bo'yicha), alohida "streak" ustuni saqlanmaydi — ma'lumot yagona manbadan (CheckIn jadvali) kelib chiqishi uchun.
- Eslatma job'i `node-cron` bilan serverning o'zida ishlaydi (alohida worker/queue yo'q) — hozirgi masshtabda bu yetarli.

## Natija
Foydalanuvchi maqsad yaratadi, kunlik belgilaydi, streak va progress grafikda ko'rinadi.

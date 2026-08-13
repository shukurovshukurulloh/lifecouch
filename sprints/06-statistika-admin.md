# Sprint 06 — Statistika, admin panel va sayqal

**Holat:** tugadi
**Muddat:** Hafta 12–13

## Maqsad
Platformani boshqarish va butun tajribani yaxlit, sifatli ko'rinishga keltirish.

## Vazifalar
- [x] Umumiy dashboard — progress, streak, sessiyalar soni
- [x] Admin panel: coach'larni tasdiqlash, foydalanuvchilarni boshqarish, obunalarni kuzatish
- [x] To'liq responsive dizayn va dark mode
- [x] i18n asoslari (o'zbek / rus / ingliz)
- [x] Bo'sh holatlar, xato xabarlari va yuklanish holatlarini sayqallash

## Qilingan ishlar
- 2026-08-13 — Prisma sxemasiga `CoachStatus` enum (PENDING/APPROVED/REJECTED) va `Coach.status`, `rejectionNote`, `reviewedAt` maydonlari qo'shildi; migratsiya (`20260813081220_sprint06_coach_status`) real lokal DB'ga qo'llanildi.
- 2026-08-13 — Coach bo'lish oqimi qayta qurildi: `POST /coaches/me` endi darhol COACH rolini bermaydi — Coach yozuvi PENDING holatda yaratiladi (yoki REJECTED bo'lsa qayta topshiriladi). Ommaviy `GET /coaches` faqat APPROVED coachlarni ko'rsatadi. Yangi `GET /coaches/me` — foydalanuvchining o'z arizasi holatini ko'rish uchun qo'shildi.
- 2026-08-13 — `admin/` moduli kengaytirildi: `GET /admin/stats`, `GET /admin/coaches/pending`, `POST /admin/coaches/:id/approve` (COACH rolini beradi), `POST /admin/coaches/:id/reject` (ilgari tasdiqlangan bo'lsa rolni ham qaytarib oladi), `GET /admin/users` (qidiruv+pagination), `PATCH /admin/users/:id/role` (o'zini o'zgartirishdan himoyalangan), `GET /admin/subscriptions`.
- 2026-08-13 — Yangi `dashboard/` moduli: `GET /api/dashboard/summary` — faol/bajarilgan maqsadlar, eng uzun streak, shu haftadagi check-inlar, kelayotgan sessiyalar (user va coach sifatida), obuna rejasi.
- 2026-08-13 — `packages/shared`ga yangi DTO'lar qo'shildi: `CoachStatus`, `MyCoachProfile`, `DashboardSummary`, `AdminStats`, `AdminCoachApplication`, `AdminUser`, `AdminSubscription`.
- 2026-08-13 — Frontend: yangi `DashboardPage` (standart tab, statistik kartalar), yangi `AdminPage` (faqat ADMIN roliga ko'rinadi) — Umumiy holat, Coach arizalari (tasdiqlash/rad etish), Foydalanuvchilar (qidiruv, rol o'zgartirish, pagination), Obunalar bo'limlari bilan. `ProfilePage`da coach ariza holati (kutilmoqda/tasdiqlangan/rad etilgan + qayta ariza topshirish) ko'rsatiladi.
- 2026-08-13 — To'liq i18n infratuzilmasi qo'shildi (`apps/web/src/i18n/`) — o'zbek/rus/ingliz, `LocaleProvider` + `useTranslation` hook, tipavfydor lug'atlar (`uz.ts` kanonik, `ru.ts`/`en.ts` TS orqali kalitlar mosligini tekshiradi), header'da til almashtirgich. Barcha mavjud sahifalar shu tizimga o'tkazildi.
- 2026-08-13 — Dark mode qo'shildi: `ThemeContext` (light/dark/system, localStorage'da saqlanadi) + header'dagi uch holatli toggle; `App.css` CSS custom properties'ga o'tkazildi (light/dark palitralar), responsive media query'lar qo'shildi (mobil nav, admin kartalari, chat balandligi va h.k.).
- 2026-08-13 — Umumiy `common/Feedback.tsx` (LoadingState/ErrorBanner/EmptyState) barcha sahifalarda bir xil qo'llanildi, xato holatlariga qayta urinish tugmasi qo'shildi.
- 2026-08-13 — `pnpm -r typecheck` va `pnpm -r build` uchala paketda toza o'tdi. Real lokal Postgres DB'da to'liq oqim qo'lda tekshirildi: ariza→PENDING→ommaviy ro'yxatda yo'q→admin approve→COACH roli va ommaviy ro'yxatda paydo bo'lishi→admin reject (rolni qaytarib olish)→admin users/subscriptions/stats ro'yxatlari→dashboard summary→o'zini-o'zi rol o'zgartirishdan himoya. Test uchun yaratilgan vaqtinchalik hisoblar bazadan tozalandi. Chrome orqali Dashboard, Admin panel, dark mode va til almashtirish vizual tekshirildi — konsolda xato yo'q.

## Qarorlar
- Coach bo'lish endi ikki bosqichli: foydalanuvchi ariza beradi (`Coach.status=PENDING`, rol hali USER), keyin ADMIN admin panelidan tasdiqlaydi/rad etadi — tasdiqlangandagina rol COACH'ga o'tadi va coach ommaviy ro'yxatda ko'rinadi. Bu Sprint 03'da qabul qilingan "darhol COACH bo'lish" (self-serve) xatti-harakatini almashtiradi.

## Natija
Admin platformani nazorat qiladi, ilova barcha ekranlarda va ikkala mavzuda yaxshi ko'rinadi.

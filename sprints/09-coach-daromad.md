# Sprint 09 — Coach daromadi va pul yechish

**Holat:** yakunlangan
**Muddat:** Hafta 16

## Maqsad
Coach'lar o'z daromadini ko'rishi va pul yechish (payout) so'rovi yuborishi —
admin so'rovlarni ko'rib chiqib qo'lda (bank o'tkazmasi va h.k.) to'laydi va
"to'landi" deb belgilaydi.

## Vazifalar
- [x] Sessiya narxini bron paytida coach narxidan "suratga olish"
- [x] O'tib ketgan sessiyalarni avtomatik COMPLETED qiladigan cron job
- [x] Coach daromad hisobi (jami/to'langan/kutilayotgan/yechish mumkin)
- [x] Coach uchun pul yechish so'rovi yuborish oqimi
- [x] Admin panelda so'rovlarni ko'rib chiqish (to'landi/rad etish)

## Qilingan ishlar
- 2026-08-25 — **Kashfiyot (kod tekshiruvidan):** coach'lar sessiya uchun
  haqiqatda hech narsa "topmasdi" — `Coach.priceCents` faqat reklama sifatida
  ko'rsatilardi, bron qilish faqat PRO/PREMIUM obunaga bog'liq edi, sessiyaga
  narx umuman biriktirilmasdi. Bundan tashqari `SessionStatus.COMPLETED`
  sxemada bor va `MySessionsPage.tsx`da tarjima kaliti tayyor edi, lekin hech
  qayerda o'rnatilmasdi. Ikkalasi ham shu sprintda to'g'irlandi.
- 2026-08-25 — Prisma: `Session`ga `priceCents Int?`/`currency String?`
  qo'shildi (bron paytida coach narxidan suratga olinadi — coach keyin
  narxini o'zgartirsa ham tarixiy daromad o'zgarmaydi). Yangi `PayoutStatus`
  enum (`PENDING`/`PAID`/`REJECTED`) va `PayoutRequest` modeli (`amountCents`,
  `currency`, `note`, `adminNote`, `requestedAt`, `processedAt`) — `Coach`
  bilan bog'langan. Migratsiya `20260825094730_add_payouts` (SQL diff qo'lda
  generatsiya qilinib, `prisma migrate deploy` bilan qo'llanildi — Sprint
  08'dagi bilan bir xil usul, `prisma migrate dev` bu sandbox muhitda
  interaktiv rejim talab qilib ishlamaydi).
- 2026-08-25 — `apps/api/src/sessions/routes.ts`: bron qilishda (`POST /`)
  coach'ning joriy `priceCents`/`currency`si sessiyaga yoziladi. Yangi
  `sessions/completionJob.ts` (`reminders/job.ts` andozasida) —
  `runSessionCompletionCheck()` o'tib ketgan (`scheduledAt + durationMinutes
  <= hozir`) CONFIRMED sessiyalarni COMPLETED'ga o'tkazadi, `index.ts`da har
  15 daqiqada ishga tushadigan cron sifatida ulandi.
- 2026-08-25 — Yangi `apps/api/src/payouts/` moduli: `service.ts`
  (`getEarningsSummary()` — COMPLETED sessiyalar/PayoutRequest'lar
  yig'indisidan real vaqtda daromad hisoblaydi, alohida "balans" ustuni
  saqlanmaydi), `routes.ts` (`GET/POST /payouts/me`, faqat COACH roli —
  so'rov yaratish `$transaction` ichida balansni qayta hisoblab tekshiradi,
  poyga holatisiz). `admin/routes.ts`ga `GET /admin/payouts` (sahifalangan,
  status filtri bilan) va `PATCH /admin/payouts/:id` (faqat PENDING'ni
  PAID/REJECTED qiladi, ikkinchi marta ko'rib chiqishga urinish 409) qo'shildi.
- 2026-08-25 — `apps/web`: yangi `earnings/EarningsPage.tsx` (faqat COACH
  roli uchun yangi "Daromad" tab'i — balans kartalari, so'rov formasi,
  so'rovlar tarixi), admin panelga yangi "Pul yechish so'rovlari" tab'i
  (`PayoutsTab` — ro'yxat, "To'landi"/"Rad etish" izoh bilan).
  `MySessionsPage.tsx`da "Coach sifatida" ro'yxatida har bir sessiya
  qiymati ko'rsatiladi. `lib/api.ts`ga `fetchMyEarnings`, `requestPayout`,
  `fetchAdminPayouts`, `updatePayoutStatus` qo'shildi.
- 2026-08-25 — Testlar: `sessions.test.ts`ga narx suratga olish testi;
  yangi `test/sessionCompletion.test.ts` (3 test — o'tgan/kelajakdagi/bekor
  qilingan sessiyalarni to'g'ri ajratadi); yangi `test/payouts.test.ts` (6
  test — daromad hisobi, balansdan oshgan so'rov rad etilishi, yaroqli
  so'rov va balans kamayishi, admin PAID/qayta ko'rib chiqolmaslik, rol
  tekshiruvlari). Tekshirildi: `pnpm -r typecheck`, `pnpm test` (92/92: 78
  api + 14 web), `pnpm --filter @lifecouch/web build`, `pnpm --filter
  @lifecouch/api build`, `pnpm audit --prod --audit-level=high` (yangi
  muammo yo'q — yangi dependency qo'shilmadi).

## Qarorlar
- Payout mexanizmi sifatida **qo'lda boshqariladigan so'rov** tanlandi
  (Stripe Connect emas) — coach so'rov yuboradi, admin pulni tashqarida
  jo'natib "to'landi" deb belgilaydi. Stripe Connect (har bir coach uchun
  Connected Account, KYC, yangi webhook oqimlari) hozirgi bosqich (kichik,
  cheklangan beta-guruh) uchun ortiqcha murakkablik deb topildi.
- Daromad("balans") alohida ustun/jadval sifatida saqlanmaydi — har doim
  COMPLETED sessiyalar va PayoutRequest holatlari yig'indisidan real vaqtda
  hisoblanadi (`payouts/service.ts`). Bu ma'lumotlar bazasi bitta manba
  ekanligini (single source of truth) kafolatlaydi — balans hech qachon
  asosiy yozuvlardan "uzilib qolmaydi".
- Sessiya narxi **bron paytida coach narxidan suratga olinadi**
  (`Session.priceCents`/`currency`) — coach keyinroq o'z narxini o'zgartirsa
  ham, allaqachon bron qilingan/yakunlangan sessiyalarning tarixiy qiymati
  o'zgarmaydi.
- `PayoutRequest`da alohida "kim ko'rib chiqdi" (`processedBy`) maydoni yo'q
  — faqat `processedAt` (qachon) kuzatiladi, mavjud `Coach.reviewedAt`
  konventsiyasiga mos (u ham "kim tasdiqladi"ni saqlamaydi).

## Natija
Coach o'z profilida daromadini (jami/to'langan/kutilayotgan/yechish mumkin)
ko'radi, pul yechish so'rovi yuboradi; admin panelda so'rovlarni ko'rib
chiqib to'lov qilingandan keyin "to'landi" deb belgilaydi.

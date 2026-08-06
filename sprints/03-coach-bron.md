# Sprint 03 — Coach profili, bron qilish va chat

**Holat:** tugallangan
**Muddat:** Hafta 6–7

## Maqsad
Foydalanuvchi coach tanlaydi, sessiya band qiladi va u bilan real vaqtda yozishadi.

## Vazifalar
- [x] Coach profil sahifasi (mutaxassislik, narx, sharhlar) — kod tayyor (sharhlar keyingi sprintga qoldirildi)
- [x] Mavjudlik jadvali (availability calendar) — kod tayyor
- [x] Booking oqimi — band qilish, bekor qilish — kod tayyor (qayta rejalashtirish bekor qilib qayta bron qilish orqali amalga oshiriladi)
- [x] Real-time chat (Socket.io, xabar tarixi saqlanadi) — kod tayyor
- [x] Video-sessiya havolasi — vaqtinchalik generatsiya qilinadigan havola (Daily.co/Zoom hali ulanmagan)
- [x] Real bazada uchidan-uchigacha tekshirish — bajarildi

## Qilingan ishlar
- 2026-08-03 — Prisma sxemasiga `AvailabilitySlot` modeli qo'shildi, `Session` unga `slotId` orqali bog'landi.
- 2026-08-03 — Backend: `coaches/routes.ts` (coach ro'yxati, o'zini coach qilib belgilash, mavjudlik jadvali CRUD), `sessions/routes.ts` (bron qilish/bekor qilish, video-havola generatsiyasi), `chat/routes.ts` (xabar tarixi) va `chat/socket.ts` (Socket.io, JWT orqali autentifikatsiya, xonalar userId bo'yicha).
- 2026-08-03 — `index.ts` `http.createServer`ga o'tkazildi, shu server ustida Express ham, Socket.io ham ishlaydi.
- 2026-08-03 — Frontend: `CoachesPage` (ro'yxat, vaqtlarni ko'rish, bron qilish), `MySessionsPage` (mening bronlarim/coach sifatidagi sessiyalarim, bekor qilish, video havola), `ChatPage` (tarix + real-time), `ProfilePage`ga "Coach bo'lish" bo'limi qo'shildi. `App.tsx`ga "Coachlar/Sessiyalar/Xabarlar" tablari qo'shildi.
- 2026-08-03 — `packages/shared`ga `PublicCoach`, `AvailabilitySlotDto`, `SessionBooking`, `ChatMessage` tiplari qo'shildi.
- 2026-08-03 — Uchala paket typecheck va `vite build`dan xatosiz o'tdi, API real ishga tushirilib `/health` tekshirildi.
- 2026-08-03 — Real bazada tekshirish Sprint 01/02'dagi bilan bir xil sababga ko'ra bloklangan (mahalliy Postgres `lifecouch` roli parol muammosi hali hal qilinmagan).
- 2026-08-06 — Blokirovka bartaraf etildi (baza Sprint 01'da allaqachon tuzatilgan edi). API server real ishga tushirilib, real bazada sinaldi: coach bo'lish (`POST /api/coaches/me`, 201, rol COACH'ga o'tdi), mavjudlik slot qo'shish (`POST /api/coaches/me/availability`, 201), coachlar ro'yxati va mavjudlik jadvali (`GET /api/coaches`, `GET /api/coaches/:id/availability`, 200), sessiya band qilish (`POST /api/sessions`, 201, video-havola avtomatik generatsiya qilindi), bo'sh slotni qayta band qilishga urinish (409, to'g'ri rad etildi), sessiyani bekor qilish (`PATCH /api/sessions/:id/cancel`, 204, slot qayta bo'shadi), chat REST tarixi (`GET /api/chat/:otherUserId/messages`, 200) va real-time chat (Socket.io: JWT orqali autentifikatsiya, `message:send` bazaga saqlanib ikki tomonga `message:new` orqali yetkazildi, tokensiz ulanish rad etildi).
- 2026-08-06 — Topilgan va tuzatilgan xato: coach bo'lgandan keyin frontend `AuthContext.refreshProfile()` faqat `GET /api/users/me`ni chaqirardi, bu access token ichidagi `role` claim'ini yangilamasdi — natijada UI foydalanuvchini COACH deb ko'rsatsa ham keyingi so'rovlar eski "USER" roli bilan yuborilib, coach-only endpointlar 403 bilan rad etilardi. Tuzatildi: `AuthContext.tsx`da `refreshProfile` endi `api.fetchMe()` o'rniga `api.refresh()`ni chaqiradi (ham foydalanuvchi ma'lumotini, ham yangilangan rolli access tokenni oladi). Tuzatgandan keyin qayta test qilindi — slot qo'shish 201 bilan muvaffaqiyatli bo'ldi.
- 2026-08-06 — `pnpm -r typecheck` tuzatishdan keyin ham barcha paketlarda xatosiz o'tdi. Test uchun yaratilgan foydalanuvchilar va tegishli yozuvlar bazadan tozalandi.

## Qarorlar
- Coach bo'lish o'z-o'zidan (self-serve): foydalanuvchi mutaxassislik+narx kiritib coach profilini yaratadi, roli avtomatik `COACH`ga o'tadi. Admin tasdiqlash bosqichi qo'shilmadi — bu Sprint 06'ning "Admin panel" vazifasiga qoldirildi.
- Qayta rejalashtirish uchun alohida endpoint yozilmadi — mavjud "bekor qilish" + "yangi bron qilish" orqali amalga oshiriladi, alohida abstraktsiya hozircha ortiqcha.
- Video-konferensiya uchun haqiqiy xizmat (Daily.co/Zoom) ulanmadi — `sessions/video.ts`da vaqtinchalik havola generatsiya qilinadi, xuddi `mailer.ts` kabi keyinchalik almashtiriladigan stub sifatida.
- Chat uchun alohida Conversation modeli qo'shilmadi — Message to'g'ridan-to'g'ri senderId/receiverId orqali ishlaydi, bu Sprint 0'da qabul qilingan sxemaga mos.
- Frontendda foydalanuvchi roli o'zgaradigan har qanday amaldan keyin (masalan coach bo'lish) profil `api.fetchMe()` bilan emas, `api.refresh()` bilan yangilanishi shart — chunki faqat `refresh` yangi `role` claim'li access token qaytaradi, `fetchMe` esa faqat foydalanuvchi ma'lumotini o'zgartiradi, tokenni emas.

## Natija
Foydalanuvchi coach bilan sessiya band qiladi va chat orqali oldindan yozishadi.

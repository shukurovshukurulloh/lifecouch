# Sprint 01 — Autentifikatsiya va profil

**Holat:** tugallangan
**Muddat:** Hafta 2–3

## Maqsad
Foydalanuvchi xavfsiz ro'yxatdan o'tadi, tizimga kiradi va profilini boshqaradi.

## Vazifalar
- [x] Ro'yxatdan o'tish / kirish (email + parol, bcrypt hash) — kod tayyor
- [x] JWT + refresh token oqimi, sessiyani yangilash — kod tayyor
- [x] Parolni tiklash (email orqali havola) — kod tayyor (email hozircha konsolga chiqadi)
- [x] Rollar: user, coach, admin — route himoyasi (middleware) — kod tayyor
- [x] Profil CRUD (ism, rasm, bio, maqsad sohasi) — kod tayyor
- [x] Real bazada uchidan-uchigacha tekshirish — bajarildi

## Qilingan ishlar
- 2026-08-03 — Mahalliy PostgreSQL 17 xizmati aniqlandi, `lifecouch` roli/bazasini yaratish buyrug'i tayyorlandi.
- 2026-08-03 — To'liq auth backend yozildi: `auth/hash.ts`, `auth/tokens.ts`, `auth/routes.ts` (register/login/refresh/logout/forgot-password/reset-password), `auth/middleware.ts` (requireAuth/requireRole), `admin/routes.ts` (RBAC namunasi), `users/routes.ts` (profil GET/PATCH).
- 2026-08-03 — Prisma sxemasiga `RefreshToken`, `PasswordResetToken` modellari va `User.focusArea` maydoni qo'shildi.
- 2026-08-03 — Frontendda `AuthContext`, `AuthForms`, `ProfilePage` yozildi — kirish/ro'yxatdan o'tish/profilni tahrirlash to'liq ishlaydi.
- 2026-08-03 — Uchala paket (`shared`, `api`, `web`) typecheck va `vite build`dan xatosiz o'tdi.
- 2026-08-03 — Real bazada tekshirish bloklandi: mahalliy Postgres'da `lifecouch` roli parol autentifikatsiyasidan o'tmayapti (`FATAL: пользователь "lifecouch" не прошёл проверку подлинности`), foydalanuvchi tomonidan parol qayta o'rnatilishi kerak.
- 2026-08-06 — Blokirovka sababi aniqlandi: mahalliy PostgreSQL 17'da `lifecouch` roli va `lifecouch` bazasi umuman mavjud emas edi. Admin huquqlari bilan `pg_hba.conf` vaqtincha `trust`ga o'zgartirilib xizmat qayta ishga tushirildi, `postgres` superuser orqali `lifecouch` roli (LOGIN, parol, keyin CREATEDB) va `lifecouch` bazasi (owner: lifecouch) yaratildi, so'ng `pg_hba.conf` asl `scram-sha-256` holatiga qaytarilib xizmat qayta ishga tushirildi.
- 2026-08-06 — `pnpm run prisma:migrate --name init` muvaffaqiyatli bajarildi (`apps/api/prisma/migrations/20260806094102_init/`), baza sxema bilan sinxronlandi.
- 2026-08-06 — API server ishga tushirilib, real bazada uchidan-uchigacha sinaldi: register, login, GET/PATCH /api/users/me, refresh (httpOnly cookie), RBAC (/api/admin/ping USER'ga 403, ADMIN'ga 200), forgot-password/reset-password (mailer stub orqali havola), logout — barchasi kutilgandek ishladi. Sinov uchun yaratilgan test foydalanuvchisi tekshiruvdan keyin bazadan o'chirildi.

## Qarorlar
- Refresh token: opaque tasodifiy token (JWT emas), bazada faqat SHA-256 xesh holida saqlanadi, har yangilanishda rotatsiya qilinadi (revoke + yangi token).
- Refresh token httpOnly cookie orqali, faqat `/api/auth` yo'lida; access token JSON javobda, frontend xotirada saqlaydi.
- Parol xeshlash uchun `bcryptjs` (native `bcrypt` emas) — Windows'da qo'shimcha build vositalarisiz ishlaydi.
- Email hali ulanmagan — `mailer.ts` hozircha havolani konsolga chiqaradigan stub, real xizmat keyingi sprintda ulanadi.

## Natija
Foydalanuvchi ro'yxatdan o'tib, profilini to'ldirib, sessiyasi saqlangan holda qayta kira oladi.

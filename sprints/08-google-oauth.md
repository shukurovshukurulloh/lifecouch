# Sprint 08 — Google orqali kirish (OAuth)

**Holat:** yakunlangan
**Muddat:** Hafta 16

## Maqsad
Foydalanuvchi email/parol o'rniga (yoki ustiga) bitta tugma bilan Google
hisobi orqali ro'yxatdan o'tishi/kirishi mumkin bo'lishi — ro'yxatdan o'tish
to'sig'ini kamaytirish, beta-guruh uchun ayniqsa foydali.

## Vazifalar
- [x] Backend: Google ID token'ni server tomonda tekshirish (`google-auth-library`)
- [x] Hisob avtomatik yaratish/bog'lash (googleId → mavjud email → yangi hisob)
- [x] Beta-reliz (taklifnoma-kod) bilan integratsiya — Google orqali yangi
  hisob yaratish ham cheklovni hurmat qiladi
- [x] Frontend: Google Identity Services tugmasi (kalit yo'q bo'lsa ko'rinmaydi)

## Qilingan ishlar
- 2026-08-25 — Prisma sxemasi: `User.passwordHash` majburiydan ixtiyoriyga
  o'tkazildi (`String?` — Google-only hisoblarda parol yo'q) va yangi
  `User.googleId String? @unique` qo'shildi. Migratsiya
  `20260825084641_add_google_oauth` (mavjud qatorlarga ta'sir qilmaydi —
  faqat ustunni bo'shashtiradi + yangi ustun/indeks qo'shadi).
- 2026-08-25 — `apps/api`ga rasmiy `google-auth-library` qo'shildi. Yangi
  `src/auth/googleClient.ts` — `billing/stripeClient.ts`/`ai/client.ts` bilan
  bir xil naqsh (`getGoogleClient()`/`isGoogleConfigured()`, `GOOGLE_CLIENT_ID`
  bo'lmasa `null`).
- 2026-08-25 — `src/auth/routes.ts`: yangi `POST /auth/google` — Google ID
  token (`credential`) `verifyIdToken`da tekshiriladi (`email_verified`
  shart), so'ng `googleId` → mavjud `email` → yangi hisob tartibida
  topilib/yaratilib, `issueSession()` orqali xuddi login/register kabi
  sessiya beriladi. Register'dagi taklifnoma-kod tekshirish/iste'mol qilish
  mantig'i umumiy `consumeInviteCode()` yordamchisiga chiqarildi — Google
  handler ham shu funksiyani ishlatadi: `BETA_INVITE_REQUIRED=true` bo'lganda
  Google orqali YANGI hisob yaratish ham kod talab qiladi (aks holda beta
  cheklovini chetlab o'tgan bo'lardi), mavjud hisobga bog'lash uchun kod
  shart emas. `login` handler'ga `passwordHash` null tekshiruvi qo'shildi
  (Google-only hisobga parol bilan kirishga urinish generik 401 bilan rad
  etiladi, hisob turi oshkor qilinmaydi).
- 2026-08-25 — `apps/web`: yangi `auth/googleIdentity.ts` (GSI skriptini
  runtime'da dinamik yuklaydi) va `auth/GoogleSignInButton.tsx`
  (`VITE_GOOGLE_CLIENT_ID` bo'lmasa `null` qaytaradi — tugma umuman
  ko'rinmaydi; bor bo'lsa `ThemeContext`ga qarab och/tungi tugma chizadi).
  `lib/api.ts`ga `googleLogin()`, `AuthContext.tsx`ga `loginWithGoogle()`
  (login/register bilan bir xil naqsh) qo'shildi. `AuthForms.tsx` forma
  ostiga "yoki" ajratuvchi + Google tugmasini qo'shdi (faqat kalit mavjud
  bo'lganda); mavjud taklifnoma-kod maydoni (beta yoqilganda) Google oqimiga
  ham uzatiladi.
- 2026-08-25 — Yangi `apps/api/test/googleAuth.test.ts` (8 test,
  `vi.mock("google-auth-library")` + `vi.hoisted()` bilan) — sozlanmagan
  holat (`501`), yangi hisob yaratish, mavjud email'ga bog'lash, xuddi shu
  `googleId` bilan qayta kirish, `email_verified: false` rad etilishi, beta
  yoqilganda kodsiz/kod bilan yangi hisob, beta yoqilganda mavjud hisobga
  bog'lash kod talab qilmasligi. `auth.test.ts`ga parolsiz hisobga parol
  bilan kirish rad etilishini tekshiruvchi test, `AuthContext.test.tsx`ga
  `loginWithGoogle()` argumentlarini tekshiruvchi test qo'shildi. Tekshirildi:
  `pnpm -r typecheck`, `pnpm test` (83/83: 69 api + 14 web),
  `pnpm --filter @lifecouch/web build`, `pnpm --filter @lifecouch/api build`,
  `pnpm audit --prod --audit-level=high` (yangi muammo yo'q).
- 2026-08-25 — `apps/api/.env.example` va `apps/web/.env.example`ga
  `GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_ID` (ikkalasi ham ixtiyoriy, bir xil
  qiymat) qo'shildi; `render.yaml`ga ikkalasi ham `sync: false` bilan
  qo'shildi (`VITE_GOOGLE_CLIENT_ID` build vaqtida kerak — bitta Render
  web-service backend'ni ham, build qilingan frontend'ni ham xizmat qiladi).

## Qarorlar
- Faqat **Google** qamrab olindi, Apple Sign In keyingi sprintga qoldirildi —
  Apple Developer Program pullik a'zoligi ($99/yil) va qo'shimcha murakkablik
  (ES256 client secret, redirect oqimi) sabab.
- `GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_ID` yo'qligida boshqa tashqi
  xizmatlar (Stripe/AI/mailer) kabi "lokal stub" qo'llanmadi — OAuth
  tekshiruvini soxta simulyatsiya qilib bo'lmaydi. Buning o'rniga: backend
  `501` bilan aniq xato qaytaradi, frontend esa tugmani umuman
  ko'rsatmaydi — bu Sentry'ning "DSN yo'q → jim ishlamaydi" konventsiyasiga
  yaqinroq, lekin CLAUDE.md'dagi qoidaning ruhi saqlanadi: kalit yo'qligida
  ilova buzilmaydi, kalit qo'shilganda chaqiruvchi tomon (frontend/backend
  route kodi) o'zgarishsiz haqiqiy xizmatga o'tadi.
- Google orqali kirish email bo'yicha mavjud hisobga **avtomatik bog'lanadi**
  (qo'shimcha tasdiqlashsiz) — Google `email_verified: true` kafolat
  bergani uchun xavfsiz deb topildi. Aks holda foydalanuvchi bir xil email
  bilan ikkita ajralgan hisobga ega bo'lib qolardi.
- `env.ts`da `betaInviteRequired`dan keyin `googleClientId` ham **getter**
  sifatida yozildi (oddiy maydon emas) — faqat integratsion testlarda process
  restart qilmasdan yoqib/o'chirish uchun; boshqa barcha ixtiyoriy kalitlar
  (Stripe, Anthropic, Sentry) hali ham oddiy maydon bo'lib qoladi, chunki
  ularning "real" tarmog'i testlarda sinalmaydi.

## Natija
Foydalanuvchi login/register formasida "Google bilan kirish" tugmasi orqali
bitta bosishda hisob ochadi yoki mavjud hisobiga kiradi; kalit sozlanmagan
muhitda (masalan lokal dev, kalit hali qo'shilmagan production) tugma
ko'rinmaydi va email/parol oqimi o'zgarishsiz ishlayveradi.

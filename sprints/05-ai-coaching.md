# Sprint 05 — AI coaching moduli

**Holat:** tugadi
**Muddat:** Hafta 10–11

## Maqsad
Foydalanuvchi o'z maqsadi va progressi asosida shaxsiylashtirilgan AI tavsiya oladi.

## Vazifalar
- [x] Claude API'ni backend proxy orqali ulash (kalit frontendga chiqmaydi)
- [x] Foydalanuvchi konteksti (maqsad + so'nggi progress) asosida prompt qurish
- [x] AI chat interfeysi (streaming javob)
- [x] So'rovlar sonini cheklash (rate limit) va xarajatni nazorat qilish
- [x] Muloqot tarixini saqlash va ko'rsatish

## Qilingan ishlar
- 2026-08-13 — Prisma'ga `AiMessageRole` enum va `AiMessage` modeli qo'shildi, migratsiya (`20260813040607_sprint05_ai_coaching`) real Postgres'da qo'llanildi.
- 2026-08-13 — `apps/api/src/ai/client.ts`, `context.ts`, `service.ts`, `routes.ts` qo'shildi: Claude API'ga stub/real proxy, foydalanuvchi maqsad+streak kontekstidan prompt qurish, kunlik xabar limiti (`remainingAiMessagesToday`) va streaming javob (`streamAiReply`), `GET/POST /api/ai/messages` endpointlari `index.ts`ga ulandi.
- 2026-08-13 — `billing/plans.ts`ga `aiMessagesPerDay` qo'shildi (FREE=5, PRO=50, PREMIUM=cheksiz), `env.ts`ga `anthropicApiKey`/`anthropicModel`, `.env.example`ga mos yozuvlar qo'shildi; `@anthropic-ai/sdk` paketi o'rnatildi.
- 2026-08-13 — `packages/shared`ga `AiMessageDto`, `AiUsageDto`, `AiMessageRole` va `PlanDefinitionDto.aiMessagesPerDay` qo'shildi.
- 2026-08-13 — Frontendda `apps/web/src/ai/AiCoachPage.tsx` (streaming chat interfeysi, kunlik limit ko'rsatkichi), `lib/api.ts`ga `fetchAiHistory`/`sendAiMessage` (raw fetch + ReadableStream), `App.tsx`ga "AI Coach" tab, `App.css`ga `.ai-usage-hint`/`.ai-coach-error` qo'shildi.
- 2026-08-13 — Real Postgres va real brauzerda (claude-in-chrome) uchidan-uchigacha tekshirildi: stub javob kontekstga mos stream bo'ldi, FREE tarifda 5-xabardan keyin 429 to'g'ri qaytdi, Pro'ga o'tgach limit 45/50'ga yangilandi va yangi xabar real vaqtda stream bo'lib keldi.

## Qarorlar
- `ANTHROPIC_API_KEY` sozlanmagan (dev) holatda `ai/client.ts` `null` qaytaradi va `ai/service.ts` shu holatda kontekstga asoslangan (foydalanuvchi maqsadlari/streaklariga qarab) deterministik javobni so'z-so'z stream qilib simulyatsiya qiladi — xuddi `mailer.ts`/`sessions/video.ts`/`billing/stripeClient.ts` stub'lari kabi, CLAUDE.md'dagi "Tashqi xizmatlar konventsiyasi"ga mos. Kalit qo'shilganda `getAnthropicClient()` haqiqiy `@anthropic-ai/sdk` klientini qaytaradi va `streamAiReply()` xuddi shu funksiya ichida haqiqiy Claude API'dan (`client.messages.stream()`, model `ANTHROPIC_MODEL` yoki default "claude-sonnet-5") streaming javob oladi — chaqiruvchi tomon (`ai/routes.ts`, frontend) o'zgarishsiz qoladi.

## Natija
Foydalanuvchi AI bilan suhbatlashadi va o'z real progressiga mos maslahat oladi.

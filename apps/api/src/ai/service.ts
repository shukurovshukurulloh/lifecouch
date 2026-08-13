import { AiMessageRole } from "@prisma/client";
import { PLAN_CATALOG } from "../billing/plans.js";
import { ensureSubscription } from "../billing/service.js";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { getAnthropicClient } from "./client.js";

const SYSTEM_PROMPT =
  "Sen Lifecouch ilovasidagi shaxsiy hayot-coach yordamchisisan. Foydalanuvchining maqsadlari va odat " +
  "streaklariga tayanib, qisqa, iliq va amaliy maslahat ber. O'zbek tilida javob yoz. Tibbiy yoki moliyaviy " +
  "professional maslahat o'rnini bosmasligini kerak bo'lsa eslat, lekin buni har javobda takrorlama.";

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
}

export interface AiUsage {
  limit: number | null;
  used: number;
  remaining: number | null;
}

/** Bugun (server vaqti bo'yicha) foydalanuvchi yuborgan AI xabarlari soni. */
export async function countTodayUserMessages(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return prisma.aiMessage.count({
    where: { userId, role: AiMessageRole.USER, createdAt: { gte: startOfDay } },
  });
}

/** Foydalanuvchi tarifiga qarab kunlik AI xabar limiti va qolgan miqdorni hisoblaydi. */
export async function remainingAiMessagesToday(userId: string): Promise<AiUsage> {
  const subscription = await ensureSubscription(userId);
  const limit = PLAN_CATALOG[subscription.plan].aiMessagesPerDay;
  const used = await countTodayUserMessages(userId);
  return { limit, used, remaining: limit === null ? null : Math.max(0, limit - used) };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Kontekstga asoslangan sodda, deterministik maslahat — Claude API kaliti hali
 * ulanmagan (dev muhit) holatda ishlatiladi, xuddi mailer.ts/stripeClient.ts kabi stub.
 */
function buildStubReply(userContext: string, message: string): string {
  const hasGoals = !userContext.includes("Hali faol maqsad qo'shmagan");
  const intro = hasGoals
    ? "Progressingizni ko'rib chiqdim — yaxshi davom etyapsiz."
    : "Hali faol maqsad qo'shmagansiz — \"Maqsadlar\" bo'limidan birinchi maqsadingizni yarating, shunda tavsiyalarim ancha aniqroq bo'ladi.";
  return (
    `${intro} Savolingiz bo'yicha: "${message}". Kichik qadamlardan boshlang — bugun bitta odatni bajarishga ` +
    "e'tibor bering va streak'ingizni uzmang. (Bu — sinov rejimidagi javob, chunki ANTHROPIC_API_KEY hali " +
    "sozlanmagan; kalit qo'shilgach, shu yerda haqiqiy Claude javobi ko'rinadi.)"
  );
}

/**
 * AI javobini bo'lak-bo'lak (streaming) qaytaradi. ANTHROPIC_API_KEY sozlangan bo'lsa
 * haqiqiy Claude API'ga so'rov yuboradi, aks holda kontekstga asoslangan stub javobni
 * so'z-so'z "stream" qiladi — chaqiruvchi tomon (route) ikkala holatda ham bir xil ishlaydi.
 */
export async function* streamAiReply(input: {
  userContext: string;
  history: HistoryEntry[];
  message: string;
}): AsyncGenerator<string> {
  const client = getAnthropicClient();
  if (client) {
    const stream = client.messages.stream({
      model: env.anthropicModel,
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\nFoydalanuvchi konteksti:\n${input.userContext}`,
      messages: [...input.history, { role: "user", content: input.message }],
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
    return;
  }

  const reply = buildStubReply(input.userContext, input.message);
  const words = reply.split(" ");
  for (let i = 0; i < words.length; i += 1) {
    yield i === words.length - 1 ? words[i] : `${words[i]} `;
    await delay(15);
  }
}

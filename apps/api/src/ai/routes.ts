import { AiMessageRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { captureError } from "../monitoring/sentry.js";
import { buildUserContext } from "./context.js";
import { remainingAiMessagesToday, streamAiReply } from "./service.js";

export const aiRouter = Router();
aiRouter.use(requireAuth);

aiRouter.get(
  "/messages",
  asyncHandler(async (req, res) => {
    const [messages, usage] = await Promise.all([
      prisma.aiMessage.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "asc" },
        take: 200,
      }),
      remainingAiMessagesToday(req.user!.id),
    ]);
    res.json({ messages, usage });
  }),
);

const sendSchema = z.object({
  content: z.string().min(1, "Xabar bo'sh bo'lishi mumkin emas").max(2000, "Xabar juda uzun"),
});

/**
 * Foydalanuvchi xabarini saqlaydi va AI javobini bo'lak-bo'lak (chunked plain-text)
 * oqim sifatida qaytaradi — frontend `response.body`ni o'qib, matnni real vaqtda ko'rsatadi.
 */
aiRouter.post(
  "/messages",
  asyncHandler(async (req, res) => {
    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const usage = await remainingAiMessagesToday(req.user!.id);
    if (usage.remaining === 0) {
      res.status(429).json({
        error: `Kunlik AI xabar limitiga yetdingiz (${usage.limit} ta). Ko'proq xabar uchun "Tarif" bo'limidan yuqori rejaga o'ting yoki ertaga qayta urining.`,
      });
      return;
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    const [userContext, historyRows] = await Promise.all([
      buildUserContext(user.id, user.name),
      prisma.aiMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);
    const history = historyRows
      .reverse()
      .map((m) => ({ role: (m.role === AiMessageRole.USER ? "user" : "assistant") as "user" | "assistant", content: m.content }));

    await prisma.aiMessage.create({
      data: { userId: user.id, role: AiMessageRole.USER, content: parsed.data.content },
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    let full = "";
    try {
      for await (const chunk of streamAiReply({ userContext, history, message: parsed.data.content })) {
        full += chunk;
        res.write(chunk);
      }
    } catch (err) {
      captureError(err, "[ai] javob generatsiya qilishda xato:");
      if (!full) {
        full = "Kechirasiz, AI javob berishda xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.";
        res.write(full);
      }
    }

    await prisma.aiMessage.create({ data: { userId: user.id, role: AiMessageRole.ASSISTANT, content: full } });
    res.end();
  }),
);

import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { getEarningsSummary, getMyEarningsSummary } from "./service.js";
import { toPayoutRequestDto } from "./serialize.js";

export const payoutsRouter = Router();
payoutsRouter.use(requireAuth, requireRole(Role.COACH));

payoutsRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const coach = await prisma.coach.findUniqueOrThrow({ where: { userId: req.user!.id } });
    const [summary, requests] = await Promise.all([
      getMyEarningsSummary(coach.id),
      prisma.payoutRequest.findMany({ where: { coachId: coach.id }, orderBy: { requestedAt: "desc" } }),
    ]);
    res.json({ summary, requests: requests.map(toPayoutRequestDto) });
  }),
);

const requestPayoutSchema = z.object({
  amountCents: z.number().int().min(1, "Summasi 0 dan katta bo'lishi kerak"),
  note: z.string().trim().max(500).optional(),
});

payoutsRouter.post(
  "/me",
  asyncHandler(async (req, res) => {
    const parsed = requestPayoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const coach = await prisma.coach.findUniqueOrThrow({ where: { userId: req.user!.id } });

    try {
      const request = await prisma.$transaction(async (tx) => {
        // Balansni tranzaksiya ichida qayta hisoblaymiz — poyga holatida ikkita
        // parallel so'rov birgalikda balansdan oshib ketmasligi uchun.
        const summary = await getEarningsSummary(tx, coach.id);
        if (parsed.data.amountCents > summary.availableCents) {
          throw new InsufficientBalanceError();
        }
        return tx.payoutRequest.create({
          data: {
            coachId: coach.id,
            amountCents: parsed.data.amountCents,
            currency: summary.currency,
            note: parsed.data.note,
          },
        });
      });

      res.status(201).json({ request: toPayoutRequestDto(request) });
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        res.status(400).json({ error: "So'ralgan summa yechish mumkin bo'lgan balansdan oshib ketdi" });
        return;
      }
      throw err;
    }
  }),
);

class InsufficientBalanceError extends Error {}

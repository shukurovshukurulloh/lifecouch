import { SessionStatus, SubscriptionPlan } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { requirePlan } from "../billing/gate.js";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { generateVideoLink } from "./video.js";

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

sessionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const coach = await prisma.coach.findUnique({ where: { userId: req.user!.id } });
    const [asUser, asCoach] = await Promise.all([
      prisma.session.findMany({
        where: { userId: req.user!.id },
        orderBy: { scheduledAt: "asc" },
        include: { coach: { include: { user: { select: { name: true } } } } },
      }),
      coach
        ? prisma.session.findMany({
            where: { coachId: coach.id },
            orderBy: { scheduledAt: "asc" },
            include: { user: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ]);
    res.json({ asUser, asCoach });
  }),
);

const bookSchema = z.object({ slotId: z.string().min(1) });

sessionsRouter.post(
  "/",
  requirePlan(SubscriptionPlan.PRO, SubscriptionPlan.PREMIUM),
  asyncHandler(async (req, res) => {
    const parsed = bookSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const slot = await prisma.availabilitySlot.findUnique({ where: { id: parsed.data.slotId } });
    if (!slot || slot.isBooked || slot.startsAt < new Date()) {
      res.status(409).json({ error: "Bu vaqt band yoki mavjud emas" });
      return;
    }

    const session = await prisma.$transaction(async (tx) => {
      await tx.availabilitySlot.update({ where: { id: slot.id }, data: { isBooked: true } });
      // Coach'ning joriy narxi/valyutasi sessiyaga suratga olinadi (payouts/service.ts
      // coach daromadini shundan hisoblaydi) — coach keyin narxini o'zgartirsa ham
      // bu sessiyaning tarixiy qiymati o'zgarmaydi.
      const coach = await tx.coach.findUniqueOrThrow({ where: { id: slot.coachId } });
      return tx.session.create({
        data: {
          userId: req.user!.id,
          coachId: slot.coachId,
          slotId: slot.id,
          scheduledAt: slot.startsAt,
          durationMinutes: Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000),
          status: SessionStatus.CONFIRMED,
          priceCents: coach.priceCents,
          currency: coach.currency,
        },
      });
    });

    const confirmed = await prisma.session.update({
      where: { id: session.id },
      data: { videoLink: generateVideoLink(session.id) },
    });

    res.status(201).json({ session: confirmed });
  }),
);

sessionsRouter.patch(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const session = await prisma.session.findFirst({
      where: { id: req.params.id, OR: [{ userId: req.user!.id }, { coach: { userId: req.user!.id } }] },
    });
    if (!session) {
      res.status(404).json({ error: "Sessiya topilmadi" });
      return;
    }

    await prisma.$transaction([
      prisma.session.update({ where: { id: session.id }, data: { status: SessionStatus.CANCELLED } }),
      ...(session.slotId
        ? [prisma.availabilitySlot.update({ where: { id: session.slotId }, data: { isBooked: false } })]
        : []),
    ]);
    res.status(204).send();
  }),
);

import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { toPublicCoach } from "./serialize.js";

export const coachesRouter = Router();
coachesRouter.use(requireAuth);

const coachInclude = { user: { select: { name: true, avatarUrl: true, bio: true } } } as const;

coachesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const coaches = await prisma.coach.findMany({ include: coachInclude, orderBy: { createdAt: "asc" } });
    res.json({ coaches: coaches.map(toPublicCoach) });
  }),
);

const becomeCoachSchema = z.object({
  specialty: z.string().min(1, "Mutaxassislik kiritilishi shart"),
  priceCents: z.number().int().min(0),
  currency: z.string().length(3).optional(),
});

coachesRouter.post(
  "/me",
  asyncHandler(async (req, res) => {
    const parsed = becomeCoachSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const existing = await prisma.coach.findUnique({ where: { userId: req.user!.id } });
    if (existing) {
      res.status(409).json({ error: "Siz allaqachon coach sifatida ro'yxatdan o'tgansiz" });
      return;
    }

    const { specialty, priceCents, currency } = parsed.data;
    await prisma.$transaction([
      prisma.coach.create({ data: { userId: req.user!.id, specialty, priceCents, currency } }),
      prisma.user.update({ where: { id: req.user!.id }, data: { role: Role.COACH } }),
    ]);

    const coach = await prisma.coach.findUniqueOrThrow({
      where: { userId: req.user!.id },
      include: coachInclude,
    });
    res.status(201).json({ coach: toPublicCoach(coach) });
  }),
);

const updateCoachSchema = z.object({
  specialty: z.string().min(1).optional(),
  priceCents: z.number().int().min(0).optional(),
  currency: z.string().length(3).optional(),
});

coachesRouter.patch(
  "/me",
  requireRole(Role.COACH),
  asyncHandler(async (req, res) => {
    const parsed = updateCoachSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const coach = await prisma.coach.update({
      where: { userId: req.user!.id },
      data: parsed.data,
      include: coachInclude,
    });
    res.json({ coach: toPublicCoach(coach) });
  }),
);

coachesRouter.get(
  "/:coachId/availability",
  asyncHandler(async (req, res) => {
    const slots = await prisma.availabilitySlot.findMany({
      where: { coachId: req.params.coachId, isBooked: false, startsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
    });
    res.json({ slots });
  }),
);

const createSlotSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

coachesRouter.post(
  "/me/availability",
  requireRole(Role.COACH),
  asyncHandler(async (req, res) => {
    const parsed = createSlotSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const { startsAt, endsAt } = parsed.data;
    if (new Date(endsAt) <= new Date(startsAt)) {
      res.status(400).json({ error: "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak" });
      return;
    }
    const coach = await prisma.coach.findUniqueOrThrow({ where: { userId: req.user!.id } });
    const slot = await prisma.availabilitySlot.create({
      data: { coachId: coach.id, startsAt: new Date(startsAt), endsAt: new Date(endsAt) },
    });
    res.status(201).json({ slot });
  }),
);

coachesRouter.delete(
  "/me/availability/:slotId",
  requireRole(Role.COACH),
  asyncHandler(async (req, res) => {
    const coach = await prisma.coach.findUniqueOrThrow({ where: { userId: req.user!.id } });
    const slot = await prisma.availabilitySlot.findFirst({
      where: { id: req.params.slotId, coachId: coach.id, isBooked: false },
    });
    if (!slot) {
      res.status(404).json({ error: "Slot topilmadi yoki band qilingan" });
      return;
    }
    await prisma.availabilitySlot.delete({ where: { id: slot.id } });
    res.status(204).send();
  }),
);

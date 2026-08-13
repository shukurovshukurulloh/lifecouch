import { CoachStatus, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { toMyCoachProfile, toPublicCoach } from "./serialize.js";

export const coachesRouter = Router();
coachesRouter.use(requireAuth);

const coachInclude = { user: { select: { name: true, avatarUrl: true, bio: true } } } as const;

coachesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    // Faqat admin tomonidan tasdiqlangan coachlar ommaviy ro'yxatda ko'rinadi.
    const coaches = await prisma.coach.findMany({
      where: { status: CoachStatus.APPROVED },
      include: coachInclude,
      orderBy: { createdAt: "asc" },
    });
    res.json({ coaches: coaches.map(toPublicCoach) });
  }),
);

/** Joriy foydalanuvchining o'z coach arizasi/profili — tasdiqlanmagan bo'lsa ham holatini ko'rish uchun. */
coachesRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const coach = await prisma.coach.findUnique({ where: { userId: req.user!.id }, include: coachInclude });
    res.json({ coach: coach ? toMyCoachProfile(coach) : null });
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
    const { specialty, priceCents, currency } = parsed.data;

    const existing = await prisma.coach.findUnique({ where: { userId: req.user!.id } });
    if (existing && existing.status !== CoachStatus.REJECTED) {
      res.status(409).json({
        error:
          existing.status === CoachStatus.PENDING
            ? "Arizangiz hali ko'rib chiqilmoqda"
            : "Siz allaqachon coach sifatida ro'yxatdan o'tgansiz",
      });
      return;
    }

    // Yangi ariza — yoki avval rad etilgan arizani PENDING holatida qayta yuborish.
    // Rolni bu yerda O'ZGARTIRMAYMIZ: faqat admin tasdiqlagach COACH bo'ladi (bo'lim: admin/routes.ts).
    const coach = existing
      ? await prisma.coach.update({
          where: { userId: req.user!.id },
          data: { specialty, priceCents, currency, status: CoachStatus.PENDING, rejectionNote: null, reviewedAt: null },
          include: coachInclude,
        })
      : await prisma.coach.create({
          data: { userId: req.user!.id, specialty, priceCents, currency },
          include: coachInclude,
        });

    res.status(201).json({ coach: toMyCoachProfile(coach) });
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

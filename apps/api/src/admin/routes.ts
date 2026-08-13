import { CoachStatus, Role, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { toAdminCoachApplication, toAdminSubscription, toAdminUser } from "./serialize.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole(Role.ADMIN));

adminRouter.get("/ping", (_req, res) => {
  res.json({ ok: true });
});

/** Admin dashboard uchun umumiy platforma ko'rsatkichlari. */
adminRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [totalUsers, totalCoaches, pendingCoaches, totalSessions, activeSubscriptions, revenue] = await Promise.all([
      prisma.user.count(),
      prisma.coach.count({ where: { status: CoachStatus.APPROVED } }),
      prisma.coach.count({ where: { status: CoachStatus.PENDING } }),
      prisma.session.count(),
      prisma.subscription.count({
        where: {
          plan: { not: SubscriptionPlan.FREE },
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        },
      }),
      prisma.invoice.aggregate({ _sum: { amountCents: true }, where: { status: "paid" } }),
    ]);

    res.json({
      totalUsers,
      totalCoaches,
      pendingCoaches,
      totalSessions,
      activeSubscriptions,
      totalRevenueCents: revenue._sum.amountCents ?? 0,
    });
  }),
);

adminRouter.get(
  "/coaches/pending",
  asyncHandler(async (_req, res) => {
    const coaches = await prisma.coach.findMany({
      where: { status: CoachStatus.PENDING },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ coaches: coaches.map(toAdminCoachApplication) });
  }),
);

adminRouter.post(
  "/coaches/:coachId/approve",
  asyncHandler(async (req, res) => {
    const coach = await prisma.coach.findUnique({ where: { id: req.params.coachId } });
    if (!coach) {
      res.status(404).json({ error: "Ariza topilmadi" });
      return;
    }
    const [updated] = await prisma.$transaction([
      prisma.coach.update({
        where: { id: coach.id },
        data: { status: CoachStatus.APPROVED, rejectionNote: null, reviewedAt: new Date() },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.user.update({ where: { id: coach.userId }, data: { role: Role.COACH } }),
    ]);
    res.json({ coach: toAdminCoachApplication(updated) });
  }),
);

const rejectSchema = z.object({ note: z.string().max(500).optional() });

/**
 * Arizani rad etadi (yoki avval tasdiqlangan coach'ning statusini bekor qiladi —
 * shu holatda COACH roli ham USER'ga qaytariladi).
 */
adminRouter.post(
  "/coaches/:coachId/reject",
  asyncHandler(async (req, res) => {
    const parsed = rejectSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const coach = await prisma.coach.findUnique({ where: { id: req.params.coachId } });
    if (!coach) {
      res.status(404).json({ error: "Ariza topilmadi" });
      return;
    }
    const [updated] = await prisma.$transaction([
      prisma.coach.update({
        where: { id: coach.id },
        data: { status: CoachStatus.REJECTED, rejectionNote: parsed.data.note, reviewedAt: new Date() },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.user.updateMany({ where: { id: coach.userId, role: Role.COACH }, data: { role: Role.USER } }),
    ]);
    res.json({ coach: toAdminCoachApplication(updated) });
  }),
);

const listUsersSchema = z.object({
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.nativeEnum(Role).optional(),
});

adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const parsed = listUsersSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const { search, page, pageSize, role } = parsed.data;
    const where = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { coach: { select: { status: true } }, subscription: { select: { plan: true } } },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users: users.map(toAdminUser), total, page, pageSize });
  }),
);

const updateRoleSchema = z.object({ role: z.nativeEnum(Role) });

/** Admin qo'lda rol beradi/qaytarib oladi — masalan yangi admin tayinlash yoki coach'ni to'g'ridan-to'g'ri USER qilish. */
adminRouter.patch(
  "/users/:userId/role",
  asyncHandler(async (req, res) => {
    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    if (req.params.userId === req.user!.id) {
      res.status(400).json({ error: "O'zingizning rolingizni bu yerdan o'zgartira olmaysiz" });
      return;
    }
    const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!target) {
      res.status(404).json({ error: "Foydalanuvchi topilmadi" });
      return;
    }
    const user = await prisma.user.update({
      where: { id: target.id },
      data: { role: parsed.data.role },
      include: { coach: { select: { status: true } }, subscription: { select: { plan: true } } },
    });
    res.json({ user: toAdminUser(user) });
  }),
);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

adminRouter.get(
  "/subscriptions",
  asyncHandler(async (req, res) => {
    const parsed = paginationSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const { page, pageSize } = parsed.data;
    const where = { plan: { not: SubscriptionPlan.FREE } };
    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.subscription.count({ where }),
    ]);
    res.json({ subscriptions: subscriptions.map(toAdminSubscription), total, page, pageSize });
  }),
);

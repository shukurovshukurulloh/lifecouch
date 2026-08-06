import { GoalStatus, HabitFrequency } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { toDbDate, todayKey } from "./dates.js";
import { buildLast7Days, computeStreak } from "./progress.js";

export const goalsRouter = Router();
goalsRouter.use(requireAuth);

async function findOwnedGoal(userId: string, goalId: string) {
  return prisma.goal.findFirst({ where: { id: goalId, userId } });
}

async function findOwnedHabit(userId: string, habitId: string) {
  return prisma.habit.findFirst({ where: { id: habitId, goal: { userId } } });
}

goalsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const goals = await prisma.goal.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "asc" },
      include: {
        habits: {
          orderBy: { createdAt: "asc" },
          include: { checkIns: { orderBy: { date: "desc" }, take: 14 } },
        },
      },
    });

    const withProgress = await Promise.all(
      goals.map(async (goal) => ({
        ...goal,
        habits: await Promise.all(
          goal.habits.map(async (habit) => {
            const { checkIns, ...rest } = habit;
            return {
              ...rest,
              streak: await computeStreak(habit.id),
              last7Days: buildLast7Days(checkIns),
            };
          }),
        ),
      })),
    );

    res.json({ goals: withProgress });
  }),
);

const createGoalSchema = z.object({
  title: z.string().min(1, "Sarlavha kiritilishi shart"),
  description: z.string().max(1000).optional(),
  category: z.string().max(80).optional(),
  targetDate: z.string().datetime().optional(),
});

goalsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = createGoalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const { title, description, category, targetDate } = parsed.data;
    const goal = await prisma.goal.create({
      data: {
        userId: req.user!.id,
        title,
        description,
        category,
        targetDate: targetDate ? new Date(targetDate) : undefined,
      },
    });
    res.status(201).json({ goal: { ...goal, habits: [] } });
  }),
);

const updateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(80).optional(),
  targetDate: z.string().datetime().optional(),
  status: z.nativeEnum(GoalStatus).optional(),
});

goalsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const goal = await findOwnedGoal(req.user!.id, req.params.id);
    if (!goal) {
      res.status(404).json({ error: "Maqsad topilmadi" });
      return;
    }
    const parsed = updateGoalSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const { targetDate, ...rest } = parsed.data;
    const updated = await prisma.goal.update({
      where: { id: goal.id },
      data: { ...rest, ...(targetDate ? { targetDate: new Date(targetDate) } : {}) },
    });
    res.json({ goal: updated });
  }),
);

goalsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const goal = await findOwnedGoal(req.user!.id, req.params.id);
    if (!goal) {
      res.status(404).json({ error: "Maqsad topilmadi" });
      return;
    }
    await prisma.goal.delete({ where: { id: goal.id } });
    res.status(204).send();
  }),
);

const createHabitSchema = z.object({
  title: z.string().min(1, "Sarlavha kiritilishi shart"),
  frequency: z.nativeEnum(HabitFrequency).optional(),
});

goalsRouter.post(
  "/:id/habits",
  asyncHandler(async (req, res) => {
    const goal = await findOwnedGoal(req.user!.id, req.params.id);
    if (!goal) {
      res.status(404).json({ error: "Maqsad topilmadi" });
      return;
    }
    const parsed = createHabitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const habit = await prisma.habit.create({
      data: { goalId: goal.id, title: parsed.data.title, frequency: parsed.data.frequency },
    });
    res.status(201).json({ habit: { ...habit, streak: 0, last7Days: buildLast7Days([]) } });
  }),
);

goalsRouter.delete(
  "/habits/:habitId",
  asyncHandler(async (req, res) => {
    const habit = await findOwnedHabit(req.user!.id, req.params.habitId);
    if (!habit) {
      res.status(404).json({ error: "Odat topilmadi" });
      return;
    }
    await prisma.habit.delete({ where: { id: habit.id } });
    res.status(204).send();
  }),
);

const checkInSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD formatida bo'lishi kerak").optional(),
});

goalsRouter.post(
  "/habits/:habitId/check-ins",
  asyncHandler(async (req, res) => {
    const habit = await findOwnedHabit(req.user!.id, req.params.habitId);
    if (!habit) {
      res.status(404).json({ error: "Odat topilmadi" });
      return;
    }
    const parsed = checkInSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const key = parsed.data.date ?? todayKey();
    const date = toDbDate(key);

    const existing = await prisma.checkIn.findUnique({
      where: { habitId_date: { habitId: habit.id, date } },
    });

    const checkIn = existing
      ? await prisma.checkIn.update({ where: { id: existing.id }, data: { completed: !existing.completed } })
      : await prisma.checkIn.create({ data: { habitId: habit.id, date, completed: true } });

    res.json({ checkIn, streak: await computeStreak(habit.id) });
  }),
);

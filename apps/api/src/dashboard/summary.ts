import { SessionStatus, SubscriptionPlan } from "@prisma/client";
import { ensureSubscription } from "../billing/service.js";
import { prisma } from "../db.js";
import { addDaysKey, toDbDate, todayKey } from "../goals/dates.js";
import { computeStreak } from "../goals/progress.js";

export interface DashboardSummary {
  activeGoals: number;
  completedGoals: number;
  totalHabits: number;
  bestStreak: number;
  checkInsThisWeek: number;
  upcomingSessions: number;
  upcomingSessionsAsCoach: number;
  subscriptionPlan: SubscriptionPlan;
}

/** Foydalanuvchining shaxsiy dashboard'i uchun progress/sessiya ko'rsatkichlarini bir joyga yig'adi. */
export async function buildDashboardSummary(userId: string): Promise<DashboardSummary> {
  const [activeGoals, completedGoals, habits, coach, subscription] = await Promise.all([
    prisma.goal.count({ where: { userId, status: "ACTIVE" } }),
    prisma.goal.count({ where: { userId, status: "COMPLETED" } }),
    prisma.habit.findMany({ where: { goal: { userId } }, select: { id: true } }),
    prisma.coach.findUnique({ where: { userId } }),
    ensureSubscription(userId),
  ]);

  const streaks = await Promise.all(habits.map((habit) => computeStreak(habit.id)));
  const bestStreak = streaks.length > 0 ? Math.max(...streaks) : 0;

  const weekStart = toDbDate(addDaysKey(todayKey(), -6));
  const checkInsThisWeek = await prisma.checkIn.count({
    where: { habit: { goal: { userId } }, completed: true, date: { gte: weekStart } },
  });

  const now = new Date();
  const upcomingSessions = await prisma.session.count({
    where: { userId, status: SessionStatus.CONFIRMED, scheduledAt: { gt: now } },
  });

  const upcomingSessionsAsCoach =
    coach && coach.status === "APPROVED"
      ? await prisma.session.count({
          where: { coachId: coach.id, status: SessionStatus.CONFIRMED, scheduledAt: { gt: now } },
        })
      : 0;

  return {
    activeGoals,
    completedGoals,
    totalHabits: habits.length,
    bestStreak,
    checkInsThisWeek,
    upcomingSessions,
    upcomingSessionsAsCoach,
    subscriptionPlan: subscription.plan,
  };
}

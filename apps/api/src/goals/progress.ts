import { prisma } from "../db.js";
import { addDaysKey, dateKey, todayKey } from "./dates.js";

export interface DayCell {
  date: string;
  completed: boolean;
}

/** Bugundan orqaga qarab, uzilishsiz bajarilgan kunlar soni. */
export async function computeStreak(habitId: string): Promise<number> {
  const checkIns = await prisma.checkIn.findMany({
    where: { habitId, completed: true },
    orderBy: { date: "desc" },
    take: 90,
  });
  const completedKeys = new Set(checkIns.map((c) => dateKey(c.date)));

  let streak = 0;
  let cursor = todayKey();
  while (completedKeys.has(cursor)) {
    streak += 1;
    cursor = addDaysKey(cursor, -1);
  }
  return streak;
}

/** Progress-panel uchun oxirgi 7 kunlik holat lentasi (eng eskisi birinchi). */
export function buildLast7Days(checkIns: { date: Date; completed: boolean }[]): DayCell[] {
  const byKey = new Map(checkIns.map((c) => [dateKey(c.date), c.completed]));
  const days: DayCell[] = [];
  let cursor = addDaysKey(todayKey(), -6);
  for (let i = 0; i < 7; i += 1) {
    days.push({ date: cursor, completed: byKey.get(cursor) ?? false });
    cursor = addDaysKey(cursor, 1);
  }
  return days;
}

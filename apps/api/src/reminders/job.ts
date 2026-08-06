import cron from "node-cron";
import { GoalStatus, HabitFrequency } from "@prisma/client";
import { prisma } from "../db.js";
import { toDbDate, todayKey } from "../goals/dates.js";
import { sendHabitReminderEmail } from "../mailer.js";

/** Bugun hali belgilanmagan kunlik odatlar bo'yicha foydalanuvchilarga eslatma yuboradi. */
export async function runDailyReminderCheck(): Promise<void> {
  const today = toDbDate(todayKey());

  const habits = await prisma.habit.findMany({
    where: {
      frequency: HabitFrequency.DAILY,
      goal: { status: GoalStatus.ACTIVE },
      checkIns: { none: { date: today, completed: true } },
    },
    include: { goal: { include: { user: true } } },
  });

  const byUser = new Map<string, { email: string; name: string; habitTitles: string[] }>();
  for (const habit of habits) {
    const { user } = habit.goal;
    const entry = byUser.get(user.id) ?? { email: user.email, name: user.name, habitTitles: [] };
    entry.habitTitles.push(habit.title);
    byUser.set(user.id, entry);
  }

  for (const { email, name, habitTitles } of byUser.values()) {
    await sendHabitReminderEmail(email, name, habitTitles);
  }
}

export function scheduleDailyReminders(): void {
  // Har kuni 18:00'da ishga tushadi (server vaqti bo'yicha).
  cron.schedule("0 18 * * *", () => {
    runDailyReminderCheck().catch((err: unknown) => console.error("[reminders] xato:", err));
  });
}

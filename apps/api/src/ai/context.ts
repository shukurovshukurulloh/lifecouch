import { GoalStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { computeStreak } from "../goals/progress.js";

/**
 * Foydalanuvchining faol maqsadlari va odat streaklari asosida AI'ga beriladigan
 * kontekst matnini quradi — shaxsiylashtirilgan tavsiya shu ma'lumotga tayanadi.
 */
export async function buildUserContext(userId: string, userName: string): Promise<string> {
  const goals = await prisma.goal.findMany({
    where: { userId, status: GoalStatus.ACTIVE },
    include: { habits: true },
    orderBy: { createdAt: "asc" },
  });

  if (goals.length === 0) {
    return `Foydalanuvchi ismi: ${userName}. Hali faol maqsad qo'shmagan.`;
  }

  const lines: string[] = [`Foydalanuvchi ismi: ${userName}. Faol maqsadlari:`];
  for (const goal of goals) {
    lines.push(`- "${goal.title}"${goal.category ? ` (${goal.category})` : ""}${goal.description ? `: ${goal.description}` : ""}`);
    for (const habit of goal.habits) {
      const streak = await computeStreak(habit.id);
      lines.push(`  - Odat "${habit.title}" (${habit.frequency === "DAILY" ? "kunlik" : "haftalik"}), joriy streak: ${streak} kun`);
    }
  }
  return lines.join("\n");
}

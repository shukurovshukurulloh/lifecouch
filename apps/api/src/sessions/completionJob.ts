import cron from "node-cron";
import { SessionStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { captureError } from "../monitoring/sentry.js";

/**
 * O'tib ketgan (`scheduledAt + durationMinutes <= hozir`) CONFIRMED sessiyalarni
 * COMPLETED'ga o'tkazadi — coach daromadi (payouts/service.ts) shu holatdagi
 * sessiyalar yig'indisidan hisoblanadi.
 */
export async function runSessionCompletionCheck(): Promise<void> {
  const now = new Date();
  const confirmed = await prisma.session.findMany({
    where: { status: SessionStatus.CONFIRMED },
    select: { id: true, scheduledAt: true, durationMinutes: true },
  });

  const pastIds = confirmed
    .filter((s) => new Date(s.scheduledAt.getTime() + s.durationMinutes * 60_000) <= now)
    .map((s) => s.id);
  if (pastIds.length === 0) {
    return;
  }

  await prisma.session.updateMany({
    where: { id: { in: pastIds } },
    data: { status: SessionStatus.COMPLETED },
  });
}

export function scheduleSessionCompletion(): void {
  // Har 15 daqiqada ishga tushadi (server vaqti bo'yicha).
  cron.schedule("*/15 * * * *", () => {
    runSessionCompletionCheck().catch((err: unknown) => captureError(err, "[sessions] completion job xato:"));
  });
}

import { PayoutStatus, SessionStatus, type Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../db.js";

export interface EarningsSummary {
  totalEarnedCents: number;
  paidCents: number;
  pendingCents: number;
  availableCents: number;
  currency: string;
}

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Coach daromadini real vaqtda hisoblaydi — alohida "balans" ustuni saqlanmaydi.
 * `jamiTopilgan` COMPLETED sessiyalar (`Session.priceCents`) yig'indisi;
 * `to'langan`/`kutilayotgan` — mos PayoutRequest holatlari yig'indisi.
 * `db` — odatiy `prisma` yoki `$transaction`dagi `tx` (pul yechish so'rovi
 * yaratishdan oldin poyga holatisiz qayta hisoblash uchun).
 */
export async function getEarningsSummary(db: Db, coachId: string): Promise<EarningsSummary> {
  const coach = await db.coach.findUniqueOrThrow({ where: { id: coachId }, select: { currency: true } });

  const [earned, paid, pending] = await Promise.all([
    db.session.aggregate({
      where: { coachId, status: SessionStatus.COMPLETED },
      _sum: { priceCents: true },
    }),
    db.payoutRequest.aggregate({
      where: { coachId, status: PayoutStatus.PAID },
      _sum: { amountCents: true },
    }),
    db.payoutRequest.aggregate({
      where: { coachId, status: PayoutStatus.PENDING },
      _sum: { amountCents: true },
    }),
  ]);

  const totalEarnedCents = earned._sum.priceCents ?? 0;
  const paidCents = paid._sum.amountCents ?? 0;
  const pendingCents = pending._sum.amountCents ?? 0;

  return {
    totalEarnedCents,
    paidCents,
    pendingCents,
    availableCents: totalEarnedCents - paidCents - pendingCents,
    currency: coach.currency,
  };
}

/** Default `prisma` klienti bilan qisqa yo'l — `$transaction` tashqarisida (GET route) ishlatiladi. */
export function getMyEarningsSummary(coachId: string): Promise<EarningsSummary> {
  return getEarningsSummary(prisma, coachId);
}

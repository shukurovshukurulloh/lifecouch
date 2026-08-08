import { SubscriptionPlan, SubscriptionStatus, type Subscription } from "@prisma/client";
import { prisma } from "../db.js";
import { PLAN_CATALOG } from "./plans.js";

/** Har bir foydalanuvchida obuna yozuvi bo'lishi shart — topilmasa FREE bilan yaratib beradi. */
export async function ensureSubscription(userId: string): Promise<Subscription> {
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing) {
    return existing;
  }
  return prisma.subscription.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function countActiveGoals(userId: string): Promise<number> {
  return prisma.goal.count({ where: { userId, status: "ACTIVE" } });
}

interface ApplyPlanChangeInput {
  userId: string;
  plan: SubscriptionPlan;
  status?: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
  /** true bo'lsa, to'langan holatni aks ettiruvchi Invoice yozuvi ham qo'shiladi. */
  recordInvoice?: boolean;
  invoiceStatus?: string;
  stripeInvoiceId?: string | null;
}

/**
 * Obunani berilgan holatga o'tkazadi va, so'ralsa, billing tarixiga yozuv qo'shadi.
 * Ham Stripe webhook handler, ham dev-stub checkout shu funksiyani chaqiradi —
 * shunday qilib ikkala yo'l bir xil natijaga olib keladi.
 */
export async function applyPlanChange(input: ApplyPlanChangeInput): Promise<Subscription> {
  const { userId, plan, recordInvoice, invoiceStatus, stripeInvoiceId, ...rest } = input;
  const status = rest.status ?? SubscriptionStatus.ACTIVE;

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    create: { userId, plan, status, ...rest },
    update: { plan, status, ...rest },
  });

  if (recordInvoice) {
    const planDef = PLAN_CATALOG[plan];
    await prisma.invoice.create({
      data: {
        userId,
        plan,
        amountCents: planDef.priceCents,
        currency: planDef.currency,
        status: invoiceStatus ?? "paid",
        stripeInvoiceId: stripeInvoiceId ?? undefined,
      },
    });
  }

  return subscription;
}

export async function downgradeToFree(userId: string): Promise<Subscription> {
  return prisma.subscription.update({
    where: { userId },
    data: {
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.CANCELED,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
    },
  });
}

import { SubscriptionPlan } from "@prisma/client";

export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  priceCents: number;
  currency: string;
  /** null — cheklovsiz. */
  maxActiveGoals: number | null;
  coachBookingAllowed: boolean;
  /** Kuniga yuborilishi mumkin bo'lgan AI coach xabarlari soni. null — cheklovsiz. */
  aiMessagesPerDay: number | null;
  features: string[];
}

/**
 * Tarif katalogi. Haqiqiy Stripe hisob ulanganda har bir pullik reja uchun
 * Stripe Dashboard'da mos Price yaratilib, uning ID'si shu yerga (yoki muhit
 * o'zgaruvchisiga) qo'shiladi — hozircha narx faqat shu yerda hisoblanadi.
 */
export const PLAN_CATALOG: Record<SubscriptionPlan, PlanDefinition> = {
  FREE: {
    id: SubscriptionPlan.FREE,
    name: "Free",
    priceCents: 0,
    currency: "USD",
    maxActiveGoals: 3,
    coachBookingAllowed: false,
    aiMessagesPerDay: 5,
    features: ["3 tagacha faol maqsad", "Odat kuzatuvi", "Streak statistikasi", "Kuniga 5 ta AI coach xabari"],
  },
  PRO: {
    id: SubscriptionPlan.PRO,
    name: "Pro",
    priceCents: 900,
    currency: "USD",
    maxActiveGoals: null,
    coachBookingAllowed: true,
    aiMessagesPerDay: 50,
    features: ["Cheksiz maqsad", "Coach bilan sessiya bron qilish", "Real-time chat", "Kuniga 50 ta AI coach xabari"],
  },
  PREMIUM: {
    id: SubscriptionPlan.PREMIUM,
    name: "Premium",
    priceCents: 2900,
    currency: "USD",
    maxActiveGoals: null,
    coachBookingAllowed: true,
    aiMessagesPerDay: null,
    features: [
      "Pro'dagi barcha imkoniyatlar",
      "Ustuvor coach qo'llab-quvvatlash",
      "Cheksiz AI coach xabari",
      "Kengaytirilgan statistika (tez orada)",
    ],
  },
};

export const PAID_PLANS = [SubscriptionPlan.PRO, SubscriptionPlan.PREMIUM] as const;

export function isPaidPlan(plan: SubscriptionPlan): boolean {
  return (PAID_PLANS as readonly SubscriptionPlan[]).includes(plan);
}

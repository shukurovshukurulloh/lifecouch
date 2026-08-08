import { Role, SubscriptionPlan, SubscriptionStatus, type Subscription } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { ensureSubscription } from "./service.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      subscription?: Subscription;
    }
  }
}

const ACTIVE_STATUSES: SubscriptionStatus[] = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING];

/** Berilgan tariflardan biri faol bo'lmasa 402 qaytaradi — pullik funksiyalarni cheklash (paywall). */
export function requirePlan(...allowed: SubscriptionPlan[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.user?.role === Role.ADMIN) {
      next();
      return;
    }
    const subscription = await ensureSubscription(req.user!.id);
    req.subscription = subscription;

    const hasAccess = allowed.includes(subscription.plan) && ACTIVE_STATUSES.includes(subscription.status);
    if (!hasAccess) {
      res.status(402).json({
        error: "Bu funksiya pullik tarifda mavjud. Iltimos, \"Tarif\" bo'limidan Pro yoki Premium'ga o'ting.",
      });
      return;
    }
    next();
  };
}

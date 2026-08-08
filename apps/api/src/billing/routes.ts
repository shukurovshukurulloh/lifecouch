import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { PLAN_CATALOG, isPaidPlan } from "./plans.js";
import { applyPlanChange, downgradeToFree, ensureSubscription } from "./service.js";
import { getStripeClient, isStripeConfigured } from "./stripeClient.js";

export const billingRouter = Router();
billingRouter.use(requireAuth);

billingRouter.get(
  "/plans",
  asyncHandler(async (req, res) => {
    const subscription = await ensureSubscription(req.user!.id);
    res.json({ plans: Object.values(PLAN_CATALOG), subscription });
  }),
);

billingRouter.get(
  "/subscription",
  asyncHandler(async (req, res) => {
    const subscription = await ensureSubscription(req.user!.id);
    res.json({ subscription });
  }),
);

billingRouter.get(
  "/invoices",
  asyncHandler(async (req, res) => {
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ invoices });
  }),
);

const checkoutSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan),
});

billingRouter.post(
  "/checkout",
  asyncHandler(async (req, res) => {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const { plan } = parsed.data;
    if (!isPaidPlan(plan)) {
      res.status(400).json({ error: "Faqat Pro yoki Premium rejaga o'tish uchun to'lov talab qilinadi" });
      return;
    }

    const stripe = getStripeClient();
    if (stripe) {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
      const existing = await ensureSubscription(user.id);

      const customerId =
        existing.stripeCustomerId ??
        (await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } })).id;

      const planDef = PLAN_CATALOG[plan];
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            price_data: {
              currency: planDef.currency.toLowerCase(),
              product_data: { name: `Lifecouch ${planDef.name}` },
              unit_amount: planDef.priceCents,
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        success_url: `${env.webOrigin}/?billing=success`,
        cancel_url: `${env.webOrigin}/?billing=cancelled`,
        metadata: { userId: user.id, plan },
      });

      res.json({ url: session.url, subscription: existing });
      return;
    }

    // Stripe ulanmagan (dev muhit) — to'lov muvaffaqiyatli o'tgandek darhol simulyatsiya qilamiz,
    // xuddi checkout.session.completed webhook'i kelgandek. mailer.ts/video.ts kabi stub.
    const subscription = await applyPlanChange({
      userId: req.user!.id,
      plan,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      recordInvoice: true,
      invoiceStatus: "paid",
    });
    res.json({ url: null, subscription });
  }),
);

billingRouter.post(
  "/cancel",
  asyncHandler(async (req, res) => {
    const subscription = await ensureSubscription(req.user!.id);
    const stripe = getStripeClient();

    if (stripe && subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: true });
      const updated = await prisma.subscription.update({
        where: { userId: req.user!.id },
        data: { status: SubscriptionStatus.CANCELED },
      });
      res.json({ subscription: updated });
      return;
    }

    const updated = await downgradeToFree(req.user!.id);
    res.json({ subscription: updated });
  }),
);

/**
 * Stripe webhook — index.ts'da `express.raw()` bilan, umumiy `express.json()`dan OLDIN
 * ulanadi, chunki imzo tekshiruvi xom (raw) body'ga muhtoj. STRIPE_WEBHOOK_SECRET
 * bo'lmasa (dev muhit) imzo tekshirilmasdan JSON sifatida o'qiladi — faqat ishlab
 * chiqarish muhitida emas.
 */
export const billingWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const stripe = getStripeClient();
  if (!stripe) {
    res.status(503).json({ error: "Stripe ulanmagan" });
    return;
  }

  let event;
  const signature = req.headers["stripe-signature"];
  if (env.stripeWebhookSecret && signature) {
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, env.stripeWebhookSecret);
    } catch (err) {
      res.status(400).json({ error: `Webhook imzosi yaroqsiz: ${(err as Error).message}` });
      return;
    }
  } else if (env.nodeEnv !== "production") {
    event = JSON.parse((req.body as Buffer).toString("utf8"));
  } else {
    res.status(400).json({ error: "Webhook imzosi talab qilinadi" });
    return;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as { metadata?: { userId?: string; plan?: string }; customer?: string; subscription?: string };
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan as SubscriptionPlan | undefined;
      if (userId && plan) {
        await applyPlanChange({
          userId,
          plan,
          status: SubscriptionStatus.ACTIVE,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : undefined,
          recordInvoice: true,
          invoiceStatus: "paid",
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as { customer: string };
      const record = await prisma.subscription.findFirst({ where: { stripeCustomerId: sub.customer } });
      if (record) {
        await downgradeToFree(record.userId);
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as {
        customer: string;
        status: string;
        current_period_end: number;
      };
      const record = await prisma.subscription.findFirst({ where: { stripeCustomerId: sub.customer } });
      if (record) {
        const statusMap: Record<string, SubscriptionStatus> = {
          active: SubscriptionStatus.ACTIVE,
          trialing: SubscriptionStatus.TRIALING,
          past_due: SubscriptionStatus.PAST_DUE,
          canceled: SubscriptionStatus.CANCELED,
          unpaid: SubscriptionStatus.PAST_DUE,
        };
        await prisma.subscription.update({
          where: { userId: record.userId },
          data: {
            status: statusMap[sub.status] ?? record.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        });
      }
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});

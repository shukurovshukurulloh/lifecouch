import type { InvoiceDto, PlanDefinitionDto, SubscriptionDto, SubscriptionPlan } from "@lifecouch/shared";
import { useEffect, useState } from "react";
import * as api from "../lib/api";

const PLAN_LABEL: Record<SubscriptionPlan, string> = { FREE: "Free", PRO: "Pro", PREMIUM: "Premium" };
const STATUS_LABEL: Record<SubscriptionDto["status"], string> = {
  ACTIVE: "Faol",
  TRIALING: "Sinov muddatida",
  PAST_DUE: "To'lov muddati o'tgan",
  CANCELED: "Bekor qilingan",
};

function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return "Bepul";
  return `${(cents / 100).toFixed(0)} ${currency}/oy`;
}

export function BillingPage() {
  const [plans, setPlans] = useState<PlanDefinitionDto[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<SubscriptionPlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [billing, invoiceData] = await Promise.all([api.fetchBillingPlans(), api.fetchInvoices()]);
    setPlans(billing.plans);
    setSubscription(billing.subscription);
    setInvoices(invoiceData.invoices);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleUpgrade(plan: SubscriptionPlan) {
    setBusyPlan(plan);
    setMessage(null);
    try {
      const { url, subscription: updated } = await api.checkout(plan);
      if (url) {
        window.location.href = url;
        return;
      }
      // Stripe ulanmagan (dev muhit) — checkout darhol stub orqali bajarildi.
      setSubscription(updated);
      const { invoices: fresh } = await api.fetchInvoices();
      setInvoices(fresh);
      setMessage(`${PLAN_LABEL[plan]} rejaga muvaffaqiyatli o'tdingiz (sinov rejimi — Stripe ulanmagan).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "To'lovni boshlab bo'lmadi");
    } finally {
      setBusyPlan(null);
    }
  }

  async function handleCancel() {
    setBusyPlan(subscription?.plan ?? null);
    setMessage(null);
    try {
      const { subscription: updated } = await api.cancelSubscription();
      setSubscription(updated);
      setMessage("Obuna bekor qilindi, Free rejaga qaytdingiz.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Bekor qilib bo'lmadi");
    } finally {
      setBusyPlan(null);
    }
  }

  if (loading) return <p className="loading">Yuklanmoqda...</p>;

  return (
    <div className="billing-page">
      {subscription && (
        <div className="billing-current">
          <span>
            Joriy reja: <strong>{PLAN_LABEL[subscription.plan]}</strong> &middot; {STATUS_LABEL[subscription.status]}
          </span>
          {subscription.plan !== "FREE" && subscription.status !== "CANCELED" && (
            <button type="button" className="link-danger" disabled={busyPlan !== null} onClick={() => void handleCancel()}>
              Obunani bekor qilish
            </button>
          )}
        </div>
      )}

      {message && <p className="profile-message">{message}</p>}

      <div className="plan-list">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan === plan.id && subscription.status !== "CANCELED";
          return (
            <div key={plan.id} className={`plan-card${isCurrent ? " plan-card-active" : ""}`}>
              <h3>{plan.name}</h3>
              <p className="plan-price">{formatPrice(plan.priceCents, plan.currency)}</p>
              <ul className="plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {isCurrent ? (
                <button type="button" disabled>
                  Joriy reja
                </button>
              ) : plan.priceCents === 0 ? (
                <button type="button" disabled={busyPlan !== null} onClick={() => void handleCancel()}>
                  Free'ga o'tish
                </button>
              ) : (
                <button type="button" disabled={busyPlan !== null} onClick={() => void handleUpgrade(plan.id)}>
                  {busyPlan === plan.id ? "Yuklanmoqda..." : `${plan.name}'ga o'tish`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <h3>To'lovlar tarixi</h3>
      {invoices.length === 0 ? (
        <p className="empty-state">Hali to'lov qilinmagan.</p>
      ) : (
        <div className="invoice-list">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="invoice-row">
              <span>{new Date(invoice.createdAt).toLocaleDateString("uz-UZ")}</span>
              <span>{PLAN_LABEL[invoice.plan]}</span>
              <span>
                {(invoice.amountCents / 100).toFixed(2)} {invoice.currency}
              </span>
              <span className="status-badge status-confirmed">{invoice.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

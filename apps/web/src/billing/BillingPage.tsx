import type { InvoiceDto, PlanDefinitionDto, SubscriptionDto, SubscriptionPlan } from "@lifecouch/shared";
import { useEffect, useState } from "react";
import { EmptyState, LoadingState } from "../common/Feedback";
import { useTranslation, type TranslationKey } from "../i18n/LocaleContext";
import * as api from "../lib/api";

const STATUS_KEY: Record<SubscriptionDto["status"], TranslationKey> = {
  ACTIVE: "status.active",
  TRIALING: "status.trialing",
  PAST_DUE: "status.pastDue",
  CANCELED: "status.cancelled",
};

// Reja nomlari brend nomi — tarjima qilinmaydi, faqat chiroyli formatda ko'rsatiladi.
const PLAN_LABEL: Record<SubscriptionPlan, string> = { FREE: "Free", PRO: "Pro", PREMIUM: "Premium" };

export function BillingPage() {
  const { t, locale } = useTranslation();
  const [plans, setPlans] = useState<PlanDefinitionDto[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<SubscriptionPlan | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function formatPrice(cents: number, currency: string): string {
    if (cents === 0) return t("billing.free");
    return t("billing.perMonth", { price: (cents / 100).toFixed(0), currency });
  }

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
      setMessage(t("billing.upgradeSuccess", { plan: PLAN_LABEL[plan] }));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("billing.upgradeError"));
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
      setMessage(t("billing.cancelSuccess"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("billing.cancelError"));
    } finally {
      setBusyPlan(null);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="billing-page">
      {subscription && (
        <div className="billing-current">
          <span>
            {t("billing.currentPlan", {
              plan: PLAN_LABEL[subscription.plan],
              status: t(STATUS_KEY[subscription.status]),
            })}
          </span>
          {subscription.plan !== "FREE" && subscription.status !== "CANCELED" && (
            <button type="button" className="link-danger" disabled={busyPlan !== null} onClick={() => void handleCancel()}>
              {t("billing.cancelSubscription")}
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
                  {t("billing.current")}
                </button>
              ) : plan.priceCents === 0 ? (
                <button type="button" disabled={busyPlan !== null} onClick={() => void handleCancel()}>
                  {t("billing.switchToFree")}
                </button>
              ) : (
                <button type="button" disabled={busyPlan !== null} onClick={() => void handleUpgrade(plan.id)}>
                  {busyPlan === plan.id ? t("billing.loadingShort") : t("billing.switchTo", { plan: plan.name })}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <h3>{t("billing.history")}</h3>
      {invoices.length === 0 ? (
        <EmptyState>{t("billing.noInvoices")}</EmptyState>
      ) : (
        <div className="invoice-list">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="invoice-row">
              <span>{new Date(invoice.createdAt).toLocaleDateString(locale)}</span>
              <span>{invoice.plan}</span>
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

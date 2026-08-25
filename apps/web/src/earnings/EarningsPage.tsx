import type { EarningsSummary, PayoutRequestDto, PayoutStatus } from "@lifecouch/shared";
import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, LoadingState } from "../common/Feedback";
import { useTranslation, type TranslationKey } from "../i18n/LocaleContext";
import * as api from "../lib/api";

const STATUS_KEY: Record<PayoutStatus, TranslationKey> = {
  PENDING: "earnings.statusPending",
  PAID: "earnings.statusPaid",
  REJECTED: "earnings.statusRejected",
};

function formatAmount(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(0)} ${currency}`;
}

export function EarningsPage() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [requests, setRequests] = useState<PayoutRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchMyEarnings();
      setSummary(data.summary);
      setRequests(data.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("earnings.errorLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const amountCents = Math.round(Number(amount) * 100);
      await api.requestPayout({ amountCents, note: note.trim() || undefined });
      setAmount("");
      setNote("");
      setMessage(t("earnings.requestSent"));
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("earnings.errorLoad"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorBanner message={error} onRetry={() => void load()} />;
  if (!summary) return null;

  const cards = [
    { label: t("earnings.totalEarned"), value: formatAmount(summary.totalEarnedCents, summary.currency) },
    { label: t("earnings.paid"), value: formatAmount(summary.paidCents, summary.currency) },
    { label: t("earnings.pending"), value: formatAmount(summary.pendingCents, summary.currency) },
    { label: t("earnings.available"), value: formatAmount(summary.availableCents, summary.currency) },
  ];

  return (
    <div className="earnings-page">
      <h2>{t("earnings.title")}</h2>
      <div className="stat-grid">
        {cards.map((card) => (
          <div key={card.label} className="stat-card">
            <span className="stat-value">{card.value}</span>
            <span className="stat-label">{card.label}</span>
          </div>
        ))}
      </div>

      <form className="become-coach-form" onSubmit={handleSubmit}>
        <label>
          {t("earnings.amountLabel", { currency: summary.currency })}
          <input
            type="number"
            min="0.01"
            step="0.01"
            max={summary.availableCents / 100}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          {t("earnings.noteLabel")}
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {message && <p className="profile-message">{message}</p>}
        <button type="submit" disabled={submitting || summary.availableCents <= 0}>
          {t("earnings.requestButton")}
        </button>
      </form>

      <h3>{t("earnings.history")}</h3>
      {requests.length === 0 && <EmptyState>{t("earnings.empty")}</EmptyState>}
      <div className="admin-card-list">
        {requests.map((r) => (
          <div key={r.id} className="admin-card">
            <div className="admin-card-main">
              <strong>{formatAmount(r.amountCents, r.currency)}</strong>
              <span>
                {new Date(r.requestedAt).toLocaleDateString()}
                {r.note ? ` · ${r.note}` : ""}
                {r.adminNote ? ` · ${r.adminNote}` : ""}
              </span>
            </div>
            <span className={`status-badge status-${r.status.toLowerCase()}`}>{t(STATUS_KEY[r.status])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

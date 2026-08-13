import type { DashboardSummary } from "@lifecouch/shared";
import { useEffect, useState } from "react";
import { ErrorBanner, LoadingState } from "../common/Feedback";
import { useTranslation } from "../i18n/LocaleContext";
import * as api from "../lib/api";

export function DashboardPage() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { summary: fetched } = await api.fetchDashboardSummary();
      setSummary(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dashboard.errorLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorBanner message={error} onRetry={() => void load()} />;
  if (!summary) return null;

  const cards: { label: string; value: string }[] = [
    { label: t("dashboard.activeGoals"), value: String(summary.activeGoals) },
    { label: t("dashboard.completedGoals"), value: String(summary.completedGoals) },
    { label: t("dashboard.totalHabits"), value: String(summary.totalHabits) },
    { label: t("dashboard.bestStreak"), value: `${summary.bestStreak} ${t("dashboard.daysUnit")}` },
    { label: t("dashboard.checkInsThisWeek"), value: String(summary.checkInsThisWeek) },
    { label: t("dashboard.upcomingSessions"), value: String(summary.upcomingSessions) },
  ];

  if (summary.upcomingSessionsAsCoach > 0) {
    cards.push({ label: t("dashboard.upcomingSessionsAsCoach"), value: String(summary.upcomingSessionsAsCoach) });
  }

  cards.push({ label: t("dashboard.currentPlan"), value: summary.subscriptionPlan });

  return (
    <div className="dashboard-page">
      <h2>{t("dashboard.title")}</h2>
      <p className="dashboard-subtitle">{t("dashboard.subtitle")}</p>
      <div className="stat-grid">
        {cards.map((card) => (
          <div key={card.label} className="stat-card">
            <span className="stat-value">{card.value}</span>
            <span className="stat-label">{card.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

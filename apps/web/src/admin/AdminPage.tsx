import type {
  AdminCoachApplication,
  AdminStats,
  AdminSubscription,
  AdminUser,
  CoachStatus,
  Role,
  SubscriptionStatus,
} from "@lifecouch/shared";
import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, LoadingState } from "../common/Feedback";
import { useTranslation, type TranslationKey } from "../i18n/LocaleContext";
import * as api from "../lib/api";

type AdminTab = "overview" | "coaches" | "users" | "subscriptions";

const COACH_STATUS_KEY: Record<CoachStatus, TranslationKey> = {
  PENDING: "status.coachPending",
  APPROVED: "status.coachApproved",
  REJECTED: "status.coachRejected",
};

const SUBSCRIPTION_STATUS_KEY: Record<SubscriptionStatus, TranslationKey> = {
  ACTIVE: "status.active",
  TRIALING: "status.trialing",
  PAST_DUE: "status.pastDue",
  CANCELED: "status.cancelled",
};

export function AdminPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<AdminTab>("overview");

  return (
    <div className="admin-page">
      <h2>{t("admin.title")}</h2>
      <nav className="admin-tabs">
        <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>
          {t("admin.tabOverview")}
        </button>
        <button type="button" className={tab === "coaches" ? "active" : ""} onClick={() => setTab("coaches")}>
          {t("admin.tabCoachApplications")}
        </button>
        <button type="button" className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>
          {t("admin.tabUsers")}
        </button>
        <button
          type="button"
          className={tab === "subscriptions" ? "active" : ""}
          onClick={() => setTab("subscriptions")}
        >
          {t("admin.tabSubscriptions")}
        </button>
      </nav>

      {tab === "overview" && <OverviewTab />}
      {tab === "coaches" && <CoachApplicationsTab />}
      {tab === "users" && <UsersTab />}
      {tab === "subscriptions" && <SubscriptionsTab />}
    </div>
  );
}

function OverviewTab() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setStats(await api.fetchAdminStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errorLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorBanner message={error} onRetry={() => void load()} />;
  if (!stats) return null;

  const cards = [
    { label: t("admin.statTotalUsers"), value: stats.totalUsers },
    { label: t("admin.statTotalCoaches"), value: stats.totalCoaches },
    { label: t("admin.statPendingCoaches"), value: stats.pendingCoaches },
    { label: t("admin.statTotalSessions"), value: stats.totalSessions },
    { label: t("admin.statActiveSubscriptions"), value: stats.activeSubscriptions },
    { label: t("admin.statRevenue"), value: `${(stats.totalRevenueCents / 100).toFixed(0)} USD` },
  ];

  return (
    <div className="stat-grid">
      {cards.map((card) => (
        <div key={card.label} className="stat-card">
          <span className="stat-value">{card.value}</span>
          <span className="stat-label">{card.label}</span>
        </div>
      ))}
    </div>
  );
}

function CoachApplicationsTab() {
  const { t } = useTranslation();
  const [coaches, setCoaches] = useState<AdminCoachApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { coaches: fetched } = await api.fetchPendingCoaches();
      setCoaches(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errorLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleApprove(coachId: string) {
    setBusyId(coachId);
    try {
      await api.approveCoach(coachId);
      setCoaches((prev) => prev.filter((c) => c.id !== coachId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errorLoad"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(coachId: string) {
    setBusyId(coachId);
    try {
      await api.rejectCoach(coachId, notes[coachId]?.trim() || undefined);
      setCoaches((prev) => prev.filter((c) => c.id !== coachId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errorLoad"));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      {coaches.length === 0 && !error && <EmptyState>{t("admin.noPendingCoaches")}</EmptyState>}
      <div className="admin-card-list">
        {coaches.map((coach) => (
          <div key={coach.id} className="admin-card">
            <div className="admin-card-main">
              <strong>{coach.name}</strong>
              <span>
                {coach.email} · {coach.specialty} · {(coach.priceCents / 100).toFixed(0)} {coach.currency}
              </span>
            </div>
            <div className="admin-card-actions">
              <input
                type="text"
                placeholder={t("admin.rejectNotePlaceholder")}
                value={notes[coach.id] ?? ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [coach.id]: e.target.value }))}
              />
              <button
                type="button"
                className="primary"
                disabled={busyId === coach.id}
                onClick={() => void handleApprove(coach.id)}
              >
                {t("admin.approve")}
              </button>
              <button
                type="button"
                className="danger"
                disabled={busyId === coach.id}
                onClick={() => void handleReject(coach.id)}
              >
                {t("admin.reject")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ROLES: Role[] = ["USER", "COACH", "ADMIN"];
const PAGE_SIZE = 20;

function UsersTab() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(currentPage: number, currentSearch: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchAdminUsers({ page: currentPage, pageSize: PAGE_SIZE, search: currentSearch || undefined });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errorLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    void load(1, search);
  }

  async function handleRoleChange(userId: string, role: Role) {
    try {
      const { user } = await api.updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? user : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errorLoad"));
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <form onSubmit={handleSearchSubmit}>
        <input
          className="admin-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("admin.searchUsersPlaceholder")}
        />
      </form>

      {error && <ErrorBanner message={error} onRetry={() => void load(page, search)} />}
      {loading ? (
        <LoadingState />
      ) : (
        <>
          {users.length === 0 && !error && <EmptyState>{t("admin.noUsers")}</EmptyState>}
          <div className="admin-card-list">
            {users.map((u) => (
              <div key={u.id} className="admin-card">
                <div className="admin-card-main">
                  <strong>{u.name}</strong>
                  <span>
                    {u.email} · {new Date(u.createdAt).toLocaleDateString()}
                    {u.coachStatus && ` · ${t(COACH_STATUS_KEY[u.coachStatus])}`}
                    {u.subscriptionPlan && u.subscriptionPlan !== "FREE" ? ` · ${u.subscriptionPlan}` : ""}
                  </span>
                </div>
                <div className="admin-card-actions">
                  <select value={u.role} onChange={(e) => void handleRoleChange(u.id, e.target.value as Role)}>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {t(`role.${role}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="admin-pagination">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {t("admin.prevPage")}
              </button>
              <span>{t("admin.pageInfo", { page, totalPages })}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                {t("admin.nextPage")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SubscriptionsTab() {
  const { t } = useTranslation();
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(currentPage: number) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchAdminSubscriptions({ page: currentPage, pageSize: PAGE_SIZE });
      setSubscriptions(data.subscriptions);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.errorLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (loading) return <LoadingState />;

  return (
    <div>
      {error && <ErrorBanner message={error} onRetry={() => void load(page)} />}
      {subscriptions.length === 0 && !error && <EmptyState>{t("admin.noSubscriptions")}</EmptyState>}
      <div className="admin-card-list">
        {subscriptions.map((sub) => (
          <div key={sub.id} className="admin-card">
            <div className="admin-card-main">
              <strong>{sub.name}</strong>
              <span>
                {sub.email} · {sub.plan}
              </span>
            </div>
            <span className={`status-badge status-${sub.status.toLowerCase()}`}>
              {t(SUBSCRIPTION_STATUS_KEY[sub.status])}
            </span>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t("admin.prevPage")}
          </button>
          <span>{t("admin.pageInfo", { page, totalPages })}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            {t("admin.nextPage")}
          </button>
        </div>
      )}
    </div>
  );
}

import type { SessionBooking } from "@lifecouch/shared";
import { useEffect, useState } from "react";
import { EmptyState, LoadingState } from "../common/Feedback";
import { useTranslation, type TranslationKey } from "../i18n/LocaleContext";
import * as api from "../lib/api";

const STATUS_KEY: Record<SessionBooking["status"], TranslationKey> = {
  PENDING: "status.pending",
  CONFIRMED: "status.confirmed",
  CANCELLED: "status.cancelled",
  COMPLETED: "status.completed",
};

export function MySessionsPage({ onOpenChat }: { onOpenChat: (partnerId: string) => void }) {
  const { t } = useTranslation();
  const [asUser, setAsUser] = useState<SessionBooking[]>([]);
  const [asCoach, setAsCoach] = useState<SessionBooking[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await api.listSessions();
    setAsUser(data.asUser);
    setAsCoach(data.asCoach);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCancel(sessionId: string) {
    await api.cancelSession(sessionId);
    await load();
  }

  if (loading) return <LoadingState />;

  return (
    <div className="sessions-page">
      <h3>{t("sessions.myBookings")}</h3>
      {asUser.length === 0 && <EmptyState>{t("sessions.empty")}</EmptyState>}
      <div className="session-list">
        {asUser.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            partnerName={session.coach?.user.name ?? t("sessions.defaultCoachName")}
            partnerId={session.coachId}
            onCancel={() => void handleCancel(session.id)}
            onOpenChat={onOpenChat}
          />
        ))}
      </div>

      {asCoach.length > 0 && (
        <>
          <h3>{t("sessions.asCoach")}</h3>
          <div className="session-list">
            {asCoach.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                partnerName={session.user?.name ?? t("sessions.defaultClientName")}
                partnerId={session.userId}
                onCancel={() => void handleCancel(session.id)}
                onOpenChat={onOpenChat}
                showEarnings
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SessionRow({
  session,
  partnerName,
  partnerId,
  onCancel,
  onOpenChat,
  showEarnings = false,
}: {
  session: SessionBooking;
  partnerName: string;
  partnerId: string;
  onCancel: () => void;
  onOpenChat: (partnerId: string) => void;
  showEarnings?: boolean;
}) {
  const { t, locale } = useTranslation();
  return (
    <div className="session-row">
      <div className="session-info">
        <span className="session-partner">{partnerName}</span>
        <span className="session-time">
          {new Date(session.scheduledAt).toLocaleString(locale, {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          &middot; {session.durationMinutes} {t("sessions.minutesShort")}
          {showEarnings && session.priceCents != null && session.currency && (
            <>
              {" "}
              &middot; {(session.priceCents / 100).toFixed(0)} {session.currency}
            </>
          )}
        </span>
      </div>
      <span className={`status-badge status-${session.status.toLowerCase()}`}>
        {t(STATUS_KEY[session.status])}
      </span>
      {session.videoLink && session.status === "CONFIRMED" && (
        <a className="video-link" href={session.videoLink} target="_blank" rel="noreferrer">
          {t("sessions.video")}
        </a>
      )}
      <button type="button" className="link-quiet" onClick={() => onOpenChat(partnerId)}>
        {t("sessions.message")}
      </button>
      {session.status === "CONFIRMED" && (
        <button type="button" className="link-danger" onClick={onCancel}>
          {t("sessions.cancel")}
        </button>
      )}
    </div>
  );
}

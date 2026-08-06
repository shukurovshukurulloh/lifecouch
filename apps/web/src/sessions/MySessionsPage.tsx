import type { SessionBooking } from "@lifecouch/shared";
import { useEffect, useState } from "react";
import * as api from "../lib/api";

const STATUS_LABEL: Record<SessionBooking["status"], string> = {
  PENDING: "Kutilmoqda",
  CONFIRMED: "Tasdiqlangan",
  CANCELLED: "Bekor qilingan",
  COMPLETED: "Yakunlangan",
};

export function MySessionsPage({ onOpenChat }: { onOpenChat: (partnerId: string) => void }) {
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

  if (loading) return <p className="loading">Yuklanmoqda...</p>;

  return (
    <div className="sessions-page">
      <h3>Mening bronlarim</h3>
      {asUser.length === 0 && <p className="empty-state">Hali bron qilingan sessiya yo'q.</p>}
      <div className="session-list">
        {asUser.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            partnerName={session.coach?.user.name ?? "Coach"}
            partnerId={session.coachId}
            onCancel={() => void handleCancel(session.id)}
            onOpenChat={onOpenChat}
          />
        ))}
      </div>

      {asCoach.length > 0 && (
        <>
          <h3>Coach sifatidagi sessiyalarim</h3>
          <div className="session-list">
            {asCoach.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                partnerName={session.user?.name ?? "Mijoz"}
                partnerId={session.userId}
                onCancel={() => void handleCancel(session.id)}
                onOpenChat={onOpenChat}
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
}: {
  session: SessionBooking;
  partnerName: string;
  partnerId: string;
  onCancel: () => void;
  onOpenChat: (partnerId: string) => void;
}) {
  return (
    <div className="session-row">
      <div className="session-info">
        <span className="session-partner">{partnerName}</span>
        <span className="session-time">
          {new Date(session.scheduledAt).toLocaleString("uz-UZ", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          &middot; {session.durationMinutes} daq
        </span>
      </div>
      <span className={`status-badge status-${session.status.toLowerCase()}`}>
        {STATUS_LABEL[session.status]}
      </span>
      {session.videoLink && session.status === "CONFIRMED" && (
        <a className="video-link" href={session.videoLink} target="_blank" rel="noreferrer">
          Video
        </a>
      )}
      <button type="button" className="link-quiet" onClick={() => onOpenChat(partnerId)}>
        Xabar
      </button>
      {session.status === "CONFIRMED" && (
        <button type="button" className="link-danger" onClick={onCancel}>
          Bekor qilish
        </button>
      )}
    </div>
  );
}

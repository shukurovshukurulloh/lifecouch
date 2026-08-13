import type { AvailabilitySlotDto, PublicCoach } from "@lifecouch/shared";
import { useEffect, useState } from "react";
import { EmptyState, ErrorBanner, LoadingState } from "../common/Feedback";
import { useTranslation } from "../i18n/LocaleContext";
import * as api from "../lib/api";

export function CoachesPage({ onOpenChat }: { onOpenChat: (partnerId: string) => void }) {
  const { t, locale } = useTranslation();
  const [coaches, setCoaches] = useState<PublicCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCoachId, setExpandedCoachId] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlotDto[]>([]);
  const [booking, setBooking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    setLoading(true);
    api
      .listCoaches()
      .then(({ coaches: fetched }) => {
        setCoaches(fetched);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("coaches.errorLoad")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleSlots(coachId: string) {
    if (expandedCoachId === coachId) {
      setExpandedCoachId(null);
      return;
    }
    setExpandedCoachId(coachId);
    const { slots: fetched } = await api.listAvailability(coachId);
    setSlots(fetched);
  }

  async function handleBook(slotId: string) {
    setBooking(slotId);
    setMessage(null);
    try {
      await api.bookSession(slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      setMessage(t("coaches.booked"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("coaches.bookError"));
    } finally {
      setBooking(null);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="coaches-page">
      {error && <ErrorBanner message={error} onRetry={load} />}
      {message && <p className="profile-message">{message}</p>}
      {coaches.length === 0 && !error && <EmptyState>{t("coaches.empty")}</EmptyState>}

      <div className="coach-list">
        {coaches.map((coach) => (
          <div key={coach.id} className="coach-card">
            <div className="coach-card-header">
              <div>
                <h3>{coach.name}</h3>
                <p className="coach-specialty">{coach.specialty}</p>
              </div>
              <span className="coach-price">
                {(coach.priceCents / 100).toFixed(0)} {coach.currency}
              </span>
            </div>
            {coach.bio && <p className="coach-bio">{coach.bio}</p>}
            <div className="coach-actions">
              <button type="button" onClick={() => void toggleSlots(coach.id)}>
                {expandedCoachId === coach.id ? t("coaches.hideSlots") : t("coaches.showSlots")}
              </button>
              <button type="button" className="secondary" onClick={() => onOpenChat(coach.userId)}>
                {t("coaches.sendMessage")}
              </button>
            </div>

            {expandedCoachId === coach.id && (
              <div className="slot-list">
                {slots.length === 0 && <EmptyState>{t("coaches.noSlots")}</EmptyState>}
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    className="slot-chip"
                    disabled={booking === slot.id}
                    onClick={() => void handleBook(slot.id)}
                  >
                    {new Date(slot.startsAt).toLocaleString(locale, {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

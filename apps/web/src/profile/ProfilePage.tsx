import type { MyCoachProfile } from "@lifecouch/shared";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { useTranslation, type TranslationKey } from "../i18n/LocaleContext";
import { becomeCoach, fetchMyCoachProfile, updateProfile } from "../lib/api";

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, logout, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [focusArea, setFocusArea] = useState(user?.focusArea ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [coachProfile, setCoachProfile] = useState<MyCoachProfile | null>(null);

  useEffect(() => {
    if (user?.role === "USER") {
      fetchMyCoachProfile()
        .then(({ coach }) => setCoachProfile(coach))
        .catch(() => undefined);
    }
  }, [user?.role]);

  if (!user) {
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({ name, bio, focusArea });
      await refreshProfile();
      setMessage(t("profile.saved"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("profile.errorGeneric"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-card">
      <h2>{t("profile.greeting", { name: user.name })}</h2>
      <p className="profile-meta">
        {user.email} &middot; {t(`role.${user.role}` as TranslationKey)}
      </p>
      <form onSubmit={handleSubmit}>
        <label>
          {t("profile.name")}
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          {t("profile.bio")}
          <textarea value={bio ?? ""} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} />
        </label>
        <label>
          {t("profile.focusArea")}
          <input
            value={focusArea ?? ""}
            onChange={(e) => setFocusArea(e.target.value)}
            placeholder={t("profile.focusAreaPlaceholder")}
            maxLength={80}
          />
        </label>
        {message && <p className="profile-message">{message}</p>}
        <button type="submit" disabled={saving}>
          {t("profile.save")}
        </button>
      </form>

      {user.role === "USER" && (
        <CoachApplicationSection
          coachProfile={coachProfile}
          onApplied={(coach) => {
            setCoachProfile(coach);
            void refreshProfile();
          }}
        />
      )}

      <button type="button" className="logout" onClick={() => void logout()}>
        {t("profile.logout")}
      </button>
    </div>
  );
}

function CoachApplicationSection({
  coachProfile,
  onApplied,
}: {
  coachProfile: MyCoachProfile | null;
  onApplied: (coach: MyCoachProfile) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [specialty, setSpecialty] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { coach } = await becomeCoach({ specialty, priceCents: Math.round(Number(price) * 100) });
      onApplied(coach);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  if (coachProfile?.status === "PENDING") {
    return (
      <div className="coach-status-notice">
        <span className="status-badge status-pending coach-status-badge">{t("status.coachPending")}</span>
        <p>{t("becomeCoach.pendingNotice")}</p>
      </div>
    );
  }

  if (coachProfile?.status === "APPROVED") {
    return (
      <div className="coach-status-notice">
        <span className="status-badge status-approved coach-status-badge">{t("status.coachApproved")}</span>
        <p>{t("becomeCoach.approvedNotice")}</p>
      </div>
    );
  }

  const wasRejected = coachProfile?.status === "REJECTED";

  if (!open) {
    return (
      <div className="coach-status-notice">
        {wasRejected && (
          <>
            <span className="status-badge status-rejected coach-status-badge">{t("status.coachRejected")}</span>
            <p>{t("becomeCoach.rejectedNotice")}</p>
          </>
        )}
        <button type="button" className="link-quiet become-coach-toggle" onClick={() => setOpen(true)}>
          {wasRejected ? t("becomeCoach.reapply") : t("becomeCoach.prompt")}
        </button>
      </div>
    );
  }

  return (
    <form className="become-coach-form" onSubmit={handleSubmit}>
      <label>
        {t("becomeCoach.specialty")}
        <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} required />
      </label>
      <label>
        {t("becomeCoach.price")}
        <input
          type="number"
          min="0"
          step="1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </label>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {t("becomeCoach.submit")}
      </button>
    </form>
  );
}

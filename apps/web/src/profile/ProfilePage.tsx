import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { becomeCoach, updateProfile } from "../lib/api";

export function ProfilePage() {
  const { user, logout, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [focusArea, setFocusArea] = useState(user?.focusArea ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage("Profil yangilandi");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-card">
      <h2>Salom, {user.name}</h2>
      <p className="profile-meta">
        {user.email} &middot; {user.role}
      </p>
      <form onSubmit={handleSubmit}>
        <label>
          Ism
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Bio
          <textarea value={bio ?? ""} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} />
        </label>
        <label>
          Maqsad sohasi
          <input
            value={focusArea ?? ""}
            onChange={(e) => setFocusArea(e.target.value)}
            placeholder="masalan: sog'liq, karyera, moliya"
            maxLength={80}
          />
        </label>
        {message && <p className="profile-message">{message}</p>}
        <button type="submit" disabled={saving}>
          Saqlash
        </button>
      </form>
      {user.role === "USER" && <BecomeCoachSection onDone={() => void refreshProfile()} />}

      <button type="button" className="logout" onClick={() => void logout()}>
        Chiqish
      </button>
    </div>
  );
}

function BecomeCoachSection({ onDone }: { onDone: () => void }) {
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
      await becomeCoach({ specialty, priceCents: Math.round(Number(price) * 100) });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="link-quiet become-coach-toggle" onClick={() => setOpen(true)}>
        Coach bo'lishni xohlaysizmi?
      </button>
    );
  }

  return (
    <form className="become-coach-form" onSubmit={handleSubmit}>
      <label>
        Mutaxassislik
        <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} required />
      </label>
      <label>
        Bir sessiya narxi (USD)
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
        Coach sifatida ro'yxatdan o'tish
      </button>
    </form>
  );
}

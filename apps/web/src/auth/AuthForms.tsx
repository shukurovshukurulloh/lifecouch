import { useEffect, useState, type FormEvent } from "react";
import * as api from "../lib/api";
import { useTranslation } from "../i18n/LocaleContext";
import { useAuth } from "./AuthContext";

export function AuthForms() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRequired, setInviteRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login, register, error } = useAuth();

  useEffect(() => {
    // Beta-reliz yoqilganmi — yoqilgan bo'lsa ro'yxatdan o'tish formasida
    // taklifnoma-kod maydoni ko'rsatiladi (auth/routes.ts: GET /auth/beta-status).
    api
      .fetchBetaStatus()
      .then((status) => setInviteRequired(status.inviteRequired))
      .catch(() => setInviteRequired(false));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name, inviteRequired ? inviteCode : undefined);
      }
    } catch {
      // Xato AuthContext ichida saqlanadi va pastda ko'rsatiladi.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
          {t("auth.loginTab")}
        </button>
        <button
          type="button"
          className={mode === "register" ? "active" : ""}
          onClick={() => setMode("register")}
        >
          {t("auth.registerTab")}
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <label>
            {t("auth.name")}
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        {mode === "register" && inviteRequired && (
          <label>
            {t("auth.inviteCode")}
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder={t("auth.inviteCodePlaceholder")}
              required
            />
          </label>
        )}
        <label>
          {t("auth.email")}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          {t("auth.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {mode === "login" ? t("auth.submitLogin") : t("auth.submitRegister")}
        </button>
      </form>
    </div>
  );
}

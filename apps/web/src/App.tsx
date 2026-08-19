import { useState } from "react";
import "./App.css";
import { AdminPage } from "./admin/AdminPage";
import { AiCoachPage } from "./ai/AiCoachPage";
import { AuthForms } from "./auth/AuthForms";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { BillingPage } from "./billing/BillingPage";
import { ChatPage } from "./chat/ChatPage";
import { CoachesPage } from "./coaches/CoachesPage";
import { CrashFallback } from "./common/CrashFallback";
import { LoadingState } from "./common/Feedback";
import { DashboardPage } from "./dashboard/DashboardPage";
import { GoalsPage } from "./goals/GoalsPage";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { LocaleProvider, useTranslation } from "./i18n/LocaleContext";
import { MonitoringErrorBoundary } from "./monitoring/sentry";
import { ProfilePage } from "./profile/ProfilePage";
import { MySessionsPage } from "./sessions/MySessionsPage";
import { ThemeProvider } from "./theme/ThemeContext";
import { ThemeToggle } from "./theme/ThemeToggle";

type Tab = "dashboard" | "goals" | "coaches" | "sessions" | "chat" | "ai" | "billing" | "profile" | "admin";

function AppDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);

  function openChat(partnerId: string) {
    setChatPartnerId(partnerId);
    setTab("chat");
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <>
      <nav className="tabs">
        <button type="button" className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>
          {t("nav.dashboard")}
        </button>
        <button type="button" className={tab === "goals" ? "active" : ""} onClick={() => setTab("goals")}>
          {t("nav.goals")}
        </button>
        <button type="button" className={tab === "coaches" ? "active" : ""} onClick={() => setTab("coaches")}>
          {t("nav.coaches")}
        </button>
        <button type="button" className={tab === "sessions" ? "active" : ""} onClick={() => setTab("sessions")}>
          {t("nav.sessions")}
        </button>
        <button type="button" className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}>
          {t("nav.chat")}
        </button>
        <button type="button" className={tab === "ai" ? "active" : ""} onClick={() => setTab("ai")}>
          {t("nav.ai")}
        </button>
        <button type="button" className={tab === "billing" ? "active" : ""} onClick={() => setTab("billing")}>
          {t("nav.billing")}
        </button>
        <button type="button" className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>
          {t("nav.profile")}
        </button>
        {isAdmin && (
          <button type="button" className={tab === "admin" ? "active" : ""} onClick={() => setTab("admin")}>
            {t("nav.admin")}
          </button>
        )}
      </nav>

      {tab === "dashboard" && <DashboardPage />}
      {tab === "goals" && <GoalsPage />}
      {tab === "coaches" && <CoachesPage onOpenChat={openChat} />}
      {tab === "sessions" && <MySessionsPage onOpenChat={openChat} />}
      {tab === "chat" && <ChatPage partnerId={chatPartnerId} />}
      {tab === "ai" && <AiCoachPage />}
      {tab === "billing" && <BillingPage />}
      {tab === "profile" && <ProfilePage />}
      {tab === "admin" && isAdmin && <AdminPage />}
    </>
  );
}

function AuthGate() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  return (
    <main className={`page${user ? " page-wide" : ""}`}>
      <header className="app-header">
        <h1 className="brand">{t("app.brand")}</h1>
        <div className="app-header-controls">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>
      {loading ? <LoadingState /> : user ? <AppDashboard /> : <AuthForms />}
    </main>
  );
}

export function App() {
  return (
    <LocaleProvider>
      <MonitoringErrorBoundary fallback={<CrashFallback />}>
        <ThemeProvider>
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </ThemeProvider>
      </MonitoringErrorBoundary>
    </LocaleProvider>
  );
}

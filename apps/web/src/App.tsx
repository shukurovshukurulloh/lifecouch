import { useState } from "react";
import "./App.css";
import { AuthForms } from "./auth/AuthForms";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ChatPage } from "./chat/ChatPage";
import { CoachesPage } from "./coaches/CoachesPage";
import { GoalsPage } from "./goals/GoalsPage";
import { ProfilePage } from "./profile/ProfilePage";
import { MySessionsPage } from "./sessions/MySessionsPage";

type Tab = "goals" | "coaches" | "sessions" | "chat" | "profile";

function Dashboard() {
  const [tab, setTab] = useState<Tab>("goals");
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);

  function openChat(partnerId: string) {
    setChatPartnerId(partnerId);
    setTab("chat");
  }

  return (
    <>
      <nav className="tabs">
        <button type="button" className={tab === "goals" ? "active" : ""} onClick={() => setTab("goals")}>
          Maqsadlar
        </button>
        <button type="button" className={tab === "coaches" ? "active" : ""} onClick={() => setTab("coaches")}>
          Coachlar
        </button>
        <button type="button" className={tab === "sessions" ? "active" : ""} onClick={() => setTab("sessions")}>
          Sessiyalar
        </button>
        <button type="button" className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}>
          Xabarlar
        </button>
        <button type="button" className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>
          Profil
        </button>
      </nav>

      {tab === "goals" && <GoalsPage />}
      {tab === "coaches" && <CoachesPage onOpenChat={openChat} />}
      {tab === "sessions" && <MySessionsPage onOpenChat={openChat} />}
      {tab === "chat" && <ChatPage partnerId={chatPartnerId} />}
      {tab === "profile" && <ProfilePage />}
    </>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  return (
    <main className="page">
      <h1 className="brand">Lifecouch</h1>
      {loading ? <p className="loading">Yuklanmoqda...</p> : user ? <Dashboard /> : <AuthForms />}
    </main>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

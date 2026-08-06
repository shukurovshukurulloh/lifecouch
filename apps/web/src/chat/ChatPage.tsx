import type { ChatMessage } from "@lifecouch/shared";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import * as api from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";

export function ChatPage({ partnerId }: { partnerId: string | null }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const socketRef = useRef<ReturnType<typeof connectSocket> | null>(null);

  useEffect(() => {
    if (!partnerId) return;
    let cancelled = false;

    api.fetchChatHistory(partnerId).then(({ messages: history }) => {
      if (!cancelled) setMessages(history);
    });

    const token = api.getAccessToken();
    if (!token) return;
    const socket = connectSocket(token);
    socketRef.current = socket;

    function handleNew(message: ChatMessage) {
      if (message.senderId === partnerId || message.receiverId === partnerId) {
        setMessages((prev) => [...prev, message]);
      }
    }
    socket.on("message:new", handleNew);

    return () => {
      cancelled = true;
      socket.off("message:new", handleNew);
      disconnectSocket();
    };
  }, [partnerId]);

  function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !partnerId || !socketRef.current) return;
    socketRef.current.emit("message:send", { receiverId: partnerId, content: draft.trim() });
    setDraft("");
  }

  if (!partnerId) {
    return (
      <p className="empty-state">
        Suhbatdosh tanlanmagan — Coachlar yoki Sessiyalar bo'limidan "Xabar" tugmasini bosing.
      </p>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`chat-bubble ${message.senderId === user?.id ? "mine" : ""}`}>
            {message.content}
          </div>
        ))}
      </div>
      <form className="chat-input" onSubmit={handleSend}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Xabar yozing..." />
        <button type="submit" disabled={!draft.trim()}>
          Yuborish
        </button>
      </form>
    </div>
  );
}

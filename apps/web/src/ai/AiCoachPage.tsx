import type { AiMessageDto, AiUsageDto } from "@lifecouch/shared";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { EmptyState, LoadingState } from "../common/Feedback";
import { useTranslation } from "../i18n/LocaleContext";
import * as api from "../lib/api";

interface DisplayMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
}

export function AiCoachPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [usage, setUsage] = useState<AiUsageDto | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function usageLabel(currentUsage: AiUsageDto | null): string {
    if (!currentUsage) return "";
    if (currentUsage.limit === null) return t("ai.unlimited");
    return t("ai.remaining", { remaining: currentUsage.remaining ?? 0, limit: currentUsage.limit });
  }

  useEffect(() => {
    let cancelled = false;
    api.fetchAiHistory().then(({ messages: history, usage: freshUsage }) => {
      if (cancelled) return;
      setMessages(history.map((m: AiMessageDto) => ({ id: m.id, role: m.role, content: m.content })));
      setUsage(freshUsage);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setDraft("");
    setError(null);
    setSending(true);
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "USER", content }]);

    const assistantId = `local-${Date.now()}-reply`;
    setMessages((prev) => [...prev, { id: assistantId, role: "ASSISTANT", content: "" }]);

    try {
      await api.sendAiMessage(content, (chunk) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
        );
      });
      const { usage: freshUsage } = await api.fetchAiHistory();
      setUsage(freshUsage);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      setError(err instanceof Error ? err.message : t("ai.errorGeneric"));
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="chat-page ai-coach-page">
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && <EmptyState>{t("ai.empty")}</EmptyState>}
        {messages.map((message) => (
          <div key={message.id} className={`chat-bubble ${message.role === "USER" ? "mine" : ""}`}>
            {message.content || (message.role === "ASSISTANT" && sending ? "..." : "")}
          </div>
        ))}
      </div>
      {error && <p className="auth-error ai-coach-error">{error}</p>}
      <p className="ai-usage-hint">{usageLabel(usage)}</p>
      <form className="chat-input" onSubmit={handleSend}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("ai.placeholder")}
          disabled={sending}
        />
        <button type="submit" disabled={!draft.trim() || sending}>
          {sending ? t("ai.sending") : t("ai.send")}
        </button>
      </form>
    </div>
  );
}

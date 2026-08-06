import type { HabitProgress } from "@lifecouch/shared";
import { useState } from "react";
import * as api from "../lib/api";

export function HabitRow({
  habit,
  onToggled,
  onDeleted,
}: {
  habit: HabitProgress;
  onToggled: (streak: number) => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const todayCompleted = habit.last7Days.at(-1)?.completed ?? false;

  async function handleToggle() {
    setBusy(true);
    try {
      const { streak } = await api.toggleCheckIn(habit.id);
      onToggled(streak);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    await api.deleteHabit(habit.id);
    onDeleted();
  }

  return (
    <div className="habit-row">
      <button
        type="button"
        className={`habit-check ${todayCompleted ? "done" : ""}`}
        onClick={() => void handleToggle()}
        disabled={busy}
        aria-pressed={todayCompleted}
        title="Bugungi holatni belgilash"
      >
        {todayCompleted ? "✓" : ""}
      </button>

      <div className="habit-info">
        <span className="habit-title">{habit.title}</span>
        <div className="habit-strip" aria-label="Oxirgi 7 kun">
          {habit.last7Days.map((day) => (
            <span key={day.date} className={`day-cell ${day.completed ? "filled" : ""}`} title={day.date} />
          ))}
        </div>
      </div>

      <span className="habit-streak">{habit.streak > 0 ? `🔥 ${habit.streak}` : "—"}</span>

      <button type="button" className="link-danger habit-delete" onClick={() => void handleDelete()}>
        &times;
      </button>
    </div>
  );
}

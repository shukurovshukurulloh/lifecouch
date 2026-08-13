import type { GoalWithHabits } from "@lifecouch/shared";
import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorBanner, LoadingState } from "../common/Feedback";
import { useTranslation } from "../i18n/LocaleContext";
import * as api from "../lib/api";
import { HabitRow } from "./HabitRow";

export function GoalsPage() {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<GoalWithHabits[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { goals: fetched } = await api.listGoals();
      setGoals(fetched);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("goals.errorLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreateGoal(event: FormEvent) {
    event.preventDefault();
    if (!newGoalTitle.trim()) return;
    setCreating(true);
    try {
      const { goal } = await api.createGoal({ title: newGoalTitle.trim() });
      setGoals((prev) => [...prev, goal]);
      setNewGoalTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("goals.errorCreate"));
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteGoal(goalId: string) {
    await api.deleteGoal(goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  }

  function handleHabitAdded(goalId: string, habit: GoalWithHabits["habits"][number]) {
    setGoals((prev) => prev.map((g) => (g.id === goalId ? { ...g, habits: [...g.habits, habit] } : g)));
  }

  function handleHabitDeleted(goalId: string, habitId: string) {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, habits: g.habits.filter((h) => h.id !== habitId) } : g)),
    );
  }

  function handleHabitToggled(goalId: string, habitId: string, streak: number) {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? { ...g, habits: g.habits.map((h) => (h.id === habitId ? { ...h, streak } : h)) }
          : g,
      ),
    );
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <div className="goals-page">
      <form className="goal-create" onSubmit={handleCreateGoal}>
        <input
          value={newGoalTitle}
          onChange={(e) => setNewGoalTitle(e.target.value)}
          placeholder={t("goals.newPlaceholder")}
        />
        <button type="submit" disabled={creating || !newGoalTitle.trim()}>
          {t("goals.add")}
        </button>
      </form>

      {error && <ErrorBanner message={error} onRetry={() => void load()} />}

      {goals.length === 0 && !error && <EmptyState>{t("goals.empty")}</EmptyState>}

      <div className="goal-list">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onDelete={() => void handleDeleteGoal(goal.id)}
            onHabitAdded={(habit) => handleHabitAdded(goal.id, habit)}
            onHabitDeleted={(habitId) => handleHabitDeleted(goal.id, habitId)}
            onHabitToggled={(habitId, streak) => handleHabitToggled(goal.id, habitId, streak)}
          />
        ))}
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  onDelete,
  onHabitAdded,
  onHabitDeleted,
  onHabitToggled,
}: {
  goal: GoalWithHabits;
  onDelete: () => void;
  onHabitAdded: (habit: GoalWithHabits["habits"][number]) => void;
  onHabitDeleted: (habitId: string) => void;
  onHabitToggled: (habitId: string, streak: number) => void;
}) {
  const { t } = useTranslation();
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [addingHabit, setAddingHabit] = useState(false);

  async function handleAddHabit(event: FormEvent) {
    event.preventDefault();
    if (!newHabitTitle.trim()) return;
    setAddingHabit(true);
    try {
      const { habit } = await api.createHabit(goal.id, { title: newHabitTitle.trim() });
      onHabitAdded(habit);
      setNewHabitTitle("");
    } finally {
      setAddingHabit(false);
    }
  }

  return (
    <div className="goal-card">
      <div className="goal-card-header">
        <h3>{goal.title}</h3>
        <button type="button" className="link-danger" onClick={onDelete}>
          {t("goals.delete")}
        </button>
      </div>

      <div className="habit-list">
        {goal.habits.map((habit) => (
          <HabitRow
            key={habit.id}
            habit={habit}
            onToggled={(streak) => onHabitToggled(habit.id, streak)}
            onDeleted={() => onHabitDeleted(habit.id)}
          />
        ))}
      </div>

      <form className="habit-create" onSubmit={handleAddHabit}>
        <input
          value={newHabitTitle}
          onChange={(e) => setNewHabitTitle(e.target.value)}
          placeholder={t("habit.newPlaceholder")}
        />
        <button type="submit" disabled={addingHabit || !newHabitTitle.trim()}>
          +
        </button>
      </form>
    </div>
  );
}

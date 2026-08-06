import type {
  AuthResponse,
  AvailabilitySlotDto,
  ChatMessage,
  GoalWithHabits,
  HabitProgress,
  PublicCoach,
  PublicUser,
  SessionBooking,
} from "@lifecouch/shared";

const API_BASE = "/api";

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? "Server bilan aloqada xatolik yuz berdi");
  }
  return body as T;
}

export function register(input: { email: string; password: string; name: string }): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) });
}

export function login(input: { email: string; password: string }): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(input) });
}

export function refresh(): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/refresh", { method: "POST" });
}

export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" });
}

export function fetchMe(): Promise<{ user: PublicUser }> {
  return request<{ user: PublicUser }>("/users/me");
}

export function updateProfile(input: {
  name?: string;
  bio?: string;
  avatarUrl?: string;
  focusArea?: string;
}): Promise<{ user: PublicUser }> {
  return request("/users/me", { method: "PATCH", body: JSON.stringify(input) });
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}

export function listGoals(): Promise<{ goals: GoalWithHabits[] }> {
  return request("/goals");
}

export function createGoal(input: { title: string; description?: string; category?: string }): Promise<{
  goal: GoalWithHabits;
}> {
  return request("/goals", { method: "POST", body: JSON.stringify(input) });
}

export function deleteGoal(goalId: string): Promise<void> {
  return request(`/goals/${goalId}`, { method: "DELETE" });
}

export function createHabit(
  goalId: string,
  input: { title: string; frequency?: "DAILY" | "WEEKLY" },
): Promise<{ habit: HabitProgress }> {
  return request(`/goals/${goalId}/habits`, { method: "POST", body: JSON.stringify(input) });
}

export function deleteHabit(habitId: string): Promise<void> {
  return request(`/goals/habits/${habitId}`, { method: "DELETE" });
}

export function toggleCheckIn(habitId: string): Promise<{ streak: number }> {
  return request(`/goals/habits/${habitId}/check-ins`, { method: "POST", body: JSON.stringify({}) });
}

export function listCoaches(): Promise<{ coaches: PublicCoach[] }> {
  return request("/coaches");
}

export function becomeCoach(input: { specialty: string; priceCents: number; currency?: string }): Promise<{
  coach: PublicCoach;
}> {
  return request("/coaches/me", { method: "POST", body: JSON.stringify(input) });
}

export function listAvailability(coachId: string): Promise<{ slots: AvailabilitySlotDto[] }> {
  return request(`/coaches/${coachId}/availability`);
}

export function addAvailability(input: { startsAt: string; endsAt: string }): Promise<{
  slot: AvailabilitySlotDto;
}> {
  return request("/coaches/me/availability", { method: "POST", body: JSON.stringify(input) });
}

export function listSessions(): Promise<{ asUser: SessionBooking[]; asCoach: SessionBooking[] }> {
  return request("/sessions");
}

export function bookSession(slotId: string): Promise<{ session: SessionBooking }> {
  return request("/sessions", { method: "POST", body: JSON.stringify({ slotId }) });
}

export function cancelSession(sessionId: string): Promise<void> {
  return request(`/sessions/${sessionId}/cancel`, { method: "PATCH" });
}

export function fetchChatHistory(otherUserId: string): Promise<{ messages: ChatMessage[] }> {
  return request(`/chat/${otherUserId}/messages`);
}

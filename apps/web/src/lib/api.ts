import type {
  AdminCoachApplication,
  AdminInviteCode,
  AdminStats,
  AdminSubscription,
  AdminUser,
  AiMessageDto,
  AiUsageDto,
  AuthResponse,
  AvailabilitySlotDto,
  BetaStatus,
  ChatMessage,
  DashboardSummary,
  GoalWithHabits,
  HabitProgress,
  InvoiceDto,
  MyCoachProfile,
  PlanDefinitionDto,
  PublicCoach,
  PublicUser,
  Role,
  SessionBooking,
  SubscriptionDto,
  SubscriptionPlan,
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

export function register(
  input: { email: string; password: string; name: string; inviteCode?: string },
): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(input) });
}

export function fetchBetaStatus(): Promise<BetaStatus> {
  return request<BetaStatus>("/auth/beta-status");
}

export function googleLogin(input: { credential: string; inviteCode?: string }): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/google", { method: "POST", body: JSON.stringify(input) });
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

export function fetchMyCoachProfile(): Promise<{ coach: MyCoachProfile | null }> {
  return request("/coaches/me");
}

export function becomeCoach(input: { specialty: string; priceCents: number; currency?: string }): Promise<{
  coach: MyCoachProfile;
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

export function fetchBillingPlans(): Promise<{ plans: PlanDefinitionDto[]; subscription: SubscriptionDto }> {
  return request("/billing/plans");
}

export function fetchInvoices(): Promise<{ invoices: InvoiceDto[] }> {
  return request("/billing/invoices");
}

export function checkout(plan: SubscriptionPlan): Promise<{ url: string | null; subscription: SubscriptionDto }> {
  return request("/billing/checkout", { method: "POST", body: JSON.stringify({ plan }) });
}

export function cancelSubscription(): Promise<{ subscription: SubscriptionDto }> {
  return request("/billing/cancel", { method: "POST" });
}

export function fetchAiHistory(): Promise<{ messages: AiMessageDto[]; usage: AiUsageDto }> {
  return request("/ai/messages");
}

/**
 * AI coach javobini bo'lak-bo'lak (streaming) qabul qiladi — `request()`dagi kabi butun
 * JSON javobni kutmasdan, har bir matn bo'lagi kelgan zahoti `onChunk` chaqiriladi.
 */
export async function sendAiMessage(content: string, onChunk: (chunk: string) => void): Promise<void> {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_BASE}/ai/messages`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "AI javob berishda xatolik yuz berdi");
  }
  if (!res.body) {
    onChunk(await res.text());
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

// ---------- Dashboard ----------

export function fetchDashboardSummary(): Promise<{ summary: DashboardSummary }> {
  return request("/dashboard/summary");
}

// ---------- Admin ----------

export function fetchAdminStats(): Promise<AdminStats> {
  return request("/admin/stats");
}

export function fetchPendingCoaches(): Promise<{ coaches: AdminCoachApplication[] }> {
  return request("/admin/coaches/pending");
}

export function approveCoach(coachId: string): Promise<{ coach: AdminCoachApplication }> {
  return request(`/admin/coaches/${coachId}/approve`, { method: "POST" });
}

export function rejectCoach(coachId: string, note?: string): Promise<{ coach: AdminCoachApplication }> {
  return request(`/admin/coaches/${coachId}/reject`, { method: "POST", body: JSON.stringify({ note }) });
}

export function fetchAdminUsers(input: { search?: string; page?: number; pageSize?: number } = {}): Promise<{
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const params = new URLSearchParams();
  if (input.search) params.set("search", input.search);
  if (input.page) params.set("page", String(input.page));
  if (input.pageSize) params.set("pageSize", String(input.pageSize));
  const qs = params.toString();
  return request(`/admin/users${qs ? `?${qs}` : ""}`);
}

export function updateUserRole(userId: string, role: Role): Promise<{ user: AdminUser }> {
  return request(`/admin/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
}

export function fetchAdminSubscriptions(input: { page?: number; pageSize?: number } = {}): Promise<{
  subscriptions: AdminSubscription[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const params = new URLSearchParams();
  if (input.page) params.set("page", String(input.page));
  if (input.pageSize) params.set("pageSize", String(input.pageSize));
  const qs = params.toString();
  return request(`/admin/subscriptions${qs ? `?${qs}` : ""}`);
}

export function fetchAdminInviteCodes(
  input: { page?: number; pageSize?: number; status?: "used" | "unused" } = {},
): Promise<{ codes: AdminInviteCode[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams();
  if (input.page) params.set("page", String(input.page));
  if (input.pageSize) params.set("pageSize", String(input.pageSize));
  if (input.status) params.set("status", input.status);
  const qs = params.toString();
  return request(`/admin/invite-codes${qs ? `?${qs}` : ""}`);
}

export function createInviteCodes(input: { note?: string; count?: number }): Promise<{ codes: AdminInviteCode[] }> {
  return request("/admin/invite-codes", { method: "POST", body: JSON.stringify(input) });
}

export function revokeInviteCode(id: string): Promise<void> {
  return request(`/admin/invite-codes/${id}`, { method: "DELETE" });
}

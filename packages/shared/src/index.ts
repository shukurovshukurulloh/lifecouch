export type Role = "USER" | "COACH" | "ADMIN";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  focusArea: string | null;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}

export type GoalStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type HabitFrequency = "DAILY" | "WEEKLY";

export interface DayCell {
  date: string;
  completed: boolean;
}

export interface HabitProgress {
  id: string;
  goalId: string;
  title: string;
  frequency: HabitFrequency;
  createdAt: string;
  streak: number;
  last7Days: DayCell[];
}

export interface GoalWithHabits {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: string | null;
  targetDate: string | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  habits: HabitProgress[];
}

export interface PublicCoach {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  specialty: string;
  priceCents: number;
  currency: string;
  ratingAvg: number | null;
}

export type CoachStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface MyCoachProfile extends PublicCoach {
  status: CoachStatus;
  rejectionNote: string | null;
}

export interface AvailabilitySlotDto {
  id: string;
  coachId: string;
  startsAt: string;
  endsAt: string;
  isBooked: boolean;
}

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface SessionBooking {
  id: string;
  userId: string;
  coachId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: BookingStatus;
  videoLink: string | null;
  /// Bron paytida coach narxidan suratga olingan — eski sessiyalarda bo'lmasligi mumkin.
  priceCents?: number | null;
  currency?: string | null;
  coach?: { user: { name: string } };
  user?: { name: string };
}

export type PayoutStatus = "PENDING" | "PAID" | "REJECTED";

export interface EarningsSummary {
  totalEarnedCents: number;
  paidCents: number;
  pendingCents: number;
  availableCents: number;
  currency: string;
}

export interface PayoutRequestDto {
  id: string;
  amountCents: number;
  currency: string;
  status: PayoutStatus;
  note: string | null;
  adminNote: string | null;
  requestedAt: string;
  processedAt: string | null;
}

export interface AdminPayoutRequest extends PayoutRequestDto {
  coachId: string;
  coachName: string;
  coachEmail: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export type SubscriptionPlan = "FREE" | "PRO" | "PREMIUM";
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";

export interface PlanDefinitionDto {
  id: SubscriptionPlan;
  name: string;
  priceCents: number;
  currency: string;
  maxActiveGoals: number | null;
  coachBookingAllowed: boolean;
  aiMessagesPerDay: number | null;
  features: string[];
}

export interface SubscriptionDto {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDto {
  id: string;
  plan: SubscriptionPlan;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
}

export type AiMessageRole = "USER" | "ASSISTANT";

export interface AiMessageDto {
  id: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
}

export interface AiUsageDto {
  /** null — cheklovsiz. */
  limit: number | null;
  used: number;
  remaining: number | null;
}

// ---------- Sprint 06: dashboard va admin ----------

export interface DashboardSummary {
  activeGoals: number;
  completedGoals: number;
  totalHabits: number;
  bestStreak: number;
  checkInsThisWeek: number;
  upcomingSessions: number;
  upcomingSessionsAsCoach: number;
  subscriptionPlan: SubscriptionPlan;
}

export interface AdminStats {
  totalUsers: number;
  totalCoaches: number;
  pendingCoaches: number;
  totalSessions: number;
  activeSubscriptions: number;
  totalRevenueCents: number;
}

export interface AdminCoachApplication {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialty: string;
  priceCents: number;
  currency: string;
  status: CoachStatus;
  rejectionNote: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  coachStatus: CoachStatus | null;
  subscriptionPlan: SubscriptionPlan | null;
}

export interface BetaStatus {
  inviteRequired: boolean;
}

export interface AdminInviteCode {
  id: string;
  code: string;
  note: string | null;
  usedByName: string | null;
  usedByEmail: string | null;
  usedAt: string | null;
  createdAt: string;
}

export interface AdminSubscription {
  id: string;
  userId: string;
  name: string;
  email: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  total: number;
  page: number;
  pageSize: number;
}

// Qolgan request/response DTOlari sprint-sprint qo'shib boriladi.

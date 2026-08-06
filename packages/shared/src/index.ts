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
  coach?: { user: { name: string } };
  user?: { name: string };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

// Qolgan request/response DTOlari sprint-sprint qo'shib boriladi.

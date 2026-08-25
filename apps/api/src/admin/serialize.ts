import type { Coach, InviteCode, Subscription, User } from "@prisma/client";

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  role: User["role"];
  createdAt: Date;
  coachStatus: Coach["status"] | null;
  subscriptionPlan: Subscription["plan"] | null;
}

export function toAdminUser(
  user: User & {
    coach: { status: Coach["status"] } | null;
    subscription: { plan: Subscription["plan"] } | null;
  },
): AdminUserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    coachStatus: user.coach?.status ?? null,
    subscriptionPlan: user.subscription?.plan ?? null,
  };
}

export interface AdminCoachApplicationDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialty: string;
  priceCents: number;
  currency: string;
  status: Coach["status"];
  rejectionNote: string | null;
  createdAt: Date;
}

export function toAdminCoachApplication(coach: Coach & { user: { name: string; email: string } }): AdminCoachApplicationDto {
  return {
    id: coach.id,
    userId: coach.userId,
    name: coach.user.name,
    email: coach.user.email,
    specialty: coach.specialty,
    priceCents: coach.priceCents,
    currency: coach.currency,
    status: coach.status,
    rejectionNote: coach.rejectionNote,
    createdAt: coach.createdAt,
  };
}

export interface AdminSubscriptionDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  plan: Subscription["plan"];
  status: Subscription["status"];
  currentPeriodEnd: Date | null;
  createdAt: Date;
}

export function toAdminSubscription(sub: Subscription & { user: { name: string; email: string } }): AdminSubscriptionDto {
  return {
    id: sub.id,
    userId: sub.userId,
    name: sub.user.name,
    email: sub.user.email,
    plan: sub.plan,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    createdAt: sub.createdAt,
  };
}

export interface AdminInviteCodeDto {
  id: string;
  code: string;
  note: string | null;
  usedByName: string | null;
  usedByEmail: string | null;
  usedAt: Date | null;
  createdAt: Date;
}

export function toAdminInviteCode(
  invite: InviteCode & { usedBy: { name: string; email: string } | null },
): AdminInviteCodeDto {
  return {
    id: invite.id,
    code: invite.code,
    note: invite.note,
    usedByName: invite.usedBy?.name ?? null,
    usedByEmail: invite.usedBy?.email ?? null,
    usedAt: invite.usedAt,
    createdAt: invite.createdAt,
  };
}

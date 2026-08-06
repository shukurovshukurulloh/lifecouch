import type { Coach } from "@prisma/client";

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

export function toPublicCoach(
  coach: Coach & { user: { name: string; avatarUrl: string | null; bio: string | null } },
): PublicCoach {
  return {
    id: coach.id,
    userId: coach.userId,
    name: coach.user.name,
    avatarUrl: coach.user.avatarUrl,
    bio: coach.user.bio,
    specialty: coach.specialty,
    priceCents: coach.priceCents,
    currency: coach.currency,
    ratingAvg: coach.ratingAvg,
  };
}

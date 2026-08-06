import type { Role } from "@prisma/client";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  focusArea: string | null;
  role: Role;
  createdAt: Date;
}

export function toPublicUser(user: PublicUser): PublicUser {
  const { id, email, name, avatarUrl, bio, focusArea, role, createdAt } = user;
  return { id, email, name, avatarUrl, bio, focusArea, role, createdAt };
}

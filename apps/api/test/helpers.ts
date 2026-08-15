import type { Express } from "express";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";

export function testApp(): Express {
  return createApp();
}

export interface RegisteredUser {
  accessToken: string;
  userId: string;
  email: string;
}

let counter = 0;
function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}.${Date.now()}.${counter}@example.com`;
}

/** Yangi foydalanuvchini ro'yxatdan o'tkazadi va access tokenini qaytaradi. */
export async function registerUser(
  app: Express,
  overrides: Partial<{ email: string; password: string; name: string }> = {},
): Promise<RegisteredUser> {
  const email = overrides.email ?? uniqueEmail("user");
  const password = overrides.password ?? "password123";
  const name = overrides.name ?? "Test Foydalanuvchi";

  const res = await request(app).post("/api/auth/register").send({ email, password, name });
  if (res.status !== 201) {
    throw new Error(`registerUser muvaffaqiyatsiz: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { accessToken: res.body.accessToken, userId: res.body.user.id, email };
}

/** Foydalanuvchini yaratadi, coach arizasini yuboradi va admin orqali tasdiqlaydi (role -> COACH). */
export async function createApprovedCoach(
  app: Express,
  opts: { priceCents?: number; specialty?: string } = {},
): Promise<RegisteredUser & { coachId: string }> {
  const coachUser = await registerUser(app, { email: uniqueEmail("coach"), name: "Coach Test" });
  await request(app)
    .post("/api/coaches/me")
    .set("Authorization", `Bearer ${coachUser.accessToken}`)
    .send({ specialty: opts.specialty ?? "Karyera", priceCents: opts.priceCents ?? 5000 });

  const coach = await prisma.coach.findUniqueOrThrow({ where: { userId: coachUser.userId } });
  const admin = await registerAdmin(app);
  const approveRes = await request(app)
    .post(`/api/admin/coaches/${coach.id}/approve`)
    .set("Authorization", `Bearer ${admin.accessToken}`);
  if (approveRes.status !== 200) {
    throw new Error(`createApprovedCoach tasdiqlash muvaffaqiyatsiz: ${approveRes.status}`);
  }

  // Approve qilingach role COACH bo'ladi — yangi access token kerak (eskisida hali eski role bor).
  const login = await request(app).post("/api/auth/login").send({ email: coachUser.email, password: "password123" });
  return { ...coachUser, accessToken: login.body.accessToken, coachId: coach.id };
}

/** Foydalanuvchini ADMIN roliga ko'taradi (to'g'ridan-to'g'ri bazada) va yangi tokenini qaytaradi. */
export async function registerAdmin(app: Express): Promise<RegisteredUser> {
  const user = await registerUser(app, { email: uniqueEmail("admin") });
  await prisma.user.update({ where: { id: user.userId }, data: { role: "ADMIN" } });
  const login = await request(app).post("/api/auth/login").send({ email: user.email, password: "password123" });
  return { ...user, accessToken: login.body.accessToken };
}

export function authHeader(token: string): [string, string] {
  return ["Authorization", `Bearer ${token}`];
}

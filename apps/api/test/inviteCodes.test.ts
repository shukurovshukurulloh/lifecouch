import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "../src/auth/hash.js";
import { prisma } from "../src/db.js";
import { authHeader, testApp } from "./helpers.js";

// `env.betaInviteRequired` getter sifatida yozilgan (src/env.ts) — har o'qishda
// process.env'dan o'qiladi, shu bilan bu yerda process restart qilmasdan
// yoqib/o'chirish mumkin va boshqa test fayllariga (auth.test.ts va h.k.,
// ular BETA_INVITE_REQUIRED'ni hech qachon o'rnatmaydi) ta'sir qilmaydi.
beforeAll(() => {
  process.env.BETA_INVITE_REQUIRED = "true";
});
afterAll(() => {
  delete process.env.BETA_INVITE_REQUIRED;
});

/**
 * BETA_INVITE_REQUIRED yoqilganda /auth/register orqali admin yaratib bo'lmaydi
 * (tuxum-tovuq muammosi — amalda birinchi admin bazada qo'lda/seed orqali
 * yaratiladi, xuddi helpers.ts'dagi registerAdmin ham rolni to'g'ridan-to'g'ri
 * bazada belgilaydi). Test uchun ham xuddi shunday, to'g'ridan-to'g'ri yaratamiz.
 */
async function bootstrapAdmin(app: Express) {
  const email = `admin.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
  const passwordHash = await hashPassword("password123");
  const user = await prisma.user.create({ data: { email, passwordHash, name: "Admin", role: "ADMIN" } });
  await prisma.subscription.create({ data: { userId: user.id } });
  const login = await request(app).post("/api/auth/login").send({ email, password: "password123" });
  return { accessToken: login.body.accessToken as string, userId: user.id, email };
}

describe("Beta taklifnoma kodlari (BETA_INVITE_REQUIRED=true)", () => {
  it("taklifnoma kodisiz ro'yxatdan o'tishni rad etadi", async () => {
    const app = testApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "kodsiz@example.com", password: "password123", name: "Kodsiz" });
    expect(res.status).toBe(400);
  });

  it("yaroqsiz kod bilan ro'yxatdan o'tishni rad etadi", async () => {
    const app = testApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "yaroqsiz@example.com", password: "password123", name: "Yaroqsiz", inviteCode: "NOTREAL" });
    expect(res.status).toBe(400);
  });

  it("admin yaratgan yaroqli kod bilan ro'yxatdan o'tkazadi va kodni ishlatilgan deb belgilaydi", async () => {
    const app = testApp();
    const admin = await bootstrapAdmin(app);
    const generateRes = await request(app)
      .post("/api/admin/invite-codes")
      .set(...authHeader(admin.accessToken))
      .send({ note: "Test guruhi" });
    expect(generateRes.status).toBe(201);
    const code = generateRes.body.codes[0].code as string;

    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "yaroqli@example.com", password: "password123", name: "Yaroqli", inviteCode: code });
    expect(registerRes.status).toBe(201);

    // Xuddi shu kod qayta ishlatilmasligi kerak.
    const reuseRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "qayta@example.com", password: "password123", name: "Qayta", inviteCode: code });
    expect(reuseRes.status).toBe(400);

    const listRes = await request(app)
      .get("/api/admin/invite-codes")
      .set(...authHeader(admin.accessToken));
    const listed = listRes.body.codes.find((c: { code: string }) => c.code === code);
    expect(listed.usedByEmail).toBe("yaroqli@example.com");
  });

  it("bir nechta kodni bir vaqtda yaratadi (count)", async () => {
    const app = testApp();
    const admin = await bootstrapAdmin(app);
    const res = await request(app)
      .post("/api/admin/invite-codes")
      .set(...authHeader(admin.accessToken))
      .send({ count: 3 });
    expect(res.status).toBe(201);
    expect(res.body.codes).toHaveLength(3);
  });

  it("ishlatilmagan kodni bekor qiladi, ishlatilganini bekor qila olmaydi", async () => {
    const app = testApp();
    const admin = await bootstrapAdmin(app);
    const generateRes = await request(app)
      .post("/api/admin/invite-codes")
      .set(...authHeader(admin.accessToken))
      .send({});
    const { id, code } = generateRes.body.codes[0];

    const revokeRes = await request(app)
      .delete(`/api/admin/invite-codes/${id}`)
      .set(...authHeader(admin.accessToken));
    expect(revokeRes.status).toBe(204);

    // Bekor qilingan kod endi ishlamaydi.
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "bekor@example.com", password: "password123", name: "Bekor", inviteCode: code });
    expect(registerRes.status).toBe(400);
  });

  it("oddiy foydalanuvchi taklifnoma kod endpointlariga kira olmaydi", async () => {
    const app = testApp();
    const admin = await bootstrapAdmin(app);
    const generateRes = await request(app)
      .post("/api/admin/invite-codes")
      .set(...authHeader(admin.accessToken))
      .send({});
    const code = generateRes.body.codes[0].code as string;
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "oddiy@example.com", password: "password123", name: "Oddiy", inviteCode: code });

    const res = await request(app)
      .post("/api/admin/invite-codes")
      .set(...authHeader(registerRes.body.accessToken))
      .send({});
    expect(res.status).toBe(403);
  });

  it("GET /api/auth/beta-status inviteRequired: true qaytaradi", async () => {
    const app = testApp();
    const res = await request(app).get("/api/auth/beta-status");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ inviteRequired: true });
  });
});

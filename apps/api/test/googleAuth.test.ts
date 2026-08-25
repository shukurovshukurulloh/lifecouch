import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock hoisting sababli (AuthContext.test.tsx'dagi vi.hoisted naqshiga o'xshab)
// verifyIdTokenMock'ni oldindan e'lon qilamiz — mock factory shu o'zgaruvchini ishlatadi.
const { verifyIdTokenMock } = vi.hoisted(() => ({ verifyIdTokenMock: vi.fn() }));

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({ verifyIdToken: verifyIdTokenMock })),
}));

// `env.googleClientId`/`env.betaInviteRequired` getter sifatida yozilgan (src/env.ts) —
// har o'qishda process.env'dan o'qiladi, shu bilan bu yerda process restart qilmasdan
// yoqib/o'chirish mumkin va boshqa test fayllariga ta'sir qilmaydi (fileParallelism:false).
import { registerAdmin, testApp } from "./helpers.js";

function mockGooglePayload(overrides: Partial<{
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}> = {}) {
  const payload = {
    sub: "google-sub-1",
    email: "google.user@example.com",
    email_verified: true,
    name: "Google Foydalanuvchi",
    picture: "https://example.com/avatar.png",
    ...overrides,
  };
  verifyIdTokenMock.mockResolvedValueOnce({ getPayload: () => payload });
  return payload;
}

describe("POST /api/auth/google", () => {
  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.BETA_INVITE_REQUIRED;
    verifyIdTokenMock.mockReset();
  });

  it("GOOGLE_CLIENT_ID sozlanmagan holatda 501 qaytaradi", async () => {
    const app = testApp();
    const res = await request(app).post("/api/auth/google").send({ credential: "any" });
    expect(res.status).toBe(501);
  });

  describe("GOOGLE_CLIENT_ID sozlangan holatda", () => {
    beforeEach(() => {
      process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    });

    it("yaroqli token bilan yangi hisob yaratadi (parolsiz, googleId/avatarUrl bilan)", async () => {
      const app = testApp();
      const payload = mockGooglePayload();
      const res = await request(app).post("/api/auth/google").send({ credential: "tok-1" });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTypeOf("string");
      expect(res.body.user).toMatchObject({ email: payload.email, name: payload.name, avatarUrl: payload.picture });
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it("email allaqachon mavjud bo'lsa, yangi user yaratmasdan hisobga bog'laydi", async () => {
      const app = testApp();
      const existing = await registerAdmin(app); // parol bilan ro'yxatdan o'tgan mavjud hisob
      mockGooglePayload({ sub: "google-sub-link", email: existing.email });

      const res = await request(app).post("/api/auth/google").send({ credential: "tok-2" });
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(existing.userId);
    });

    it("xuddi shu googleId bilan ikkinchi marta kirganda bir xil hisobga kiradi", async () => {
      const app = testApp();
      mockGooglePayload({ sub: "google-sub-repeat", email: "repeat@example.com" });
      const first = await request(app).post("/api/auth/google").send({ credential: "tok-3a" });
      expect(first.status).toBe(200);

      mockGooglePayload({ sub: "google-sub-repeat", email: "repeat@example.com" });
      const second = await request(app).post("/api/auth/google").send({ credential: "tok-3b" });
      expect(second.status).toBe(200);
      expect(second.body.user.id).toBe(first.body.user.id);
    });

    it("email tasdiqlanmagan bo'lsa (email_verified: false) rad etadi", async () => {
      const app = testApp();
      mockGooglePayload({ email_verified: false });
      const res = await request(app).post("/api/auth/google").send({ credential: "tok-4" });
      expect(res.status).toBe(401);
    });

    it("BETA_INVITE_REQUIRED=true bo'lganda yangi hisob uchun kodsiz rad etadi", async () => {
      process.env.BETA_INVITE_REQUIRED = "true";
      const app = testApp();
      mockGooglePayload({ sub: "google-sub-beta-1", email: "beta1@example.com" });
      const res = await request(app).post("/api/auth/google").send({ credential: "tok-5" });
      expect(res.status).toBe(400);
    });

    it("BETA_INVITE_REQUIRED=true bo'lganda yaroqli kod bilan yangi hisob yaratadi va kodni ishlatilgan deb belgilaydi", async () => {
      const app = testApp();
      // Admin BETA_INVITE_REQUIRED yoqilishidan OLDIN yaratiladi — aks holda registerAdmin
      // (u ham /auth/register orqali ishlaydi) o'zi kod talab qilib qolar edi.
      const admin = await registerAdmin(app);
      process.env.BETA_INVITE_REQUIRED = "true";
      const generateRes = await request(app)
        .post("/api/admin/invite-codes")
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({});
      const code = generateRes.body.codes[0].code as string;

      mockGooglePayload({ sub: "google-sub-beta-2", email: "beta2@example.com" });
      const res = await request(app).post("/api/auth/google").send({ credential: "tok-6", inviteCode: code });
      expect(res.status).toBe(200);

      const reuse = await request(app)
        .post("/api/auth/register")
        .send({ email: "reuse@example.com", password: "password123", name: "Reuse", inviteCode: code });
      expect(reuse.status).toBe(400);
    });

    it("BETA_INVITE_REQUIRED=true bo'lsa ham, mavjud hisobga bog'lash uchun kod talab qilmaydi", async () => {
      const app = testApp();
      const existing = await registerAdmin(app);
      process.env.BETA_INVITE_REQUIRED = "true";
      mockGooglePayload({ sub: "google-sub-beta-link", email: existing.email });

      const res = await request(app).post("/api/auth/google").send({ credential: "tok-7" });
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(existing.userId);
    });
  });
});

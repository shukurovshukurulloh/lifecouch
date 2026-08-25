import request from "supertest";
import { describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { testApp } from "./helpers.js";

describe("POST /api/auth/register", () => {
  it("yangi foydalanuvchini yaratadi va accessToken + refresh cookie qaytaradi", async () => {
    const app = testApp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "yangi@example.com", password: "password123", name: "Yangi Foydalanuvchi" });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.body.user).toMatchObject({ email: "yangi@example.com", role: "USER" });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers["set-cookie"]?.[0]).toMatch(/lifecouch_refresh=/);
  });

  it("bir xil email bilan ikkinchi marta ro'yxatdan o'tkazmaydi", async () => {
    const app = testApp();
    await request(app).post("/api/auth/register").send({ email: "dup@example.com", password: "password123", name: "A" });
    const res = await request(app).post("/api/auth/register").send({ email: "dup@example.com", password: "password123", name: "B" });
    expect(res.status).toBe(409);
  });

  it("qisqa parolni rad etadi", async () => {
    const app = testApp();
    const res = await request(app).post("/api/auth/register").send({ email: "short@example.com", password: "abc", name: "A" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("to'g'ri email/parol bilan kirishga ruxsat beradi", async () => {
    const app = testApp();
    await request(app).post("/api/auth/register").send({ email: "login@example.com", password: "password123", name: "A" });
    const res = await request(app).post("/api/auth/login").send({ email: "login@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTypeOf("string");
  });

  it("noto'g'ri parolni rad etadi", async () => {
    const app = testApp();
    await request(app).post("/api/auth/register").send({ email: "login2@example.com", password: "password123", name: "A" });
    const res = await request(app).post("/api/auth/login").send({ email: "login2@example.com", password: "wrong-pass" });
    expect(res.status).toBe(401);
  });

  it("mavjud bo'lmagan emailni rad etadi", async () => {
    const app = testApp();
    const res = await request(app).post("/api/auth/login").send({ email: "yoq@example.com", password: "password123" });
    expect(res.status).toBe(401);
  });

  it("parolsiz (Google-only) hisobga parol bilan kirishga urinishni rad etadi", async () => {
    const app = testApp();
    // Google orqali yaratilgan hisobda passwordHash yo'q (null) — bunday hisob login.ts
    // uchun ham xuddi shu generik xatoni qaytarishi kerak.
    await prisma.user.create({
      data: { email: "google-only@example.com", name: "Google Foydalanuvchi", googleId: "google-sub-login-test" },
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "google-only@example.com", password: "password123" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/refresh", () => {
  it("yaroqli refresh cookie bilan yangi accessToken beradi va eskisini bekor qiladi (rotatsiya)", async () => {
    const app = testApp();
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "refresh@example.com", password: "password123", name: "A" });
    const cookie = registerRes.headers["set-cookie"];

    const refreshRes = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeTypeOf("string");
    // Eslatma: JWT payload (sub/role) va iat (soniyagacha) bir xil bo'lsa, bir soniya ichida
    // yaratilgan ikki access token satr sifatida bir xil chiqishi mumkin — bu xavfsizlik
    // muammosi emas, shuning uchun bu yerda satrlarni solishtirmaymiz. Asosiy invariant —
    // refresh cookie ROTATSIYA qilinishi (eski token endi ishlamasligi), pastda tekshiriladi.
    const newCookie = refreshRes.headers["set-cookie"];
    expect(newCookie?.[0]).toMatch(/lifecouch_refresh=/);
    expect(newCookie?.[0]).not.toBe(cookie[0]);

    // Eski refresh token endi bekor qilingan — qayta ishlatib bo'lmaydi.
    const reuseRes = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(reuseRes.status).toBe(401);
  });

  it("cookie bo'lmasa 401 qaytaradi", async () => {
    const app = testApp();
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("refresh tokenni bekor qiladi va cookie'ni tozalaydi", async () => {
    const app = testApp();
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "logout@example.com", password: "password123", name: "A" });
    const cookie = registerRes.headers["set-cookie"];

    const logoutRes = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(logoutRes.status).toBe(204);

    const refreshRes = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(refreshRes.status).toBe(401);
  });
});

describe("himoyalangan yo'llar", () => {
  it("Authorization header'siz 401 qaytaradi", async () => {
    const app = testApp();
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
  });

  it("yaroqli accessToken bilan foydalanuvchi profilini qaytaradi", async () => {
    const app = testApp();
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "profile@example.com", password: "password123", name: "Profil Egasi" });

    const res = await request(app).get("/api/users/me").set("Authorization", `Bearer ${registerRes.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: "profile@example.com", name: "Profil Egasi" });
  });
});

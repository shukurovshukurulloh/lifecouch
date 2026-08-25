import request from "supertest";
import { describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { authHeader, createApprovedCoach, registerAdmin, registerUser, testApp } from "./helpers.js";

/** COMPLETED sessiyani to'g'ridan-to'g'ri bazada yaratadi — cron/completionJob'ni kutmasdan. */
function completeSession(coachId: string, userId: string, priceCents: number) {
  return prisma.session.create({
    data: {
      userId,
      coachId,
      scheduledAt: new Date(Date.now() - 60 * 60 * 1000),
      durationMinutes: 60,
      status: "COMPLETED",
      priceCents,
      currency: "USD",
    },
  });
}

describe("GET /api/payouts/me", () => {
  it("COMPLETED sessiyalar yig'indisini qaytaradi", async () => {
    const app = testApp();
    const coach = await createApprovedCoach(app, { priceCents: 5000 });
    const user = await registerUser(app);
    await completeSession(coach.coachId, user.userId, 5000);
    await completeSession(coach.coachId, user.userId, 5000);

    const res = await request(app).get("/api/payouts/me").set(...authHeader(coach.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.summary).toMatchObject({
      totalEarnedCents: 10000,
      paidCents: 0,
      pendingCents: 0,
      availableCents: 10000,
      currency: "USD",
    });
    expect(res.body.requests).toEqual([]);
  });

  it("oddiy USER kira olmaydi", async () => {
    const app = testApp();
    const user = await registerUser(app);
    const res = await request(app).get("/api/payouts/me").set(...authHeader(user.accessToken));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/payouts/me", () => {
  it("yechish mumkin bo'lgan balansdan ko'p summani rad etadi", async () => {
    const app = testApp();
    const coach = await createApprovedCoach(app, { priceCents: 5000 });
    const user = await registerUser(app);
    await completeSession(coach.coachId, user.userId, 5000);

    const res = await request(app)
      .post("/api/payouts/me")
      .set(...authHeader(coach.accessToken))
      .send({ amountCents: 10000 });
    expect(res.status).toBe(400);
  });

  it("yaroqli so'rov PENDING yaratadi va keyingi balansni kamaytiradi", async () => {
    const app = testApp();
    const coach = await createApprovedCoach(app, { priceCents: 5000 });
    const user = await registerUser(app);
    await completeSession(coach.coachId, user.userId, 5000);

    const res = await request(app)
      .post("/api/payouts/me")
      .set(...authHeader(coach.accessToken))
      .send({ amountCents: 3000, note: "Bank kartaga" });
    expect(res.status).toBe(201);
    expect(res.body.request).toMatchObject({ amountCents: 3000, status: "PENDING", note: "Bank kartaga" });

    const summaryRes = await request(app).get("/api/payouts/me").set(...authHeader(coach.accessToken));
    expect(summaryRes.body.summary.pendingCents).toBe(3000);
    expect(summaryRes.body.summary.availableCents).toBe(2000);
  });
});

describe("PATCH /api/admin/payouts/:id", () => {
  it("admin so'rovni PAID qiladi, keyin qayta ko'rib chiqa olmaydi", async () => {
    const app = testApp();
    const coach = await createApprovedCoach(app, { priceCents: 5000 });
    const user = await registerUser(app);
    await completeSession(coach.coachId, user.userId, 5000);
    const reqRes = await request(app)
      .post("/api/payouts/me")
      .set(...authHeader(coach.accessToken))
      .send({ amountCents: 5000 });
    const requestId = reqRes.body.request.id;

    const admin = await registerAdmin(app);
    const patchRes = await request(app)
      .patch(`/api/admin/payouts/${requestId}`)
      .set(...authHeader(admin.accessToken))
      .send({ status: "PAID", adminNote: "Bank o'tkazmasi qilindi" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.request.status).toBe("PAID");

    // To'langandan keyin balans doimiy kamayadi (kutilayotgan emas, to'langan hisoblanadi).
    const summaryRes = await request(app).get("/api/payouts/me").set(...authHeader(coach.accessToken));
    expect(summaryRes.body.summary).toMatchObject({ paidCents: 5000, pendingCents: 0, availableCents: 0 });

    const second = await request(app)
      .patch(`/api/admin/payouts/${requestId}`)
      .set(...authHeader(admin.accessToken))
      .send({ status: "REJECTED" });
    expect(second.status).toBe(409);
  });

  it("ADMIN bo'lmagan foydalanuvchi kira olmaydi", async () => {
    const app = testApp();
    const coach = await createApprovedCoach(app);
    const res = await request(app).get("/api/admin/payouts").set(...authHeader(coach.accessToken));
    expect(res.status).toBe(403);
  });
});

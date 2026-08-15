import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApprovedCoach, registerUser, testApp } from "./helpers.js";

/** Foydalanuvchini PRO rejaga o'tkazadi (dev muhitda Stripe ulanmagan — checkout darhol simulyatsiya qilinadi). */
async function upgradeToPro(app: ReturnType<typeof testApp>, token: string): Promise<void> {
  const res = await request(app)
    .post("/api/billing/checkout")
    .set("Authorization", `Bearer ${token}`)
    .send({ plan: "PRO" });
  expect(res.status).toBe(200);
}

async function addAvailabilitySlot(
  app: ReturnType<typeof testApp>,
  coachToken: string,
  startsAt = new Date(Date.now() + 60 * 60 * 1000),
  endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000),
): Promise<{ id: string }> {
  const res = await request(app)
    .post("/api/coaches/me/availability")
    .set("Authorization", `Bearer ${coachToken}`)
    .send({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
  expect(res.status).toBe(201);
  return res.body.slot;
}

describe("coach bo'lish arizasi va tasdiqlash oqimi", () => {
  it("ariza PENDING holatda boshlanadi va admin tasdiqlagach role COACH bo'ladi", async () => {
    const app = testApp();
    const coach = await createApprovedCoach(app);

    const meRes = await request(app).get("/api/users/me").set("Authorization", `Bearer ${coach.accessToken}`);
    expect(meRes.body.user.role).toBe("COACH");
  });

  it("tasdiqlanmagan coach ommaviy ro'yxatda ko'rinmaydi", async () => {
    const app = testApp();
    const coachUser = await registerUser(app);
    await request(app)
      .post("/api/coaches/me")
      .set("Authorization", `Bearer ${coachUser.accessToken}`)
      .send({ specialty: "Sport", priceCents: 3000 });

    const listRes = await request(app).get("/api/coaches").set("Authorization", `Bearer ${coachUser.accessToken}`);
    expect(listRes.body.coaches).toHaveLength(0);
  });
});

describe("sessiya bron qilish", () => {
  it("Free rejadagi foydalanuvchini 402 bilan to'xtatadi (paywall)", async () => {
    const app = testApp();
    const coach = await createApprovedCoach(app);
    const slot = await addAvailabilitySlot(app, coach.accessToken);
    const user = await registerUser(app);

    const res = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ slotId: slot.id });

    expect(res.status).toBe(402);
  });

  it("PRO foydalanuvchi bo'sh slotni band qiladi, video havola yaratiladi va slot band bo'ladi", async () => {
    const app = testApp();
    const coach = await createApprovedCoach(app);
    const slot = await addAvailabilitySlot(app, coach.accessToken);
    const user = await registerUser(app);
    await upgradeToPro(app, user.accessToken);

    const bookRes = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ slotId: slot.id });

    expect(bookRes.status).toBe(201);
    expect(bookRes.body.session.status).toBe("CONFIRMED");
    expect(bookRes.body.session.videoLink).toBeTypeOf("string");

    // Endi shu slot boshqa hech kimga ko'rinmaydi.
    const availabilityRes = await request(app)
      .get(`/api/coaches/${coach.coachId}/availability`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(availabilityRes.body.slots).toHaveLength(0);
  });

  it("band qilingan slotni ikkinchi marta bron qilishga urinishda 409 qaytaradi", async () => {
    const app = testApp();
    const coach = await createApprovedCoach(app);
    const slot = await addAvailabilitySlot(app, coach.accessToken);

    const userA = await registerUser(app);
    await upgradeToPro(app, userA.accessToken);
    const userB = await registerUser(app);
    await upgradeToPro(app, userB.accessToken);

    const first = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${userA.accessToken}`)
      .send({ slotId: slot.id });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${userB.accessToken}`)
      .send({ slotId: slot.id });
    expect(second.status).toBe(409);
  });

  it("sessiyani bekor qilish slotni yana bo'shatadi", async () => {
    const app = testApp();
    const coach = await createApprovedCoach(app);
    const slot = await addAvailabilitySlot(app, coach.accessToken);
    const user = await registerUser(app);
    await upgradeToPro(app, user.accessToken);

    const bookRes = await request(app)
      .post("/api/sessions")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ slotId: slot.id });

    const cancelRes = await request(app)
      .patch(`/api/sessions/${bookRes.body.session.id}/cancel`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(cancelRes.status).toBe(204);

    const availabilityRes = await request(app)
      .get(`/api/coaches/${coach.coachId}/availability`)
      .set("Authorization", `Bearer ${user.accessToken}`);
    expect(availabilityRes.body.slots).toHaveLength(1);
  });
});

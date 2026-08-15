import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerUser, testApp } from "./helpers.js";

describe("GET /api/billing/subscription", () => {
  it("yangi foydalanuvchi avtomatik FREE obuna bilan boshlaydi", async () => {
    const app = testApp();
    const user = await registerUser(app);
    const res = await request(app).get("/api/billing/subscription").set("Authorization", `Bearer ${user.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.subscription.plan).toBe("FREE");
    expect(res.body.subscription.status).toBe("ACTIVE");
  });
});

describe("POST /api/billing/checkout", () => {
  it("Stripe ulanmagan muhitda (dev stub) to'lovni darhol simulyatsiya qiladi va PRO'ga o'tkazadi", async () => {
    const app = testApp();
    const user = await registerUser(app);

    const res = await request(app)
      .post("/api/billing/checkout")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ plan: "PRO" });

    expect(res.status).toBe(200);
    expect(res.body.url).toBeNull(); // stub rejimda checkout URL yo'q — darhol faollashadi
    expect(res.body.subscription.plan).toBe("PRO");
    expect(res.body.subscription.status).toBe("ACTIVE");
  });

  it("checkout'dan keyin to'langan invoice yozuvi paydo bo'ladi", async () => {
    const app = testApp();
    const user = await registerUser(app);
    await request(app).post("/api/billing/checkout").set("Authorization", `Bearer ${user.accessToken}`).send({ plan: "PREMIUM" });

    const res = await request(app).get("/api/billing/invoices").set("Authorization", `Bearer ${user.accessToken}`);
    expect(res.body.invoices).toHaveLength(1);
    expect(res.body.invoices[0].status).toBe("paid");
  });

  it("FREE rejaga checkout so'ralsa 400 qaytaradi", async () => {
    const app = testApp();
    const user = await registerUser(app);
    const res = await request(app)
      .post("/api/billing/checkout")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ plan: "FREE" });
    expect(res.status).toBe(400);
  });

  it("Authorization header'siz 401 qaytaradi", async () => {
    const app = testApp();
    const res = await request(app).post("/api/billing/checkout").send({ plan: "PRO" });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/billing/cancel", () => {
  it("Stripe ulanmagan muhitda obunani FREE'ga qaytaradi", async () => {
    const app = testApp();
    const user = await registerUser(app);
    await request(app).post("/api/billing/checkout").set("Authorization", `Bearer ${user.accessToken}`).send({ plan: "PRO" });

    const cancelRes = await request(app).post("/api/billing/cancel").set("Authorization", `Bearer ${user.accessToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.subscription.plan).toBe("FREE");
  });
});

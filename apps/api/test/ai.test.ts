import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerUser, testApp } from "./helpers.js";

describe("POST /api/ai/messages", () => {
  it("ANTHROPIC_API_KEY sozlanmagan (dev stub) holatda oqim ko'rinishida javob qaytaradi", async () => {
    const app = testApp();
    const user = await registerUser(app);

    const res = await request(app)
      .post("/api/ai/messages")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ content: "Salom, menga maslahat bering" });

    expect(res.status).toBe(200);
    expect(res.text.length).toBeGreaterThan(0);
    expect(res.text).toContain("sinov rejimidagi javob");
  });

  it("bo'sh xabarni rad etadi", async () => {
    const app = testApp();
    const user = await registerUser(app);
    const res = await request(app)
      .post("/api/ai/messages")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ content: "" });
    expect(res.status).toBe(400);
  });

  it("xabar va javob AiMessage tarixiga yoziladi", async () => {
    const app = testApp();
    const user = await registerUser(app);
    await request(app).post("/api/ai/messages").set("Authorization", `Bearer ${user.accessToken}`).send({ content: "Salom" });

    const historyRes = await request(app).get("/api/ai/messages").set("Authorization", `Bearer ${user.accessToken}`);
    expect(historyRes.body.messages).toHaveLength(2);
    expect(historyRes.body.messages[0].role).toBe("USER");
    expect(historyRes.body.messages[1].role).toBe("ASSISTANT");
  });

  it("FREE tarifning kunlik 5 ta xabar limitini qo'llaydi", async () => {
    const app = testApp();
    const user = await registerUser(app);

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app)
        .post("/api/ai/messages")
        .set("Authorization", `Bearer ${user.accessToken}`)
        .send({ content: `Xabar ${i}` });
      expect(res.status).toBe(200);
    }

    const sixth = await request(app)
      .post("/api/ai/messages")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ content: "Oltinchi xabar" });
    expect(sixth.status).toBe(429);
  });

  it("GET /api/ai/messages qolgan limitni (usage) qaytaradi", async () => {
    const app = testApp();
    const user = await registerUser(app);
    await request(app).post("/api/ai/messages").set("Authorization", `Bearer ${user.accessToken}`).send({ content: "Salom" });

    const res = await request(app).get("/api/ai/messages").set("Authorization", `Bearer ${user.accessToken}`);
    expect(res.body.usage).toMatchObject({ limit: 5, used: 1, remaining: 4 });
  });
});

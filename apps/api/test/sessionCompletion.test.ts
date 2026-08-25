import { describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { runSessionCompletionCheck } from "../src/sessions/completionJob.js";
import { createApprovedCoach, registerUser, testApp } from "./helpers.js";

describe("runSessionCompletionCheck", () => {
  it("o'tib ketgan CONFIRMED sessiyani COMPLETED'ga o'tkazadi", async () => {
    const app = testApp();
    const coach = await createApprovedCoach(app);
    const user = await registerUser(app);
    // 2 soat oldin boshlangan, 60 daqiqalik sessiya — 1 soat oldin tugagan.
    const session = await prisma.session.create({
      data: {
        userId: user.userId,
        coachId: coach.coachId,
        scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        durationMinutes: 60,
        status: "CONFIRMED",
        priceCents: 5000,
        currency: "USD",
      },
    });

    await runSessionCompletionCheck();

    const updated = await prisma.session.findUniqueOrThrow({ where: { id: session.id } });
    expect(updated.status).toBe("COMPLETED");
  });

  it("hali tugamagan (kelajakdagi) CONFIRMED sessiyaga tegmaydi", async () => {
    const app = testApp();
    const coach = await createApprovedCoach(app);
    const user = await registerUser(app);
    const session = await prisma.session.create({
      data: {
        userId: user.userId,
        coachId: coach.coachId,
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
        durationMinutes: 60,
        status: "CONFIRMED",
        priceCents: 5000,
        currency: "USD",
      },
    });

    await runSessionCompletionCheck();

    const updated = await prisma.session.findUniqueOrThrow({ where: { id: session.id } });
    expect(updated.status).toBe("CONFIRMED");
  });

  it("CANCELLED sessiyaga tegmaydi (garchi vaqti o'tib ketgan bo'lsa ham)", async () => {
    const app = testApp();
    const coach = await createApprovedCoach(app);
    const user = await registerUser(app);
    const session = await prisma.session.create({
      data: {
        userId: user.userId,
        coachId: coach.coachId,
        scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        durationMinutes: 60,
        status: "CANCELLED",
      },
    });

    await runSessionCompletionCheck();

    const updated = await prisma.session.findUniqueOrThrow({ where: { id: session.id } });
    expect(updated.status).toBe("CANCELLED");
  });
});

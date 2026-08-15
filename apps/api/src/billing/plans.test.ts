import { SubscriptionPlan } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { isPaidPlan, PLAN_CATALOG } from "./plans.js";

describe("PLAN_CATALOG", () => {
  it("FREE reja pullik emas va bepul", () => {
    expect(PLAN_CATALOG.FREE.priceCents).toBe(0);
    expect(PLAN_CATALOG.FREE.coachBookingAllowed).toBe(false);
  });

  it("PRO va PREMIUM coach bron qilishga ruxsat beradi", () => {
    expect(PLAN_CATALOG.PRO.coachBookingAllowed).toBe(true);
    expect(PLAN_CATALOG.PREMIUM.coachBookingAllowed).toBe(true);
  });

  it("PREMIUM'da AI xabar limiti cheklanmagan (null)", () => {
    expect(PLAN_CATALOG.PREMIUM.aiMessagesPerDay).toBeNull();
  });
});

describe("isPaidPlan", () => {
  it("FREE uchun false qaytaradi", () => {
    expect(isPaidPlan(SubscriptionPlan.FREE)).toBe(false);
  });

  it("PRO va PREMIUM uchun true qaytaradi", () => {
    expect(isPaidPlan(SubscriptionPlan.PRO)).toBe(true);
    expect(isPaidPlan(SubscriptionPlan.PREMIUM)).toBe(true);
  });
});

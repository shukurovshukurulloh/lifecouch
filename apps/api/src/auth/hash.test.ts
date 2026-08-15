import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./hash.js";

describe("hashPassword / verifyPassword", () => {
  it("parolni xash qiladi va to'g'ri parolni tasdiqlaydi", async () => {
    const hash = await hashPassword("mySecret123");
    expect(hash).not.toBe("mySecret123");
    await expect(verifyPassword("mySecret123", hash)).resolves.toBe(true);
  });

  it("noto'g'ri parolni rad etadi", async () => {
    const hash = await hashPassword("mySecret123");
    await expect(verifyPassword("wrongPassword", hash)).resolves.toBe(false);
  });

  it("bir xil parol uchun har safar boshqa xash yaratadi (salt)", async () => {
    const [a, b] = await Promise.all([hashPassword("same-password"), hashPassword("same-password")]);
    expect(a).not.toBe(b);
  });
});

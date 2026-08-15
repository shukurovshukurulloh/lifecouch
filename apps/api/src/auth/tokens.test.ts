import { describe, expect, it } from "vitest";
import { generateRefreshToken, hashToken, signAccessToken, verifyAccessToken } from "./tokens.js";

describe("access token", () => {
  it("sign qilingan tokenni tekshirib, payload'ni qaytaradi", () => {
    const token = signAccessToken({ sub: "user-1", role: "USER" });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.role).toBe("USER");
  });

  it("buzilgan tokenda xato tashlaydi", () => {
    expect(() => verifyAccessToken("not-a-real-token")).toThrow();
  });
});

describe("hashToken", () => {
  it("bir xil kirish uchun deterministik xash beradi", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("boshqa kirish uchun boshqa xash beradi", () => {
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});

describe("generateRefreshToken", () => {
  it("token, uning xashi va kelajakdagi muddatini qaytaradi", () => {
    const { token, tokenHash, expiresAt } = generateRefreshToken();
    expect(token).toHaveLength(96); // randomBytes(48) -> hex
    expect(tokenHash).toBe(hashToken(token));
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("har chaqiriqda boshqa token yaratadi", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a.token).not.toBe(b.token);
  });
});

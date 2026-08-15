import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMe, getAccessToken, login, setAccessToken } from "./api";

function mockFetchOnce(status: number, body: unknown, ok = status >= 200 && status < 300): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => body,
    }),
  );
}

describe("api client", () => {
  beforeEach(() => {
    setAccessToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("setAccessToken/getAccessToken tokenni saqlaydi", () => {
    setAccessToken("abc123");
    expect(getAccessToken()).toBe("abc123");
  });

  it("request() Authorization header'ni faqat token mavjud bo'lsa qo'shadi", async () => {
    mockFetchOnce(200, { user: { id: "u1" } });
    await fetchMe();
    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((options.headers as Headers).has("Authorization")).toBe(false);

    setAccessToken("my-token");
    mockFetchOnce(200, { user: { id: "u1" } });
    await fetchMe();
    const [, options2] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((options2.headers as Headers).get("Authorization")).toBe("Bearer my-token");
  });

  it("credentials: 'include' bilan so'rov yuboradi (httpOnly refresh cookie uchun)", async () => {
    mockFetchOnce(200, { user: { id: "u1" } });
    await fetchMe();
    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.credentials).toBe("include");
  });

  it("server xato qaytarsa, body.error xabarli Error tashlaydi", async () => {
    mockFetchOnce(401, { error: "Email yoki parol noto'g'ri" });
    await expect(login({ email: "a@b.com", password: "wrong" })).rejects.toThrow("Email yoki parol noto'g'ri");
  });

  it("server javobida error maydoni bo'lmasa, umumiy xato xabari beradi", async () => {
    mockFetchOnce(500, {});
    await expect(fetchMe()).rejects.toThrow("Server bilan aloqada xatolik yuz berdi");
  });

  it("muvaffaqiyatli javobda parsed body'ni qaytaradi", async () => {
    mockFetchOnce(200, { user: { id: "u1", name: "Ali" } });
    const result = await fetchMe();
    expect(result.user).toMatchObject({ id: "u1", name: "Ali" });
  });
});

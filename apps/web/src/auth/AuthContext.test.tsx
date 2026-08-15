import { act, renderHook, waitFor } from "@testing-library/react";
import type { PublicUser } from "@lifecouch/shared";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "../i18n/LocaleContext";
import { AuthProvider, useAuth } from "./AuthContext";

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock("../lib/api", () => ({
  ...mockApi,
  setAccessToken: vi.fn(),
  getAccessToken: vi.fn(),
}));

const user: PublicUser = {
  id: "u1",
  email: "ali@example.com",
  name: "Ali",
  avatarUrl: null,
  bio: null,
  focusArea: null,
  role: "USER",
  createdAt: new Date().toISOString(),
};

function wrapper({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mount bo'lganda /auth/refresh orqali sessiyani tiklashga urinadi", async () => {
    mockApi.refresh.mockResolvedValue({ accessToken: "tok-1", user });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProviderWrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.refresh).toHaveBeenCalledTimes(1);
    expect(result.current.user).toEqual(user);
  });

  it("refresh muvaffaqiyatsiz bo'lsa, user null va loading false bo'ladi", async () => {
    mockApi.refresh.mockRejectedValue(new Error("no session"));
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProviderWrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("login muvaffaqiyatli bo'lsa user'ni o'rnatadi", async () => {
    mockApi.refresh.mockRejectedValue(new Error("no session"));
    mockApi.login.mockResolvedValue({ accessToken: "tok-2", user });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProviderWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login("ali@example.com", "password123");
    });

    expect(result.current.user).toEqual(user);
    expect(result.current.error).toBeNull();
  });

  it("login muvaffaqiyatsiz bo'lsa error'ni o'rnatadi va qayta tashlaydi", async () => {
    mockApi.refresh.mockRejectedValue(new Error("no session"));
    mockApi.login.mockRejectedValue(new Error("Email yoki parol noto'g'ri"));
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProviderWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.login("ali@example.com", "wrong")).rejects.toThrow();
    });

    expect(result.current.error).toBe("Email yoki parol noto'g'ri");
    expect(result.current.user).toBeNull();
  });

  it("refreshProfile() fetchMe() EMAS, api.refresh()ni chaqiradi — role claim yangilanishi uchun (CLAUDE.md konventsiyasi)", async () => {
    mockApi.refresh.mockResolvedValue({ accessToken: "tok-1", user });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProviderWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi.refresh).toHaveBeenCalledTimes(1);

    const promotedUser = { ...user, role: "COACH" as const };
    mockApi.refresh.mockResolvedValue({ accessToken: "tok-3", user: promotedUser });

    await act(async () => {
      await result.current.refreshProfile();
    });

    expect(mockApi.refresh).toHaveBeenCalledTimes(2);
    expect(result.current.user?.role).toBe("COACH");
  });

  it("logout user va tokenni tozalaydi", async () => {
    mockApi.refresh.mockResolvedValue({ accessToken: "tok-1", user });
    mockApi.logout.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProviderWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });
});

function AuthProviderWrapper({ children }: { children: ReactNode }) {
  return wrapper({ children: <AuthProvider>{children}</AuthProvider> });
}

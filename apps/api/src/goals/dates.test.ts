import { describe, expect, it } from "vitest";
import { addDaysKey, dateKey, toDbDate, todayKey } from "./dates.js";

describe("dateKey", () => {
  it("UTC bo'yicha YYYY-MM-DD formatiga o'giradi", () => {
    expect(dateKey(new Date("2026-03-05T23:59:00.000Z"))).toBe("2026-03-05");
  });

  it("mahalliy vaqt zonasidan qat'i nazar UTC kunini oladi", () => {
    expect(dateKey(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01-01");
  });
});

describe("toDbDate", () => {
  it("kalitni UTC yarim tunidagi Date'ga o'giradi", () => {
    const date = toDbDate("2026-06-15");
    expect(date.toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });
});

describe("addDaysKey", () => {
  it("kunlarni qo'shadi", () => {
    expect(addDaysKey("2026-01-30", 3)) .toBe("2026-02-02");
  });

  it("manfiy delta bilan orqaga suradi", () => {
    expect(addDaysKey("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("yil chegarasidan to'g'ri o'tadi", () => {
    expect(addDaysKey("2025-12-31", 1)).toBe("2026-01-01");
  });
});

describe("todayKey", () => {
  it("dateKey(new Date())ga teng formatni qaytaradi", () => {
    expect(todayKey()).toBe(dateKey(new Date()));
  });
});

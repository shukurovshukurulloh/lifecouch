import { describe, expect, it } from "vitest";
import { addDaysKey, todayKey } from "./dates.js";
import { buildLast7Days } from "./progress.js";

describe("buildLast7Days", () => {
  it("bugungi kun bilan tugaydigan 7 kunlik lenta qaytaradi", () => {
    const days = buildLast7Days([]);
    expect(days).toHaveLength(7);
    expect(days[6].date).toBe(todayKey());
    expect(days[0].date).toBe(addDaysKey(todayKey(), -6));
  });

  it("bajarilmagan kunlarni completed:false deb belgilaydi", () => {
    const days = buildLast7Days([]);
    expect(days.every((d) => d.completed === false)).toBe(true);
  });

  it("mos kelgan check-in kunlarini completed:true deb belgilaydi", () => {
    const target = addDaysKey(todayKey(), -2);
    const days = buildLast7Days([{ date: new Date(`${target}T00:00:00.000Z`), completed: true }]);
    const cell = days.find((d) => d.date === target);
    expect(cell?.completed).toBe(true);
  });

  it("completed:false bo'lgan check-inni hisobga olmaydi", () => {
    const target = addDaysKey(todayKey(), -1);
    const days = buildLast7Days([{ date: new Date(`${target}T00:00:00.000Z`), completed: false }]);
    const cell = days.find((d) => d.date === target);
    expect(cell?.completed).toBe(false);
  });
});

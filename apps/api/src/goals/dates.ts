/** CheckIn.date @db.Date ustunlari doim UTC yarim tunda saqlanadi — shu kalit bilan solishtiramiz. */
export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function toDbDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDaysKey(key: string, delta: number): string {
  const d = toDbDate(key);
  d.setUTCDate(d.getUTCDate() + delta);
  return dateKey(d);
}

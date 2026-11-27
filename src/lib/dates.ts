// Dates as integer day numbers (days since 1970-01-01 UTC): no time zones, no hours, and a daily
// calendar can be walked with a plain index (day − first day). Use these for anything that is a
// calendar date; use Date/ISO strings only for timestamps.

export type Day = number;

const MS_DAY = 86_400_000;

/** '2025-01-31' → day number. */
export function day(iso: string): Day {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(y, m - 1, d) / MS_DAY);
}

/** Day number → '2025-01-31'. */
export function iso(d: Day): string {
  return new Date(d * MS_DAY).toISOString().slice(0, 10);
}

export function parts(d: Day): { year: number; month: number; day: number } {
  const f = new Date(d * MS_DAY);
  return { year: f.getUTCFullYear(), month: f.getUTCMonth() + 1, day: f.getUTCDate() };
}

export const yearOf = (d: Day): number => new Date(d * MS_DAY).getUTCFullYear();

/** Sortable month key: year * 12 + (month − 1). */
export function monthKey(d: Day): number {
  const f = new Date(d * MS_DAY);
  return f.getUTCFullYear() * 12 + f.getUTCMonth();
}

/** Today as the user's local calendar day (not UTC: at 00:30 in Madrid it is already the new day). */
export function today(): Day {
  const f = new Date();
  return Math.round(Date.UTC(f.getFullYear(), f.getMonth(), f.getDate()) / MS_DAY);
}

/** Adds calendar months (clamped to the last day when the target month is shorter). */
export function addMonths(d: Day, months: number): Day {
  const { year, month, day: dd } = parts(d);
  const total = year * 12 + (month - 1) + months;
  const last = new Date(Date.UTC(Math.floor(total / 12), (total % 12) + 1, 0)).getUTCDate();
  return Math.round(Date.UTC(Math.floor(total / 12), total % 12, Math.min(dd, last)) / MS_DAY);
}

/**
 * Parses DD/MM/YYYY or ISO (YYYY-MM-DD, optionally followed by a time). Never guesses the format,
 * and rejects impossible dates such as 31/02/2025.
 */
export function parseDate(text: string): Day {
  const t = String(text ?? '').trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (m) return valid(+m[3]!, +m[2]!, +m[1]!, t);
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/.exec(t);
  if (m) return valid(+m[1]!, +m[2]!, +m[3]!, t);
  throw new Error(`Unrecognised date: '${t}'`);
}

function valid(y: number, m: number, d: number, t: string): Day {
  const f = new Date(Date.UTC(y, m - 1, d));
  if (f.getUTCFullYear() !== y || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) {
    throw new Error(`Unrecognised date: '${t}'`);
  }
  return Math.round(f.getTime() / MS_DAY);
}

/** Day number → milliseconds (for Date, charts). */
export const ms = (d: Day): number => d * MS_DAY;

// Number, money and date formatting for the current locale, plus privacy mode.
// Everything that shows an amount of money goes through money()/money0()/moneySigned(): in
// private mode they return '••••'. Percentages, dates and counts stay visible.

import { getLocale } from '../i18n';
import { type Day, ms } from '../lib/dates';

/* ---------- privacy mode ---------- */

let isPrivateMode = false;
export const isPrivate = (): boolean => isPrivateMode;
export const setPrivate = (v: boolean): void => {
  isPrivateMode = !!v;
};
export const HIDDEN = '••••';

/* ---------- numbers ---------- */

const cache = new Map<string, Intl.NumberFormat>();
function nf(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = getLocale() + JSON.stringify(options);
  let f = cache.get(key);
  if (!f) {
    // 'always': Spanish otherwise leaves 4-digit numbers ungrouped (1234 instead of 1.234).
    f = new Intl.NumberFormat(getLocale(), { useGrouping: 'always', ...options });
    cache.set(key, f);
  }
  return f;
}

const missing = (v: number | null | undefined): v is null | undefined =>
  v === null || v === undefined || Number.isNaN(v);

export function number(v: number | null | undefined, decimals = 2): string {
  if (missing(v)) return '—';
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
  return nf({ minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);
}

/** Default currency for money(). Change it here or pass one per call. */
export let CURRENCY = 'EUR';
export const setCurrency = (c: string): void => {
  CURRENCY = c;
};

export function money(v: number | null | undefined, decimals = 2, currency = CURRENCY): string {
  if (isPrivateMode)
    return nf({ style: 'currency', currency, maximumFractionDigits: 0 }).format(0).replace(/0/, HIDDEN);
  if (missing(v)) return '—';
  return nf({
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
}
export const money0 = (v: number | null | undefined, currency = CURRENCY): string => money(v, 0, currency);

/** Money with an explicit sign (+/−). */
export function moneySigned(v: number | null | undefined, decimals = 0, currency = CURRENCY): string {
  if (isPrivateMode || missing(v)) return money(v, decimals, currency);
  return nf({
    style: 'currency',
    currency,
    signDisplay: 'exceptZero',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v);
}

/** 0.1234 → '12,3 %'. */
export const percent = (v: number | null | undefined, decimals = 1): string =>
  missing(v)
    ? '—'
    : nf({ style: 'percent', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);

/** 0.1234 → '+12,34 %'. */
export const percentSigned = (v: number | null | undefined, decimals = 2): string =>
  missing(v)
    ? '—'
    : nf({
        style: 'percent',
        signDisplay: 'exceptZero',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(v);

/** 12 500 → '12,5 mil' / '12.5K': for chart axes, where the full figure does not fit. */
export const compact = (v: number): string => nf({ notation: 'compact', maximumFractionDigits: 1 }).format(v);

/** Compact money for axes; hidden in private mode. */
export const moneyCompact = (v: number, currency = CURRENCY): string =>
  isPrivateMode
    ? HIDDEN
    : nf({ style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(v);

/** CSS class for the sign of a value: 'up', 'down' or ''. */
export const signClass = (v: number, epsilon = 0.0049): string =>
  v > epsilon ? 'up' : v < -epsilon ? 'down' : '';

/* ---------- dates ---------- */

const dateFormats = new Map<string, Intl.DateTimeFormat>();
function df(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = getLocale() + JSON.stringify(options);
  let f = dateFormats.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(getLocale(), { timeZone: 'UTC', ...options });
    dateFormats.set(key, f);
  }
  return f;
}

/** Day number → '31/01/2025' (es) / '1/31/2025' (en). */
export const date = (d: Day | null | undefined): string =>
  d === null || d === undefined
    ? '—'
    : df({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(ms(d));

/** Day number → '31 ene 2025'. */
export const dateMedium = (d: Day | null | undefined): string =>
  d === null || d === undefined ? '—' : df({ day: 'numeric', month: 'short', year: 'numeric' }).format(ms(d));

/** Day number → 'enero de 2025'. */
export const monthYear = (d: Day): string => df({ month: 'long', year: 'numeric' }).format(ms(d));

/** Short month names for the current locale (chart axes). */
export const monthNames = (): string[] =>
  Array.from({ length: 12 }, (_, m) => df({ month: 'short' }).format(Date.UTC(2020, m, 1)));

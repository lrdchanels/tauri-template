// Translations. All UI text goes through t(): never hardcode copy in views.
//   t('update.found', { version: '1.2.0' })       → 'Hay una versión nueva: 1.2.0.'
//   t('home.items.count', { count: 3, total })    → plural form chosen with Intl.PluralRules
// Add a locale: copy en.ts, translate it, register it in DICTIONARIES and LOCALE_NAMES.

import { en } from './en';
import { es, type Message } from './es';

export type MessageKey = keyof typeof es;
export type Messages = Record<MessageKey, Message>;
export type Vars = Record<string, string | number>;

const DICTIONARIES: Record<'es' | 'en', Messages> = { es, en };
export type Locale = keyof typeof DICTIONARIES;
export type LocalePreference = Locale | 'system';

/** Shown in the language picker, each in its own language. */
export const LOCALE_NAMES: Record<Locale, string> = { es: 'Español', en: 'English' };
export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALES = Object.keys(DICTIONARIES) as Locale[];

let current: Locale = DEFAULT_LOCALE;

export const getLocale = (): Locale => current;

/** Resolves a preference ('system' → the OS/browser language if there is a dictionary, else the default). */
export function resolveLocale(
  pref: LocalePreference,
  languages: readonly string[] = navigatorLanguages(),
): Locale {
  // An unknown value (hand-edited or old config) falls back instead of breaking every t() call.
  if (pref !== 'system') return pref in DICTIONARIES ? pref : DEFAULT_LOCALE;
  for (const l of languages) {
    const base = l.toLowerCase().split('-')[0] ?? '';
    if (base in DICTIONARIES) return base as Locale;
  }
  return DEFAULT_LOCALE;
}

export function setLocale(pref: LocalePreference, languages?: readonly string[]): Locale {
  current = resolveLocale(pref, languages);
  if (typeof document !== 'undefined') document.documentElement.lang = current;
  return current;
}

function navigatorLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

export function t(key: MessageKey, vars: Vars = {}): string {
  const msg: Message = DICTIONARIES[current][key] ?? es[key] ?? key;
  const text =
    typeof msg === 'string'
      ? msg
      : new Intl.PluralRules(current).select(Number(vars.count)) === 'one'
        ? msg.one
        : msg.other;
  return text.replace(/\{(\w+)\}/g, (all, name: string) => (name in vars ? String(vars[name]) : all));
}

/** «A, B y C» / “A, B, and C”. */
export const list = (items: readonly string[]): string =>
  new Intl.ListFormat(current, { style: 'long', type: 'conjunction' }).format(items);

// The app's persisted state: `config` (preferences) and `data` (your domain data), plus backup
// and restore. Views read `store.data.value` / `store.config.value` and call `.update()` to save.
//
// To add a document: add its key to STORE_KEYS (src/platform/types.ts) and ALLOWED
// (src-tauri/src/storage.rs), create a Doc below and add it to DOCS.

import { APP } from '../app.config';
import type { LocalePreference } from '../i18n';
import type { Day } from '../lib/dates';
import { Doc } from './doc';

export { NewerVersionError } from './doc';

/* ---------- config ---------- */

export type Theme = 'system' | 'light' | 'dark';

export interface Config {
  preferences: {
    theme: Theme;
    locale: LocalePreference;
    /** Privacy mode: hide amounts of money. */
    private: boolean;
    /** Check for a new version when the app opens. */
    updates: boolean;
    /** Global shortcut that brings the window to the front. */
    globalShortcut: boolean;
  };
}

export const config = new Doc<Config>({
  key: 'config',
  version: 1,
  defaults: () => ({
    preferences: { theme: 'system', locale: 'system', private: false, updates: true, globalShortcut: false },
  }),
});

/* ---------- data (replace with your app's model) ---------- */

export interface Item {
  id: string;
  name: string;
  amount: number;
  created: Day;
}

export interface Data {
  items: Item[];
}

export const data = new Doc<Data>({
  key: 'data',
  version: 1,
  defaults: () => ({ items: [] }),
  // migrations: { 1: (old) => ({ ...old, items: old.items.map(...) }) },  // when version becomes 2
});

/* ---------- all documents ---------- */

const DOCS = [config, data] as const;

export const store = {
  config,
  data,

  async load(): Promise<void> {
    await Promise.all(DOCS.map((d) => d.load()));
  },

  reset(): void {
    for (const d of DOCS) d.reset();
  },

  /** Backup file contents: every document with its version. */
  backup(): string {
    return JSON.stringify(
      {
        app: APP.id,
        format: 1,
        exported: new Date().toISOString(),
        docs: Object.fromEntries(DOCS.map((d) => [d.key, d.envelope()])),
      },
      null,
      1,
    );
  },

  /**
   * Validates and applies a backup, then saves every document. Throws InvalidBackupError or
   * NewerVersionError without touching the current state.
   */
  async restore(text: string): Promise<void> {
    let parsed: { app?: unknown; docs?: Record<string, unknown> };
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new InvalidBackupError();
    }
    if (parsed?.app !== APP.id || typeof parsed.docs !== 'object' || parsed.docs === null)
      throw new InvalidBackupError();
    const docs = parsed.docs;
    const values = DOCS.map((d) => d.hydrate(docs[d.key] ?? null));
    DOCS.forEach((d, i) => {
      (d as Doc<unknown>).value = values[i];
    });
    await Promise.all(DOCS.map((d) => d.save()));
  },
};

export class InvalidBackupError extends Error {}

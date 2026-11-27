import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { APP } from '../src/app.config';
import { platform, STORE_KEYS } from '../src/platform';
import { InvalidBackupError, NewerVersionError, store } from '../src/store';
import { Doc, mergeDefaults } from '../src/store/doc';

beforeEach(async () => {
  localStorage.clear();
  store.reset();
});

describe('mergeDefaults', () => {
  it('fills missing fields deeply; arrays and values from the saved data win', () => {
    const defaults = { a: 1, nested: { x: true, y: 'y' }, list: [1, 2] };
    expect(mergeDefaults(defaults, { nested: { x: false }, list: [] })).toEqual({
      a: 1,
      nested: { x: false, y: 'y' },
      list: [],
    });
  });
});

describe('Doc', () => {
  const doc = () =>
    new Doc<{ name: string; tags: string[] }>({
      key: 'data',
      version: 3,
      defaults: () => ({ name: '', tags: [] }),
      migrations: {
        1: (old) => ({ name: old.title }),
        2: (old) => ({ ...old, tags: ['migrated'] }),
      },
    });

  it('uses defaults when nothing is stored', () => {
    expect(doc().hydrate(null)).toEqual({ name: '', tags: [] });
  });

  it('runs every migration from the stored version', () => {
    expect(doc().hydrate({ version: 1, value: { title: 'old' } })).toEqual({
      name: 'old',
      tags: ['migrated'],
    });
    expect(doc().hydrate({ version: 2, value: { name: 'n' } })).toEqual({ name: 'n', tags: ['migrated'] });
  });

  it('refuses data from a newer version', () => {
    expect(() => doc().hydrate({ version: 4, value: {} })).toThrow(NewerVersionError);
  });

  it('saves and loads through the platform', async () => {
    const d = doc();
    d.value.name = 'saved';
    await d.save();
    expect(await platform.read('data')).toEqual({ version: 3, value: { name: 'saved', tags: [] } });
    const other = doc();
    await other.load();
    expect(other.value.name).toBe('saved');
  });
});

describe('backup', () => {
  it('round-trips every document', async () => {
    await store.data.update((d) => {
      d.items.push({ id: '1', name: 'x', amount: 5, created: 0 });
    });
    await store.config.update((c) => {
      c.preferences.theme = 'dark';
    });
    const text = store.backup();
    expect(JSON.parse(text).app).toBe(APP.id);

    store.reset();
    await store.restore(text);
    expect(store.data.value.items).toHaveLength(1);
    expect(store.config.value.preferences.theme).toBe('dark');
    expect(await platform.read('config')).toMatchObject({ value: { preferences: { theme: 'dark' } } });
  });

  it('rejects other files without touching the current state', async () => {
    await store.data.update((d) => {
      d.items.push({ id: '1', name: 'keep', amount: 1, created: 0 });
    });
    await expect(store.restore('not json')).rejects.toThrow(InvalidBackupError);
    await expect(store.restore(JSON.stringify({ app: 'other', docs: {} }))).rejects.toThrow(
      InvalidBackupError,
    );
    await expect(
      store.restore(JSON.stringify({ app: APP.id, docs: { data: { version: 99, value: {} } } })),
    ).rejects.toThrow(NewerVersionError);
    expect(store.data.value.items[0]?.name).toBe('keep');
  });
});

describe('storage keys', () => {
  it('match the whitelist in src-tauri/src/storage.rs', () => {
    const rs = readFileSync(resolve(process.cwd(), 'src-tauri/src/storage.rs'), 'utf8');
    const m = /pub const ALLOWED: &\[&str\] = &\[([^\]]*)\]/.exec(rs);
    expect(m, 'ALLOWED not found in storage.rs').toBeTruthy();
    const rust = [...m![1]!.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    expect(rust).toEqual([...STORE_KEYS]);
  });
});

---
name: add-store-doc
description: Persist new data - add a stored JSON document, or change the shape of an existing one with a migration. Use when the user wants the app to remember something new or when a data model changes.
---

# Persist data

## New field in an existing document

Add it to the type and to `defaults()` in `src/store/index.ts`. Existing files get the default on
load (deep merge); no migration needed. Add a test if the default matters.

## Reshaping existing data (rename, move, change type)

1. Bump `version` of that `Doc` in `src/store/index.ts` (e.g. 1 → 2).
2. Add `migrations: { 1: (old) => ({ ...converted }) }` — key = the version being upgraded _from_.
   Never edit an existing migration once released; add the next one.
3. Test in `test/store.test.ts`: `doc.hydrate({ version: 1, value: oldShape })` equals the new shape.
   Restoring an old backup goes through the same path.

## New document

1. Add the key to `STORE_KEYS` in `src/platform/types.ts` **and** `ALLOWED` in
   `src-tauri/src/storage.rs` (the `storage keys` unit test checks they match).
2. Create `new Doc<T>({ key, version: 1, defaults })` in `src/store/index.ts`; add it to `DOCS`
   and to the exported `store` object.
3. Use `store.<doc>.value` to read and `await store.<doc>.update((d) => { ... })` to write.
4. Large or frequently written data (caches)? Keep it in its own document so saving the config
   does not rewrite it.

Run `npm run check`.

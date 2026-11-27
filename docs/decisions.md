# Design decisions

Short records of why the template is the way it is. Change them deliberately.

## No UI framework

Plain TypeScript + DOM with an escaping `html` template. Desktop apps of this kind have a handful
of screens that repaint on explicit events; a framework adds build complexity, dependency churn and
a second mental model without much payoff. Repainting a view from state is simple to reason about,
easy for AI agents to edit locally, and fast enough (measured in dev with `performance.measure`).
If a screen grows truly interactive (drag and drop editors, big live lists), mount a component
library inside that one view.

## One platform layer with a browser implementation

Everything that touches the system goes through `src/platform/`. Benefits: the UI runs in a plain
browser (`npm run dev`), unit tests and E2E tests need no native build, agents can verify UI
changes with Playwright, and the Tauri surface is in one file.

## File dialogs in Rust

The webview never receives or sends file paths: Rust opens the dialog and returns contents (or
writes what it was given). A compromised or buggy page can only touch files the user picked.

## Whitelisted storage, atomic writes

The frontend stores named JSON documents, not arbitrary files. The names are whitelisted in Rust
and writes go through a temp file + rename, so a crash never leaves half a file.

## Versioned documents with defaults merge

Every document is `{ version, value }`. New fields get their defaults on load (deep merge);
reshapes go through numbered migrations. Backups carry the versions, so restoring an old backup
migrates it and a backup from a newer app is refused instead of corrupting data.

## Commands as the unit of user action

Menus, buttons and shortcuts all run the same registered command, so behaviour is defined once and
the native menu can be rebuilt (e.g. on language change) without touching views.

## Menu built from TypeScript

The native menu is created with `@tauri-apps/api/menu` so it uses the same translations as the UI
and is rebuilt when the language changes.

## Strict tooling as guard rails

`tsc --strict` with `noUncheckedIndexedAccess`, Biome, clippy `-D warnings`, i18n parity enforced
by types, a test that keeps TS and Rust storage keys in sync, and E2E tests in CI on three OSes.
For agents this turns most mistakes into fast, local, explicit failures.

## Updater on GitHub Releases

`tauri-plugin-updater` reads `latest.json` from the latest GitHub release; `release.yml` builds and
signs everything on a version tag and leaves a draft release to review. No server needed.

## Raw bytes for picked files

`pick_files` returns a `tauri::ipc::Response` (an `ArrayBuffer` in the webview) with every file
packed as length-prefixed name + bytes (`pack()` in `files.rs`, `unpackFiles()` in `lib/pack.ts`).
Returning `Vec<u8>` through serde would send a JSON array of numbers: about four times larger and
slow to parse for files of a few megabytes.

## Limits at the Rust boundary

The HTTP allowlist is enforced on every redirect hop, not only on the first URL, and responses
are capped (`MAX_RESPONSE_BYTES`); files picked by the user are capped too (`MAX_FILE_BYTES`).
Storage writes take a lock and `fsync` before the rename, so concurrent saves of one document
never race on its temporary file and a power cut leaves the old or the new version.


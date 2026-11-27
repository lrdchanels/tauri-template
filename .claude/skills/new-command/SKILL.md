---
name: new-command
description: Add a native capability - a Rust #[tauri::command] or a Tauri plugin - exposed to the UI through the platform layer, with tests and permissions. Use when the UI needs something the browser cannot do (files, processes, OS APIs, HTTP without CORS, heavy computation).
---

# Add a native capability

The UI never calls Tauri directly: everything goes through `src/platform/`.

## Own Rust command

1. Put the logic in a plain function in a module under `src-tauri/src/` (new module → `mod x;` in
   `main.rs`). Unit-test it in `#[cfg(test)] mod tests`.
2. Wrap it in `#[tauri::command] pub fn name(...) -> crate::error::Result<T>` (add a variant to
   `AppError` in `error.rs` if none fits; map errors with `AppError::io(...)` for files).
   Blocking or slow work: `async` + `tauri::async_runtime::spawn_blocking`.
3. Add it to `tauri::generate_handler![...]` in `src-tauri/src/main.rs`.
4. Add a method to `Platform` in `src/platform/types.ts` with a doc comment.
5. Implement it in `src/platform/native.ts` with `invoke('name', { camelCaseArgs })` and in
   `src/platform/browser.ts` (JS equivalent, deterministic fake, or a clear error).
6. Paths: never accept a path from the UI. Open the dialog in Rust (see `files.rs`) or whitelist.

## Plugin

1. `npm i @tauri-apps/plugin-<name>`; `cargo add tauri-plugin-<name> --manifest-path src-tauri/Cargo.toml`.
2. `.plugin(...)` in `main.rs`.
3. The narrowest permissions that work in `src-tauri/capabilities/default.json`.
4. Wrap in the platform layer as above (import the plugin lazily inside `native.ts`).

## Finish

- Unit test the browser fallback if it has logic (`test/`).
- `npm run check`. Try it for real with `npm run tauri dev` when the behaviour is native-only and
  say so if you could not.

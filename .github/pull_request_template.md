## What and why

<!-- One or two sentences. -->

## Checklist

- [ ] `npm run check` passes locally
- [ ] New UI text goes through `t()` and exists in every locale (`src/i18n/*.ts`)
- [ ] System access goes through `src/platform/` (no `@tauri-apps/*` imports elsewhere)
- [ ] New Rust commands are registered in `main.rs` and exposed in `platform/types.ts`, `native.ts` and `browser.ts`
- [ ] New plugin APIs have their permission in `src-tauri/capabilities/default.json`
- [ ] Tests cover the change (unit in `test/`, flows in `e2e/`, Rust in `#[cfg(test)]`)

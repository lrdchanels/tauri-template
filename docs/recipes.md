# Recipes

Step-by-step changes, each ending with `npm run check`. File paths are relative to the repo root.

## Add a view

1. Create `src/views/<id>.ts` (copy `home.ts` as a starting point):

   ```ts
   import { t } from '../i18n';
   import { el, html } from '../ui/html';
   import type { View } from './types';

   export const reports: View = {
     id: 'reports',
     title: 'reports.title',
     icon: 'chart',
     nav: 'main',
     render(root, ctx) {
       // The shell already painted the view title (an <h1> with t(title)) at the top of root.
       root.append(el(html`<section class="block"><p class="lead">${t('reports.lead')}</p></section>`));
     },
   };
   ```

2. Register it in `src/views/index.ts` (`VIEWS` order = sidebar order).
3. Add `reports.title`, `reports.lead` to `src/i18n/es.ts` **and** `src/i18n/en.ts`.
4. Need a new icon? Add a 24×24 stroke path to `ICONS` in `src/ui/components.ts`.
5. Add an E2E test in `e2e/` that opens `#reports` and checks the heading.

Sub-pages: read `ctx.sub` (`#reports/2025` → `'2025'`), link with `href="#reports/2025"`.
UI state that survives repaint (selected tab, sort, filter): `ctx.state.foo`.

## Add a command (button + menu + shortcut)

1. In `src/app.ts` → `registerBuiltInCommands()`, or in your own module at startup:
   `registerCommand({ id: 'reports.export', keys: 'mod+e', run: exportReports })`.
2. Buttons: `html`<button class="btn" data-action="reports.export">${t('…')}</button>``.
3. Menu: add `item('reports.export', t('menu.reportsExport'), 'mod+e')` in `buildMenu()`.

## Add a Rust command

1. Write it in a module under `src-tauri/src/` returning `crate::error::Result<T>`:

   ```rust
   #[tauri::command]
   pub fn word_count(text: String) -> Result<usize> {
       Ok(text.split_whitespace().count())
   }
   ```

   Put the logic in a plain function and unit-test it in `#[cfg(test)] mod tests`.
2. List it in `generate_handler![…]` in `src-tauri/src/main.rs`.
3. Add the method to `Platform` in `src/platform/types.ts`, implement it in `native.ts`
   (`invoke('word_count', { text })`; argument names are camelCase in TS, snake_case in Rust)
   and in `browser.ts` (a JS equivalent or a deterministic fake).
4. Use it from the UI as `platform.wordCount(text)`.

Long-running work: make the command `async` and keep it off the main thread
(`tauri::async_runtime::spawn_blocking` for CPU-bound code). Progress: `app.emit("progress", n)`
in Rust and `listen('progress', …)` from `@tauri-apps/api/event` inside `native.ts`.

## Store a new document

1. Add the key to `STORE_KEYS` in `src/platform/types.ts` and to `ALLOWED` in
   `src-tauri/src/storage.rs` (the `storage keys` unit test fails until both match).
2. In `src/store/index.ts`: `export const notes = new Doc<Notes>({ key: 'notes', version: 1, defaults: () => ({ list: [] }) })`
   and add it to `DOCS` (so it loads, resets and goes into backups) and to the `store` object.
3. Read `store.notes.value`; write with `await store.notes.update((n) => { n.list.push(x); })`.

Changing the shape later: bump `version` to 2 and add `migrations: { 1: (old) => newShape }`.
Test the migration in `test/store.test.ts`.

## Add a setting

1. Add the field with its default to `Config['preferences']` (or a new group) in
   `src/store/index.ts`. Existing users get the default automatically.
2. Show it in `src/views/settings.ts` as a row of a `group()` (`switchRow` for on/off,
   `row(title, text, control)` with a `segmented` or `<select>` otherwise) and save it with
   `ctx.setPreference('key', value)`; extend `setPreference` in `app.ts` if it must be applied
   (like the theme or the global shortcut).
3. Add a section: append to `SECTIONS` in `settings.ts`.

## Call an HTTP API

- From Rust (no CORS, secrets stay out of the webview): add the host to `ALLOWED_HOSTS` in
  `src-tauri/src/http.rs` and call `platform.httpGetJson(url)`. For POST, auth headers or parsing,
  write a dedicated command in its own module with a shared `reqwest::Client` in managed state.
- From the webview with `fetch`: add the origin to `connect-src` in the CSP in
  `src-tauri/tauri.conf.json`. Only for public APIs that send CORS headers.

## Add a Tauri plugin

1. `npm i @tauri-apps/plugin-<name>` and `cargo add tauri-plugin-<name> --manifest-path src-tauri/Cargo.toml`.
2. Register it in `main.rs`: `.plugin(tauri_plugin_<name>::init())`.
3. Add its permissions to `src-tauri/capabilities/default.json` (least privilege: specific
   `allow-*` entries rather than `<name>:default` when you can).
4. Wrap it in `src/platform/` (types + native + browser fallback).

## Add a chart

```ts
import { chart, colors, gridBase, timeAxis, valueAxis, axisTooltip } from '../ui/charts';
import { money, moneyCompact } from '../ui/format';

const box = el(html`<div class="chart"></div>`);
root.append(box);
chart(
  box,
  {
    grid: gridBase(),
    xAxis: timeAxis(),
    yAxis: valueAxis(moneyCompact),
    tooltip: axisTooltip(money),
    series: [
      { type: 'line', name: t('…'), data: points, showSymbol: false, itemStyle: { color: colors().accent } },
    ],
  },
  260,
);
```

Need another chart type (pie, scatter, treemap…)? Import it in `src/ui/charts.ts` and add it to
`echarts.use([...])`. Charts are disposed automatically when the view repaints.

## Add a language

1. Copy `src/i18n/en.ts` to `src/i18n/fr.ts`, translate, type it as `Messages`.
2. Register it in `DICTIONARIES` and `LOCALE_NAMES` in `src/i18n/index.ts`.

## Change the look

Palette and radius in `src/styles/tokens.css` (light and both dark blocks). The font is the
system's (`--font`); for a custom one, install a `@fontsource-variable/*` package, import it in
`src/main.ts` and put its name first in `--font`. App icon: put a square SVG somewhere
and run `npm run init-app -- --icon path/to/icon.svg --no-key --yes` or `npm run icons`.

## Import files

`platform.pickFiles({ filters: [{ name: 'Excel', extensions: ['xls', 'xlsx'] }], multiple: true })`
returns `[{ name, bytes }]`. Parse `bytes` in a pure function in `src/lib/` and unit-test it with
fixture files in `test/fixtures/`.

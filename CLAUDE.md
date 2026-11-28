# CLAUDE.md

Guidance for AI coding agents (Claude Code, Codex, Cursor…) and humans working in this repository.
`AGENTS.md` points here.

A desktop app for Windows, macOS and Linux: **Tauri 2** (Rust backend) + **TypeScript** (strict,
no framework) bundled by **Vite**. The UI is plain DOM rendered with a safe `html` tagged template;
state lives in JSON documents in the app data folder; everything the UI needs from the system goes
through one platform layer that also has a browser implementation, so the whole UI runs and is
tested in a normal browser.

## Commands

```sh
npm install
npm run tauri dev        # the app (Vite on :1420 + Rust rebuild on change)
npm run dev              # UI only, in a browser: localStorage instead of files, no native APIs
npm run check            # EVERYTHING CI runs; must pass before you finish a task
npm run check:js         # typecheck + biome + i18n + build + vitest + playwright
npm run check:rs         # rustfmt --check + clippy -D warnings + cargo test
npm run format           # biome --write (format + organise imports + safe fixes)
npm test                 # unit tests; one: npx vitest run -t "backup"
npm run e2e              # E2E in Chromium on :14290; debug: npx playwright test --ui
npm run test:rs          # Rust tests; one: cargo test --manifest-path src-tauri/Cargo.toml <name>
npm run release -- 0.2.0 # release PR with auto-merge; once merged: npm run release -- 0.2.0 --tag
npm run init-app         # once, after creating a repo from the template
```

First `npm run e2e` on a machine: `npx playwright install chromium`.

## Architecture

```
src/
  main.ts            entry: font, CSS, start()
  app.ts             shell: sidebar, hash router, update band, preferences, native menu, built-in commands
  app.config.ts      app identity (id, name, repo) — rewritten by init-app
  commands.ts        command registry: id → run(), optional keyboard shortcut
  platform/          THE ONLY DOOR TO THE SYSTEM
    types.ts         Platform interface + STORE_KEYS
    native.ts        Tauri: invoke() + plugins (the only file importing @tauri-apps/*)
    browser.ts       localStorage, <input type=file>, downloads, confirm()
    index.ts         export const platform = isTauri ? native : browser
  store/
    doc.ts           Doc<T>: persisted JSON with defaults, versioned migrations, merge of new fields
    index.ts         config + data documents, backup() / restore()
  i18n/              t(key, vars); es.ts is the source of keys, en.ts must match (type-checked)
  ui/
    html.ts          html`` (escapes), raw(), el(), $()
    format.ts        number/money/percent/date with Intl + privacy mode
    components.ts    icons, section, chip, field, fieldGroup, toggle, segmented, emptyState
    table.ts         sortable table + CSV export
    charts.ts        ECharts (tree-shaken, SVG, theme colours from CSS vars)
    toast.ts         status messages
    crash.ts         global error screen
  lib/               pure helpers, no DOM: dates (integer day numbers), csv, errors, pack (binary IPC)
  views/             one file per screen; registered in views/index.ts
  styles/            tokens.css (palette, light/dark), base.css (shell), components.css
src-tauri/src/
  main.rs            builder: plugins + generate_handler! (every command listed here)
  storage.rs         JSON documents in app_data_dir, whitelist ALLOWED, atomic + serialised writes
  files.rs           dialogs opened in Rust: pick_files (raw bytes), open_text, save_as; MAX_FILE_BYTES
  http.rs            http_get_json with ALLOWED_HOSTS (HTTPS only, redirects too), MAX_RESPONSE_BYTES
  error.rs           AppError → { kind, message } for the frontend
test/                vitest + happy-dom (lib, ui, i18n, store, storage-key sync)
e2e/                 Playwright against the browser build
scripts/             init-app.mjs, release.mjs, check-i18n.mjs
```

**Data flow.** `start()` loads every `Doc` → applies preferences → paints the shell → paints the
current view. A view is `render(root, ctx)`: it reads `store.*.value`, writes markup into `root` and
attaches listeners. After a change it calls `store.x.update(fn)` (saves) and `ctx.rerender()`.
Per-view UI state that must survive repaints goes in `ctx.state`. There is no virtual DOM and no
reactivity: repainting a view is cheap and explicit.

**Routing.** `#<view>` or `#<view>/<sub>` (e.g. `#settings/data`). Unknown routes fall back to the
first `main` view. Links are plain `<a href="#…">`.

**Commands.** Actions reachable from several places (buttons, native menu, shortcuts) are
registered once in `commands.ts` style: `registerCommand({ id, run, keys })`. A button runs one
with `data-action="<id>"` (delegated in app.ts); the menu references the id.

**Platform.** Native in Tauri, browser otherwise. File dialogs open in Rust so the webview never
handles paths. Storage keys are whitelisted on both sides (`STORE_KEYS` in TS, `ALLOWED` in Rust;
a unit test checks they match).

## Rules (do not break these)

1. **System access only through `platform`.** Never import `@tauri-apps/*` or call `invoke`
   outside `src/platform/native.ts`. A new capability = method in `types.ts` + `native.ts` +
   `browser.ts` (+ a Rust command or plugin permission).
2. **All UI text through `t()`.** Add the key to `src/i18n/es.ts` and `en.ts` (the type checker
   fails if a locale is missing a key; `npm run i18n` fails on unused keys). Copy is plain sentences,
   sentence case, no all-caps. Spanish is the default language.
3. **All markup through `html```.** It escapes interpolations. `raw()`only for constants you wrote
   (icons). For boolean attribute values use`String(bool)` (`false` renders nothing).
4. **Money through `money()` / `money0()` / `moneySigned()` / `moneyCompact()`** so privacy mode
   hides it. Percentages, dates and counts use `percent()`, `date()`, `number()`.
5. **Calendar dates are integer day numbers** (`lib/dates.ts`), stored as ISO strings only in CSV.
6. **Persisted shape changes need a migration**: bump `version` in the `Doc` and add
   `migrations[oldVersion]`. Adding a field with a default needs nothing.
7. **Every Rust command** returns `error::Result<T>`, is listed in `generate_handler!` in `main.rs`,
   and is covered by a `#[cfg(test)]` test for its pure logic.
8. **Plugin APIs called from TS need a permission** in `src-tauri/capabilities/default.json`.
   Own commands do not.
   Keep scopes narrow (e.g. `opener:allow-open-url` only lists the domains the app opens) and
   never add a host to `ALLOWED_HOSTS` or a key to `ALLOWED` "just in case".
9. Keep `npm run check` green. Don't disable lint rules or add `// @ts-ignore` to get there.
10. Colours only from CSS variables in `styles/tokens.css`; charts read them via `colors()`.

## Recipes

Step-by-step guides in [docs/recipes.md](docs/recipes.md): add a view, a command, a Rust command,
a stored document, a setting, a plugin, a chart, a locale. Design decisions in
[docs/decisions.md](docs/decisions.md); releases and signing in [docs/release.md](docs/release.md).
Claude Code skills in `.claude/skills/` automate the common ones.
Security model and how to report a vulnerability: [SECURITY.md](SECURITY.md). CI also runs
`npm audit` and `cargo audit` (`.github/workflows/audit.yml`); workflow actions are pinned to
commit SHAs (Dependabot bumps them).

## Verifying UI changes

`npm run dev` and open http://localhost:1420 — or write/extend a Playwright test in `e2e/` and run
`npm run e2e`. In DevTools, `window.__app` exposes `{ app, store, platform, runCommand }` in dev.
Native-only behaviour (menu, dialogs, notifications, global shortcut, updater) needs
`npm run tauri dev`.

## Conventions

- Code, comments, commits and docs in English; UI copy through i18n (Spanish default).
- Small modules with a header comment saying what they are for. Prefer pure functions in `lib/`
  with unit tests; keep DOM code in `ui/` and `views/`.
- Biome formats (2 spaces, single quotes, 110 columns); rustfmt for Rust.
- Version lives in `package.json` (read by tauri.conf.json) and `src-tauri/Cargo.toml`: use
  `npm run release`.

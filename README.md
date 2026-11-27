# tauri-template

A template for desktop apps on **Windows, macOS and Linux** with **Tauri 2 + TypeScript + Vite**,
no UI framework. Designed to be extended quickly and consistently by AI coding agents (and people):
one platform layer, strict types, a single `npm run check`, a browser mode for testing the whole UI,
and step-by-step recipes.

## What you get

- **Shell:** sidebar navigation, hash routing with sub-routes, light/dark/system theme, privacy mode
  that hides money, toasts, update banner, global error screen, keyboard shortcuts.
- **Native:** translated native menu, file dialogs opened in Rust, notifications, a global shortcut
  to bring the window up, log files, single instance, remembered window size and position.
- **Data:** versioned JSON documents with migrations and default-merging, atomic writes, a storage
  whitelist, backup/restore to a file, "delete everything".
- **UI kit:** escaping `html` templates, Intl formatting (money, percent, dates), sortable tables
  with CSV export, ECharts with theme colours, form fields, segmented controls, cards.
- **i18n:** Spanish (default) and English; missing keys are type errors, unused keys fail the check.
- **Quality:** TypeScript strict, Biome, Vitest, Playwright E2E, rustfmt, clippy `-D warnings`,
  `cargo test`; CI on all three OSes.
- **Releases:** `npm run release -- x.y.z` → tag → GitHub Actions builds signed installers and
  `latest.json`; the app updates itself.
- **For agents:** `CLAUDE.md`/`AGENTS.md`, `docs/recipes.md`, Claude Code skills (`new-view`,
  `new-command`, `add-store-doc`, `release`) and pre-approved check commands.

## Start a new app

1. **Use this template** on GitHub (or `gh repo create my-app --template lrdchanels/tauri-template --private --clone`).
2. Install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (Rust, and on Linux
   the WebKitGTK packages) and Node 22+.
3. Make it yours:

   ```sh
   npm install
   npm run init-app            # name, identifier, repo, updater key, optional --icon icon.svg
   npx playwright install chromium
   npm run check
   npm run tauri dev
   ```

4. Replace the example view (`src/views/home.ts`) and the `data` document (`src/store/index.ts`)
   with your own. Ask your agent: _"Read CLAUDE.md and add a view that…"_.

## Commands

| Command                    | What it does                                                                   |
| -------------------------- | ------------------------------------------------------------------------------ |
| `npm run tauri dev`        | Run the app with hot reload                                                    |
| `npm run dev`              | UI only in a browser (localStorage, no native APIs)                            |
| `npm run check`            | Everything CI runs: types, lint, i18n, build, unit, E2E, Rust fmt/clippy/tests |
| `npm run format`           | Format and fix with Biome                                                      |
| `npm run release -- 0.2.0` | Bump versions, check, commit and tag                                           |
| `npx tauri build`          | Build installers locally (no updater artifacts)                                |

## Layout

```
src/            TypeScript UI (platform/, store/, i18n/, ui/, views/, lib/)
src-tauri/      Rust backend (storage, file dialogs, HTTP, errors) and Tauri config
test/  e2e/     Vitest unit tests and Playwright E2E tests
scripts/        init-app, release, check-i18n
docs/           recipes, design decisions, releases and signing
```

Details in [CLAUDE.md](CLAUDE.md).

## License

MIT

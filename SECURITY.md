# Security

## Reporting a vulnerability

Please do not open a public issue. Use **GitHub → Security → Report a vulnerability** (private
security advisories) on this repository. Include the version, the operating system and the
steps to reproduce. You will get an answer within a week.

## Security model

The app is a local desktop program; the webview is treated as less trusted than the Rust side, so
a bug in the UI (or injected content) is contained:

- **Content Security Policy** (`src-tauri/tauri.conf.json`): scripts only from the bundle, no
  plugins, frames, `<base>` or form submissions; network only to the IPC.
- **Escaped markup**: all HTML is built with the `html` tagged template, which escapes every
  interpolation (`src/ui/html.ts`).
- **Capabilities** (`src-tauri/capabilities/default.json`): the webview only gets the plugin
  permissions it uses, with narrow scopes (URLs it may open, folders it may reveal).
- **No paths in the webview**: file dialogs open in Rust; the page receives contents, never
  paths it could reuse (`src-tauri/src/files.rs`). File size is capped.
- **Whitelisted storage**: the page can only read and write the named JSON documents in the app
  data folder (`ALLOWED` in `src-tauri/src/storage.rs`).
- **HTTP allowlist**: `http_get_json` only reaches HTTPS hosts in `ALLOWED_HOSTS`, also after
  redirects, with a response size cap (`src-tauri/src/http.rs`).
- **Signed updates**: the updater only installs packages signed with the project's key
  (`plugins.updater.pubkey`). The signing key lives in a protected `release` environment that
  only `v*` tags can use; see `docs/release.md`.
- **Supply chain**: lockfiles are committed, CI runs `npm audit` and `cargo audit` weekly, and
  GitHub Actions are pinned to commit SHAs and updated by Dependabot.

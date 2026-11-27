// App identity used by the frontend. `npm run init-app` rewrites these values together with
// package.json, src-tauri/Cargo.toml and src-tauri/tauri.conf.json: keep them in sync by hand
// only if you skip the script.

export const APP = {
  /** Machine name: backup files, localStorage prefix, log names. Lowercase, dashes. */
  id: 'tauri-template',
  /** Human name shown in the window, sidebar and dialogs. */
  name: 'Tauri Template',
  /** GitHub "owner/repo", used for the "Report a problem" link. Empty to hide it. */
  repo: '',
} as const;

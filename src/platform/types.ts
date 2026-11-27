// The contract between the UI and the system. Two implementations: native.ts (Tauri) and
// browser.ts (plain browser for `npm run dev`, unit and E2E tests). When you add a capability,
// add it here first, then to both implementations; the type checker keeps them in step.

/** Names of the JSON documents the app may store. Must match ALLOWED in src-tauri/src/storage.rs
 *  (a unit test checks it). Add a key in both places to persist a new document. */
export const STORE_KEYS = ['config', 'data'] as const;
export type StoreKey = (typeof STORE_KEYS)[number];

export interface FileFilter {
  /** Shown in the dialog, e.g. 'CSV para Excel'. */
  name: string;
  /** Without the dot: ['csv'], ['xls', 'xlsx']. */
  extensions: string[];
}

export interface PickedFile {
  name: string;
  bytes: Uint8Array;
}

export interface ConfirmOptions {
  title?: string;
  okLabel?: string;
  cancelLabel?: string;
  /** Warning icon (destructive actions). */
  danger?: boolean;
}

export interface Update {
  version: string;
  notes?: string;
  /** Downloads, installs and relaunches. `onProgress` gets 0–1, or null when the size is unknown. */
  install(onProgress?: (fraction: number | null) => void): Promise<void>;
}

/** A native menu: top-level submenus of items. On macOS the first submenu is the app menu. */
export type MenuEntry =
  | { id: string; text: string; accelerator?: string; action: () => void }
  | { separator: true }
  | {
      predefined:
        | 'Copy'
        | 'Cut'
        | 'Paste'
        | 'SelectAll'
        | 'Undo'
        | 'Redo'
        | 'Quit'
        | 'Minimize'
        | 'Fullscreen';
    };
export interface MenuSpec {
  text: string;
  items: MenuEntry[];
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Platform {
  /** True inside the Tauri app, false in a plain browser. */
  readonly isApp: boolean;

  /* storage: JSON documents in the app data folder, written atomically */
  read<T = unknown>(key: StoreKey): Promise<T | null>;
  write(key: StoreKey, value: unknown): Promise<void>;
  clearAll(): Promise<void>;
  openDataFolder(): Promise<void>;
  openLogFolder(): Promise<void>;

  /* files chosen by the user; dialogs open in Rust, so the webview never handles paths */
  pickFiles(opts: { title?: string; filters: FileFilter[]; multiple?: boolean }): Promise<PickedFile[]>;
  openText(filter: FileFilter): Promise<string | null>;
  /** Asks where to save and writes the text. Returns the path, or null if cancelled. */
  saveAs(opts: { fileName: string; contents: string; filter: FileFilter }): Promise<string | null>;

  /* system */
  confirm(message: string, opts?: ConfirmOptions): Promise<boolean>;
  openUrl(url: string): Promise<void>;
  notify(title: string, body: string): Promise<boolean>;
  /** GET a JSON URL from Rust (no CORS). The host must be in ALLOWED_HOSTS in src-tauri/src/http.rs. */
  httpGetJson<T = unknown>(url: string): Promise<T>;
  log(level: LogLevel, message: string): void;

  /* app */
  version(): Promise<string>;
  checkUpdate(): Promise<Update | null>;
  setMenu(menu: MenuSpec[]): Promise<void>;
  /** Registers (or with null, removes) the global shortcut that brings the window to the front. */
  setGlobalShortcut(accelerator: string | null): Promise<void>;
  reload(): void;
}

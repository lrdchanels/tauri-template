// Tauri implementation of the platform. The only module that imports @tauri-apps/*.
// Plugins are imported lazily so the browser build never loads them.

import type { Platform } from './types';

const core = () => import('@tauri-apps/api/core');
const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> =>
  (await core()).invoke<T>(cmd, args);

let shortcut: string | null = null;

export const native: Platform = {
  isApp: true,

  async read(key) {
    const text = await invoke<string | null>('storage_read', { key });
    return text === null ? null : JSON.parse(text);
  },
  async write(key, value) {
    await invoke('storage_write', { key, contents: JSON.stringify(value) });
  },
  async clearAll() {
    await invoke('storage_clear');
  },
  async openDataFolder() {
    const { openPath } = await import('@tauri-apps/plugin-opener');
    await openPath(await invoke<string>('storage_dir'));
  },
  async openLogFolder() {
    const { openPath } = await import('@tauri-apps/plugin-opener');
    await openPath(await invoke<string>('log_dir'));
  },

  async pickFiles({ title, filters, multiple = false }) {
    const files = await invoke<{ name: string; bytes: number[] }[]>('pick_files', {
      title,
      filters,
      multiple,
    });
    return files.map((f) => ({ name: f.name, bytes: new Uint8Array(f.bytes) }));
  },
  openText(filter) {
    return invoke<string | null>('open_text', { filter });
  },
  saveAs({ fileName, contents, filter }) {
    return invoke<string | null>('save_as', { fileName, contents, filter });
  },

  async confirm(message, { title, okLabel, cancelLabel, danger = false } = {}) {
    const { ask } = await import('@tauri-apps/plugin-dialog');
    return ask(message, { title, kind: danger ? 'warning' : 'info', okLabel, cancelLabel });
  },
  async openUrl(url) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  },
  async notify(title, body) {
    const n = await import('@tauri-apps/plugin-notification');
    let granted = await n.isPermissionGranted();
    if (!granted) granted = (await n.requestPermission()) === 'granted';
    if (granted) n.sendNotification({ title, body });
    return granted;
  },
  httpGetJson(url) {
    return invoke('http_get_json', { url });
  },
  log(level, message) {
    import('@tauri-apps/plugin-log').then((l) => {
      const f = { debug: l.debug, info: l.info, warn: l.warn, error: l.error }[level];
      return f(message);
    });
  },

  async version() {
    const { getVersion } = await import('@tauri-apps/api/app');
    return getVersion();
  },
  async checkUpdate() {
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const u = await check();
      if (!u) return null;
      return {
        version: u.version,
        notes: u.body,
        async install(onProgress) {
          let total = 0;
          let done = 0;
          await u.downloadAndInstall((e) => {
            if (e.event === 'Started') total = e.data.contentLength ?? 0;
            if (e.event === 'Progress') {
              done += e.data.chunkLength;
              onProgress?.(total ? done / total : null);
            }
          });
          const { relaunch } = await import('@tauri-apps/plugin-process');
          await relaunch();
        },
      };
    } catch (e) {
      // No network, no release yet, or the updater is not configured: not an error for the user.
      native.log('warn', `update check failed: ${e}`);
      return null;
    }
  },

  async setMenu(spec) {
    const { Menu, Submenu, MenuItem, PredefinedMenuItem } = await import('@tauri-apps/api/menu');
    const submenus = await Promise.all(
      spec.map(async (s) =>
        Submenu.new({
          text: s.text,
          items: await Promise.all(
            s.items.map((e) => {
              if ('separator' in e) return PredefinedMenuItem.new({ item: 'Separator' });
              if ('predefined' in e) return PredefinedMenuItem.new({ item: e.predefined });
              return MenuItem.new({ id: e.id, text: e.text, accelerator: e.accelerator, action: e.action });
            }),
          ),
        }),
      ),
    );
    const menu = await Menu.new({ items: submenus });
    await menu.setAsAppMenu();
  },

  async setGlobalShortcut(accelerator) {
    const gs = await import('@tauri-apps/plugin-global-shortcut');
    if (shortcut) await gs.unregister(shortcut);
    shortcut = accelerator;
    if (!accelerator) return;
    await gs.register(accelerator, async (e) => {
      if (e.state !== 'Pressed') return;
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const w = getCurrentWindow();
      await w.show();
      await w.unminimize();
      await w.setFocus();
    });
  },

  reload() {
    location.reload();
  },
};

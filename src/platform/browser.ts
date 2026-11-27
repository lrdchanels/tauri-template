// Browser implementation of the platform, for `npm run dev` without Tauri, unit tests and E2E
// tests. Storage goes to localStorage; dialogs use <input type=file>, downloads and confirm().
// Keep it deterministic: tests and agents rely on it to exercise the UI without a native build.

import { APP } from '../app.config';
import { t } from '../i18n';
import type { Platform } from './types';

const prefix = `${APP.id}:`;

function pick(accept: string, multiple: boolean): Promise<File[]> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', multiple, accept });
    input.addEventListener('change', () => resolve([...(input.files ?? [])]));
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}

const accept = (extensions: string[]) => extensions.map((e) => `.${e}`).join(',');

export const browser: Platform = {
  isApp: false,

  async read(key) {
    const text = localStorage.getItem(prefix + key);
    return text === null ? null : JSON.parse(text);
  },
  async write(key, value) {
    localStorage.setItem(prefix + key, JSON.stringify(value));
  },
  async clearAll() {
    for (const k of Object.keys(localStorage)) if (k.startsWith(prefix)) localStorage.removeItem(k);
  },
  async openDataFolder() {
    alert(t('browser.dataFolder'));
  },
  async openLogFolder() {
    alert(t('browser.dataFolder'));
  },

  async pickFiles({ filters, multiple = false }) {
    const files = await pick(accept(filters.flatMap((f) => f.extensions)), multiple);
    return Promise.all(
      files.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })),
    );
  },
  async openText(filter) {
    const [f] = await pick(accept(filter.extensions), false);
    return f ? f.text() : null;
  },
  async saveAs({ fileName, contents }) {
    const url = URL.createObjectURL(new Blob([contents]));
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return fileName;
  },

  async confirm(message) {
    return confirm(message);
  },
  async openUrl(url) {
    window.open(url, '_blank', 'noopener');
  },
  async notify(title, body) {
    if (!('Notification' in window)) return false;
    const granted =
      Notification.permission === 'granted' || (await Notification.requestPermission()) === 'granted';
    if (granted) new Notification(title, { body });
    return granted;
  },
  async httpGetJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  },
  log(level, message) {
    console[level === 'debug' ? 'debug' : level](`[${APP.id}] ${message}`);
  },

  async version() {
    return 'dev';
  },
  async checkUpdate() {
    return null;
  },
  async setMenu() {},
  async setGlobalShortcut() {},
  reload() {
    location.reload();
  },
};

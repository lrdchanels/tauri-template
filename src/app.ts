// The app shell: sidebar, hash routing (#view or #view/sub), the update band, preferences
// (theme, language, privacy), the native menu and the built-in commands (backup, restore,
// reset, updates, folders). Views live in src/views/ and only paint their own area.

import { APP } from './app.config';
import { accelerator, installShortcuts, keysLabel, registerCommand, runCommand } from './commands';
import { setLocale, t } from './i18n';
import { errorMessage } from './lib/errors';
import { platform, type Update } from './platform';
import { type Config, InvalidBackupError, NewerVersionError, store, THEMES } from './store';
import { animateCharts, clearCharts } from './ui/charts';
import { icon, installSegmentedKeys } from './ui/components';
import { installCrashHandler } from './ui/crash';
import { setPrivate } from './ui/format';
import { $, el, html } from './ui/html';
import { toast } from './ui/toast';
import { DEFAULT_VIEW, findView, VIEWS } from './views';
import { GLOBAL_SHORTCUT } from './views/settings';
import type { ViewContext } from './views/types';

const app = {
  route: DEFAULT_VIEW,
  sub: null as string | null,
  /** Per-view UI state (see ViewContext.state). */
  state: {} as Record<string, Record<string, unknown>>,
  update: null as Update | null,
};

const PRIVATE_KEYS = 'mod+shift+h';

/* ---------- shell ---------- */

function shell() {
  document.body.replaceChildren(
    el(html`
      <div class="app">
        <aside class="sidebar">
          <div class="brand"><img src="/icon.svg" alt=""><span>${APP.name}</span></div>
          <nav class="nav" aria-label="${t('nav.sections')}">
            ${VIEWS.filter((v) => v.nav === 'main').map((v) => html`<a href="#${v.id}" data-route="${v.id}">${icon(v.icon)}<span>${t(v.title)}</span></a>`)}
          </nav>
          <div class="sidebar-foot">
            <button class="side-btn" data-action="private.toggle" aria-pressed="false" title="${t('sidebar.private.title', { shortcut: keysLabel(PRIVATE_KEYS, t('keys.shift')) })}">${icon('eye')}<span class="private-text"></span></button>
            <button class="side-btn" data-action="theme.toggle" title="${t('sidebar.theme.title')}">${icon('theme')}<span class="theme-text"></span></button>
            ${VIEWS.filter((v) => v.nav === 'footer').map((v) => html`<a class="side-btn" href="#${v.id}" data-route="${v.id}">${icon(v.icon)}<span>${t(v.title)}</span></a>`)}
          </div>
        </aside>
        <main tabindex="-1">
          <div class="band"></div>
          <div class="view"></div>
        </main>
      </div>`),
  );
}

/* ---------- preferences ---------- */

function applyPreferences() {
  const p = store.config.value.preferences;
  document.documentElement.dataset.theme = p.theme;
  setLocale(p.locale);
  setPrivate(p.private);
}

/** Labels that depend on preferences, without rebuilding the shell. */
function paintPreferenceLabels() {
  const p = store.config.value.preferences;
  const b = document.querySelector('[data-action="private.toggle"]');
  if (b) {
    b.setAttribute('aria-pressed', String(p.private));
    $('.private-text', b).textContent = p.private ? t('sidebar.private.show') : t('sidebar.private.hide');
  }
  const th = document.querySelector('.theme-text');
  if (th) th.textContent = t(`theme.${p.theme}`);
}

async function setPreference<K extends keyof Config['preferences']>(key: K, value: Config['preferences'][K]) {
  const before = store.config.value.preferences.locale;
  await store.config.update((c) => {
    c.preferences[key] = value;
  });
  applyPreferences();
  if (key === 'globalShortcut') await applyGlobalShortcut();
  if (key === 'locale' && value !== before) {
    // Every label is translated at paint time: rebuild the shell and the native menu.
    shell();
    await buildMenu();
  }
  paint();
}

async function applyGlobalShortcut() {
  try {
    await platform.setGlobalShortcut(store.config.value.preferences.globalShortcut ? GLOBAL_SHORTCUT : null);
  } catch (e) {
    toast(errorMessage(e), 'error');
  }
}

/* ---------- views ---------- */

function context(): ViewContext {
  app.state[app.route] ??= {};
  return {
    state: app.state[app.route]!,
    sub: app.sub,
    rerender: () => paintView({ animate: false }),
    navigate: (route) => {
      location.hash = route;
    },
    setPreference,
  };
}

function paintView({ animate = true } = {}) {
  const view = findView(app.route) ?? findView(DEFAULT_VIEW)!;
  const root = $('.view');
  const main = $('main');
  const scroll = main.scrollTop;
  clearCharts();
  animateCharts(animate);
  root.replaceChildren();
  root.className = `view view-${view.id}`;
  measure(`paint ${view.id}`, () => view.render(root, context()));
  main.scrollTop = scroll;
}

function paintBand() {
  const parts = [];
  if (app.update) {
    parts.push(
      html`<div class="band-update">${t('update.available', { app: APP.name, version: app.update.version })} <button class="link" data-action="updates.install">${t('update.install')}</button></div>`,
    );
  }
  $('.band').innerHTML = String(html`${parts}`);
}

function paint({ animate = true } = {}) {
  for (const a of document.querySelectorAll<HTMLElement>('[data-route]')) {
    if (a.dataset.route === app.route) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  paintPreferenceLabels();
  paintBand();
  paintView({ animate });
}

function parseRoute(hash: string) {
  const [route = '', sub] = hash.replace(/^#/, '').split('/');
  app.route = findView(route) ? route : DEFAULT_VIEW;
  app.sub = sub ?? null;
}

function go(hash: string) {
  parseRoute(hash);
  paint();
  $('main').scrollTop = 0;
}

/** In development, how long each step takes (DevTools Performance panel and console). */
function measure<T>(name: string, f: () => T): T {
  if (!import.meta.env.DEV) return f();
  const t0 = performance.now();
  const r = f();
  performance.measure(`${APP.id}:${name}`, { start: t0 });
  console.debug(`[${APP.id}] ${name}: ${(performance.now() - t0).toFixed(1)} ms`);
  return r;
}

/* ---------- built-in commands ---------- */

const backupFilter = () => ({ name: t('backup.fileDescription', { app: APP.name }), extensions: ['json'] });

async function exportBackup() {
  const fileName = `${APP.id}-backup-${new Date().toISOString().slice(0, 10)}.json`;
  if (await platform.saveAs({ fileName, contents: store.backup(), filter: backupFilter() }))
    toast(t('backup.saved'));
}

async function restoreBackup() {
  const text = await platform.openText(backupFilter());
  if (!text) return;
  const ok = await platform.confirm(t('backup.restoreConfirm'), {
    title: t('backup.restoreTitle'),
    okLabel: t('backup.restoreAction'),
    cancelLabel: t('dialog.cancel'),
    danger: true,
  });
  if (!ok) return;
  try {
    await store.restore(text);
  } catch (e) {
    if (e instanceof InvalidBackupError) toast(t('backup.invalid', { app: APP.name }), 'error');
    else if (e instanceof NewerVersionError) toast(t('backup.newer', { app: APP.name }), 'error');
    else throw e;
    return;
  }
  app.state = {};
  await afterDataChange();
  toast(t('backup.restored'));
}

async function resetAll() {
  const ok = await platform.confirm(t('reset.confirm'), {
    title: t('reset.title'),
    okLabel: t('reset.action'),
    cancelLabel: t('dialog.cancel'),
    danger: true,
  });
  if (!ok) return;
  await platform.clearAll();
  store.reset();
  app.state = {};
  await afterDataChange();
  toast(t('reset.done'));
  location.hash = DEFAULT_VIEW;
}

/** After the config may have changed wholesale (restore, reset). */
async function afterDataChange() {
  applyPreferences();
  shell();
  await buildMenu();
  await applyGlobalShortcut();
  paint();
}

async function checkUpdate(manual = false) {
  const u = await platform.checkUpdate();
  app.update = u;
  paintBand();
  if (manual) toast(u ? t('update.found', { version: u.version }) : t('update.none'));
}

async function installUpdate() {
  const u = app.update;
  if (!u) return;
  toast(t('update.downloading'));
  try {
    await u.install((p) => {
      if (p !== null) toast(t('update.progress', { percent: Math.round(p * 100) }));
    });
  } catch (e) {
    toast(t('update.failed', { error: errorMessage(e) }), 'error');
  }
}

function registerBuiltInCommands() {
  const prefs = () => store.config.value.preferences;
  registerCommand({
    id: 'private.toggle',
    keys: PRIVATE_KEYS,
    run: () => setPreference('private', !prefs().private),
  });
  registerCommand({
    id: 'theme.toggle',
    run: () => setPreference('theme', THEMES[(THEMES.indexOf(prefs().theme) + 1) % THEMES.length]!),
  });
  registerCommand({ id: 'settings.open', keys: 'mod+,', run: () => go('#settings') });
  registerCommand({ id: 'backup.export', keys: 'mod+s', run: exportBackup });
  registerCommand({ id: 'backup.restore', run: restoreBackup });
  registerCommand({ id: 'data.reset', run: resetAll });
  registerCommand({ id: 'folder.data', run: () => platform.openDataFolder() });
  registerCommand({ id: 'folder.logs', run: () => platform.openLogFolder() });
  registerCommand({ id: 'updates.check', run: () => checkUpdate(true) });
  registerCommand({ id: 'updates.install', run: installUpdate });
  registerCommand({ id: 'notify.test', run: () => platform.notify(APP.name, t('settings.notify.body')) });
  registerCommand({
    id: 'help.report',
    run: () => platform.openUrl(`https://github.com/${APP.repo}/issues/new`),
  });
  registerCommand({ id: 'app.reload', run: () => platform.reload() });
  registerCommand({ id: 'about', run: () => go('#settings/about') });
}

/* ---------- native menu ---------- */

async function buildMenu() {
  const item = (id: string, text: string, keys?: string) => ({
    id,
    text,
    accelerator: keys ? accelerator(keys) : undefined,
    action: () => void runCommand(id),
  });
  try {
    await platform.setMenu([
      // On macOS the first submenu is the application menu.
      {
        text: APP.name,
        items: [
          item('about', t('menu.about', { app: APP.name })),
          { separator: true },
          { predefined: 'Quit' },
        ],
      },
      {
        text: t('menu.file'),
        items: [
          item('backup.export', t('menu.backupExport'), 'mod+s'),
          item('backup.restore', t('menu.backupRestore')),
          { separator: true },
          item('settings.open', t('menu.settings'), 'mod+,'),
        ],
      },
      {
        text: t('menu.edit'),
        items: [
          { predefined: 'Undo' },
          { predefined: 'Redo' },
          { separator: true },
          { predefined: 'Cut' },
          { predefined: 'Copy' },
          { predefined: 'Paste' },
          { predefined: 'SelectAll' },
        ],
      },
      {
        text: t('menu.view'),
        items: [
          item('private.toggle', t('menu.togglePrivate'), PRIVATE_KEYS),
          item('theme.toggle', t('menu.toggleTheme')),
          { separator: true },
          item('app.reload', t('menu.reload')),
          { predefined: 'Fullscreen' },
        ],
      },
      {
        text: t('menu.help'),
        items: [
          item('folder.data', t('menu.dataFolder')),
          item('folder.logs', t('menu.logFolder')),
          item('updates.check', t('menu.checkUpdates')),
        ],
      },
    ]);
  } catch (e) {
    platform.log('warn', `menu: ${errorMessage(e)}`);
  }
}

/* ---------- events ---------- */

function events() {
  window.addEventListener('hashchange', () => go(location.hash));
  document.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-action]');
    if (b?.dataset.action) void runCommand(b.dataset.action);
  });
  installShortcuts();
  installSegmentedKeys();
  // With the system theme, charts read the new colours when the OS switches light/dark.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (store.config.value.preferences.theme === 'system') paint({ animate: false });
  });
}

/* ---------- start ---------- */

export async function start(): Promise<void> {
  installCrashHandler();
  registerBuiltInCommands();
  let loadError: unknown = null;
  try {
    await store.load();
  } catch (e) {
    loadError = e;
  }
  applyPreferences();
  shell();
  events();
  parseRoute(location.hash);
  paint();
  // After shell(): it replaces the body, which would remove a toast shown earlier.
  if (loadError) toast(t('error.loadData', { error: errorMessage(loadError) }), 'error');
  await buildMenu();
  await applyGlobalShortcut();
  if (platform.isApp && store.config.value.preferences.updates) setTimeout(() => void checkUpdate(), 4000);
}

// Debug handle for the DevTools console in development.
if (import.meta.env.DEV) Object.assign(window, { __app: { app, store, platform, runCommand } });

// Settings: general preferences, data (backup, folders, reset) and about. Each section is a
// sub-route (#settings/general, #settings/data, #settings/about). Add your app's sections to
// SECTIONS; buttons with data-action run commands registered in app.ts.

import { APP } from '../app.config';
import { keysLabel } from '../commands';
import { LOCALE_NAMES, LOCALES, type LocalePreference, t } from '../i18n';
import { platform } from '../platform';
import { store, type Theme } from '../store';
import { field, fieldGroup, section, segmented, toggle } from '../ui/components';
import { el, html, raw } from '../ui/html';
import type { View, ViewContext } from './types';

export const GLOBAL_SHORTCUT = 'CommandOrControl+Shift+Space';

const SECTIONS = [
  { id: 'general', title: 'settings.general', render: general },
  { id: 'data', title: 'settings.data', render: dataSection },
  { id: 'about', title: 'settings.about', render: about },
] as const;

export const settings: View = {
  id: 'settings',
  title: 'nav.settings',
  icon: 'settings',
  nav: 'footer',
  render(root, ctx) {
    const current = SECTIONS.find((s) => s.id === ctx.sub) ?? SECTIONS[0];
    root.append(
      el(html`
        <div class="settings">
          <nav class="settings-nav" aria-label="${t('settings.sections')}">
            ${SECTIONS.map((s) => html`<a href="#settings/${s.id}" aria-current="${s.id === current.id ? 'page' : 'false'}">${t(s.title)}</a>`)}
          </nav>
          <div class="settings-body"></div>
        </div>`),
    );
    current.render(root.querySelector<HTMLElement>('.settings-body')!, ctx);
  },
};

function general(root: HTMLElement, ctx: ViewContext) {
  const p = store.config.value.preferences;
  const themes: { value: Theme; text: string }[] = [
    { value: 'system', text: t('theme.system') },
    { value: 'light', text: t('theme.light') },
    { value: 'dark', text: t('theme.dark') },
  ];
  const locales: LocalePreference[] = ['system', ...LOCALES];
  root.innerHTML = String(html`
    ${section(t('settings.general'), t('settings.general.sub'))}
    <div class="fields column">
      ${fieldGroup(t('settings.theme'), segmented('theme', themes, p.theme))}
      ${field(
        t('settings.language'),
        html`<select name="locale">${locales.map(
          (l) =>
            html`<option value="${l}" ${l === p.locale ? raw('selected') : ''}>${l === 'system' ? t('locale.system') : LOCALE_NAMES[l]}</option>`,
        )}</select>`,
      )}
      ${platform.isApp ? toggle('updates', t('settings.updates'), p.updates) : ''}
      ${platform.isApp ? toggle('globalShortcut', t('settings.shortcut', { shortcut: keysLabel('mod+shift+space', t('keys.shift')) }), p.globalShortcut, t('settings.shortcut.hint')) : ''}
    </div>
    <div class="cards">
      <div class="card">
        <h3>${t('settings.notify.title')}</h3>
        <p>${t('settings.notify.text')}</p>
        <div class="buttons"><button class="btn" data-action="notify.test">${t('settings.notify.test')}</button></div>
      </div>
    </div>`);

  root.querySelector('[data-seg="theme"]')?.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-value]');
    if (b) void ctx.setPreference('theme', b.dataset.value as Theme);
  });
  root.addEventListener('change', (ev) => {
    const input = ev.target as HTMLInputElement | HTMLSelectElement;
    if (input.name === 'locale') void ctx.setPreference('locale', input.value as LocalePreference);
    if (input.name === 'updates') void ctx.setPreference('updates', (input as HTMLInputElement).checked);
    if (input.name === 'globalShortcut')
      void ctx.setPreference('globalShortcut', (input as HTMLInputElement).checked);
  });
}

function dataSection(root: HTMLElement) {
  root.innerHTML = String(html`
    ${section(t('settings.data'), t('settings.data.sub'))}
    <div class="cards">
      <div class="card">
        <h3>${t('settings.data.backup.title')}</h3>
        <p>${t('settings.data.backup.text')}</p>
        <div class="buttons">
          <button class="btn" data-action="backup.export">${t('settings.data.backup.export')}</button>
          <button class="btn" data-action="backup.restore">${t('settings.data.backup.restore')}</button>
        </div>
      </div>
      <div class="card">
        <h3>${t('settings.data.folder.title')}</h3>
        <p>${t('settings.data.folder.text')}</p>
        <div class="buttons">
          <button class="btn" data-action="folder.data">${t('settings.data.folder.open')}</button>
          <button class="btn" data-action="folder.logs">${t('settings.data.logs.open')}</button>
        </div>
      </div>
      <div class="card">
        <h3>${t('settings.data.reset.title')}</h3>
        <p>${t('settings.data.reset.text')}</p>
        <div class="buttons"><button class="btn danger" data-action="data.reset">${t('reset.action')}</button></div>
      </div>
    </div>`);
}

function about(root: HTMLElement) {
  root.innerHTML = String(html`
    ${section(APP.name)}
    <p class="version" data-testid="version">…</p>
    ${platform.isApp ? '' : html`<p class="note">${t('settings.about.browser')}</p>`}
    <div class="buttons spaced">
      ${platform.isApp ? html`<button class="btn" data-action="updates.check">${t('settings.about.check')}</button>` : ''}
      ${APP.repo ? html`<button class="btn" data-action="help.report">${t('error.report')}</button>` : ''}
    </div>`);
  void platform.version().then((v) => {
    const n = root.querySelector('.version');
    if (n) n.textContent = t('settings.about.version', { version: v });
  });
}

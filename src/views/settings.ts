// Settings: general preferences, data (backup, folders, reset) and about. Each section is a
// sub-route (#settings/general, #settings/data, #settings/about). Add your app's sections to
// SECTIONS; buttons with data-action run commands registered in app.ts.

import { APP } from '../app.config';
import { keysLabel } from '../commands';
import { LOCALE_NAMES, LOCALES, type LocalePreference, t } from '../i18n';
import { platform } from '../platform';
import { store, type Theme } from '../store';
import { group, row, type Segment, section, segmented, switchRow } from '../ui/components';
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
  const themes: Segment<Theme>[] = [
    { value: 'system', text: t('settings.theme.system'), label: t('theme.system') },
    { value: 'light', text: t('settings.theme.light'), label: t('theme.light') },
    { value: 'dark', text: t('settings.theme.dark'), label: t('theme.dark') },
  ];
  const locales: LocalePreference[] = ['system', ...LOCALES];
  const shortcut = keysLabel('mod+shift+space', t('keys.shift'));
  root.innerHTML = String(html`
    ${section(t('settings.general'), t('settings.general.sub'))}
    ${group([
      row(t('settings.theme'), '', segmented('theme', themes, p.theme)),
      row(
        t('settings.language'),
        '',
        html`<select name="locale" aria-label="${t('settings.language')}">${locales.map(
          (l) =>
            html`<option value="${l}" ${l === p.locale ? raw('selected') : ''}>${l === 'system' ? t('locale.system') : LOCALE_NAMES[l]}</option>`,
        )}</select>`,
      ),
    ])}
    ${
      platform.isApp
        ? group([
            switchRow('updates', t('settings.updates'), p.updates),
            switchRow(
              'globalShortcut',
              t('settings.shortcut', { shortcut }),
              p.globalShortcut,
              t('settings.shortcut.hint'),
            ),
            row(
              t('settings.notify.title'),
              t('settings.notify.text'),
              html`<button class="btn" data-action="notify.test">${t('settings.notify.test')}</button>`,
            ),
          ])
        : ''
    }`);

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
    ${group([
      row(
        t('settings.data.backup.title'),
        t('settings.data.backup.text'),
        html`<button class="btn" data-action="backup.export">${t('settings.data.backup.export')}</button>
          <button class="btn" data-action="backup.restore">${t('settings.data.backup.restore')}</button>`,
      ),
      row(
        t('settings.data.folder.title'),
        t('settings.data.folder.text'),
        html`<button class="btn" data-action="folder.data">${t('settings.data.folder.open')}</button>
          <button class="btn" data-action="folder.logs">${t('settings.data.logs.open')}</button>`,
      ),
    ])}
    ${group([
      row(
        t('settings.data.reset.title'),
        t('settings.data.reset.text'),
        html`<button class="btn danger" data-action="data.reset">${t('reset.action')}</button>`,
        true,
      ),
    ])}`);
}

function about(root: HTMLElement) {
  root.innerHTML = String(html`
    ${section(t('settings.about'))}
    ${group([
      row(
        APP.name,
        html`<span class="version selectable" data-testid="version">…</span>`,
        html`${platform.isApp ? html`<button class="btn" data-action="updates.check">${t('settings.about.check')}</button>` : ''}
          ${APP.repo ? html`<button class="btn" data-action="help.report">${t('error.report')}</button>` : ''}`,
      ),
    ])}
    ${platform.isApp ? '' : html`<p class="note">${t('settings.about.browser')}</p>`}`);
  void platform.version().then((v) => {
    const n = root.querySelector('.version');
    if (n) n.textContent = t('settings.about.version', { version: v });
  });
}

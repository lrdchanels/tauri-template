// Global error screen: any uncaught error or rejected promise opens a panel with the details,
// a button to copy them and (when APP.repo is set) a link to report it. The app keeps running;
// errors are also written to the log file.

import { APP } from '../app.config';
import { t } from '../i18n';
import { errorMessage } from '../lib/errors';
import { platform } from '../platform';
import { el, html } from './html';
import { toast } from './toast';

function describeError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}\n${e.stack ?? ''}`;
  return errorMessage(e);
}

export function showCrash(e: unknown): void {
  const detail = describeError(e);
  platform.log('error', detail);
  document.querySelector('.crash')?.remove();
  const panel = el(html`
    <div class="crash" role="alertdialog" aria-labelledby="crash-title">
      <div class="crash-box">
        <h2 id="crash-title">${t('error.title')}</h2>
        <p>${t('error.body')}</p>
        <pre>${detail}</pre>
        <div class="buttons">
          <button class="btn" data-crash="copy">${t('error.copy')}</button>
          ${APP.repo ? html`<button class="btn" data-crash="report">${t('error.report')}</button>` : ''}
          <button class="btn primary" data-crash="close">${t('error.dismiss')}</button>
        </div>
      </div>
    </div>`);
  panel.addEventListener('click', async (ev) => {
    const action = (ev.target as Element).closest<HTMLElement>('[data-crash]')?.dataset.crash;
    if (action === 'copy') {
      // A rejected copy must not raise another unhandled rejection (it would reopen this panel).
      try {
        await navigator.clipboard.writeText(detail);
        toast(t('error.copied'));
      } catch {
        toast(t('error.copyFailed'), 'error');
      }
    }
    if (action === 'report') await platform.openUrl(`https://github.com/${APP.repo}/issues/new`);
    if (action === 'close') panel.remove();
  });
  document.body.append(panel);
  panel.querySelector<HTMLElement>('[data-crash="close"]')?.focus();
}

export function installCrashHandler(): void {
  window.addEventListener('error', (ev) => showCrash(ev.error ?? ev.message));
  window.addEventListener('unhandledrejection', (ev) => showCrash(ev.reason));
}

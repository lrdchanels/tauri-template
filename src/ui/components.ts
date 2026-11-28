// Small reusable pieces of UI. Each returns Raw HTML (compose with html``) or an element.
// Interactive behaviour is attached with event delegation (data-action / data-go attributes are
// handled by app.ts; segmented controls by installSegmentedKeys()).

import { signClass } from './format';
import { html, type Raw, raw } from './html';

/* ---------- icons ---------- */

// 24×24 stroke icons (draw with currentColor). Add yours here and use icon('name').
export const ICONS = {
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  theme: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  list: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  chart: '<path d="M4 18l5-6 4 3 7-9"/><path d="M15 6h5v5"/>',
  folder: '<path d="M3 6h6l2 2h10v11H3z"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20h4"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
} as const;
export type IconName = keyof typeof ICONS;

export const icon = (name: IconName): Raw =>
  raw(`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`);

/* ---------- layout ---------- */

/** Section heading with an optional one-line reading of what it shows, and optional controls. */
export const section = (title: string, sub = '', extra: Raw | string = ''): Raw => html`
  <header class="sec-head">
    <div><h2>${title}</h2>${sub ? html`<p class="sec-sub">${sub}</p>` : ''}</div>
    ${extra}
  </header>`;

/** Coloured pill: green for positive values, red for negative, neutral otherwise. */
export const chip = (text: string, value = 0): Raw =>
  html`<span class="chip ${signClass(value) || 'neutral'}">${text}</span>`;

/** Centered empty state with an optional action. */
export const emptyState = (text: string, action: Raw | string = ''): Raw =>
  html`<div class="empty"><p>${text}</p>${action}</div>`;

/** Labelled form field. `control` is the input/select markup. */
export const field = (label: string, control: Raw, hint = ''): Raw => html`
  <label class="field"><span>${label}</span>${control}${hint ? html`<small>${hint}</small>` : ''}</label>`;

/** Labelled group for controls that are not a single input (segmented controls, radio sets). */
export const fieldGroup = (label: string, control: Raw): Raw => html`
  <div class="field" role="group" aria-label="${label}"><span>${label}</span>${control}</div>`;

/** Checkbox with its label. */
export const toggle = (name: string, label: string, checked: boolean, hint = ''): Raw => html`
  <label class="toggle"><input type="checkbox" name="${name}" ${checked ? raw('checked') : ''}>
    <span>${label}${hint ? html`<small>${hint}</small>` : ''}</span></label>`;

/* ---------- grouped rows ---------- */

/**
 * A settings-style group: rows inside one surface, separated by hairlines. `title` is an
 * optional small heading above it. Compose with row() and switchRow().
 */
export const group = (rows: Raw[], title = ''): Raw => html`
  ${title ? html`<h3 class="group-title">${title}</h3>` : ''}<div class="group">${rows}</div>`;

/** One row of a group: what it is (and an optional explanation) on the left, controls on the right. */
export const row = (
  title: string,
  text: Raw | string,
  control: Raw | string = '',
  danger = false,
): Raw => html`
  <div class="row${danger ? ' danger' : ''}">
    <div class="row-text"><span>${title}</span>${text ? html`<small>${text}</small>` : ''}</div>
    <div class="row-control">${control}</div>
  </div>`;

/** A row that is an on/off switch; the whole row is its label. Listen to `change` on `name`. */
export const switchRow = (name: string, title: string, checked: boolean, text = ''): Raw => html`
  <label class="row">
    <span class="row-text"><span>${title}</span>${text ? html`<small>${text}</small>` : ''}</span>
    <input class="switch" type="checkbox" role="switch" name="${name}" ${checked ? raw('checked') : ''}>
  </label>`;

/* ---------- segmented control ---------- */

export interface Segment<V extends string = string> {
  value: V;
  text: string;
  /** Accessible name when `text` alone is ambiguous out of context ('Dark' → 'Dark theme'). */
  label?: string;
}

/**
 * Segmented control (a radio group of buttons). The view listens to clicks on
 * `[data-seg="name"] [data-value]`; arrow keys move the selection (see installSegmentedKeys).
 */
export const segmented = <V extends string>(name: string, options: Segment<V>[], current: V): Raw => html`
  <div class="segmented" role="radiogroup" data-seg="${name}">
    ${options.map(
      (o) =>
        html`<button type="button" role="radio" aria-checked="${String(o.value === current)}" tabindex="${o.value === current ? 0 : -1}" data-value="${o.value}" aria-label="${o.label ?? o.text}">${o.text}</button>`,
    )}
  </div>`;

/** Arrow keys inside a segmented control behave like a radio group; focus survives a repaint. */
export function installSegmentedKeys(doc: Document = document): void {
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
  doc.addEventListener('keydown', (ev) => {
    const b = (ev.target as Element | null)?.closest?.<HTMLElement>('.segmented [role="radio"]');
    if (!b || !keys.includes(ev.key)) return;
    ev.preventDefault();
    const group = b.closest<HTMLElement>('.segmented')!;
    const buttons = [...group.querySelectorAll<HTMLElement>('[role="radio"]')];
    const i = buttons.indexOf(b);
    const back = ev.key === 'ArrowLeft' || ev.key === 'ArrowUp';
    const j =
      ev.key === 'Home'
        ? 0
        : ev.key === 'End'
          ? buttons.length - 1
          : (i + (back ? -1 : 1) + buttons.length) % buttons.length;
    const target = buttons[j]!;
    const { seg } = group.dataset;
    const value = target.dataset.value ?? '';
    target.click();
    requestAnimationFrame(() =>
      doc
        .querySelector<HTMLElement>(`.segmented[data-seg="${seg}"] [data-value="${CSS.escape(value)}"]`)
        ?.focus(),
    );
  });
}

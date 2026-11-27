// Sortable table with optional CSV export.
//
//   root.append(table<Item>([
//     { key: 'name', title: t('home.col.name') },
//     { key: 'amount', title: t('home.col.amount'), num: true, fmt: (v) => money(v) },
//   ], items, { exportAs: 'items.csv' }));
//
// Click a header to sort (numbers start descending, text ascending). Export writes every row with
// full precision and is never hidden by privacy mode: it is an explicit action by the user.

import { t } from '../i18n';
import { type Cell, csvNumber, toCsv } from '../lib/csv';
import { platform } from '../platform';
import { el, html, type Raw } from './html';

export interface Column<R> {
  key: keyof R & string;
  title: string;
  /** Cell content; default: the raw value, escaped. */
  fmt?: (value: R[keyof R], row: R) => string | Raw;
  /** Right-aligned, sorted numerically. */
  num?: boolean;
  /** Sort key when it differs from the value. */
  sortBy?: (row: R) => number | string | null;
  /** Value written to the CSV; default: numbers with a decimal comma, the rest as text. */
  csv?: (value: R[keyof R], row: R) => Cell;
  /** Extra CSS class for the cell. */
  cellClass?: (row: R) => string;
}

export interface TableOptions<R> {
  /** File name for "Export to CSV"; no button when omitted. */
  exportAs?: string;
  /** Max height in px (the header sticks while scrolling). */
  maxHeight?: number;
  empty?: string;
  onRowClick?: (row: R) => void;
}

export function table<R extends object>(
  columns: Column<R>[],
  rows: R[],
  opts: TableOptions<R> = {},
): HTMLElement {
  const box = el(`<div class="table-box"></div>`);
  let sortKey: string | null = null;
  let asc = true;
  const index = new Map(rows.map((r, i) => [r, i]));

  const paint = () => {
    const data = [...rows];
    if (sortKey) {
      const c = columns.find((x) => x.key === sortKey)!;
      const val = (r: R) => (c.sortBy ? c.sortBy(r) : (r[c.key] as unknown));
      data.sort((a, b) => {
        const x = val(a);
        const y = val(b);
        const nx = x === null || x === undefined || Number.isNaN(x);
        const ny = y === null || y === undefined || Number.isNaN(y);
        if (nx || ny) return Number(nx) - Number(ny);
        const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
        return asc ? r : -r;
      });
    }
    const head = columns.map(
      (c) =>
        html`<th class="${c.num ? 'num' : ''}" data-key="${c.key}" aria-sort="${sortKey === c.key ? (asc ? 'ascending' : 'descending') : 'none'}"><button type="button">${c.title}</button></th>`,
    );
    const body = data.length
      ? data.map(
          (r) =>
            html`<tr data-i="${index.get(r)}" class="${opts.onRowClick ? 'clickable' : ''}">${columns.map(
              (c) => {
                const v = r[c.key];
                return html`<td class="${c.num ? 'num' : ''} ${c.cellClass ? c.cellClass(r) : ''}">${c.fmt ? c.fmt(v, r) : String(v ?? '')}</td>`;
              },
            )}</tr>`,
        )
      : html`<tr><td class="empty-cell" colspan="${columns.length}">${opts.empty ?? t('table.empty')}</td></tr>`;
    box.innerHTML = String(html`
      <div class="table-scroll" style="${opts.maxHeight ? `max-height:${opts.maxHeight}px` : ''}">
        <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      </div>`);
  };

  box.addEventListener('click', (e) => {
    const target = e.target as Element;
    const th = target.closest<HTMLElement>('th');
    if (th) {
      const k = th.dataset.key!;
      asc = sortKey === k ? !asc : !columns.find((c) => c.key === k)?.num;
      sortKey = k;
      paint();
      return;
    }
    const tr = target.closest<HTMLElement>('tr[data-i]');
    if (tr && opts.onRowClick) opts.onRowClick(rows[Number(tr.dataset.i)]!);
  });
  paint();
  if (!opts.exportAs) return box;

  const fileName = opts.exportAs;
  const csv = () =>
    toCsv(
      columns.map((c) => c.title),
      rows.map((r) =>
        columns.map((c) => {
          const v = r[c.key];
          if (c.csv) return c.csv(v, r);
          return typeof v === 'number' ? csvNumber(v) : (v as Cell);
        }),
      ),
    );
  const wrap = el('<div class="table-wrap"></div>');
  const button = el<HTMLButtonElement>(
    html`<button type="button" class="btn small export">${t('table.export')}</button>`,
  );
  button.addEventListener('click', () =>
    platform.saveAs({
      fileName,
      contents: csv(),
      filter: { name: t('table.csvDescription'), extensions: ['csv'] },
    }),
  );
  wrap.append(box, button);
  return wrap;
}

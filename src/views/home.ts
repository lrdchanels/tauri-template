// Example view: a form that adds items to the store, a sortable table and a chart.
// It shows every pattern a view needs; copy it as the starting point of yours, or delete it
// (and its entry in views/index.ts and its 'home.*' messages).

import { t } from '../i18n';
import { iso, monthKey, today } from '../lib/dates';
import { type Item, store } from '../store';
import { axisTooltip, categoryAxis, chart, colors, gridBase, valueAxis } from '../ui/charts';
import { emptyState, field, icon, section } from '../ui/components';
import { date, money, moneyCompact, monthNames } from '../ui/format';
import { el, html } from '../ui/html';
import { table } from '../ui/table';
import { toast } from '../ui/toast';
import type { View } from './types';

export const home: View = {
  id: 'home',
  title: 'home.title',
  icon: 'home',
  nav: 'main',
  render(root, ctx) {
    const items = store.data.value.items;
    const total = items.reduce((s, i) => s + i.amount, 0);

    root.append(
      el(html`
        <section class="block">
          <p class="lead">${t('home.lead')}</p>
          <form class="fields" data-testid="add-item">
            ${field(t('home.form.name'), html`<input name="name" required autocomplete="off">`)}
            ${field(t('home.form.amount'), html`<input name="amount" type="number" step="0.01" required>`)}
            <button class="btn primary" type="submit">${t('home.form.add')}</button>
          </form>
        </section>`),
    );

    const form = root.querySelector<HTMLFormElement>('form')!;
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = new FormData(form);
      const name = String(f.get('name') ?? '').trim();
      const amount = Number(f.get('amount'));
      if (!name || !Number.isFinite(amount)) {
        toast(t('home.form.invalid'), 'error');
        return;
      }
      const item: Item = { id: crypto.randomUUID(), name, amount, created: today() };
      await store.data.update((d) => {
        d.items.push(item);
      });
      toast(t('home.added'));
      ctx.rerender();
      root.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
    });

    const list = el(html`
      <section class="block">
        ${section(t('home.items.title'), items.length ? t('home.items.count', { count: items.length, total: money(total) }) : '')}
      </section>`);
    root.append(list);

    if (!items.length) {
      list.append(el(emptyState(t('home.items.empty'))));
      return;
    }

    list.append(
      table<Item>(
        [
          { key: 'name', title: t('home.col.name') },
          {
            key: 'created',
            title: t('home.col.created'),
            num: true,
            fmt: (v) => date(v as number),
            csv: (v) => iso(v as number),
          },
          { key: 'amount', title: t('home.col.amount'), num: true, fmt: (v) => money(v as number) },
          {
            key: 'id',
            title: '',
            fmt: (_, r) =>
              html`<button type="button" class="icon-btn danger" data-remove="${r.id}" aria-label="${t('home.remove', { name: r.name })}">${icon('trash')}</button>`,
            csv: () => '',
          },
        ],
        items,
        { exportAs: 'items.csv' },
      ),
    );
    list.addEventListener('click', async (ev) => {
      const b = (ev.target as Element).closest<HTMLElement>('[data-remove]');
      if (!b) return;
      await store.data.update((d) => {
        d.items = d.items.filter((i) => i.id !== b.dataset.remove);
      });
      ctx.rerender();
    });

    // Chart: total amount per month.
    const byMonth = new Map<number, number>();
    for (const i of items)
      byMonth.set(monthKey(i.created), (byMonth.get(monthKey(i.created)) ?? 0) + i.amount);
    const keys = [...byMonth.keys()].sort((a, b) => a - b);
    const names = monthNames();
    const box = el(
      html`<section class="block">${section(t('home.chart.title'))}<div class="chart"></div></section>`,
    );
    root.append(box);
    chart(
      box.querySelector<HTMLElement>('.chart')!,
      {
        grid: gridBase({ top: 12 }),
        xAxis: categoryAxis(keys.map((k) => `${names[k % 12]} ${Math.floor(k / 12)}`)),
        yAxis: valueAxis((v) => moneyCompact(v)),
        tooltip: axisTooltip((v) => money(v)),
        series: [
          {
            type: 'bar',
            name: t('home.chart.series'),
            data: keys.map((k) => byMonth.get(k)),
            itemStyle: { color: colors().accent, borderRadius: [4, 4, 0, 0] },
            barMaxWidth: 36,
          },
        ],
      },
      240,
    );
  },
};

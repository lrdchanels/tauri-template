import { afterEach, describe, expect, it } from 'vitest';
import { keysLabel, matches } from '../src/commands';
import { list, resolveLocale, setLocale, t } from '../src/i18n';
import { day } from '../src/lib/dates';
import { date, HIDDEN, money, moneySigned, number, percent, setPrivate } from '../src/ui/format';
import { el, html, raw } from '../src/ui/html';
import { table } from '../src/ui/table';

afterEach(() => {
  setLocale('es');
  setPrivate(false);
});

describe('html', () => {
  it('escapes interpolations but not nested templates or raw()', () => {
    const name = '<b>"x"</b>';
    expect(String(html`<p>${name}</p>`)).toBe('<p>&lt;b&gt;&quot;x&quot;&lt;/b&gt;</p>');
    expect(String(html`<ul>${['a', 'b'].map((x) => html`<li>${x}</li>`)}</ul>`)).toBe(
      '<ul><li>a</li><li>b</li></ul>',
    );
    expect(String(html`${raw('<i></i>')}${null}${false}`)).toBe('<i></i>');
  });

  it('el() returns the first element', () => {
    expect(el(html`<div class="x"><span></span></div>`).className).toBe('x');
  });
});

describe('i18n', () => {
  it('fills placeholders and picks plural forms', () => {
    setLocale('es');
    expect(t('update.found', { version: '1.2.0' })).toBe('Hay una versión nueva: 1.2.0.');
    expect(t('home.items.count', { count: 1, total: 'x' })).toBe('1 elemento, x en total');
    expect(t('home.items.count', { count: 3, total: 'x' })).toBe('3 elementos, x en total');
    setLocale('en');
    expect(t('home.items.count', { count: 1, total: 'x' })).toBe('1 item, x in total');
  });

  it('resolves the system language with a Spanish fallback', () => {
    expect(resolveLocale('system', ['en-GB'])).toBe('en');
    expect(resolveLocale('system', ['fr-FR', 'es-ES'])).toBe('es');
    expect(resolveLocale('system', ['de-DE'])).toBe('es');
    expect(resolveLocale('en', ['es-ES'])).toBe('en');
  });

  it('joins lists in the current language', () => {
    setLocale('es');
    expect(list(['A', 'B', 'C'])).toBe('A, B y C');
  });
});

describe('format', () => {
  it('groups thousands in Spanish even with four digits', () => {
    setLocale('es');
    expect(number(1234.5, 1)).toBe('1.234,5');
    expect(number(Number.NaN)).toBe('—');
    expect(percent(0.1234)).toMatch(/^12,3\s%$/);
  });

  it('hides money in private mode, not percentages or dates', () => {
    setLocale('es');
    expect(money(1500)).toMatch(/^1\.500,00\s€$/);
    expect(moneySigned(25)).toMatch(/^\+25\s€$/);
    setPrivate(true);
    expect(money(1500)).toContain(HIDDEN);
    expect(money(1500)).not.toContain('1');
    expect(percent(0.5)).toMatch(/50/);
    expect(date(day('2025-01-31'))).toBe('31/01/2025');
  });
});

describe('commands', () => {
  it('matches shortcuts with mod = Ctrl off macOS', () => {
    const ev = { key: 'H', ctrlKey: true, metaKey: false, shiftKey: true, altKey: false };
    expect(matches('mod+shift+h', ev)).toBe(true);
    expect(matches('mod+h', ev)).toBe(false);
    expect(keysLabel('mod+shift+h', 'Mayús')).toBe('Ctrl+Mayús+H');
  });
});

describe('table', () => {
  interface Row {
    name: string;
    n: number;
  }
  const rows: Row[] = [
    { name: 'b', n: 2 },
    { name: 'a', n: 10 },
    { name: 'c', n: 1 },
  ];
  const cells = (box: HTMLElement) =>
    [...box.querySelectorAll('tbody tr')].map((tr) => tr.children[0]!.textContent);

  it('sorts by clicking headers: numbers descending first, text ascending', () => {
    const box = table<Row>(
      [
        { key: 'name', title: 'Name' },
        { key: 'n', title: 'N', num: true },
      ],
      rows,
    );
    expect(cells(box)).toEqual(['b', 'a', 'c']);
    box.querySelector<HTMLElement>('th[data-key="n"] button')!.click();
    expect(cells(box)).toEqual(['a', 'b', 'c']);
    box.querySelector<HTMLElement>('th[data-key="name"] button')!.click();
    expect(cells(box)).toEqual(['a', 'b', 'c']);
    box.querySelector<HTMLElement>('th[data-key="name"] button')!.click();
    expect(cells(box)).toEqual(['c', 'b', 'a']);
  });

  it('shows the empty message', () => {
    setLocale('es');
    const box = table<Row>([{ key: 'name', title: 'Name' }], []);
    expect(box.textContent).toContain('Nada que enseñar.');
  });
});

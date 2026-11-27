import { describe, expect, it } from 'vitest';
import { BOM, csvNumber, toCsv } from '../src/lib/csv';
import { addMonths, day, iso, monthKey, parseDate, parts } from '../src/lib/dates';
import { errorMessage, toAppError } from '../src/lib/errors';

describe('dates', () => {
  it('round-trips ISO dates and day numbers', () => {
    expect(day('1970-01-01')).toBe(0);
    expect(iso(day('2025-01-31'))).toBe('2025-01-31');
    expect(parts(day('2024-02-29'))).toEqual({ year: 2024, month: 2, day: 29 });
  });

  it('adds months clamping to the last day', () => {
    expect(iso(addMonths(day('2025-01-31'), 1))).toBe('2025-02-28');
    expect(iso(addMonths(day('2024-01-31'), 1))).toBe('2024-02-29');
    expect(iso(addMonths(day('2025-03-15'), -3))).toBe('2024-12-15');
  });

  it('parses DD/MM/YYYY and ISO, never guessing, rejecting impossible dates', () => {
    expect(iso(parseDate('03/04/2025'))).toBe('2025-04-03');
    expect(iso(parseDate('2025-04-03T10:00:00'))).toBe('2025-04-03');
    expect(() => parseDate('31/02/2025')).toThrow();
    expect(() => parseDate('04-03-2025')).toThrow();
  });

  it('builds sortable month keys', () => {
    expect(monthKey(day('2025-01-15'))).toBeLessThan(monthKey(day('2025-02-01')));
    expect(monthKey(day('2025-12-31')) % 12).toBe(11);
  });
});

describe('csv', () => {
  it('uses ; with a BOM and quotes fields that need it', () => {
    const out = toCsv(
      ['a', 'b'],
      [
        ['x;y', 'he said "hi"'],
        [1, null],
      ],
    );
    expect(out.startsWith(BOM)).toBe(true);
    expect(out).toBe(`${BOM}a;b\r\n"x;y";"he said ""hi"""\r\n1;\r\n`);
  });

  it('writes numbers with a decimal comma', () => {
    expect(csvNumber(1234.5)).toBe('1234,5');
    expect(csvNumber(Number.NaN)).toBe('');
  });
});

describe('errors', () => {
  it('normalises Rust errors, Error objects and anything else', () => {
    expect(toAppError({ kind: 'io', message: 'disk full' })).toEqual({ kind: 'io', message: 'disk full' });
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('plain')).toBe('plain');
  });
});

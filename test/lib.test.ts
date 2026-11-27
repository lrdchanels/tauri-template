import { describe, expect, it } from 'vitest';
import { BOM, csvNumber, toCsv } from '../src/lib/csv';
import { addMonths, day, iso, monthKey, parseDate, parts } from '../src/lib/dates';
import { errorMessage, toAppError } from '../src/lib/errors';
import { unpackFiles } from '../src/lib/pack';

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

describe('pack', () => {
  // Same layout as pack() in src-tauri/src/files.rs.
  const pack = (files: [string, number[]][]) => {
    const enc = new TextEncoder();
    const out: number[] = [];
    const u32 = (n: number) => out.push(n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255);
    u32(files.length);
    for (const [name, bytes] of files) {
      const n = enc.encode(name);
      u32(n.length);
      out.push(...n);
      u32(bytes.length);
      out.push(...bytes);
    }
    return new Uint8Array(out).buffer;
  };

  it('decodes names and contents of picked files', () => {
    expect(unpackFiles(pack([]))).toEqual([]);
    const files = unpackFiles(
      pack([
        ['añ.csv', [1, 2, 3]],
        ['b', []],
      ]),
    );
    expect(files.map((f) => f.name)).toEqual(['añ.csv', 'b']);
    expect([...files[0]!.bytes]).toEqual([1, 2, 3]);
    expect(files[1]!.bytes.length).toBe(0);
  });

  it('rejects a truncated buffer', () => {
    expect(() => unpackFiles(pack([['x', [1, 2]]]).slice(0, 10))).toThrow(/truncated/);
  });
});

// CSV that Excel opens correctly in Spanish (and most other) locales.

/** Byte order mark: tells Excel the file is UTF-8. */
export const BOM = String.fromCharCode(0xfeff);

export type Cell = string | number | null | undefined;

/** Rows → CSV with `;` separator and a BOM, so Excel keeps accents and splits columns. */
export function toCsv(header: Cell[], rows: Cell[][]): string {
  const field = (v: Cell) => {
    const s = String(v ?? '');
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `${BOM}${[header, ...rows].map((r) => r.map(field).join(';')).join('\r\n')}\r\n`;
}

/** Number for CSV with a decimal comma and no thousands separator (what Spanish Excel expects). */
export const csvNumber = (v: number | null | undefined, decimals = 6): string =>
  v === null || v === undefined || Number.isNaN(v) ? '' : String(+v.toFixed(decimals)).replace('.', ',');

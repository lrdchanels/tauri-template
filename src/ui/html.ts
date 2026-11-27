// Safe HTML templating. Every interpolation in html`` is escaped unless it is wrapped in raw()
// or is itself the result of html`` (so templates compose). Never build markup by string
// concatenation with user data: use html``.
//
//   const row = html`<li>${item.name}</li>`;            // escaped
//   root.append(el(html`<ul>${items.map(row)}</ul>`));  // arrays are joined

export class Raw {
  constructor(readonly s: string) {}
  toString(): string {
    return this.s;
  }
}

export type Html = Raw;
type Value = unknown;

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]!);

/** Marks a trusted string as HTML. Only for markup you wrote yourself (icons, constants). */
export const raw = (s: string): Raw => new Raw(s);

const piece = (v: Value): string => {
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(piece).join('');
  // false/null/undefined render nothing, so `${cond && html`…`}` works. For attribute values
  // that must say "false" (aria-*), pass String(bool).
  if (v === false || v === null || v === undefined) return '';
  return esc(v);
};

export function html(strings: TemplateStringsArray, ...values: Value[]): Raw {
  let out = strings[0] ?? '';
  values.forEach((v, i) => {
    out += piece(v) + (strings[i + 1] ?? '');
  });
  return new Raw(out);
}

/** HTML → its first element. */
export function el<T extends Element = HTMLElement>(markup: Raw | string): T {
  const t = document.createElement('template');
  t.innerHTML = String(markup).trim();
  const first = t.content.firstElementChild;
  if (!first) throw new Error('el(): the markup has no element');
  return first as T;
}

/** Replaces the children of `root` with the markup. */
export function render(root: Element, markup: Raw): void {
  root.innerHTML = markup.s;
}

/** querySelector that throws instead of returning null: a missing node is a bug. */
export function $<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const n = root.querySelector<T>(selector);
  if (!n) throw new Error(`Missing element: ${selector}`);
  return n;
}

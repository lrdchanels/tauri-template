// A persisted JSON document with defaults and versioned migrations.
//
// Stored as { version, value }. On load:
//   1. missing file          → defaults()
//   2. older version         → each migration from the stored version up to the current one
//   3. always                → merged over defaults(), so fields added later get their default
// Bump `version` and add a migration only when you rename/reshape fields; adding a new field with
// a default needs neither (step 3 fills it in).

import { platform, type StoreKey } from '../platform';

export interface Envelope {
  version: number;
  value: unknown;
}

export interface DocOptions<T> {
  key: StoreKey;
  /** Current schema version (start at 1). */
  version: number;
  defaults: () => T;
  /** migrations[n] turns version n into version n + 1. */
  // biome-ignore lint/suspicious/noExplicitAny: migrations work on untyped stored JSON.
  migrations?: Record<number, (old: any) => any>;
}

export class NewerVersionError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Deep merge for plain objects; arrays and primitives in `saved` replace the defaults. */
export function mergeDefaults<T>(defaults: T, saved: unknown): T {
  if (!isObject(defaults) || !isObject(saved)) return (saved === undefined ? defaults : saved) as T;
  const out: Record<string, unknown> = { ...defaults };
  for (const [k, v] of Object.entries(saved)) out[k] = k in defaults ? mergeDefaults(defaults[k], v) : v;
  return out as T;
}

export class Doc<T> {
  value: T;

  constructor(readonly opts: DocOptions<T>) {
    this.value = opts.defaults();
  }

  get key(): StoreKey {
    return this.opts.key;
  }

  /** Turns stored JSON (an envelope, or null) into a current value. Throws NewerVersionError. */
  hydrate(stored: unknown): T {
    if (stored === null || stored === undefined) return this.opts.defaults();
    const env =
      isObject(stored) && 'version' in stored
        ? (stored as unknown as Envelope)
        : { version: 1, value: stored };
    if (env.version > this.opts.version) throw new NewerVersionError(`${this.key}: version ${env.version}`);
    let value = env.value;
    for (let v = env.version; v < this.opts.version; v++) {
      const m = this.opts.migrations?.[v];
      if (m) value = m(value);
    }
    return mergeDefaults(this.opts.defaults(), value);
  }

  envelope(): Envelope {
    return { version: this.opts.version, value: this.value };
  }

  async load(): Promise<void> {
    this.value = this.hydrate(await platform.read(this.key));
  }

  async save(): Promise<void> {
    await platform.write(this.key, this.envelope());
  }

  /** Changes the value with `f` and saves it. */
  async update(f: (value: T) => void): Promise<void> {
    f(this.value);
    await this.save();
  }

  reset(): void {
    this.value = this.opts.defaults();
  }
}

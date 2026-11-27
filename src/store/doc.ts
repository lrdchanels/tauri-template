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
  /**
   * Checks the shape after migrations and defaults: return false for values the UI could never
   * produce (a restored backup or a hand-edited file), and the document is rejected.
   */
  validate?: (value: T) => boolean;
}

export class NewerVersionError extends Error {}
/** The stored document has an invalid envelope or fails `validate`. */
export class InvalidDocumentError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Keys that would reach the prototype chain if copied from untrusted JSON (a restored backup). */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Deep merge for plain objects; arrays and primitives in `saved` replace the defaults. */
export function mergeDefaults<T>(defaults: T, saved: unknown): T {
  if (!isObject(defaults) || !isObject(saved)) return (saved === undefined ? defaults : saved) as T;
  const out: Record<string, unknown> = { ...defaults };
  for (const [k, v] of Object.entries(saved)) {
    if (UNSAFE_KEYS.has(k)) continue;
    out[k] = Object.hasOwn(defaults, k) ? mergeDefaults(defaults[k], v) : v;
  }
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

  /** Turns stored JSON (an envelope, or null) into a current value. Throws NewerVersionError or InvalidDocumentError. */
  hydrate(stored: unknown): T {
    if (stored === null || stored === undefined) return this.opts.defaults();
    const env =
      isObject(stored) && 'version' in stored
        ? (stored as unknown as Envelope)
        : { version: 1, value: stored };
    if (!Number.isInteger(env.version) || env.version < 1)
      throw new InvalidDocumentError(`${this.key}: version ${String(env.version)}`);
    if (env.version > this.opts.version) throw new NewerVersionError(`${this.key}: version ${env.version}`);
    let value = env.value;
    for (let v = env.version; v < this.opts.version; v++) {
      const m = this.opts.migrations?.[v];
      if (m) value = m(value);
    }
    const result = mergeDefaults(this.opts.defaults(), value);
    if (this.opts.validate && !this.opts.validate(result))
      throw new InvalidDocumentError(`${this.key}: invalid shape`);
    return result;
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

  /** Changes the value with `f` and saves it. If saving fails the change is undone and the error rethrown. */
  async update(f: (value: T) => void): Promise<void> {
    // Documents are plain JSON, so a JSON round trip is an exact copy.
    const before = JSON.parse(JSON.stringify(this.value)) as T;
    f(this.value);
    try {
      await this.save();
    } catch (e) {
      this.value = before;
      throw e;
    }
  }

  reset(): void {
    this.value = this.opts.defaults();
  }
}

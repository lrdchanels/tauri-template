// Finds message keys in src/i18n/es.ts that no code uses. (Missing keys and keys that differ
// between locales are already type errors.) Keys built dynamically, like t(`theme.${x}`), are
// recognised by their prefix: list such prefixes in DYNAMIC.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const DYNAMIC = ['theme.'];

const es = readFileSync(join(root, 'src/i18n/es.ts'), 'utf8');
const keys = [...es.matchAll(/^\s{2}'([\w.]+)':/gm)].map((m) => m[1]);

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return p.endsWith('i18n') ? [] : files(p);
    return p.endsWith('.ts') ? [p] : [];
  });
}
const code = files(join(root, 'src'))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

const unused = keys.filter((k) => !code.includes(`'${k}'`) && !DYNAMIC.some((p) => k.startsWith(p)));
if (unused.length) {
  console.error(
    `Unused message keys in src/i18n/es.ts (remove them from every locale):\n  ${unused.join('\n  ')}`,
  );
  process.exit(1);
}
console.log(`i18n: ${keys.length} keys, all used.`);

// Turns the template into your app: names, identifier, repo, updater signing key and icons.
// Run it once, right after creating your repo from the template:
//
//   npm run init-app                                   # asks for each value
//   npm run init-app -- --name my-app --product "My App" --identifier com.me.myapp \
//     --repo me/my-app --description "What it does" --author "Me" --yes
//
// Flags: --icon <file.svg|png>  generate icons from it   --no-key  skip the updater key
//        --remove-self          delete this script afterwards   --dry-run  show the plan only
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const TEMPLATE = { id: 'tauri-template', product: 'Tauri Template', identifier: 'com.example.tauritemplate' };

/* ---------- arguments ---------- */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
};

const fail = (msg) => {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
};

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const VALID = {
  name: (v) => /^[a-z][a-z0-9-]*$/.test(v) || 'lowercase letters, digits and dashes, starting with a letter',
  product: (v) => v.trim().length > 0 || 'required',
  identifier: (v) =>
    /^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2,}$/.test(v) || 'reverse domain, e.g. com.yourname.yourapp',
  repo: (v) => v === '' || /^[\w.-]+\/[\w.-]+$/.test(v) || 'owner/repo, or empty',
  description: () => true,
  author: () => true,
};

async function collect() {
  const values = {
    product: opt('product'),
    name: opt('name'),
    identifier: opt('identifier'),
    description: opt('description'),
    author: opt('author'),
    repo: opt('repo'),
  };
  const interactive = !flag('yes') && process.stdin.isTTY;
  const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null;
  const ask = async (key, question, fallback) => {
    if (values[key] !== undefined) return;
    if (!rl) {
      values[key] = fallback;
      return;
    }
    for (;;) {
      const a =
        (await rl.question(`${question}${fallback ? ` (${fallback})` : ''}: `)).trim() || fallback || '';
      const ok = VALID[key](a);
      if (ok === true) {
        values[key] = a;
        return;
      }
      console.log(`  ${ok}`);
    }
  };
  await ask('product', 'App name, as users see it', undefined);
  if (!values.product) fail('--product is required (e.g. --product "My App").');
  await ask('name', 'Package name', slug(values.product));
  await ask(
    'identifier',
    'Bundle identifier',
    `com.${slug(values.author ?? 'me').replace(/-/g, '') || 'me'}.${values.name.replace(/-/g, '')}`,
  );
  await ask('description', 'One-line description', '');
  await ask('author', 'Author', '');
  await ask('repo', 'GitHub repo (owner/repo)', '');
  rl?.close();
  for (const [k, check] of Object.entries(VALID)) {
    const ok = check(values[k] ?? '');
    if (ok !== true) fail(`--${k}: ${ok}`);
  }
  if (values.identifier.startsWith('com.example.'))
    console.warn('⚠ Bundle identifier still starts with com.example.');
  return values;
}

/* ---------- file edits ---------- */

const read = (p) => readFileSync(join(root, p), 'utf8');
const changes = [];
function edit(path, f) {
  const before = read(path);
  const after = f(before);
  if (after !== before) changes.push([path, after]);
}
const json = (path, f) =>
  edit(path, (text) => {
    const o = JSON.parse(text);
    f(o);
    return `${JSON.stringify(o, null, 2)}\n`;
  });
const tomlString = (s) => JSON.stringify(s);

function plan(v) {
  json('package.json', (o) => {
    o.name = v.name;
    o.version = '0.1.0';
    o.description = v.description;
    if (v.author) o.author = v.author;
    if (v.repo) o.repository = { type: 'git', url: `https://github.com/${v.repo}.git` };
    delete o.scripts['init-app'];
  });
  json('package-lock.json', (o) => {
    o.name = v.name;
    o.version = '0.1.0';
    if (o.packages?.['']) {
      o.packages[''].name = v.name;
      o.packages[''].version = '0.1.0';
    }
  });
  edit('src-tauri/Cargo.toml', (t) =>
    t
      .replace(/^name = ".*"$/m, `name = ${tomlString(v.name)}`)
      .replace(/^version = ".*"$/m, 'version = "0.1.0"')
      .replace(/^description = ".*"$/m, `description = ${tomlString(v.description || v.product)}`)
      .replace(/^(edition = .*)$/m, v.author ? `authors = [${tomlString(v.author)}]\n$1` : '$1'),
  );
  if (existsSync(join(root, 'src-tauri/Cargo.lock'))) {
    edit('src-tauri/Cargo.lock', (t) =>
      t.replace(`name = "${TEMPLATE.id}"\nversion = "0.1.0"`, `name = "${v.name}"\nversion = "0.1.0"`),
    );
  }
  json('src-tauri/tauri.conf.json', (o) => {
    o.productName = v.product;
    o.identifier = v.identifier;
    o.app.windows[0].title = v.product;
    o.bundle.shortDescription = v.description || v.product;
    o.bundle.longDescription = v.description || v.product;
    o.plugins.updater.endpoints = [
      v.repo
        ? `https://github.com/${v.repo}/releases/latest/download/latest.json`
        : 'https://github.com/OWNER/REPO/releases/latest/download/latest.json',
    ];
  });
  edit('src/app.config.ts', (t) =>
    t
      .replace(/id: '.*',/, `id: '${v.name}',`)
      .replace(/name: '.*',/, `name: ${JSON.stringify(v.product).replace(/^"|"$/g, "'")},`)
      .replace(/repo: '.*',/, `repo: '${v.repo}',`),
  );
  edit('index.html', (t) => t.replace(/<title>.*<\/title>/, `<title>${v.product}</title>`));
  edit('README.md', () => readme(v));
}

function readme(v) {
  const releases = v.repo ? `https://github.com/${v.repo}/releases/latest` : 'the Releases page';
  return `# ${v.product}

${v.description || ''}

## Install

Download the installer for your system from [Releases](${releases}): \`.exe\`/\`.msi\` on Windows,
\`.dmg\` on macOS (universal), \`.AppImage\`/\`.deb\`/\`.rpm\` on Linux. The app updates itself.

## Develop

\`\`\`sh
npm install
npm run tauri dev   # the app
npm run dev         # UI only, in a browser (localStorage instead of files)
npm run check       # everything CI runs
\`\`\`

See [CLAUDE.md](CLAUDE.md) for the architecture and conventions, and [docs/recipes.md](docs/recipes.md)
for step-by-step changes. Built from [tauri-template](https://github.com/lrdchanels/tauri-template).
`;
}

/* ---------- updater key and icons ---------- */

function signingKey(v) {
  const dir = join(homedir(), '.tauri');
  const key = join(dir, `${v.name}.key`);
  if (!existsSync(key)) {
    mkdirSync(dir, { recursive: true });
    execSync(`npx tauri signer generate --ci -w "${key}"`, { cwd: root, stdio: 'inherit' });
  } else console.log(`Using the existing key ${key}`);
  const pub = readFileSync(`${key}.pub`, 'utf8').trim();
  const conf = JSON.parse(read('src-tauri/tauri.conf.json'));
  conf.plugins.updater.pubkey = pub;
  writeFileSync(join(root, 'src-tauri/tauri.conf.json'), `${JSON.stringify(conf, null, 2)}\n`);
  return key;
}

function icons(source) {
  if (!existsSync(source)) fail(`Icon not found: ${source}`);
  if (source.toLowerCase().endsWith('.svg')) {
    copyFileSync(source, join(root, 'src-tauri/icons/icon.svg'));
    copyFileSync(source, join(root, 'public/icon.svg'));
  }
  execSync(`npx tauri icon "${source}"`, { cwd: root, stdio: 'inherit' });
  for (const d of ['android', 'ios'])
    rmSync(join(root, 'src-tauri/icons', d), { recursive: true, force: true });
}

/* ---------- run ---------- */

const v = await collect();
plan(v);
console.log(`\n${v.product} (${v.name}, ${v.identifier})${v.repo ? ` → github.com/${v.repo}` : ''}`);
for (const [p] of changes) console.log(`  ✎ ${p}`);
if (flag('dry-run')) {
  console.log('\n(dry run: nothing written)');
  process.exit(0);
}
for (const [p, text] of changes) writeFileSync(join(root, p), text);

let key = null;
if (!flag('no-key')) key = signingKey(v);
const icon = opt('icon');
if (icon) icons(icon);
if (flag('remove-self')) rmSync(fileURLToPath(import.meta.url));

console.log(`
✔ Done. Next:
  npm install && npm run check
  git add -A && git commit -m "Start ${v.product}"`);
if (key) {
  console.log(`
Updater signing key: ${key}  (keep it safe and out of git; losing it means users
cannot auto-update to versions signed with a new key). For release builds on GitHub:
  gh secret set TAURI_SIGNING_PRIVATE_KEY < "${key}"
  gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --body ""`);
}
if (!v.repo) console.log('\nNo repo given: set the updater endpoint in src-tauri/tauri.conf.json later.');

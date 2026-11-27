// Prepares a release: sets the version in package.json (+ lock) and src-tauri/Cargo.toml (+ lock),
// runs every check (npm run check), and creates the "vX.Y.Z" commit and annotated tag.
// tauri.conf.json reads the version from package.json, so it is not touched.
// Then `git push --follow-tags`: .github/workflows/release.yml builds the installers.
// Usage: npm run release -- 0.2.0 [--dry-run]
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const version = args.find((a) => !a.startsWith('-'))?.replace(/^v/, '');
const sh = (cmd, opts = {}) => execSync(cmd, { cwd: root, stdio: 'inherit', ...opts });
const out = (cmd) => execSync(cmd, { cwd: root, encoding: 'utf8' }).trim();
const fail = (text) => {
  console.error(text);
  process.exit(1);
};

if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version))
  fail('Usage: npm run release -- 0.2.0 [--dry-run]');
const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8'));
if (pkg.version === version) fail(`Already at version ${version}.`);
if (!dry) {
  if (out('git status --porcelain')) fail('Uncommitted changes: commit or stash them before releasing.');
  if (out(`git tag -l v${version}`)) fail(`Tag v${version} already exists.`);
}

const cargoPath = `${root}src-tauri/Cargo.toml`;
const cargo = readFileSync(cargoPath, 'utf8');
// only the [package] version (the first `version = ...` line of the file)
const newCargo = cargo.replace(/^version = "[^"]*"/m, `version = "${version}"`);
if (newCargo === cargo) fail('Version not found in src-tauri/Cargo.toml.');

console.log(`${pkg.version} → ${version}`);
if (dry) {
  console.log(
    `(dry run: nothing changes)\n  package.json, package-lock.json, src-tauri/Cargo.toml, src-tauri/Cargo.lock\n  npm run check\n  git commit + git tag v${version}`,
  );
  process.exit(0);
}

sh(`npm version ${version} --no-git-tag-version`, { stdio: 'ignore' });
writeFileSync(cargoPath, newCargo);
// updates Cargo.lock and checks everything
sh('npm run check');
sh('git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock');
sh(`git commit -m "v${version}"`);
sh(`git tag -a v${version} -m "v${version}"`); // annotated: the kind `git push --follow-tags` pushes
console.log('\nDone. To publish: git push --follow-tags');

// Releases in two steps, because `main` is protected (changes only through pull requests with CI
// green, see docs/release.md):
//
//   npm run release -- 0.2.0          1. on a release/v0.2.0 branch: sets the version in
//                                        package.json (+ lock) and src-tauri/Cargo.toml (+ lock),
//                                        runs `npm run check`, commits "v0.2.0", pushes the branch
//                                        and opens a pull request with auto-merge.
//   npm run release -- 0.2.0 --tag    2. once it is merged: tags main as v0.2.0 and pushes the tag,
//                                        which starts .github/workflows/release.yml.
//
// tauri.conf.json reads the version from package.json, so it is not touched.
// Add --dry-run to either step to see what it would do without changing anything.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const tagStep = args.includes('--tag');
const version = args.find((a) => !a.startsWith('-'))?.replace(/^v/, '');
const sh = (cmd, opts = {}) => execSync(cmd, { cwd: root, stdio: 'inherit', ...opts });
const out = (cmd) => execSync(cmd, { cwd: root, encoding: 'utf8' }).trim();
const ok = (cmd) => {
  try {
    execSync(cmd, { cwd: root, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
const fail = (text) => {
  console.error(text);
  process.exit(1);
};

if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version))
  fail('Usage: npm run release -- 0.2.0 [--tag] [--dry-run]');
const tag = `v${version}`;
const branch = `release/${tag}`;
const main = ok('git symbolic-ref --quiet refs/remotes/origin/HEAD')
  ? out('git symbolic-ref --short refs/remotes/origin/HEAD').replace(/^origin\//, '')
  : 'main';
const readVersion = () => JSON.parse(readFileSync(`${root}package.json`, 'utf8')).version;

if (out(`git tag -l ${tag}`) || out(`git ls-remote --tags origin refs/tags/${tag}`))
  fail(`Tag ${tag} already exists.`);
sh('git fetch origin --quiet');

if (tagStep) {
  /* ---------- 2. tag the merged release ---------- */
  // The tag goes on origin/main as merged, whatever is checked out here.
  const merged = JSON.parse(out(`git show origin/${main}:package.json`)).version;
  if (merged !== version)
    fail(`origin/${main} is at version ${merged}, not ${version}: merge the ${branch} pull request first.`);
  console.log(`Tagging origin/${main} (${out(`git rev-parse --short origin/${main}`)}) as ${tag}`);
  if (dry) process.exit(0);
  sh(`git tag -a ${tag} -m "${tag}" origin/${main}`); // annotated, like every release tag
  sh(`git push origin ${tag}`);
  if (out('git rev-parse --abbrev-ref HEAD') === main) ok(`git merge --ff-only --quiet origin/${main}`);
  ok(`git branch -D ${branch}`);
  console.log(
    '\nDone. .github/workflows/release.yml is building the installers: approve the "release"\n' +
      'environment in Actions if asked, then review and publish the draft release.',
  );
  process.exit(0);
}

/* ---------- 1. release pull request ---------- */
if (!dry && out('git status --porcelain'))
  fail('Uncommitted changes: commit or stash them before releasing.');
if (out('git rev-parse --abbrev-ref HEAD') !== main) fail(`Run it from ${main}.`);
if (out('git rev-parse HEAD') !== out(`git rev-parse origin/${main}`))
  fail(`${main} differs from origin/${main}: pull first (changes reach ${main} only through pull requests).`);
if (readVersion() === version) fail(`Already at version ${version}.`);
if (
  ok(`git rev-parse --verify --quiet refs/heads/${branch}`) ||
  out(`git ls-remote --heads origin ${branch}`)
)
  fail(`Branch ${branch} already exists.`);

const cargoPath = `${root}src-tauri/Cargo.toml`;
const cargo = readFileSync(cargoPath, 'utf8');
// only the [package] version (the first `version = ...` line of the file)
const newCargo = cargo.replace(/^version = "[^"]*"/m, `version = "${version}"`);
if (newCargo === cargo) fail('Version not found in src-tauri/Cargo.toml.');

console.log(`${readVersion()} → ${version}`);
if (dry) {
  console.log(
    `(dry run: nothing changes)\n  git checkout -b ${branch}\n  package.json, package-lock.json, src-tauri/Cargo.toml, src-tauri/Cargo.lock\n  npm run check\n  git commit "${tag}", push ${branch}, pull request with auto-merge`,
  );
  process.exit(0);
}

sh(`git checkout --quiet -b ${branch}`);
sh(`npm version ${version} --no-git-tag-version`, { stdio: 'ignore' });
writeFileSync(cargoPath, newCargo);
// updates Cargo.lock and checks everything
sh('npm run check');
sh('git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock');
sh(`git commit --quiet -m "${tag}"`);
sh(`git push --quiet -u origin ${branch}`);

const next = `npm run release -- ${version} --tag`;
if (ok('gh --version')) {
  sh(`gh pr create --base ${main} --head ${branch} --title "${tag}" --body "Release ${tag}."`);
  // Merges by itself once CI is green ("Allow auto-merge" must be on in the repository settings).
  if (!ok(`gh pr merge ${branch} --auto --merge`))
    console.log('Could not enable auto-merge: merge the pull request yourself when CI is green.');
  sh(`git checkout --quiet ${main}`);
  console.log(`\nWhen the pull request is merged: ${next}`);
} else {
  sh(`git checkout --quiet ${main}`);
  console.log(
    `\nBranch ${branch} pushed. Open a pull request into ${main}, merge it when CI is green, then: ${next}`,
  );
}

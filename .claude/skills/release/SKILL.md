---
name: release
description: Cut a new version of the app - bump versions, verify, tag and explain how to publish. Use when the user asks to release, publish or ship a version.
disable-model-invocation: true
---

# Release

1. Confirm the version number with the user (semver: fix → patch, feature → minor).
2. `git status` must be clean and on the default branch. If not, stop and say why.
3. `npm run release -- <version>`: bumps `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`
   and `Cargo.lock`, runs `npm run check`, commits `v<version>` and creates the annotated tag.
   If `check` fails, fix the cause in a separate commit first; never skip it.
4. Do **not** push on your own. Tell the user: `git push --follow-tags` starts
   `.github/workflows/release.yml`, which leaves a draft release to review and publish.
5. First release of an app? Check `docs/release.md`: the `TAURI_SIGNING_PRIVATE_KEY` secret and
   the updater `pubkey`/`endpoints` in `src-tauri/tauri.conf.json` must be set.

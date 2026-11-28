---
name: release
description: Cut a new version of the app - bump versions, verify, tag and explain how to publish. Use when the user asks to release, publish or ship a version.
disable-model-invocation: true
---

# Release

1. Confirm the version number with the user (semver: fix → patch, feature → minor).
2. `git status` must be clean, on the default branch and up to date with origin. If not, stop
   and say why.
3. `npm run release -- <version>`: on a `release/v<version>` branch it bumps `package.json`,
   `package-lock.json`, `src-tauri/Cargo.toml` and `Cargo.lock`, runs `npm run check`, commits
   `v<version>`, pushes the branch and opens a pull request with auto-merge (`main` is protected:
   nothing reaches it without a PR and green CI). If `check` fails, fix the cause first (in its own
   PR); never skip it.
4. When the PR is merged, `npm run release -- <version> --tag` tags `main` and pushes the tag, which
   starts `.github/workflows/release.yml`. Ask the user before this step: it is what ships. The
   build waits for their approval of the `release` environment and leaves a draft release to
   review and publish.
5. First release of an app? Check `docs/release.md`: the `TAURI_SIGNING_PRIVATE_KEY` secret and
   the updater `pubkey`/`endpoints` in `src-tauri/tauri.conf.json` must be set.

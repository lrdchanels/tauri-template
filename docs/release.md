# Releases, updates and signing

## One-time setup

1. `npm run init-app` generates an updater key pair in `~/.tauri/<name>.key` and writes the public
   key into `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`). Keep the private key out of git
   and backed up: if you lose it, installed apps cannot verify new versions.
2. Put the private key in a protected `release` environment (not in repository secrets: any
   workflow run from any branch could read those):

   ```sh
   gh secret set TAURI_SIGNING_PRIVATE_KEY --env release < ~/.tauri/<name>.key
   gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --env release --body ""   # or your password
   ```

   Then protect the environment, the release tags and `main` (next section). Whoever can trigger a
   signed build can sign an update that every installed copy will accept.

3. Make sure `plugins.updater.endpoints` points to
   `https://github.com/<owner>/<repo>/releases/latest/download/latest.json`.

Manual key generation: `npx tauri signer generate -w ~/.tauri/<name>.key`.

## Protecting the repository

GitHub does not copy settings when you create a repository from a template: run this once in every
new repository (free for public repositories). Replace `OWNER/REPO`; it needs `gh` logged in as an
admin of the repository.

```sh
REPO=OWNER/REPO
ME=$(gh api user --jq .id)

# 1. `release` environment: you approve every signed build, and only v* tags can use it.
gh api -X PUT repos/$REPO/environments/release --input - <<EOF
{ "reviewers": [{ "type": "User", "id": $ME }], "prevent_self_review": false,
  "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true } }
EOF
gh api -X POST repos/$REPO/environments/release/deployment-branch-policies -f name='v*' -f type=tag

# 2. Release tags: only admins can create, move or delete v* tags.
gh api -X POST repos/$REPO/rulesets --input - <<'EOF'
{ "name": "release tags v*", "target": "tag", "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/tags/v*"], "exclude": [] } },
  "rules": [{ "type": "creation" }, { "type": "update" }, { "type": "deletion" },
            { "type": "non_fast_forward" }],
  "bypass_actors": [{ "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }] }
EOF

# 3. main: no deletion or force push, changes through pull requests, CI green on the three OSes.
gh api -X POST repos/$REPO/rulesets --input - <<'EOF'
{ "name": "main", "target": "branch", "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" }, { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": { "required_approving_review_count": 0,
      "dismiss_stale_reviews_on_push": false, "require_code_owner_review": false,
      "require_last_push_approval": false, "required_review_thread_resolution": false } },
    { "type": "required_status_checks", "parameters": { "strict_required_status_checks_policy": false,
      "required_status_checks": [ { "context": "check (windows-latest)" },
        { "context": "check (macos-latest)" }, { "context": "check (ubuntu-22.04)" } ] } } ] }
EOF
```

`required_approving_review_count: 0` keeps you able to merge your own pull requests when you work
alone (GitHub never lets you approve your own). The status check names come from the `check` job
in `.github/workflows/ci.yml`: update them if you rename the job or change its matrix. Check the
result in Settings → Rules → Rulesets and Settings → Environments.

## Each release

```sh
npm run release -- 0.2.0     # bumps versions, runs npm run check, commits "v0.2.0" and tags it
git push --follow-tags       # release.yml builds Windows, macOS (universal) and Linux installers
```

The workflow creates a **draft** release with the installers and `latest.json`. Review it and
publish it: from that moment installed apps see the update (Settings → About → Check for updates,
or automatically a few seconds after start).

Local builds (`npx tauri build`) don't create updater artifacts and don't need the key; the release
workflow adds `--config src-tauri/tauri.updater.conf.json`.

## Code signing (optional, recommended for public apps)

Unsigned apps work but show warnings: SmartScreen on Windows, Gatekeeper on macOS (users must
right-click → Open the first time).

- **macOS:** an Apple Developer account. Add `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`,
  `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` as secrets and pass them
  as `env` to `tauri-action` in `release.yml`. See https://v2.tauri.app/distribute/sign/macos/.
- **Windows:** an OV/EV certificate or Azure Trusted Signing; configure `bundle.windows` signing in
  `tauri.conf.json`. See https://v2.tauri.app/distribute/sign/windows/.
- **Linux:** AppImage/deb/rpm are not signed by default.

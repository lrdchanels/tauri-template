# Releases, updates and signing

## One-time setup

1. `npm run init-app` generates an updater key pair in `~/.tauri/<name>.key` and writes the public
   key into `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`). Keep the private key out of git
   and backed up: if you lose it, installed apps cannot verify new versions.
2. Add the private key to the repo secrets:

   ```sh
   gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/<name>.key
   gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --body ""   # or the password you chose
   ```

3. Make sure `plugins.updater.endpoints` points to
   `https://github.com/<owner>/<repo>/releases/latest/download/latest.json`.

Manual key generation: `npx tauri signer generate -w ~/.tauri/<name>.key`.

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

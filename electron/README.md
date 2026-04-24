# Electron

Desktop-app files for Widgetizer. Everything in this folder is specific to the Electron packaging — the web-app build (`npm run build`) does not touch any of it.

## Files

| File | Role |
|---|---|
| `main.js` | Electron main process. Creates the browser window, spawns the internal Express server, wires up the auto-updater. |
| `preload.js` | Exposes a safe `window.electronUpdater` bridge to the renderer. |
| `builder.config.mjs` | `electron-builder` configuration (targets, signing, publish provider, asar unpack rules). Consumed by the build scripts. |
| `notarize.cjs` | macOS `afterSign` hook. Submits the signed `.app` to Apple's notarization service via `@electron/notarize`. Skips on non-darwin or when `SKIP_NOTARIZE=1`. |
| `prepare-mac-sharp.cjs` | Before packaging on macOS, installs per-arch Sharp binaries (`arm64` and `x64`) so the universal build ships with both. |
| `entitlements.mac.plist` | macOS hardened-runtime entitlements (JIT, unsigned executable memory, library validation). Required for Sharp + better-sqlite3 to load. |
| `resources/` | App icons (`icon.icns`, etc.) picked up by `electron-builder`. |

## Common commands

See [CLAUDE.md](../CLAUDE.md#electron-desktop-app) for the full list. Quick reference:

```bash
npm run electron:dev               # Run Electron against the Vite + Express dev servers
npm run electron:build:mac         # Package signed/notarized macOS installer
npm run electron:build:win         # Package signed Windows installer (run on Windows)
npm run electron:preflight         # Pre-release sanity check: lint + locale validation
```

The four `electron:build:*` scripts are thin wrappers over `scripts/build-electron.mjs`, which runs Vite build → platform prep → `@electron/rebuild` → `electron-builder`.

## Notes

- Build output goes to `dist-electron/` at the repo root (gitignored).
- The `preelectron:dev` npm lifecycle hook rebuilds `better-sqlite3` and validates locales before `electron:dev`.
- macOS signing + notarization require `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` environment variables; the notarize hook prints these (masked) on run.
- Windows signing uses a Certum/SimplySign certificate configured via `signtoolOptions` in `builder.config.mjs`.

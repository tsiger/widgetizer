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

## Simulating auto-updates locally (Windows)

Test the real auto-update flow — detect → banner → download with progress → Restart → install → relaunch — without cutting a GitHub tag/release. It's accurate because only the feed *host* changes (localhost instead of github.com): the same `autoUpdater`, the same `latest.yml` parsing, the same NSIS installer + blockmap, the same relaunch.

This works because `main.js` already supports a feed override via the `ELECTRON_UPDATER_URL` env var (or `--updater-url=` arg), which points `autoUpdater` at a `generic` provider instead of GitHub.

You can't update *from* nothing, so install a baseline first:

```bash
npm run updater:base    # builds + runs the installer for the CURRENT package.json version
# ...let it install (silent NSIS one-click; the app launches)...
npm run updater:sim     # builds the NEXT version, serves it locally, launches the baseline
```

`updater:sim` then:

1. Builds a version-bumped installer (default: base patch + 1) into `dist-electron-update/` using `build-electron.mjs --app-version <next> --out-dir …` — **no change to `package.json` or git**.
2. Serves that directory over `http://127.0.0.1:8384` (`scripts/serve-update-feed.mjs`, an Express static server that honours Range/ETag — what electron-updater's downloader needs).
3. Launches the installed baseline app with `ELECTRON_UPDATER_URL` pointed at the local feed.

The update check fires ~10s after launch; the banner appears, you download and Restart, and the app relaunches as the new version (verify via **Help → About**). Press Ctrl+C in the `updater:sim` terminal to stop the feed server.

Useful flags: `--next <x.y.z>` (explicit update version), `--port <n>`, `--skip-build` (reuse `dist-electron-update/`), `--app-exe <path>` (if the installed exe isn't auto-found). The new version, once installed, relaunches without the override env var, so it reverts to the GitHub feed — no loops.

> Notes: the first simulated update typically does a *full* download (blockmap delta needs the prior version's blockmap matched up); the user-visible flow is identical. Mac is intentionally not supported — Squirrel.Mac requires matching code signatures, so an unsigned update can't be faked, though the flow is otherwise the same.

## Notes

- Build output goes to `dist-electron/` at the repo root (gitignored).
- The `preelectron:dev` npm lifecycle hook rebuilds `better-sqlite3` and validates locales before `electron:dev`.
- The packaged app's bundled server binds with `PORT=0` (OS-assigned ephemeral port) and reports the actual bound port back to the main process via a `{ type: "server-ready", port }` IPC message. The renderer URL uses that reported port. Set `PORT` to force a specific port.
- macOS signing + notarization require `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` environment variables; the notarize hook prints these (masked) on run.
- Windows signing uses a Certum/SimplySign certificate configured via `signtoolOptions` in `builder.config.mjs`.

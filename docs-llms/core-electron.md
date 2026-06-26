# Electron App

Widgetizer runs as a native desktop app using Electron. The app embeds the React frontend in a `BrowserWindow` and runs the Express server internally as a `utilityProcess`.

This doc covers the **Electron-runtime-specific** material: dev mode, the dynamic-port server model, runtime data paths, the preview window, error handling, build output/distribution, and the local Windows update test. The full **release / auto-update flow** is in [CLAUDE.md](../CLAUDE.md); **asar bundling rules** for the workspace packages live in [core-packages.md](core-packages.md).

## Development

Run the API server, Vite dev server, and Electron together:

```bash
npm run electron:dev
```

- API server: `http://localhost:3001`
- Vite dev server: `http://localhost:3000` — the `electron:dev` script sets `VITE_DEV_SERVER_URL=http://localhost:3000` and waits on that port (`wait-on http://localhost:3000`). Electron loads that URL.
- `http://localhost:5173` is only the hardcoded **fallback** in `electron/main.js` (`process.env.VITE_DEV_SERVER_URL || "http://localhost:5173"`) for when `VITE_DEV_SERVER_URL` is unset. The dev script always sets it, so the live dev URL is 3000.

In dev the script also sets `ELECTRON_DISABLE_INTERNAL_SERVER=1`, so Electron points at the standalone `npm run server` rather than forking its own bundled server.

The `preelectron:dev` npm lifecycle hook runs automatically before `electron:dev`, rebuilding `better-sqlite3` for the local Node dev server and validating locales. Electron ABI rebuilds run during packaged builds in `scripts/build-electron.mjs`.

Use Electron dev mode when testing Electron-specific features (menus, native dialogs, preview window, auto-update). For regular development, use `npm run dev:all` and open `http://localhost:3000` in your browser.

## Production Build

### Build entry: `scripts/build-electron.mjs`

All four `electron:build:*` npm scripts call `node scripts/build-electron.mjs --platform <mac|win> [--unsigned]`. The script:

1. Preflights `.env.production` (prompts to create it if missing — see below).
2. Runs the Vite frontend build (`npm run build`).
3. Runs platform prep: mac swaps in per-arch Sharp binaries via `electron/prepare-mac-sharp.cjs`; Windows builds install win32 x64 optional native deps (`npm install --no-save --platform=win32 --arch=x64 --include=optional`) so modules like `sharp` are present.
4. Runs `npx @electron/rebuild --force` for Electron's native-module ABI.
5. Runs `electron-builder --config electron/builder.config.mjs --<platform>`, passing the unsigned flag/env where requested. For Windows unsigned it sets `WIN_UNSIGNED=1`, which `builder.config.mjs` reads to drop the `signtoolOptions` block.

> **There is no `build` key in `package.json`.** The only `build` script there is `vite build`. All electron-builder configuration lives in **`electron/builder.config.mjs`** (passed explicitly via `--config`). Any reference to a "package.json build config" is stale — look in `builder.config.mjs`.

### Prerequisite: `.env.production`

The production frontend bundle is same-origin: it talks to whichever Express origin served it (the bundled server on a dynamic port in Electron, the deployed Express host on the web app). For that to work, `VITE_API_URL` must be empty in the production build, which is what `.env.production` enforces — Vite loads it with priority over `.env` when `vite build` runs.

```
# .env.production
VITE_API_URL=
```

If this file is missing, the bundle bakes in `VITE_API_URL` from `.env` (typically `http://localhost:3001`) and every `/api/*` call in the packaged app fails because the bundled server runs on a dynamic port. `scripts/build-electron.mjs` prompts to create `.env.production` if it is missing.

### Build commands

```bash
# macOS only (loads signing credentials from .env.mac first)
export $(cat .env.mac | xargs) && npm run electron:build:mac

# macOS unsigned (fast, skips signing + notarization, local testing only)
npm run electron:build:mac:unsigned

# Windows only
npm run electron:build:win

# Windows unsigned (fast, skips Authenticode signing, local testing only)
npm run electron:build:win:unsigned
```

Output directory: `dist-electron/`

### Windows-from-mac note

If you build the Windows app on macOS, native modules like `sharp` may be missing. `build-electron.mjs` installs the Windows optional dependencies before packaging, but for best results run Windows builds on Windows.

### Packaging targets

- **Windows** target is `nsis` (installer), `x64` only — required for auto-updates.
- **macOS** targets are `dmg` (first-time install) + `zip` (for seamless auto-updates via electron-updater), each for `arm64` and `x64`.
- macOS builds are signed and notarized with a Developer ID Application certificate.

### macOS Output

```
dist-electron/
├── mac-arm64/
│   └── Widgetizer.app               # Apple Silicon (M1/M2/M3/M4)
├── mac/
│   └── Widgetizer.app               # Intel Macs
├── Widgetizer-x.x.x-arm64.dmg       # Apple Silicon distribution
├── Widgetizer-x.x.x-arm64.dmg.blockmap
├── Widgetizer-x.x.x.dmg             # Intel distribution
├── Widgetizer-x.x.x.dmg.blockmap
├── Widgetizer-x.x.x-arm64-mac.zip   # auto-update artifact
├── Widgetizer-x.x.x-arm64-mac.zip.blockmap
├── Widgetizer-x.x.x-mac.zip         # auto-update artifact
├── Widgetizer-x.x.x-mac.zip.blockmap
└── latest-mac.yml                   # electron-updater metadata
```

### Windows Output

```
dist-electron/
├── win-unpacked/
│   └── Widgetizer.exe
├── Widgetizer-Setup-x.x.x.exe       # NSIS installer (artifactName from builder.config.mjs)
├── Widgetizer-Setup-x.x.x.exe.blockmap
└── latest.yml                       # electron-updater metadata
```

The Windows installer name is forced via `win.artifactName: "Widgetizer-Setup-${version}.${ext}"` in `electron/builder.config.mjs`, which keeps `latest.yml` and the generated files aligned. There is no Windows `.zip` target.

## Code Signing

### macOS

macOS signing and notarization are fully implemented.

**Requirements:**

- Apple Developer Program membership
- Developer ID Application certificate (in macOS Keychain)
- An app-specific password generated at [appleid.apple.com](https://appleid.apple.com)

**Credentials file — `.env.mac`** (gitignored):

```
APPLE_ID=your@apple.id
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=XXXXXXXXXX
```

**How it works:**

1. `electron-builder` packages the app with `hardenedRuntime: true`.
2. The `afterSign` hook runs `electron/notarize.cjs`.
3. `@electron/notarize` submits the `.app` to Apple's notarization service via `notarytool`.
4. Notarization typically takes 5–30 minutes.
5. `electron-builder` then staples the notarization ticket to the `.dmg`.

**Active `mac` block (`electron/builder.config.mjs`):**

```js
mac: {
  target: [
    { target: "dmg", arch: ["arm64", "x64"] },
    { target: "zip", arch: ["arm64", "x64"] },
  ],
  category: "public.app-category.productivity",
  hardenedRuntime: true,
  gatekeeperAssess: false,
  entitlements: "electron/entitlements.mac.plist",
  entitlementsInherit: "electron/entitlements.mac.plist",
},
afterSign: "electron/notarize.cjs",
```

**Entitlements (`electron/entitlements.mac.plist`):**

- `com.apple.security.cs.allow-jit` — required for V8 JIT
- `com.apple.security.cs.allow-unsigned-executable-memory` — required for Node.js
- `com.apple.security.cs.disable-library-validation` — required for native modules (sharp, better-sqlite3)

**`electron/notarize.cjs`** — CJS module required by `electron-builder`'s `afterSign` hook. Uses `@electron/notarize` with `notarytool`. Skips automatically on non-darwin platforms.

### Windows

Windows Authenticode signing works for the packaged executable. Signing is configured in `electron/builder.config.mjs` under `win.signtoolOptions` (added only when `WIN_UNSIGNED` is not set):

```js
win: {
  artifactName: "Widgetizer-Setup-${version}.${ext}",
  target: [{ target: "nsis", arch: ["x64"] }],
  signtoolOptions: {
    signingHashAlgorithms: ["sha256"],
    certificateSubjectName: "Open Source Developer Gerasimos Tsiamalos",
    rfc3161TimeStampServer: "http://time.certum.pl",
  },
},
```

`electron-builder` 26 note: Windows signing options (`certificateSubjectName`, `signingHashAlgorithms`, `rfc3161TimeStampServer`) must be nested under `win.signtoolOptions`. Putting them directly under `win` causes schema validation errors and the build fails before signing starts.

SimplySign note: Certum SimplySign authenticates a session first rather than prompting on every signing operation. If the SimplySign Desktop session is active and the certificate is in the Current User store, signing completes without an extra PIN dialog during the build.

## Runtime Data Paths

The Electron app stores user data separately from the application bundle, under `app.getPath("userData")` (`electron/main.js`):

| Path      | Location                                                  |
| --------- | --------------------------------------------------------- |
| User data | `<userData>/data` — passed to the server as `DATA_ROOT`   |
| Logs      | `<userData>/logs` — `widgetizer.log`                      |
| Themes    | `<userData>/data/themes` — installed working copy, seeded from `app.asar.unpacked/themes` on first access |

On macOS `<userData>` resolves to `~/Library/Application Support/widgetizer`. On startup `main.js` ensures `<userData>/data/projects` exists, then forks the server with `DATA_ROOT=<userData>/data` so all project content (pages, collections, uploads, theme files) lives under user data, not the read-only bundle.

Access these from the app menu: **File → Open Data Folder** or **File → Open Logs Folder** (both call `shell.openPath`).

## Server Process & Dynamic Port

- **utilityProcess.** Electron spawns the Express server via `utilityProcess.fork()` (`electron/main.js`), which runs with full asar support — unlike `spawn` with `ELECTRON_RUN_AS_NODE`. The forked entry is **`electron/server-bootstrap.js`**, which mirrors the web entry (`server.js`) but reports the bound port back to the parent. It imports `@widgetizer/builder-server/env` and calls `startOssServer` from `app/server-common.js`.
- **Dynamic port.** The server is forked with `PORT=0`, asks the OS for an ephemeral port at `app.listen` time, then posts `{ type: "server-ready", port }` back to the main process over the `utilityProcess` IPC channel (`process.parentPort.postMessage`). Main reads the actual port, builds the renderer URL from it, and loads the window. This eliminates the TOCTOU race a probe-then-bind approach has and means two packaged apps (or a packaged app alongside another local server) never collide. Set the `PORT` env var to force a specific port; if that port is taken, the server exits non-zero with `EADDRINUSE` instead of hanging.
- **Startup flow.** A loading screen is shown immediately. The UI swaps in once the `server-ready` message arrives, or a 30s timeout fires and surfaces a Startup Error screen with a Retry button.

## Preview Window

The editor preview opens in a dedicated Electron `BrowserWindow` (`createPreviewWindow` / `openPreviewWindow` in `electron/main.js`) rather than replacing the editor view:

- Repeated preview opens **reuse the same preview window** if it already exists; if minimized it is restored, then shown and focused.
- A new preview window is offset from the editor so it doesn't sit exactly on top when the editor isn't maximized.
- The incoming `previewPath` arrives over IPC and is **untrusted**: it is validated by `isSafePreviewPath` (`electron/previewPath.js`) before being turned into a renderer URL. Unsafe paths are ignored. See that module for the rationale.
- The preview renderer's `will-prevent-unload` is overridden so a stuck `beforeunload` handler can't block closing.
- In web builds, the editor uses a named browser tab for the same reuse behavior.

## Error Handling

Runtime resilience is split between a React boundary in the renderer and native handlers in the main process.

- **React ErrorBoundary** (`packages/editor-ui/src/components/ui/ErrorBoundary.jsx`) — wraps the app in `app/src/App.jsx`. Catches render errors and shows a recovery screen with Dashboard and Reload buttons. Shows a stack trace in dev mode.
- **Unresponsive window** (`main.js` `mainWindow.on("unresponsive")`) — dialog offers "Wait" or "Reload" when the renderer hangs.
- **Renderer crash** (`render-process-gone`) — shows the error page with a Retry button.
- **Blocked window close** (`will-prevent-unload`) — forces close when a stuck `beforeunload` handler tries to block it.
- **Uncaught exceptions** (`process.on("uncaughtException")`) — logs the error and shows a dialog, but skips the dialog during app quit to prevent blocking shutdown.

## Auto-Update (renderer side)

The full release procedure and the user-facing update flow are documented once in [CLAUDE.md](../CLAUDE.md) — do not duplicate them here. The Electron-runtime pieces:

- **Main process** — `setupAutoUpdater()` and IPC handlers in `electron/main.js`; `autoUpdater.autoDownload = false` (user-initiated), `autoInstallOnAppQuit = true`. Provider is GitHub Releases (`publish` block in `electron/builder.config.mjs`).
- **Preload** — `electron/preload.js` exposes `window.electronUpdater` via `contextBridge`.
- **UI** — `app/src/components/layout/UpdateBanner.jsx` renders the "Version X.Y.Z is available" bar. It mounts in **`app/src/App.jsx`** (passed as the `topbarBanner` slot), **not** in `Layout.jsx`. The shared `Layout` itself lives in `packages/editor-ui/src/components/layout/Layout.jsx`.

### Local Windows Update Test

To exercise the updater without a real GitHub release, launch the installed app with `--updater-url=http://127.0.0.1:5500` (parsed in `electron/main.js`) to override the GitHub feed.

1. Build and install the current version:
   ```powershell
   npm run electron:build:win:unsigned
   Copy-Item ".\dist-electron" ".\dist-electron-current" -Recurse
   & ".\dist-electron-current\Widgetizer-Setup-<current>.exe"
   ```
2. Bump `package.json` to the next version and build again:
   ```powershell
   npm run electron:build:win:unsigned
   Copy-Item ".\dist-electron" ".\dist-electron-next" -Recurse
   ```
3. Serve the new build folder:
   ```powershell
   npx http-server ".\dist-electron-next" -p 5500 --cors
   ```
4. In a second terminal, launch the already-installed old app against that local feed:
   ```powershell
   & "$env:LOCALAPPDATA\Programs\Widgetizer\Widgetizer.exe" --updater-url=http://127.0.0.1:5500
   ```
5. Wait ~10 seconds for the update check, then click **Update** and **Restart Now**.

Notes:

- Keep the HTTP server running while the update downloads.
- The served folder must contain `latest.yml`, the Windows `Widgetizer-Setup-<next>.exe`, and the matching `.exe.blockmap`.
- Windows artifact naming is forced via `win.artifactName` in `electron/builder.config.mjs`, so `latest.yml` and the generated files stay aligned.
- If differential download fails, `electron-updater` falls back to a full installer download automatically.

## App Icon

To add a custom icon:

1. Create a 1024x1024 PNG with ~100px transparent padding on all sides (actual artwork ~800x800 centered).
2. Convert to `.icns` for macOS:

```bash
mkdir icon.iconset
sips -z 16 16 icon-1024.png --out icon.iconset/icon_16x16.png
sips -z 32 32 icon-1024.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32 icon-1024.png --out icon.iconset/icon_32x32.png
sips -z 64 64 icon-1024.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128 icon-1024.png --out icon.iconset/icon_128x128.png
sips -z 256 256 icon-1024.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256 icon-1024.png --out icon.iconset/icon_256x256.png
sips -z 512 512 icon-1024.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512 icon-1024.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon-1024.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o icon.icns
```

3. Place `icon.icns` in `electron/resources/`.
4. Rebuild the app.

## Distribution

### Sharing with others

| Recipient's Mac             | File to share                 |
| --------------------------- | ----------------------------- |
| Apple Silicon (M1/M2/M3/M4) | `Widgetizer-x.x.x-arm64.dmg`  |
| Intel Mac                   | `Widgetizer-x.x.x.dmg`        |
| Windows                     | `Widgetizer-Setup-x.x.x.exe`  |

### First-run instructions for recipients (macOS)

macOS builds are signed and notarized, so Gatekeeper should not block them.

1. Open the `.dmg`.
2. Drag `Widgetizer.app` to Applications.
3. Double-click to run.

If Gatekeeper still warns (e.g. on an older OS or an unsigned dev build), right-click → Open → Open, or run:

```bash
xattr -cr /path/to/Widgetizer.app
```

## Bundling & asar

The workspace packages are bundled into the asar by their presence in the OSS `package.json` `dependencies` (not by being npm workspaces), with placeholder SVGs, `dist`, themes, and `src/utils/*.js` runtime modules asar-**unpacked** via `asarUnpack` in `electron/builder.config.mjs`. The full set of bundling rules and path-resolution patterns (`config.js` fs-read-from-asar, `UNPACKED_ROOT`, `THEMES_ROOT`) is documented in [core-packages.md](core-packages.md) — refer there rather than duplicating it.

Quick reference for what `electron/builder.config.mjs` unpacks (`asarUnpack`):

- `themes/**` (excluding `themes/widgetizer/**`) and `dist/**`
- `node_modules/@widgetizer/core/src/assets/**` — placeholder SVGs served via `res.sendFile`
- `src/utils/*.js` — `previewRuntime.js` + its sibling `standalonePreviewTarget.js`, served raw via `express.static`
- native modules: `sharp`, `@img/sharp-*`, `better-sqlite3`

## See Also

- [CLAUDE.md](../CLAUDE.md) — release procedure and user-facing auto-update flow
- [core-packages.md](core-packages.md) — workspace packages, adapters/DI/Scope, and full asar bundling rules
- [core-architecture.md](core-architecture.md) — overall orientation and the admin-shell vs site-workspace split

# Electron App

Widgetizer runs as a native desktop app using Electron. The app embeds the React frontend in a `BrowserWindow` and runs the Express server internally.

## Development

Run the API server, Vite dev server, and Electron together:

```bash
npm run electron:dev
```

- API server: `http://localhost:3001`
- Vite dev server: `http://localhost:5173` (or `VITE_DEV_SERVER_URL` when provided)
- Electron loads the Vite URL

Use this when testing Electron-specific features (menus, native dialogs). For regular development, use `npm run dev:all` and open `http://localhost:3000` in your browser.

## Production Build

### Prerequisite: `.env.production`

The production frontend bundle is same-origin: it talks to whichever Express origin served it (the bundled server on a dynamic port in Electron, the deployed Express host on the web app). For that to work, `VITE_API_URL` must be empty in the production build, which is what `.env.production` exists to enforce — Vite loads it with priority over `.env` when `vite build` runs.

```
# .env.production
VITE_API_URL=
```

If this file is missing, the bundle bakes in `VITE_API_URL` from `.env` (typically `http://localhost:3001`) and every `/api/*` call in the packaged app fails because the bundled server runs on a dynamic port. The build scripts prompt for confirmation if `.env.production` is missing.

Build the React frontend and package the Electron app:

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

### Windows note

If you build the Windows app on macOS, native modules like `sharp` may be missing. The `electron:build:win` script installs Windows optional dependencies before packaging. For best results, run Windows builds on Windows.

### Current Packaging Status

- Windows builds run successfully on Windows.
- Windows signing is working with `electron-builder` 26.
- Windows target is `nsis` (installer), required for auto-updates.
- macOS targets are `dmg` (first-time install) + `zip` (for seamless auto-updates via electron-updater).
- macOS builds are signed and notarized with a Developer ID Application certificate.

### macOS Output

```
dist-electron/
├── mac-arm64/
│   └── Widgetizer.app               # Apple Silicon (M1/M2/M3/M4)
├── mac/
│   └── Widgetizer.app               # Intel Macs
├── Widgetizer-x.x.x-arm64.dmg      # Apple Silicon distribution
└── Widgetizer-x.x.x.dmg            # Intel distribution
```

### Windows Output

```
dist-electron/
├── win-unpacked/
│   └── Widgetizer.exe
└── Widgetizer-x.x.x-win.zip
```

## Windows Signing Status

Windows signing is configured in `package.json` under `build.win.signtoolOptions`.

Working configuration details:

- `signingHashAlgorithms: ["sha256"]`
- `certificateSubjectName` set to the current Certum/SimplySign certificate subject
- `rfc3161TimeStampServer` set to `http://time.certum.pl`

Important `electron-builder` 26 note:

- Windows signing options such as `certificateSubjectName`, `signingHashAlgorithms`, and `rfc3161TimeStampServer` must be nested under `win.signtoolOptions`.
- Putting those keys directly under `build.win` causes schema validation errors and the build fails before signing starts.

How signing was verified:

- `electron-builder` successfully invoked `signtool.exe`
- `signtool verify /pa /v` passed for `dist-electron/win-unpacked/Widgetizer.exe`
- Windows file properties showed a valid digital signature and timestamp

SimplySign behavior note:

- Certum SimplySign typically authenticates a session first rather than prompting on every individual signing operation.
- If the SimplySign Desktop session is active and the certificate is available in the Current User certificate store, signing can complete without an extra PIN dialog during the build.

## Runtime Paths

The Electron app stores user data separately from the application bundle:

| Path      | Location                                                |
| --------- | ------------------------------------------------------- |
| User data | `~/Library/Application Support/widgetizer/data` (macOS) |
| Logs      | `~/Library/Application Support/widgetizer/logs`         |
| Themes    | Bundled inside the app                                  |

Access these from the app menu: **File → Open Data Folder** or **File → Open Logs Folder**.

## Preview Window Behavior

- The editor preview is opened through a dedicated Electron `BrowserWindow` rather than replacing the editor view.
- Repeated preview opens reuse the same preview window if it already exists.
- The preview window is maximized and focused when opened or reused.
- In web builds, the editor uses a named browser tab for the same reuse behavior.

## App Icon

To add a custom icon:

1. Create a 1024x1024 PNG with ~100px transparent padding on all sides (actual artwork ~800x800 centered)
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

3. Place `icon.icns` in `electron/resources/` folder
4. Rebuild the app

## Distribution

### Sharing with others

| Recipient's Mac             | File to share                    |
| --------------------------- | -------------------------------- |
| Apple Silicon (M1/M2/M3/M4) | `Widgetizer-x.x.x-arm64.dmg`    |
| Intel Mac                   | `Widgetizer-x.x.x.dmg`          |
| Windows                     | `Widgetizer-x.x.x-win.zip`      |

### First-run instructions for recipients (macOS)

macOS builds are signed and notarized, so Gatekeeper should not block them.

1. Open the `.dmg`
2. Drag `Widgetizer.app` to Applications
3. Double-click to run

If Gatekeeper still warns (e.g. on an older OS or an unsigned dev build), right-click → Open → Open, or run:

```bash
xattr -cr /path/to/Widgetizer.app
```

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

**Build command:**

```bash
export $(cat .env.mac | xargs) && npm run electron:build:mac
```

**How it works:**

1. `electron-builder` packages the app with `hardenedRuntime: true`
2. The `afterSign` hook runs `electron/notarize.cjs`
3. `@electron/notarize` submits the `.app` to Apple's notarization service via `notarytool`
4. Notarization typically takes 5–30 minutes
5. `electron-builder` then staples the notarization ticket to the `.dmg`

**Active `package.json` build config:**

```json
"mac": {
  "target": [{ "target": "dmg", "arch": ["arm64", "x64"] }],
  "category": "public.app-category.productivity",
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "electron/entitlements.mac.plist",
  "entitlementsInherit": "electron/entitlements.mac.plist"
},
"afterSign": "electron/notarize.cjs"
```

**Entitlements (`electron/entitlements.mac.plist`):**

- `com.apple.security.cs.allow-jit` — required for V8 JIT
- `com.apple.security.cs.allow-unsigned-executable-memory` — required for Node.js
- `com.apple.security.cs.disable-library-validation` — required for native modules (sharp, better-sqlite3)

**`electron/notarize.cjs`** — CJS module required by `electron-builder`'s `afterSign` hook. Uses `@electron/notarize` (`^3.1.1`) with `notarytool`. Skips automatically on non-darwin platforms.

### Windows

Windows app signing is now working for the packaged executable.

What is done:

- Authenticode signing works with the current Certum/SimplySign certificate
- the executable verifies successfully after signing
- RFC3161 timestamping is included

What is left for Windows:

- optionally clean up the `electron:build:win` script to avoid the npm `--platform` / `--arch` warnings

## Auto-Updates

In-app auto-updates are implemented via `electron-updater` with GitHub Releases as the provider.

**How it works:**

1. On startup (10s delay), the main process checks GitHub Releases for a newer version
2. If found, an IPC message is sent to the renderer via `window.electronUpdater`
3. The `UpdateBanner` component shows a notification bar: "Version X.Y.Z is available" with an Update button
4. User clicks Update → progress bar shown → "Restart Now" button appears when done
5. `autoUpdater.autoDownload = false` (user-initiated), `autoInstallOnAppQuit = true`

**Build targets for auto-update:**

- macOS: DMG (for first-time installs) + ZIP (for seamless auto-updates via electron-updater)
- Windows: NSIS installer (required for auto-update support)

**Releasing a new version:**

1. Bump `version` in `package.json`, commit, tag, and push
2. Build Mac artifacts on Mac:
   ```bash
   export $(cat .env.mac | xargs) && npm run electron:build:mac
   ```
3. Build Windows artifacts on Windows:
   ```bash
   npm run electron:build:win
   ```
4. Create a GitHub release manually at `github.com/tsiger/widgetizer/releases`
5. Attach **all** of these files from `dist-electron/`:
   - Mac: `.dmg`, `.dmg.blockmap`, `.zip`, `.zip.blockmap`, `latest-mac.yml`
   - Windows: `.exe`, `.exe.blockmap`, `latest.yml`

The `latest-mac.yml` and `latest.yml` files are critical — electron-updater reads them to detect new versions. The `.blockmap` files enable delta updates (only changed blocks are downloaded). The public repo allows anonymous update checks at runtime.

### Local Windows Update Test

For local Windows testing, the app can override the normal GitHub feed by launching the installed app with `--updater-url=http://127.0.0.1:5500`.

Use this flow:

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
5. Wait ~10 seconds for the update check, then click `Update` and `Restart Now`.

Notes:

- Keep the HTTP server running while the update downloads.
- The served folder must contain `latest.yml`, the Windows `.exe`, and the matching `.exe.blockmap`.
- Windows artifact naming is forced via `electron/builder.config.mjs`, so `latest.yml` and the generated files stay aligned.
- If differential download fails, `electron-updater` falls back to a full installer download automatically.

**Implementation files:**

- `electron/main.js` — `setupAutoUpdater()` function, IPC handlers
- `electron/preload.js` — `contextBridge` exposing `window.electronUpdater` API
- `src/components/layout/UpdateBanner.jsx` — Notification bar UI
- `src/components/layout/Layout.jsx` — Mounts `UpdateBanner`

## Error Handling

- **React ErrorBoundary** (`src/components/ui/ErrorBoundary.jsx`) — wraps the entire app in `App.jsx`. Catches render errors and shows a recovery screen with Dashboard and Reload buttons. Shows stack trace in dev mode.
- **Unresponsive window** — dialog offers "Wait" or "Reload" when the renderer hangs.
- **Renderer crash** (`render-process-gone`) — shows the error page with a Retry button.
- **Blocked window close** (`will-prevent-unload`) — forces close when a stuck `beforeunload` handler tries to block it.
- **Uncaught exceptions** — logs the error and shows a dialog, but skips the dialog during app quit to prevent blocking shutdown.

## Packaging Workspace Packages into the asar

After the workspaces refactor (see [Packages & Adapter Architecture](core-packages.md)), the backend lives in npm workspace packages. electron-builder bundles them with a few non-obvious rules:

- **`dependencies`, not workspaces, drive bundling.** `@widgetizer/core`, `@widgetizer/builder-server`, `@widgetizer/render-engine`, and `@widgetizer/adapters-local` are bundled into the asar **only because they are listed in the OSS `package.json` `dependencies`**. Being npm workspaces is *not* enough for electron-builder's dependency collector.
- **`@widgetizer/editor-ui` is deliberately excluded.** It is frontend-only; Vite compiles it into `dist/`, so it must not be collected as a runtime dependency.
- **Three path-resolution patterns** in `packages/builder-server/src/config.js`:
  1. **fs-read-from-asar** via `require.resolve("@widgetizer/core/...")` — used for locales and core widgets/snippets. Works because Electron patches `fs` to read inside the asar.
  2. **asar-UNPACKED + `UNPACKED_ROOT`** — statically-served files that need real disk: `dist`, core `assets` placeholder SVGs, and `previewRuntime.js` are unpacked and resolved off `UNPACKED_ROOT`.
  3. **seed dirs off `THEMES_ROOT`** — bundled themes.
- **`@widgetizer/core/src/assets` are asar-unpacked** via `electron/builder.config.mjs` `asarUnpack` (placeholder SVGs are served from disk, not the asar).
- **sharp arch fix.** `prepare-mac-sharp.cjs` had a bug where its arch-prune step pruned the non-last arch, breaking Mac builds. It was fixed so sharp installs for both `arm64` and `x64`.

## Technical Notes

- **asar enabled**: The app is packaged into `app.asar`, with native modules and themes unpacked in `app.asar.unpacked` for compatibility.
- **Server process**: Electron spawns the Express server using `utilityProcess` (Electron's lightweight child process API designed for CPU-intensive work without access to the renderer).
- **Server port resolution**: The bundled server is spawned with `PORT=0`, asks the OS for an ephemeral port at `app.listen` time, then posts `{ type: "server-ready", port }` back to the Electron main process over the `utilityProcess` IPC channel. Main reads the actual port from that message, builds the renderer URL from it, and uses it to load the window. This eliminates the TOCTOU race that a probe-then-bind approach has and means two packaged apps (or a packaged app alongside another local server) never collide. Set the `PORT` env var to force a specific port; if that port is taken, the server exits non-zero with `EADDRINUSE` instead of hanging.
- **Startup flow**: A loading screen is shown immediately. The UI swaps in once the server-ready IPC message arrives (or the 30s timeout fires, surfacing a Startup Error screen with a Retry button).

# Electron App

Widgetizer runs as a native desktop app using Electron. The app embeds the React frontend in a `BrowserWindow` and runs the Express server internally.

## Development

Run the API server, Vite dev server, and Electron together:

```bash
npm run electron:dev
```

- API server: `http://localhost:3001`
- Vite dev server: `http://localhost:3000`
- Electron loads the Vite URL

Use this when testing Electron-specific features (menus, native dialogs). For regular development, use `npm run dev:all` and open `http://localhost:3000` in your browser.

## Production Build

Build the React frontend and package the Electron app:

```bash
# Both platforms
npm run electron:build

# macOS only
npm run electron:build:mac

# Windows only
npm run electron:build:win
```

Output directory: `dist-electron/`

### Windows note

If you build the Windows app on macOS, native modules like `sharp` may be missing. The `electron:build:win` script installs Windows optional dependencies before packaging. For best results, run Windows builds on Windows.

### Current Packaging Status

- Windows builds run successfully on Windows.
- Windows signing is now working with `electron-builder` 26.
- The current Windows target is still `zip`, not an installer.
- macOS builds are still unsigned (`identity: null`).

### macOS Output

```
dist-electron/
├── mac-arm64/
│   └── Widgetizer.app          # Apple Silicon (M1/M2/M3/M4)
├── mac/
│   └── Widgetizer.app          # Intel Macs
├── Widgetizer-x.x.x-arm64-mac.zip   # Apple Silicon distribution
└── Widgetizer-x.x.x-mac.zip         # Intel distribution
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
| Apple Silicon (M1/M2/M3/M4) | `Widgetizer-x.x.x-arm64-mac.zip` |
| Intel Mac                   | `Widgetizer-x.x.x-mac.zip`       |
| Windows                     | `Widgetizer-x.x.x-win.zip`       |

### First-run instructions for recipients

1. Unzip the file
2. Move `Widgetizer.app` to Applications (optional)
3. Double-click to run
4. If Gatekeeper warning appears: right-click → Open → Open

Or run in Terminal:

```bash
xattr -cr /path/to/Widgetizer.app
```

## Code Signing

### macOS

We have not implemented macOS signing or notarization yet. Leave this for later.

Current macOS status:

- `identity: null` in the Electron build config
- unsigned macOS builds are acceptable for local/internal testing
- Gatekeeper warnings are still expected for public distribution

When we come back to macOS, we will need:

- Apple Developer Program membership
- Developer ID Application certificate
- notarization
- hardened runtime and entitlements review

Expected config shape later:

```json
"mac": {
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "electron/resources/entitlements.mac.plist",
  "entitlementsInherit": "electron/resources/entitlements.mac.plist",
  "notarize": true
}
```

### Windows

Windows app signing is now working for the packaged executable.

What is done:

- Authenticode signing works with the current Certum/SimplySign certificate
- the executable verifies successfully after signing
- RFC3161 timestamping is included

What is left for Windows:

- switch the build target from `zip` to `nsis`
- decide how releases will be published on GitHub Releases
- add in-app update support with `electron-updater`
- decide how users should be notified about available updates
- optionally clean up the `electron:build:win` script to avoid the npm `--platform` / `--arch` warnings

## Technical Notes

- **asar enabled**: The app is packaged into `app.asar`, with native modules and themes unpacked in `app.asar.unpacked` for compatibility.
- **Server process**: Electron spawns the Express server using `utilityProcess` (Electron's lightweight child process API designed for CPU-intensive work without access to the renderer).
- **Startup flow**: A loading screen is shown immediately; the UI swaps in once `/health` is ready.

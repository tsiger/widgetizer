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

Build the React frontend and package a portable Electron app:

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

## Code Signing (Optional for MVP)

### macOS

Unsigned apps trigger Gatekeeper warnings. For MVP/internal testing, this is acceptable with the workaround above.

For public distribution, you need:

- Apple Developer Program ($99/year)
- Developer ID Application certificate
- Notarization

Update `package.json` build config:

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

Unsigned builds show SmartScreen warnings ("Unknown publisher"). For MVP, this is acceptable.

For public distribution, use Authenticode code signing certificate.

## Technical Notes

- **asar enabled**: The app is packaged into `app.asar`, with native modules and themes unpacked in `app.asar.unpacked` for compatibility.
- **Server process**: Electron spawns the Express server using `utilityProcess` (Electron's lightweight child process API designed for CPU-intensive work without access to the renderer).
- **Startup flow**: A loading screen is shown immediately; the UI swaps in once `/health` is ready.

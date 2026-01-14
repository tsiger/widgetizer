# Building Widgetizer for macOS

Complete step-by-step guide for creating the portable macOS build.

## Prerequisites

- **Node.js** v20.19.5+ (v22.13.0 recommended)
- **Xcode Command Line Tools** (for compiling Swift app)
  ```bash
  xcode-select --install
  ```

## Step 1: Build the Application Structure

### From the root `widgetizer/` directory:

```bash
npm run build:macos
```

This will:

- Build the React frontend (`npm run build`)
- Run the build script (`desktop-apps/scripts/build-macos.js`)
- Create output at: `desktop-apps/builds/macos/widgetizer-v<version>/`

> [!NOTE] The version number (`<version>`) is automatically pulled from `package.json`.

**Output structure:**

```
widgetizer-v<version>/
├── bin/node/          # (empty - Node.js goes here)
├── data/              # (empty - user projects)
├── dist/              # Frontend build
├── node_modules/      # (empty - will install)
├── server/            # Backend code
├── src/               # Backend dependencies (core, utils, config)
├── themes/            # Theme files
├── .env.example       # Environment template
├── package.json       # Production package.json
└── package-lock.json  # Lock file
```

## Step 2: Add Portable Node.js

### Download Node.js v22.13.0 for macOS:

**For Apple Silicon (M1/M2/M3):**

```
https://nodejs.org/dist/v22.13.0/node-v22.13.0-darwin-arm64.tar.gz
```

**For Intel Macs:**

```
https://nodejs.org/dist/v22.13.0/node-v22.13.0-darwin-x64.tar.gz
```

### Extract and copy to build:

```bash
# Extract the archive
tar -xzf node-v22.13.0-darwin-arm64.tar.gz

# Copy just the node binary
cp node-v22.13.0-darwin-arm64/bin/node desktop-apps/builds/macos/widgetizer-v<version>/bin/node/
```

**Result:**

```
bin/node/
└── node           # Main binary (~100MB)
```

## Step 3: Install Production Dependencies

### Navigate to build folder:

```bash
cd desktop-apps/builds/macos/widgetizer-v<version>
```

### Install dependencies:

```bash
./bin/node/node $(which npm) ci --omit=dev
```

Or if you have npm in the extracted Node folder:

```bash
./bin/node/node ../node-v22.13.0-darwin-arm64/bin/npm ci --omit=dev
```

This installs ~274 production packages (~40MB).

## Step 4: Build the Menu Bar App

### Navigate to tray app source:

```bash
cd desktop-apps/tray-app/macos
```

### Make build script executable and run:

```bash
chmod +x build.sh
./build.sh
```

**Output:** `build/WidgetizerMenu.app` (~1MB)

### Copy to build folder:

```bash
cp -r build/WidgetizerMenu.app ../../builds/macos/widgetizer-v<version>/
```

## Step 5: Add App Icon (Optional)

### Create icon files:

1. **Menu bar icon** (`icon.png`): 18x18 or 36x36 (for retina) PNG, black or template-style
2. **App icon** (`icon.icns`): Full macOS icon set

Place these in `desktop-apps/tray-app/macos/` before building.

### To create .icns from PNG:

```bash
# Create iconset folder
mkdir icon.iconset

# Create required sizes (from a 1024x1024 source)
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

# Convert to .icns
iconutil -c icns icon.iconset
```

## Step 6: Create Production Config

### Create `.env` file:

```bash
cd desktop-apps/builds/macos/widgetizer-v<version>
echo "NODE_ENV=production" > .env
echo "PORT=3001" >> .env
```

---

## Step 7: Test the Build

### Run the menu bar app:

```bash
open WidgetizerMenu.app
```

**Expected behavior:**

1. Menu bar icon appears (top-right of screen)
2. Notification: "Starting server, please wait..."
3. After ~3-5 seconds: "Server is ready!"
4. Browser opens automatically at `http://localhost:3001`
5. Widgetizer loads successfully

### Test menu options:

- Click the menu bar icon
- "Open Widgetizer" → Opens browser
- "Restart Server" → Restarts Node.js
- "Quit" → Exits app and stops server

### Test portability:

1. **Copy** the entire `widgetizer-v<version>/` folder to a different location
2. **Run** `WidgetizerMenu.app` from new location
3. Should work identically (all paths are relative)

## Step 8: Package for Distribution

### Create ZIP file:

```bash
# From desktop-apps/builds/macos/
cd desktop-apps/builds/macos
zip -r widgetizer-v<version>-macos.zip widgetizer-v<version>
```

### Or create DMG (optional):

```bash
hdiutil create -volname "Widgetizer" -srcfolder widgetizer-v<version> -ov -format UDZO widgetizer-v<version>-macos.dmg
```

**Final package size:** ~120-150MB

## Final Build Contents

```
widgetizer-v<version>/
├── WidgetizerMenu.app    # ~1 MB - Menu bar launcher
│   └── Contents/
│       ├── MacOS/WidgetizerMenu
│       ├── Resources/
│       └── Info.plist
├── bin/node/             # ~100 MB - Portable Node.js
│   └── node
├── node_modules/         # ~40 MB - Production dependencies
├── server/               # ~2 MB - Backend code
├── dist/                 # ~5 MB - Frontend build
├── src/                  # ~1 MB - Backend deps (core, utils, config)
│   ├── core/
│   ├── utils/
│   └── config/
├── themes/               # ~5 MB - Theme files
├── data/                 # Empty - User projects
│   └── projects/
├── .env                  # Config file
├── .env.example          # Template
├── package.json          # Metadata
└── package-lock.json     # Lock file
```

**Total:** ~120-150MB

## Troubleshooting

### "Swift compiler not found"

→ Install Xcode Command Line Tools: `xcode-select --install`

### "Server not starting"

→ Check `.env` file exists with `NODE_ENV=production` → Check permissions: `chmod +x bin/node/node`

### Menu bar icon not showing

→ Make sure `icon.png` was in `desktop-apps/tray-app/macos/` during build → Rebuild with: `./build.sh`

### "App is damaged and can't be opened"

→ This is macOS Gatekeeper. Run:

```bash
xattr -cr WidgetizerMenu.app
```

### App won't run on another Mac

→ Make sure `node_modules/` folder is included → Make sure `.env` file exists → For Intel Macs, use the x64 Node.js binary

## Quick Rebuild Checklist

- [ ] `npm run build:macos`
- [ ] Download and extract Node.js to `bin/node/`
- [ ] Run `./bin/node/node $(which npm) ci --omit=dev`
- [ ] Build menu bar app: `cd desktop-apps/tray-app/macos && ./build.sh`
- [ ] Copy `WidgetizerMenu.app` to build folder
- [ ] Create `.env` file
- [ ] Test locally
- [ ] Test portability (copy to different location)
- [ ] Create ZIP or DMG

## User Instructions

Include this `README.txt` in the ZIP:

```
WIDGETIZER - Portable Website Builder

INSTALLATION:
1. Unzip this folder anywhere (Desktop, Documents, USB drive, etc.)
2. Double-click WidgetizerMenu.app
3. If you see "App is damaged" error, right-click → Open, then click Open
4. Wait for the "Server is ready!" notification
5. Browser will open automatically

USAGE:
- The app runs in your menu bar (top-right corner of screen)
- Click the menu bar icon for options:
  * Open Widgetizer - Opens the app in browser
  * Restart Server - Restarts the backend
  * Quit - Closes the app completely

NO INSTALLATION REQUIRED:
- No admin rights needed
- No Node.js installation required
- Works offline
- Fully portable

NOTES:
- First startup may take 5-10 seconds
- Data is stored in the 'data/projects/' folder
- To uninstall, just delete this folder

For support: [your-email]
```

## Universal Binary (Optional)

To support both Apple Silicon and Intel Macs with the same app, you would need to:

1. Build the Swift app as a universal binary (the build script attempts this)
2. Include both Node.js binaries and detect which to use at runtime

For simplicity, it's recommended to create separate builds:

- `widgetizer-v<version>-macos-arm64.zip` (Apple Silicon)
- `widgetizer-v<version>-macos-x64.zip` (Intel)

## Notes

- **Version:** Update version number in filenames when releasing new versions
- **Icon:** Keep icon files in `tray-app/macos/` for future rebuilds
- **Node.js:** Check for newer Node.js versions periodically
- **Dependencies:** Run `npm audit` before building for security updates

**Build Date:** January 14, 2026 **Node.js Version:** 22.13.0 (Minimum: 20.19.5) **Widgetizer Version:** (Dynamic from `package.json`) **Minimum macOS:** 11.0 (Big Sur)

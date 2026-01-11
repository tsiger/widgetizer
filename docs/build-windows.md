# Building Widgetizer for Windows

Complete step-by-step guide for creating the portable Windows build.

## Prerequisites

- **Node.js** v20.19.5+ (v22.13.0 recommended)
- **Visual Studio Build Tools** or **.NET SDK** (for compiling C# tray app)
- **Developer Command Prompt** (comes with Visual Studio)

## Step 1: Build the Application Structure

### From the root `widgetizer/` directory:

```bash
npm run build:windows
```

This will:

- Build the React frontend (`npm run build`)
- Run the build script (`desktop-apps/scripts/build-windows.js`)
- Create output at: `desktop-apps/builds/windows/widgetizer-v<version>/`

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

### Download Node.js v22.13.0 for Windows:

```
https://nodejs.org/dist/v22.13.0/node-v22.13.0-win-x64.zip
```

### Extract and copy to build:

1. **Extract** the downloaded ZIP
2. **Copy contents** to: `desktop-apps/builds/windows/widgetizer-v<version>/bin/node/`

**Keep these files (at least for now):**

```
bin/node/
├── node.exe           # Main binary
├── npm.cmd            # Required for next step
├── npm/               # Required for next step
└── ...
```

## Step 3: Install Production Dependencies & Cleanup

### Navigate to build folder:

```powershell
cd desktop-apps\builds\windows\widgetizer-v<version>
```

### Install dependencies:

```powershell
bin\node\npm.cmd ci --omit=dev
```

This installs ~274 production packages (~40MB).

### Cleanup Node.js (Optional, to save space):

After installing dependencies, you can delete these (not needed to run the app):

```
bin/node/npm/          # npm folder
npm.cmd, npx, npx.cmd  # npm tools
```

## Step 4: Build the Tray App

### Navigate to tray app source:

```cmd
cd desktop-apps\tray-app\windows
```

### Option A: Run Build Batch File (Recommended)

Simply run:

```cmd
build.bat
```

### Option B: Manual Compile (Developer Command Prompt)

(Required because `csc` compiler is not in regular PATH)

```cmd
csc /target:winexe /win32icon:icon.ico /out:WidgetizerTray.exe WidgetizerTray.cs
```

**Output:** `WidgetizerTray.exe` (~34KB with embedded icon)

### Copy to build:

```cmd
copy WidgetizerTray.exe ..\..\builds\windows\widgetizer-v<version>\
```

## Step 5: Create Production Config

### Navigate to build folder:

```powershell
cd ..\..\builds\windows\widgetizer-v<version>
```

### Create `.env` file:

```powershell
echo NODE_ENV=production > .env
echo PORT=3001 >> .env
```

---

## Step 6: Test the Build

### Run the tray app:

```powershell
.\WidgetizerTray.exe
```

**Expected behavior:**

1. Tray icon appears with custom logo
2. Balloon notification: "Starting server, please wait..."
3. After ~3-5 seconds: "Server is ready! Opening browser..."
4. Browser opens automatically at `http://localhost:3001`
5. Widgetizer loads successfully

### Test portability:

1. **Copy** the entire `widgetizer-v<version>/` folder to a different location
2. **Run** `WidgetizerTray.exe` from new location
3. Should work identically (all paths are relative)

## Step 7: Package for Distribution

### Create ZIP file:

```powershell
# From desktop-apps/builds/windows/
Compress-Archive -Path widgetizer-v<version> -DestinationPath widgetizer-v<version>-windows.zip
```

**Final package size:** ~120-150MB

## Final Build Contents

```
widgetizer-v<version>/
├── WidgetizerTray.exe    # 34 KB - Main launcher
├── bin/node/             # ~45 MB - Portable Node.js
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

### "csc: command not found"

→ Use **Developer Command Prompt for VS** (not regular PowerShell) or run `build.bat` if VS is in path.

### "Server not starting"

→ Check `.env` file exists with `NODE_ENV=production`

### Tray icon not showing custom logo

→ Make sure `icon.ico` was in the same folder during compile  
→ Recompile with `/win32icon:icon.ico` flag

### App won't run on another PC

→ Make sure `node_modules/` folder is included  
→ Make sure `.env` file exists

## Quick Rebuild Checklist

- [ ] `npm run build:windows`
- [ ] Extract Node.js to `bin/node/`
- [ ] Run `bin\node\npm.cmd ci --omit=dev`
- [ ] Delete `bin/node/npm/` and npm tools (optional)
- [ ] Compile `WidgetizerTray.exe` (run `build.bat`)
- [ ] Copy `.exe` to build folder
- [ ] Create `.env` file
- [ ] Test locally
- [ ] Test portability (copy to different location)
- [ ] Create ZIP

## User Instructions

Include this `README.txt` in the ZIP:

```
WIDGETIZER - Portable Website Builder

INSTALLATION:
1. Unzip this folder anywhere (Desktop, Documents, USB drive, etc.)
2. Double-click WidgetizerTray.exe
3. Wait for the "Server is ready!" notification
4. Browser will open automatically

USAGE:
- The app runs in your system tray (bottom-right corner)
- Right-click the tray icon for options:
  * Open Widgetizer - Opens the app in browser
  * Restart Server - Restarts the backend
  * Exit - Closes the app completely

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

## Notes

- **Version:** Update version number in filenames when releasing new versions
- **Icon:** Keep `icon.ico` in `tray-app/windows/` for future rebuilds
- **Node.js:** Check for newer Node.js versions periodically
- **Dependencies:** Run `npm audit` before building for security updates

**Build Date:** January 11, 2026  
**Node.js Version:** 22.13.0 (Minimum: 20.19.5)  
**Widgetizer Version:** (Dynamic from `package.json`)

```
## 📁 Save as:
desktop-apps/BUILD-WINDOWS.md
```

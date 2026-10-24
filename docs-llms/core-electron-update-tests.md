# Electron Auto-Update And Theme Update Test

This is a playbook for testing real Windows and macOS Electron auto-updates and bundled theme-update deltas between any two releases.

Use it for `0.9.8 -> 0.9.9`, `0.9.9 -> 0.9.10`, or future version pairs. The important rule is that the base app must be built from the real previous release tag, not by editing or emulating the app version.

Do not ask an agent to run these commands unless you explicitly want it to execute the test.

## Rehearsal Recipes (Start Here)

These are the short, proven paths. The long sections further down are the original detailed playbook and troubleshooting reference.

Rules that apply to both platforms:

- **Use a preset with content, not Blank, for the test projects** — see [Test Projects From A Preset](#test-projects-from-a-preset). A preset's fonts and colours live in the settings' defaults, which every theme update rebuilds, and its pages, collections and images are what a real site holds; a Blank project has neither, so it cannot show whether the update kept them.
- **Back up the real user data, don't just wipe it.** The developer's own Widgetizer projects live in the user-data folder. Copy it aside before the test and restore it afterwards.
- **Both sides must be signed the same way.** A signed app refuses an unsigned update. On Windows, a signed build stores the publisher name in `resources/app-update.yml` and the updater checks the new installer against it. So either test unsigned → unsigned (both built from source), or signed → signed.
- **Do not regenerate the theme delta** when `themes/arch/updates/<targetVersion>/` is already committed. `theme-update-delta.js --force` overwrites hand-made fixes in that folder. Build the target from its branch as it is.
- **Build each version in its own worktree** under a separate test folder, so the developer's normal checkout is untouched. Remove the worktrees afterwards with `git worktree remove --force <path>`.
- **The updater override** is `ELECTRON_UPDATER_URL` (or `--updater-url=`). It exists from `0.9.8` onwards and only applies when the app is started with it. An app started from a shortcut, the Dock or Finder checks GitHub instead.
- **An expected harmless error:** `Cannot download differentially, fallback to full download ... blockmap ... 404`. The local feed doesn't hold the old version's blockmap, so it downloads the full file. On GitHub the old release has its blockmap, so real users get the smaller download.

### Windows (verified 2026-10-19, 0.9.9 → 0.9.10)

Unsigned → unsigned. The official 0.9.9 release is signed, so it would refuse an unsigned 0.9.10. Build both from source.

```powershell
$repo = "C:\Users\g_tsi\Projects\widgetizer-saas\widgetizer"
$test = "C:\Users\g_tsi\Projects\widgetizer-upgrade-test"
cd $repo
git fetch origin

# 1. Back up the real data, then wipe the install (Widgetizer must be closed)
robocopy "$env:APPDATA\widgetizer" "$test\backup-appdata-widgetizer" /E /COPY:DAT
foreach ($p in "$env:LOCALAPPDATA\Programs\widgetizer","$env:APPDATA\widgetizer","$env:LOCALAPPDATA\widgetizer","$env:LOCALAPPDATA\widgetizer-updater") {
  if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Recurse -Force }
}

# 2. Build the base and target, each in a worktree (one at a time; each takes a few minutes)
foreach ($v in @(@{ dir = "widgetizer-0.9.9"; ref = "0.9.9" }, @{ dir = "widgetizer-0.9.10"; ref = "0.9.10" })) {
  git worktree add --detach "$test\$($v.dir)" $v.ref
  Push-Location "$test\$($v.dir)"
  Set-Content -LiteralPath .env -Value "VITE_API_URL=http://localhost:3001"
  Set-Content -LiteralPath .env.production -Value "VITE_API_URL="
  npm ci
  npm run electron:build:win:unsigned
  Pop-Location
}

# 3. Serve the target as the update feed (leave running)
cd "$test\widgetizer-0.9.10\dist-electron"
npx --yes http-server . -p 8384 -a 127.0.0.1 -c-1
```

For the target, use the release branch (`0.9.10`) after `git fetch`, and check that it matches `origin/0.9.10`.

The human then:

1. Installs `$test\widgetizer-0.9.9\dist-electron\Widgetizer-Setup-0.9.9.exe`.
2. Creates the two test projects from the **Arch** preset as described in [Test Projects From A Preset](#test-projects-from-a-preset), closes Widgetizer completely (check Task Manager), and takes the "before" snapshot from that section.
3. Opens a new PowerShell window from the Start menu and runs:
   ```powershell
   $env:ELECTRON_UPDATER_URL = "http://127.0.0.1:8384"
   & "$env:LOCALAPPDATA\Programs\widgetizer\Widgetizer.exe"
   ```
4. Clicks Update, then Restart Now, and checks the version in About.
5. Runs the "after the app update" check from [Test Projects From A Preset](#test-projects-from-a-preset). Then updates Arch on the Themes screen; only the opted-in project offers the theme update. Applies it, then runs the "after the theme update" checks and looks at the project's preview.

Restore afterwards (Widgetizer closed): stop the feed, delete the four install/data folders again, copy the backup back with `robocopy "$test\backup-appdata-widgetizer" "$env:APPDATA\widgetizer" /E /COPY:DAT`, and reinstall the official signed release (`gh release download <fromVersion> --repo tsiger/widgetizer --pattern "Widgetizer-Setup-*.exe"`, then run it with `/S`). Keep the backup until the developer confirms their projects look right.

### Mac (verified 2026-10-19, Apple silicon, 0.9.9 → 0.9.10)

The installed signed 0.9.9 app detected the local feed, downloaded the signed and notarized arm64 ZIP, and installed/relaunched as 0.9.10 through **Update → Restart Now**. The installed signature verified, SQLite integrity passed, and all 442 existing project files were unchanged by the app upgrade. Arch then updated to 0.9.10; the opted-in project accepted its theme update, while the opted-out project remained on 0.9.8 with its files unchanged. These were existing blank-preset test projects, so this run does not establish populated-site rendering/export coverage. The original app and data were restored afterward. Intel and differential downloads were not tested; this run used a full download.

Notarization initially returned HTTP 403 about a missing or expired agreement. The account showed the updated agreement accepted, but retries still failed. After replacing the app-specific password in `.env.mac`, the next submission succeeded. This sequence does not establish whether credential replacement or agreement propagation resolved the error. Keep credentials out of logs and chat; no signing certificate replacement was needed.

macOS only installs updates that are code-signed by the same Developer ID as the running app. **An unsigned → unsigned test does not work on Mac.** Use the official signed release as the base and a signed (and notarized) build of the target.

Data folder: `~/Library/Application Support/widgetizer`. Updater caches: `~/Library/Caches/widgetizer-updater` and `~/Library/Caches/com.widgetizer.app.ShipIt`.

```bash
repo=~/Projects/widgetizer-saas/widgetizer   # adjust to the Mac checkout
test=~/widgetizer-upgrade-test
cd "$repo" && git fetch origin

# 1. Back up the real data, then remove the app and data (Widgetizer must be quit: Cmd+Q)
mkdir -p "$test"
ditto ~/Library/Application\ Support/widgetizer "$test/backup-appsupport-widgetizer"
rm -rf /Applications/Widgetizer.app ~/Library/Application\ Support/widgetizer \
  ~/Library/Caches/widgetizer-updater ~/Library/Caches/com.widgetizer.app.ShipIt

# 2. Download the official signed base release (pick the DMG for this Mac: -arm64 for Apple silicon)
gh release download 0.9.9 --repo tsiger/widgetizer --pattern "Widgetizer-0.9.9-arm64.dmg" --dir "$test"

# 3. Build the signed + notarized target in a worktree
git worktree add --detach "$test/widgetizer-0.9.10" 0.9.10
cp "$repo/.env.mac" "$test/widgetizer-0.9.10/"
cd "$test/widgetizer-0.9.10"
printf 'VITE_API_URL=http://localhost:3001\n' > .env
printf 'VITE_API_URL=\n' > .env.production
npm ci
export $(cat .env.mac | xargs) && npm run electron:build:mac

# 4. Serve the target as the update feed (leave running in its own Terminal tab)
cd "$test/widgetizer-0.9.10/dist-electron"
npx --yes http-server . -p 8384 -a 127.0.0.1 -c-1
```

The feed folder must contain `latest-mac.yml` and the `.zip` files; macOS updates come from the zip, not the DMG.

The human then:

1. Opens the 0.9.9 DMG and drags Widgetizer to Applications, then opens it once from Applications.
2. Creates the two test projects from the **Arch** preset as described in [Test Projects From A Preset](#test-projects-from-a-preset), quits with Cmd+Q, and takes the "before" snapshot from that section.
3. Opens a new Terminal window and runs (all one line):
   ```bash
   ELECTRON_UPDATER_URL=http://127.0.0.1:8384 /Applications/Widgetizer.app/Contents/MacOS/Widgetizer
   ```
   Do not use `open -a Widgetizer`, because `open` does not pass the variable through. Leave the Terminal window open; the app's log prints there.
4. Clicks Update, then Restart Now, and checks the version in About.
5. Runs the "after the app update" check from [Test Projects From A Preset](#test-projects-from-a-preset). Then updates Arch on the Themes screen; only the opted-in project offers the theme update. Applies it, then runs the "after the theme update" checks and looks at the project's preview.

Restore afterwards (Widgetizer quit): stop the feed, remove the app, data and caches as in step 1, copy the backup back with `ditto "$test/backup-appsupport-widgetizer" ~/Library/Application\ Support/widgetizer`, and reinstall the official release from its DMG. Remove the worktree with `git worktree remove --force "$test/widgetizer-0.9.10"`. Keep the backup until the developer confirms their projects look right.

## Test Projects From A Preset

Every rehearsal uses two projects made from the **Arch** preset card on New Project. It ships a full demo site — pages, menus, the News, Projects and Services collections, starter images — and its own look (Fraunces headings, pink `#DE1877` accent). Name them exactly as below, so the folder names in the commands match:

| Project name | Receive theme updates | Folder |
|---|---|---|
| `Preset test - updates ON` | on | `preset-test-updates-on` |
| `Preset test - updates OFF` | off | `preset-test-updates-off` |

The commands use the packaged app's data folder: `~/Library/Application Support/widgetizer/data` on Mac, `$env:APPDATA\widgetizer\data` on Windows. Set the test folder first (`test=~/widgetizer-upgrade-test` on Mac; `$test` from the Windows recipe).

### Before the app update

With the base version's projects created and Widgetizer closed, record every file in both projects.

Mac:

```bash
cd ~/Library/Application\ Support/widgetizer/data/projects
find preset-test-updates-on preset-test-updates-off -type f | sort | xargs -I{} shasum -a 256 "{}" > "$test/projects-before.sha"
```

Windows:

```powershell
$projects = "$env:APPDATA\widgetizer\data\projects"
Get-ChildItem "$projects\preset-test-updates-on", "$projects\preset-test-updates-off" -Recurse -File |
  Get-FileHash | Select-Object Path, Hash | Export-Csv "$test\projects-before.csv" -NoTypeInformation
```

### After the app update

Once the app has restarted as the target version, and before touching the Themes screen, the app update must have changed no project file. Both commands print nothing when that holds.

Mac:

```bash
cd ~/Library/Application\ Support/widgetizer/data/projects
shasum -a 256 -c --quiet "$test/projects-before.sha"
```

Windows:

```powershell
$projects = "$env:APPDATA\widgetizer\data\projects"
Import-Csv "$test\projects-before.csv" |
  Where-Object { -not (Test-Path -LiteralPath $_.Path) -or (Get-FileHash -LiteralPath $_.Path).Hash -ne $_.Hash } |
  Select-Object -ExpandProperty Path
```

### After the theme update

After updating Arch on the Themes screen and applying the update to `Preset test - updates ON`:

1. **Content and the opted-out project are untouched.** Only the opted-in project's theme files (`theme.json`, `assets`, `widgets`, `snippets`, `locales`, `layout.liquid`, `collection-types`) may have changed. Both commands print nothing when that holds.

   Mac:

   ```bash
   cd ~/Library/Application\ Support/widgetizer/data/projects
   grep -E 'preset-test-updates-off/|/(pages|menus|collections|uploads)/' "$test/projects-before.sha" | shasum -a 256 -c --quiet
   ```

   Windows:

   ```powershell
   $projects = "$env:APPDATA\widgetizer\data\projects"
   Import-Csv "$test\projects-before.csv" |
     Where-Object { $_.Path -match '\\preset-test-updates-off\\|\\(pages|menus|collections|uploads)\\' } |
     Where-Object { -not (Test-Path -LiteralPath $_.Path) -or (Get-FileHash -LiteralPath $_.Path).Hash -ne $_.Hash } |
     Select-Object -ExpandProperty Path
   ```

2. **The preset's look survived and every new setting arrived.** Each of the preset's settings must still be in effect, read from the updated Arch's own `presets/arch/preset.json`, and every setting in the updated Arch `theme.json` must be in the project. Both commands print only the `checked …` line when that holds; any `NOT THE PRESET'S` or `MISSING SETTING` line is a failure.

   Mac:

   ```bash
   python3 - <<'EOF'
   import json, os
   data = os.path.expanduser("~/Library/Application Support/widgetizer/data")
   ids = lambda t: {i["id"]: i for g in t["settings"]["global"].values() if isinstance(g, list) for i in g if isinstance(i, dict) and i.get("id")}
   project = ids(json.load(open(f"{data}/projects/preset-test-updates-on/theme.json")))
   preset = json.load(open(f"{data}/themes/arch/latest/presets/arch/preset.json"))["settings"]
   for key, want in preset.items():
       item = project.get(key, {})
       if (item["value"] if item.get("value") is not None else item.get("default")) != want:
           print("NOT THE PRESET'S:", key)
   for key in ids(json.load(open(f"{data}/themes/arch/latest/theme.json"))):
       if key not in project:
           print("MISSING SETTING:", key)
   print(f"checked {len(preset)} preset settings")
   EOF
   ```

   Windows:

   ```powershell
   $data = "$env:APPDATA\widgetizer\data"
   $settingsOf = { param($t) foreach ($g in $t.settings.global.PSObject.Properties) { $g.Value | Where-Object { $_.id } } }
   $project = & $settingsOf (Get-Content "$data\projects\preset-test-updates-on\theme.json" -Raw | ConvertFrom-Json)
   $preset = (Get-Content "$data\themes\arch\latest\presets\arch\preset.json" -Raw | ConvertFrom-Json).settings
   foreach ($p in $preset.PSObject.Properties) {
     $item = $project | Where-Object { $_.id -eq $p.Name } | Select-Object -First 1
     $actual = if ($null -ne $item.value) { $item.value } else { $item.default }
     if (($actual | ConvertTo-Json -Compress -Depth 5) -ne ($p.Value | ConvertTo-Json -Compress -Depth 5)) { "NOT THE PRESET'S: $($p.Name)" }
   }
   $latest = & $settingsOf (Get-Content "$data\themes\arch\latest\theme.json" -Raw | ConvertFrom-Json)
   $latest.id | Where-Object { $_ -notin $project.id } | ForEach-Object { "MISSING SETTING: $_" }
   "checked $(@($preset.PSObject.Properties).Count) preset settings"
   ```

3. **It looks right.** Open `Preset test - updates ON` and look over the preview: home page, a News item, a Projects item, the header menu and footer. Headings are in Fraunces, accents are pink, and the demo images show. Then open `Preset test - updates OFF`: it is still on the base version and looks the same.

## Non-Negotiables

- Start from a clean local Widgetizer install/data state every time.
- Build the base app from the real previous release tag.
- Do not emulate the base app version.
- Do not run the unpacked app as the upgrade-test baseline; install and run the NSIS setup exe.
- Create Vite env files in the base checkout before dev/build commands. Older releases such as `0.9.8` require this; without it the frontend can call bad API URLs and look like themes/data are broken.
- When a command is run in a new PowerShell window, do not rely on variables from another window. Use literal paths/ports or set the variables again.
- In `0.9.8`, the app update banner is mounted only in the workspace layout, not on the project picker screens (`Projects`, `New Project`, `Themes`, `App Settings`). To see the update notification when testing from `0.9.8`, enter a project workspace before that old version's 10-second updater check fires.
- In `0.9.9` and newer, the app update banner is mounted at the app root and the updater check delay is 5 seconds.

## Variables

Set the version pair first:

```powershell
$fromVersion = "0.9.8"
$targetVersion = "0.9.9"
$targetBranch = "master"
```

For a future test, only change those values, for example:

```powershell
$fromVersion = "0.9.9"
$targetVersion = "0.9.10"
$targetBranch = "master"
```

Common paths:

```powershell
$repo = "C:\Users\g_tsi\Projects\widgetizer-saas\widgetizer"
$testRoot = "C:\Users\g_tsi\Projects\widgetizer-upgrade-test"
$baseWt = "$testRoot\widgetizer-$fromVersion"
$installedExe = "$env:LOCALAPPDATA\Programs\widgetizer\Widgetizer.exe"
$userData = "$env:APPDATA\widgetizer"
$dataRoot = "$userData\data"
$logFile = "$userData\logs\widgetizer.log"
$feedPort = 8384
$feedUrl = "http://127.0.0.1:$feedPort"
```

## What This Test Proves

- The installed previous version detects a real newer Electron update.
- The update downloads and installs through `electron-updater`.
- The updated app launches as the target version.
- The shipped `arch` theme contains a target-version update delta.
- The Themes screen reports Arch has a pending update.
- Updating Arch builds/applies `latest/`.
- Projects that opted into theme updates show project-level update notifications.
- Projects that did not opt in do not show project-level update notifications.
- Applying a project theme update moves the project from `$fromVersion` to `$targetVersion`.

## Fast Retest From Existing Artifacts: Two PowerShell Windows

Use this section when the `0.9.8` installer and the target `dist-electron` feed artifacts already exist and you want to rerun the upgrade test from a clean slate.

For the current `0.9.8 -> 0.9.9` test, the expected files are:

- Base installer: `C:\Users\g_tsi\Projects\widgetizer-upgrade-test\widgetizer-0.9.8\dist-electron\Widgetizer-Setup-0.9.8.exe`
- Target feed directory: `C:\Users\g_tsi\Projects\widgetizer-saas\widgetizer\dist-electron`
- Target feed URL: `http://127.0.0.1:8384`

### PowerShell Window 1: Clean And Install `0.9.8`

Open a normal PowerShell window. Run the whole block below in this window:

```powershell
Get-Process Widgetizer -ErrorAction SilentlyContinue | Stop-Process -Force

foreach ($port in 3001,8384) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}

$paths = @(
  "$env:LOCALAPPDATA\Programs\widgetizer",
  "$env:LOCALAPPDATA\Programs\Widgetizer",
  "$env:APPDATA\widgetizer",
  "$env:APPDATA\Widgetizer",
  "$env:LOCALAPPDATA\widgetizer",
  "$env:LOCALAPPDATA\Widgetizer",
  "$env:LOCALAPPDATA\widgetizer-updater",
  "$env:LOCALAPPDATA\Widgetizer-updater"
)

foreach ($p in $paths) {
  if (Test-Path -LiteralPath $p) {
    Remove-Item -LiteralPath $p -Recurse -Force
  }
}

& "C:\Users\g_tsi\Projects\widgetizer-upgrade-test\widgetizer-0.9.8\dist-electron\Widgetizer-Setup-0.9.8.exe"
```

After the installer finishes, open Widgetizer if it did not auto-open.

Create the two test projects in the `0.9.8` app from the **Arch** preset, as described in [Test Projects From A Preset](#test-projects-from-a-preset): `Preset test - updates ON` with theme updates enabled and `Preset test - updates OFF` with them disabled.

Still in **PowerShell Window 1**, verify the clean `0.9.8` state while Widgetizer is running:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api/projects | ConvertTo-Json -Depth 10
Invoke-RestMethod http://127.0.0.1:3001/api/themes | ConvertTo-Json -Depth 10
```

Expected before starting the update:

- `/api/themes` shows Arch `version: "0.9.8"`.
- The opted-in project has `receiveThemeUpdates: true`.
- The opted-out project has `receiveThemeUpdates: false`.
- Both projects have `themeVersion: "0.9.8"` and `preset: "arch"`.

Close Widgetizer before launching it against the update feed:

```powershell
Get-Process Widgetizer -ErrorAction SilentlyContinue | Stop-Process -Force
```

Then take the "before" snapshot from [Test Projects From A Preset](#test-projects-from-a-preset).

### PowerShell Window 2: Start The `0.9.9` Feed Server

Open a **second PowerShell window or tab**. This second window is only for the feed server.

Run this in **PowerShell Window 2**:

```powershell
cd "C:\Users\g_tsi\Projects\widgetizer-saas\widgetizer\dist-electron"
npx http-server . -p 8384 -a 127.0.0.1
```

Leave **PowerShell Window 2** open. Do not run any other test commands in it. It should keep showing something like:

```text
Available on:
  http://127.0.0.1:8384
Hit CTRL-C to stop the server
```

Do not close this feed-server window until the app update has been downloaded and installed.

### PowerShell Window 1: Verify The Feed

Return to **PowerShell Window 1**. Run:

```powershell
Invoke-WebRequest "http://127.0.0.1:8384/latest.yml" -UseBasicParsing | Select-Object StatusCode,Content
```

Expected:

```text
StatusCode 200
Content    version: 0.9.9...
```

### PowerShell Window 1: Launch Installed `0.9.8` Against The Feed

Still in **PowerShell Window 1**, run:

```powershell
$env:ELECTRON_UPDATER_URL = "http://127.0.0.1:8384"
& "$env:LOCALAPPDATA\Programs\widgetizer\Widgetizer.exe"
```

Expected:

- Widgetizer starts as `0.9.8`.
- The log includes `Using updater override feed: http://127.0.0.1:8384`.
- After about 10 seconds, `0.9.8` checks the feed and finds `0.9.9`.
- In `0.9.8`, enter a project workspace if the update banner is not visible on the Projects screen. The old `0.9.8` banner is not mounted globally.
- Click the update action in the app, wait for download, then restart/install when prompted.

Optional log tail in **PowerShell Window 1**:

```powershell
Get-Content -LiteralPath "$env:APPDATA\widgetizer\logs\widgetizer.log" -Wait
```

After the app restarts into `0.9.9`, verify the result with the API port shown in the log. For `0.9.9+`, the packaged app may use a dynamic backend port. Look for a log line like:

```text
Server reported ready on port <port>
```

Then run, replacing `<port>`:

```powershell
$port = <port>
Invoke-RestMethod "http://127.0.0.1:$port/api/themes" | ConvertTo-Json -Depth 10
Invoke-RestMethod "http://127.0.0.1:$port/api/projects" | ConvertTo-Json -Depth 10
```

Expected final state:

- App is running as `0.9.9`.
- Arch reports `version: "0.9.9"` after the Arch update is applied.
- The opted-in project moves to `themeVersion: "0.9.9"` after applying its project theme update.
- The opted-out project remains on `themeVersion: "0.9.8"`.
- The "after the app update" and "after the theme update" checks in [Test Projects From A Preset](#test-projects-from-a-preset) pass.

## Updater Override Requirement

The base version must already support a local updater feed override. Verify once per base version:

```powershell
cd $repo
git grep -n "ELECTRON_UPDATER_URL\|--updater-url\|setFeedURL" $fromVersion -- electron
```

Expected:

- The base tag reads `ELECTRON_UPDATER_URL` or `--updater-url`.
- The base tag calls `autoUpdater.setFeedURL({ provider: "generic", url: ... })`.

If a future base version does not support this, a local generic feed cannot be used without modifying the base app. In that case, test through the provider that the real base build already checks.

## Preflight

Close Widgetizer before starting. Make sure no stale Widgetizer process owns port `3001`.

```powershell
Get-Process Widgetizer -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess
```

If the owner is Widgetizer and you want a clean test:

```powershell
Get-Process Widgetizer -ErrorAction SilentlyContinue | Stop-Process -Force
```

Do not chase unrelated `node-spawn-server` processes; on this machine that has been GitKraken, not Widgetizer.

For a completely fresh base install, wipe all local Widgetizer install/data/updater state after Widgetizer is stopped:

```powershell
Remove-Item -LiteralPath "$env:LOCALAPPDATA\Programs\widgetizer" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$env:APPDATA\widgetizer" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$env:APPDATA\Widgetizer" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$env:LOCALAPPDATA\widgetizer-updater" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "$env:LOCALAPPDATA\widgetizer" -Recurse -Force -ErrorAction SilentlyContinue
```

Verify the wipe:

```powershell
Test-Path "$env:LOCALAPPDATA\Programs\widgetizer"
Test-Path "$env:APPDATA\widgetizer"
Test-Path "$env:APPDATA\Widgetizer"
Test-Path "$env:LOCALAPPDATA\widgetizer-updater"
Test-Path "$env:LOCALAPPDATA\widgetizer"
```

Expected:

```text
False
False
False
False
False
```

## Build The Genuine Base Version

From the current repo:

```powershell
cd $repo

New-Item -ItemType Directory -Force -Path $testRoot | Out-Null

git worktree remove --force $baseWt 2>$null
git worktree prune
git worktree add --detach $baseWt $fromVersion

cd $baseWt
git rev-parse --short HEAD
git describe --tags --exact-match
npm ci
Set-Content -LiteralPath .env -Value "VITE_API_URL=http://localhost:3001"
Set-Content -LiteralPath .env.production -Value "VITE_API_URL="
npm run electron:build:win:unsigned
```

Expected:

- `git describe --tags --exact-match` prints `$fromVersion`.
- `.env` contains `VITE_API_URL=http://localhost:3001`.
- `.env.production` contains `VITE_API_URL=`.
- The installer is created under `$baseWt\dist-electron`.
- The bundled Arch theme version matches `$fromVersion`.

Install and run the base app:

```powershell
& "$baseWt\dist-electron\Widgetizer-Setup-$fromVersion.exe"
& $installedExe
```

Do not launch this as the baseline:

```text
$baseWt\dist-electron\win-unpacked\Widgetizer.exe
```

That is useful for debugging, but the upgrade rehearsal needs the installed NSIS app because `electron-updater` updates the installed app.

In the base app, create the two test projects from the **Arch** preset, as described in [Test Projects From A Preset](#test-projects-from-a-preset): `Preset test - updates ON` with theme updates enabled and `Preset test - updates OFF` with them disabled. Close Widgetizer and take the "before" snapshot from that section before launching against the update feed.

Optional API sanity checks while the base app is running:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api/themes | ConvertTo-Json -Depth 10
Invoke-RestMethod http://127.0.0.1:3001/api/projects | ConvertTo-Json -Depth 10
```

Expected before upgrade:

- `/api/themes` shows Arch version `$fromVersion`.
- Projects have `themeVersion: "$fromVersion"` and `preset: "arch"`.
- The opted-in project has `receiveThemeUpdates: true`.
- The opted-out project has `receiveThemeUpdates: false`.

## Prepare The Target Version With Arch Delta

Return to the target branch worktree:

```powershell
cd $repo
git switch $targetBranch
git status --short --branch
node -p "require('./package.json').version"
```

Expected:

- The branch is `$targetBranch`.
- Package version is `$targetVersion`.

Ensure the target worktree also has production same-origin API config before building:

```powershell
Set-Content -LiteralPath .env.production -Value "VITE_API_URL="
```

Skip this step when `themes/arch/updates/$targetVersion/` is already committed: `--force` overwrites hand-made fixes in that folder.

Generate the Arch update delta from the real base tag:

```powershell
node scripts/theme-update-delta.js themes/arch --from $fromVersion --version $targetVersion --force
```

This should create:

```text
themes/arch/updates/<targetVersion>/
```

Then build the unsigned Windows target app:

```powershell
npm run electron:build:win:unsigned
```

Expected output under:

```text
C:\Users\g_tsi\Projects\widgetizer-saas\widgetizer\dist-electron
```

The generic feed folder must contain at least:

- `latest.yml`
- `Widgetizer-Setup-<targetVersion>.exe`
- `Widgetizer-Setup-<targetVersion>.exe.blockmap`

## Serve The Target Update Feed

Use a dedicated PowerShell window or tab for the feed server. In examples above this is **PowerShell Window 2**.

```powershell
cd "$repo\dist-electron"
npx http-server . -p $feedPort -a 127.0.0.1
```

If this is a new PowerShell window and the variables are not set, use literal values:

```powershell
cd "C:\Users\g_tsi\Projects\widgetizer-saas\widgetizer\dist-electron"
npx http-server . -p 8384 -a 127.0.0.1
```

Leave this feed-server window open.

Check the feed from a different PowerShell window, not the feed-server window:

```powershell
Invoke-WebRequest "$feedUrl/latest.yml" -UseBasicParsing | Select-Object StatusCode,Content
```

If variables are not set in this PowerShell window:

```powershell
Invoke-WebRequest "http://127.0.0.1:8384/latest.yml" -UseBasicParsing | Select-Object StatusCode,Content
```

## Launch The Installed Base App Against The Local Feed

Run this from a different PowerShell window than the feed server. In examples above this is **PowerShell Window 1**.

```powershell
$env:ELECTRON_UPDATER_URL = $feedUrl
& $installedExe
```

If variables are not set in this PowerShell window:

```powershell
$env:ELECTRON_UPDATER_URL = "http://127.0.0.1:8384"
& "$env:LOCALAPPDATA\Programs\widgetizer\Widgetizer.exe"
```

Watch the log:

```powershell
Get-Content -LiteralPath $logFile -Wait
```

If variables are not set in this PowerShell window:

```powershell
Get-Content -LiteralPath "$env:APPDATA\widgetizer\logs\widgetizer.log" -Wait
```

Expected log lines include:

- `Using updater override feed: <feedUrl>`
- `Update available: <targetVersion>`
- download progress after clicking the app's update action
- `Update downloaded, will install on quit`

For `0.9.8`, immediately enter a project workspace after launch if you need to see and test the update banner UI. The banner is not mounted on project-picker screens in `0.9.8`, so if the updater check fires while the app is on `Projects`, `New Project`, `Themes`, or `App Settings`, the main process logs `Update available` but no banner appears. In `0.9.9` and newer, the banner is mounted globally and appears across the app.

Use the app UI to download and install the update. After restart, verify the running app version from the About dialog or from logs.

After `0.9.9`, the packaged server may use a dynamic port. Read the current port from the log line:

```text
Server reported ready on port <port>
```

Use that port for direct API checks, for example:

```powershell
$port = 56546
Invoke-RestMethod "http://127.0.0.1:$port/api/themes" | ConvertTo-Json -Depth 10
Invoke-RestMethod "http://127.0.0.1:$port/api/projects" | ConvertTo-Json -Depth 10
```

## Verify Theme Update Notification

After the app has updated to `$targetVersion`, the user's existing data still contains Arch base `$fromVersion`. The packaged seed now contains `themes/arch/updates/$targetVersion`.

The packaged `0.9.9`+ server binds a dynamic port, so the `3001` in the commands in this section and the next is only right when the app was launched with `$env:PORT = "3001"`. Otherwise substitute the port from the `Server reported ready on port <port>` log line.

Only update folders newer than the installed base are layered into `latest/`. Folders at or below the base (such as an `updates/$fromVersion` the theme still ships) are kept as history and not applied, and when nothing newer exists no `latest/` is built.

Check API state:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api/themes | ConvertTo-Json -Depth 10
Invoke-RestMethod http://127.0.0.1:3001/api/themes/update-count | ConvertTo-Json -Depth 10
```

Expected before updating Arch:

- Arch `version` is still `$fromVersion`.
- Arch `versions` includes `$fromVersion` and `$targetVersion`.
- Arch `latestVersion` is `$targetVersion`.
- Arch `hasPendingUpdate` is `true`.
- `/api/themes/update-count` returns `count: 1` or higher.
- The Themes screen shows an update affordance for Arch.

Apply the Arch theme update from the UI, or with:

```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:3001/api/themes/arch/update |
  ConvertTo-Json -Depth 10
```

Expected after updating Arch:

- Arch source version becomes `$targetVersion`.
- `$userData\data\themes\arch\latest\theme.json` exists and says `$targetVersion`.
- `/api/themes` reports Arch `version: "$targetVersion"`.
- Arch `hasPendingUpdate` becomes `false`.

## Verify Project Update Notifications

After Arch itself is updated, check projects:

```powershell
$projects = Invoke-RestMethod http://127.0.0.1:3001/api/projects
$projects | ConvertTo-Json -Depth 10
```

Expected:

- Opted-in project:
  - `receiveThemeUpdates: true`
  - `themeVersion: "$fromVersion"`
  - `hasThemeUpdate: true`
- Opted-out project:
  - `receiveThemeUpdates: false`
  - `themeVersion: "$fromVersion"`
  - `hasThemeUpdate: false`

Check individual project statuses:

```powershell
$projects | ForEach-Object {
  $status = Invoke-RestMethod "http://127.0.0.1:3001/api/projects/$($_.id)/theme-updates/status"
  [pscustomobject]@{
    name = $_.name
    receiveThemeUpdates = $_.receiveThemeUpdates
    currentVersion = $status.currentVersion
    latestVersion = $status.latestVersion
    hasUpdate = $status.hasUpdate
  }
}
```

Expected:

- Opted-in project returns `hasUpdate: true`.
- Opted-out project returns `hasUpdate: false`.

Apply the update to the opted-in project:

```powershell
$optedIn = $projects | Where-Object { $_.receiveThemeUpdates -eq $true } | Select-Object -First 1
Invoke-RestMethod -Method Post "http://127.0.0.1:3001/api/projects/$($optedIn.id)/theme-updates/apply" |
  ConvertTo-Json -Depth 10
```

Expected:

- Result has `success: true`.
- `previousVersion` is `$fromVersion`.
- `newVersion` is `$targetVersion`.
- The project metadata now has `themeVersion: "$targetVersion"`.
- The project no longer reports `hasThemeUpdate: true`.

The opted-out project should remain on `themeVersion: "$fromVersion"` until its update preference is enabled and the project update is applied.

Then run the "after the theme update" checks in [Test Projects From A Preset](#test-projects-from-a-preset): content and the opted-out project untouched, the preset's look and every new setting present, and the preview looks right.

## Troubleshooting

If the app shows old or impossible data, identify the actual backend serving `3001`:

```powershell
Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,OwningProcess

$pid = (Get-NetTCPConnection -LocalPort 3001 -State Listen).OwningProcess
Get-CimInstance Win32_Process -Filter "ProcessId=$pid" |
  Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine |
  Format-List
```

Then ask the live API directly:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api/projects | ConvertTo-Json -Depth 10
Invoke-RestMethod http://127.0.0.1:3001/api/themes | ConvertTo-Json -Depth 10
```

If the visible UI disagrees with these responses, suspect a stale renderer window or an already-running Widgetizer instance. Fully close Widgetizer and relaunch with the updater environment variable set.

If New Project fails in the genuine base version, keep the log open while reproducing:

```powershell
Get-Content -LiteralPath $logFile -Wait
```

Capture:

- the error toast/message
- the `/api/themes` response
- the `/api/projects` response
- the latest relevant lines from `widgetizer.log`

# Electron Auto-Update And Theme Update Test

This is a human-run playbook for testing real Windows Electron auto-updates and bundled theme-update deltas between any two releases.

Use it for `0.9.8 -> 0.9.9`, `0.9.9 -> 0.9.10`, or future version pairs. The important rule is that the base app must be built from the real previous release tag, not by editing or emulating the app version.

Do not ask an agent to run these commands unless you explicitly want it to execute the test.

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
$targetBranch = "experimentation"
```

For a future test, only change those values, for example:

```powershell
$fromVersion = "0.9.9"
$targetVersion = "0.9.10"
$targetBranch = "experimentation"
```

Common paths:

```powershell
$repo = "C:\Users\g_tsi\Projects\widgetizer"
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

In the base app, create at least two Arch projects:

- One project with theme updates enabled.
- One project with theme updates disabled.

Optional API sanity checks while the base app is running:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api/themes | ConvertTo-Json -Depth 10
Invoke-RestMethod http://127.0.0.1:3001/api/projects | ConvertTo-Json -Depth 10
```

Expected before upgrade:

- `/api/themes` shows Arch version `$fromVersion`.
- Projects have `themeVersion: "$fromVersion"`.
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
C:\Users\g_tsi\Projects\widgetizer\dist-electron
```

The generic feed folder must contain at least:

- `latest.yml`
- `Widgetizer-Setup-<targetVersion>.exe`
- `Widgetizer-Setup-<targetVersion>.exe.blockmap`

## Serve The Target Update Feed

In one PowerShell window:

```powershell
cd "$repo\dist-electron"
npx http-server . -p $feedPort -a 127.0.0.1
```

If this is a new PowerShell window and the variables are not set, use literal values:

```powershell
cd "C:\Users\g_tsi\Projects\widgetizer\dist-electron"
npx http-server . -p 8384 -a 127.0.0.1
```

Leave this feed-server window open.

Check the feed:

```powershell
Invoke-WebRequest "$feedUrl/latest.yml" -UseBasicParsing | Select-Object StatusCode,Content
```

If variables are not set in this PowerShell window:

```powershell
Invoke-WebRequest "http://127.0.0.1:8384/latest.yml" -UseBasicParsing | Select-Object StatusCode,Content
```

## Launch The Installed Base App Against The Local Feed

In another PowerShell window:

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

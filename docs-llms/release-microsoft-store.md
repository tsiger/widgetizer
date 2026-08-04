# Publishing Widgetizer to the Microsoft Store (MSIX)

**Status:** packaging verified locally on 2026-08-04, not yet submitted.
**Route:** MSIX/AppX — Microsoft hosts and signs the package. No code signing certificate is involved.

This doc assumes no Microsoft developer account exists yet. Steps are small and in order.

---

## Version plan

The Store rejects MSIX identity versions whose first segment is `0`, so `0.9.x` cannot be submitted.

1. **0.9.10** — ships normally: GitHub Releases + NSIS installer + `electron-updater`. Nothing Store-related. Follow *Releasing a New Version* in `CLAUDE.md`.
2. **1.0.0** — the first Store submission. Everything below targets this release.

The Store work and the 0.9.10 release are independent; account verification can run in the background while 0.9.10 ships.

---

## Repo state

The code changes below were written and verified end-to-end on 2026-08-04, then **reverted** — the repo is currently clean of Store work, so 0.9.10 can ship without carrying half-finished Store plumbing. The exact changes are reproduced verbatim in [Part 3](#part-3--repo-changes-for-100); reapply them when you start the 1.0.0 Store build.

---

## Verified findings (2026-08-04)

Established by building and running the package on this machine. These resolve questions that the Microsoft docs answer misleadingly:

| Question | Answer |
|---|---|
| Does the bundled Express server work inside the package? | **Yes.** The manifest gets `EntryPoint="Windows.FullTrustApplication"` + `runFullTrust` — Desktop Bridge full trust, not the restricted AppContainer sandbox. The loopback port binds normally. |
| Do `better-sqlite3` and `sharp` load? | **Yes.** Both are correctly `asarUnpack`ed inside the package. Project creation and image resizing both work. |
| Does MSIX redirect the app's data directory? | **No.** The packaged build reads and writes `%APPDATA%\widgetizer` — the same location as the NSIS build. The package container has no Widgetizer data folder. |
| Do existing users lose their projects? | **No.** The Store build opens existing projects with zero migration. Nothing to import or export. |
| Does uninstalling the installer version delete data? | **No.** electron-builder's `deleteAppDataOnUninstall` defaults to `false` and isn't overridden. |
| Does `process.windowsStore` work? | **Yes**, confirmed true under a packaged build. The updater gate fires. |

**Consequence:** both builds share one SQLite database. Users should not run both long-term — the NSIS build auto-updates while the Store build updates on the Store's schedule, and forward-only schema migrations make version drift risky. Tell users to uninstall the installer version after switching ([step 7.2](#72-tell-existing-users-what-to-do)).

**Known gap, unrelated to the Store:** Widgetizer has no `requestSingleInstanceLock` anywhere, so multiple instances can already run against the same data today. Worth fixing separately.

---

## Part 1 — Developer account (start this first, it has the longest lead time)

Registration is free for both individual and company accounts. **The fee waiver only applies via the correct entry URL** — going directly to Partner Center gives the legacy paid flow.

### 1.1 Decide account type first

This is the one irreversible choice. It sets the publisher name shown on your listing.

- **Individual** — free, fast, verified by government ID + selfie. The publisher name is tied to your verified legal name (Gerasimos Tsiamalos). You cannot claim "Widgetizer" as a publisher name.
- **Company** — free, slower, requires a registered legal entity and business documents. The publisher name can be your company name.

Changing later means a new account. Decide before signing up.

### 1.2 Gather

- [ ] A Microsoft account (MSA) that will permanently own this — not a throwaway. Enable MFA.
- [ ] Original government photo ID (passport or national ID). Photos of photocopies get rejected.
- [ ] A phone with a camera, good lighting.

### 1.3 Sign up

1. [ ] Open **https://storedeveloper.microsoft.com** — this exact URL.
2. [ ] Click **Get started for free**.
3. [ ] Choose Individual or Company per [1.1](#11-decide-account-type-first).
4. [ ] Sign in with your MSA; complete MFA setup.
5. [ ] Complete ID + selfie capture on your phone.
6. [ ] Review the auto-filled profile; correct anything wrong.
7. [ ] Accept the App Developer Agreement.
8. [ ] Click **Go to Partner Center dashboard**, pick the same MSA when prompted.
9. [ ] You should land on **Apps & Games**. If not, wait ~5 min and refresh, or go to https://aka.ms/submitwindowsapp.

Problems with this specific free-onboarding flow: email **storesupport@service.microsoft.com**. Anything else (account management, submission, certification): https://aka.ms/windowsdevelopersupport.

### 1.4 After signup

- [ ] Confirm your **publisher display name** under Account settings — this is public.
- [ ] Widgetizer is free, so payout/tax profiles can be skipped. Complete them only if you decide to charge.
- [ ] Set a support email you actually read; certification failures go there.

---

## Part 2 — Reserve the name and get identity values

1. [ ] Partner Center → **Apps and games** → **+ New product** → **MSIX/PWA app**.
2. [ ] Product name: **`Widgetizer`**. Click **Reserve product name**.
3. [ ] If taken, try `Widgetizer — Website Builder` and adjust your listing copy accordingly.
4. [ ] Go to **Product management → Product identity**.
5. [ ] Copy these three values verbatim (case- and whitespace-sensitive):
   - `Package/Identity/Name`
   - `Package/Identity/Publisher` — looks like `CN=ABCD1234-…`
   - `Package/Properties/PublisherDisplayName`

---

## Part 3 — Repo changes for 1.0.0

All of this was verified working on 2026-08-04 and then reverted. Reapply it here.

### 3.1 Add the `appx` block to `electron/builder.config.mjs`

Insert as a **top-level key** (sibling of `win`, not nested inside it). Keeping it out of `win.target` means `npm run electron:build:win` stays NSIS-only and needs no Windows SDK; the appx is built by passing the target explicitly ([4.2](#42-build)).

```js
  // Microsoft Store (MSIX/AppX) packaging. Not in win.target — the Store build is
  // opt-in via an explicit target arg (`electron-builder --win appx`) so the normal
  // release build stays NSIS-only and doesn't require the Windows SDK.
  //
  // The Store re-signs the package, so no code signing cert is used here.
  appx: {
    identityName: "<Package/Identity/Name from Partner Center>",
    publisher: "<Package/Identity/Publisher from Partner Center>",
    publisherDisplayName: "<Package/Properties/PublisherDisplayName>",
    applicationId: "Widgetizer",
    displayName: "Widgetizer",
    backgroundColor: "#464646",
    languages: ["en-US"],
    showNameOnTiles: false,
    setBuildNumber: false,
  },
```

- [ ] Paste the three identity values from [Part 2](#part-2--reserve-the-name-and-get-identity-values) verbatim. A mismatch produces a package that installs nowhere.
- [ ] `applicationId` must be alphanumeric with no spaces.

> For local testing before you have a Partner Center account, `identityName: "widgetizer"` and `publisher: "CN=Widgetizer-DevTest"` work fine — dev-mode registration doesn't check signatures.

### 3.2 Add the Store-build flag to `electron/main.js`

Add next to `getIsDev()`:

```js
// True when running from an MSIX/AppX package (Microsoft Store build) rather than
// the NSIS installer. Electron sets process.windowsStore when the process has a
// package identity. Both builds share %APPDATA%\widgetizer, so this flag is the
// only reliable way to tell them apart at runtime.
function getIsStoreBuild() {
  return process.windowsStore === true;
}
```

Then use it in three places:

**a. Disable the auto-updater — required.** `electron-updater` inside an MSIX breaks package identity and violates Store policy. In `setupAutoUpdater()`, replace `if (getIsDev()) return;` with:

```js
  // Store builds are updated by the Store itself. Running electron-updater inside
  // an MSIX package breaks the package's signature/identity and is against Store
  // policy, so the whole updater is inert there.
  if (getIsDev() || getIsStoreBuild()) {
    log(getIsStoreBuild() ? "Store build - auto-updater disabled" : "Dev mode - auto-updater disabled");
    return;
  }
```

Nothing else needs changing — the renderer's `UpdateBanner` only reacts to IPC events from this function, and `createAppMenu()` has no manual update check.

**b. Mark the build in Help → About** — this is how you tell the two builds apart at runtime. In `showAboutDialog()`:

```js
    detail: getIsStoreBuild() ? `Version ${version} (Microsoft Store)` : `Version ${version}`,
```

**c. Record it in the startup log.** In `initPaths()`, after the `isDev` line:

```js
  log(`  packaging: ${getIsStoreBuild() ? "msix (Microsoft Store)" : "nsis/dev"}`);
```

- [ ] `npx eslint electron/main.js` passes.

### 3.3 Bump the version

- [ ] Set `version` to `1.0.0` in `package.json`. MSIX turns this into identity version `1.0.0.0`.

### 3.4 Real icon assets

The build currently falls back to electron-builder's placeholder logos. Create `electron/resources/appx/` (the config's `buildResources` is `electron/resources`) containing:

| File | Size |
|---|---|
| `StoreLogo.png` | 50 × 50 |
| `Square150x150Logo.png` | 150 × 150 |
| `Square44x44Logo.png` | 44 × 44 |
| `Wide310x150Logo.png` | 310 × 150 |

Optional: `BadgeLogo.png` (24 × 24), `LargeTile.png` (310 × 310), `SmallTile.png` (71 × 71), `SplashScreen.png` (620 × 300).

- [ ] Generate these from the same source artwork as `icon.icns`, not by upscaling the derived `.ico`.

### 3.5 Optional tidy-ups

- [ ] The appx inherits `win.artifactName` and comes out as `Widgetizer-Setup-1.0.0.appx`. "Setup" is a misnomer for a Store package — set `artifactName` inside the `appx` block if it bothers you.
- [ ] `scripts/build-electron.mjs` has no `--target` passthrough, so the appx is built by calling electron-builder directly (below). Add one if you want `npm run` coverage.

---

## Part 4 — Build and verify locally

### 4.1 Prerequisites

- [ ] **Windows 10/11 SDK** — provides `makeappx.exe`. Verified present at `C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\`. Install via the Visual Studio Installer if missing on another machine.
- [ ] **Developer Mode** on: Settings → System → For developers → Developer Mode. Needed only to install the package locally, not to build it.

### 4.2 Build

```bash
npm run build
```

```bash
npm install --no-save --platform=win32 --arch=x64 --include=optional
```

```bash
npx @electron/rebuild --force
```

```bash
npx electron-builder --config electron/builder.config.mjs --win appx
```

Output: `dist-electron/Widgetizer-Setup-1.0.0.appx` (~330 MB).

> `npx @electron/rebuild` leaves native modules on the Electron ABI. The `predev:all` / `preelectron:dev` hooks rebuild them for Node automatically on the next dev run — nothing to do manually.

### 4.3 Install locally

Unpack and register the loose files — this needs no signature, unlike installing the `.appx` directly:

```bash
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\makeappx.exe" unpack /p "dist-electron\Widgetizer-Setup-1.0.0.appx" /d "dist-electron\appx-unpacked" /o
```

```bash
Add-AppxPackage -Register "$PWD\dist-electron\appx-unpacked\AppxManifest.xml"
```

### 4.4 Launch the right one

With both builds installed, the Start menu shows two Widgetizers. Launch the package explicitly by its identity instead of guessing:

```bash
Start-Process "shell:AppsFolder\$((Get-AppxPackage *widgetizer*).PackageFamilyName)!Widgetizer"
```

> The PackageFamilyName is a hash of the identity name + publisher, so it **changes** once you paste the real Partner Center values. Always read it back with `Get-AppxPackage` rather than hardcoding it.

Confirm which build you're in: **Help → About** should read `Version 1.0.0 (Microsoft Store)`. To double-check from outside:

```bash
Get-Process Widgetizer | Select-Object -ExpandProperty Path -Unique
```

The packaged build runs from `dist-electron\appx-unpacked\app\`; the installer build from `%LOCALAPPDATA%\Programs\widgetizer\`.

### 4.5 Smoke test

- [ ] Editor UI renders (bundled server + loopback port)
- [ ] Create a project (`better-sqlite3`)
- [ ] Upload an image, confirm resized variants (`sharp`)
- [ ] Export a site
- [ ] Help → About says "(Microsoft Store)"

### 4.6 Clean up when done

The registered package points at `dist-electron\appx-unpacked`; rebuilding or cleaning that folder breaks it in confusing ways.

```bash
Get-AppxPackage *widgetizer* | Remove-AppxPackage
```

This removes only the packaged build. The NSIS install and `%APPDATA%\widgetizer` are untouched.

---

## Part 5 — Listing assets

### 5.1 Screenshots — at least 1 required

- [ ] PNG, **1366 × 768 or larger** (shoot 1920 × 1080), max 50 MB, up to 10.
- [ ] 4+ recommended. Suggested: projects list · page editor with widget sidebar · theme/preset picker · media library · collections · export screen.
- [ ] Keep key visuals in the **top two-thirds** — the Store overlays text on the bottom third.
- [ ] **No** added logos, badges, or marketing text — that's a rejection reason.
- [ ] Realistic demo content, not lorem ipsum.

### 5.2 Logos

- [ ] **1:1 app tile icon, 300 × 300 PNG** — strongly recommended; the Store prefers it over the package icon.
- [ ] 16:9 super hero art (1920 × 1080), no text — optional, used in promotional layouts.
- [ ] 2:3 poster art and 1:1 box art matter mainly for games. Skip.

### 5.3 Copy

- [ ] **Description** (required, 10k chars) — what Widgetizer is, the Create → Build → Export flow, themes and presets, everything stays local. The first two lines are what shows before "read more".
- [ ] **Applicable license terms** (required, 10k chars) — your EULA, as text or a URL. Not a placeholder; users legally accept this.
- [ ] Short description (1k), What's new (1.5k), App features (20 × 200 chars), Keywords (7 terms), Copyright — all optional, all cheap wins.

### 5.4 Privacy policy

- [ ] Partner Center asks whether the product accesses/collects/transmits personal information. **Answer yes and publish a policy** — safest, given the update check contacts GitHub (which sees the user's IP). Note the Store build's updater is disabled, so even that goes away; the policy is still worth having.
- [ ] Host at a stable public URL, e.g. `https://widgetizer.org/privacy`. Certification checks it loads.

---

## Part 6 — Partner Center submission

Open the reserved product → **Start submission**. Sections can be done in any order.

**Availability** — Markets (default all) · Discoverability · Pricing (Free) · Free trial (n/a when free).

> For a first submission, set Discoverability to **Available through link**. You get full certification and a real installable listing with no public exposure, then flip it to searchable once you're happy.

**Properties** — Category: `Developer tools` (or `Productivity`) · personal-information question + privacy policy URL · Website · support contact.

**Product declarations** — no non-Microsoft drivers/services · don't claim accessibility testing unless you did it · **Notes for certification** (2k chars, strongly recommended):

> Widgetizer is an Electron-based offline website builder. No account or login is required — launch the app and click "New project" to start. The app runs a local Express server on an ephemeral loopback port (127.0.0.1) to serve the editor UI and render page previews; no data leaves the machine.

**Age ratings** — all questions required (IARC). For a productivity tool this is a run of "No" answers → 3+/Everyone. Read them; a careless "yes" on user-generated content changes your rating and market availability.

**Packages** — upload the `.appx`. Max 25 GB, well within range.

**Store listings** — one per language, English required. Paste the copy from [5.3](#53-copy), upload screenshots (drag to reorder; first is the hero) and the 300 × 300 icon.

Then re-read the description for typos and confirm the privacy URL loads in a private window.

---

## Part 7 — Submit and go live

1. [ ] **Publish** on the Store listing page, or **Submit** on the product Overview.
2. [ ] Certification takes hours to a few business days; first submissions from a new account are slower.
3. [ ] On failure, the report names the policy section. Fix exactly that and resubmit — you edit the existing submission, you don't start over.
4. [ ] On success, install it from the Store yourself and run the [4.5](#45-smoke-test) smoke test against the real Store build.
5. [ ] If you launched link-only, edit → Availability → **Available in Microsoft Store** → resubmit.

### 7.1 Add the badge

- [ ] Store link on `widgetizer.org` and in the GitHub README.

### 7.2 Tell existing users what to do

Because both builds share `%APPDATA%\widgetizer`, an existing user's projects appear immediately in the Store version — but they shouldn't keep both. Put this in the listing description or release notes:

> Already using Widgetizer? Install this version, confirm your projects are there, then uninstall the previous one.

In Settings → Apps → Installed apps they'll see two entries:

| Entry | Which |
|---|---|
| **Widgetizer 1.0.0** | installer version (electron-builder puts the version in the display name) |
| **Widgetizer** | Store version |

So: *uninstall the one with the version number in its name.* It leaves their data intact.

---

## Part 8 — Updates after launch

The Store manages updates for MSIX. `electron-updater` is inert in Store builds, so there's no versioned-URL hosting to maintain.

Per release, after the normal GitHub/NSIS steps in `CLAUDE.md`:

1. [ ] Bump `version` in `package.json`.
2. [ ] Rebuild the appx ([4.2](#42-build)).
3. [ ] Partner Center → **Update** (pre-fills from the last submission).
4. [ ] Packages → upload the new `.appx`.
5. [ ] Store listings → update **What's new in this version**; refresh screenshots if the UI changed.
6. [ ] Submit. Re-certification is usually faster than the first.

---

## Common rejection reasons

| Problem | Fix |
|---|---|
| Identity mismatch between package and Partner Center | Re-copy all three values from Product identity; they're case-sensitive |
| Illegal version — leading `0` | Ship `1.0.0`+ |
| Reviewer can't work out how to use the app | Explain first-run in Notes for certification; check the app's empty state is self-explanatory |
| Privacy policy 404s or contradicts your declaration | Verify in a private window; keep it consistent |
| Screenshots contain marketing text or logos | Plain captures of the real UI only |
| Description mentions other platforms, stores, or competitors | Describe only what the Windows build does |
| Auto-updater active in the Store build | Already handled by `getIsStoreBuild()` — don't regress it |

---

## Sources

- [Free developer registration for individual developers](https://learn.microsoft.com/en-us/windows/apps/publish/whats-new-individual-developer)
- [App package requirements for MSIX app](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements) — Store re-signing, version rules, size limits
- [App screenshots, images, and trailers](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/screenshots-and-images)
- [Microsoft Store Policies](https://learn.microsoft.com/en-us/windows/apps/publish/store-policies)
- [electron-builder: appx](https://www.electron.build/appx)

## Related docs

- [core-electron.md](core-electron.md) — Electron runtime, packaging, `utilityProcess` server model
- `CLAUDE.md` → *Releasing a New Version* — the GitHub/NSIS release process this runs alongside

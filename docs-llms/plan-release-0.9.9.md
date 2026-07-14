# 0.9.9 Release Checklist (temp)

Working checklist for the 0.9.9 release. Delete this file after the release ships.

## Current State (2026-07-13)

- `package.json` version: **0.9.9** ✓
- Arch `theme.json` version: **0.9.9** ✓
- Arch update delta (`themes/arch/updates/0.9.9/`): **missing — must be generated** (see Preflight)
- Changelog dates: both say `TBC` (set on release day)
- Arch: 58 widgets, 32 presets (Bedrock is new this release)

## 1. Preflight

- [ ] Working tree clean, everything pushed (`master` = `origin/master`)
- [x] `npm test` green (backend)
- [x] `npm run test:frontend` green (Vitest)
- [x] `npm run lint:all` clean
- [x] Implement the preset-media slimming — done 2026-07-14, see **[plan-preset-media.md](plan-preset-media.md)** (all suites green: 1,323 backend tests, 22 delta-script tests, lint clean)
- [x] Regenerate the Arch update delta: done 2026-07-14 — **23 MB** (was 197 MB), zero preset media inside, only the `video-modal.js` deletion marker
- [ ] Commit the preset-media change + delta (must ship in the packaged builds)

## 2. Electron Builds

> Order matters on Windows: run the **unsigned** build for the update test first,
> then rebuild **signed** for the actual release so no unsigned artifact ships.

### Mac (run on Mac)

- [ ] `npm run electron:build:mac` (signed + notarized)
- [ ] Fresh install from the `.dmg`: app opens, no auto-maximize, port auto-selection works (launch two instances)
- [ ] Create a project from a preset, edit, save, preview, export
- [ ] Verify `latest-mac.yml`, `.zip`, and both `.blockmap` files exist in `dist-electron/`

### Windows (run here)

> Base fast path: the genuine release-day `Widgetizer-Setup-0.9.8.exe` (2026-04-26)
> exists in `dist-electron/` — move it aside and install it as the baseline; no
> base rebuild from the tag needed. The stale June 0.9.9 exe (495 MB, pre-slimming)
> gets deleted; the rebuild should land ~250 MB.

- [ ] `npm run electron:build:win:unsigned` for the update rehearsal; verify the
      package contains `themes/arch/preset-media/` AND `themes/arch/updates/0.9.9/`
- [ ] Run the full **[Electron update playbook](core-electron-update-tests.md)** (0.9.8 → 0.9.9):
      app auto-update, Arch theme update, opted-in project updates, opted-out project untouched
- [ ] **Preset-media checks (new this release):**
      - `data/themes/arch/latest/` contains NO preset media after the Arch update (delta is 23 MB)
      - In the updated app, create a NEW project from Brewline or Bedrock → starter
        images appear in the media library and on pages (packaged-seed lookup proof)
      - Fresh-install pass: wipe state, install the new 0.9.9 exe directly, create a
        preset project → images seed, and `data/themes/arch/` has NO `preset-media/` copy
- [ ] After the rehearsal passes: `npm run electron:build:win` (signed) — final release artifacts
- [ ] Fresh install from the signed setup exe: same smoke pass as Mac

## 3. Arch Widgets & Settings Sweep

- [ ] All 58 widgets: insert each, fill settings, check preview + export rendering
      (split by category; tick off per session)
- [ ] Widget inserter previews show for every widget
- [ ] Theme settings: every group (colors, typography, shapes, spacing, custom CSS/JS resize)
- [ ] New setting types end-to-end: `date`, `gallery` (captions), `table`, `file`
- [ ] Rich text: headings/images opt-ins, link editor, link-to-file (all media types + filter), stable internal links across a rename
- [ ] New widgets extra attention: Table, Audio Player, Contact Form (form renders in export + forms manifest written), News/Projects/Services grids
- [ ] Collections: create/edit/delete items, item pages, SEO, menu links, News archive
- [ ] Spot-check presets: default Arch, Bedrock (new), plus 3-4 random others — create project, check starter media + menus

## 4. User Test Checklist

- [ ] Full pass of **[user-test-checklist.md](user-test-checklist.md)** on the packaged app (not dev mode)
- [ ] Log regressions as they're found; fix-or-defer decision per item

## 5. Suggested Extra Checks (new this release)

- [ ] **Docker** (new install channel): `docker compose up --build` → create project, upload media, export; restart container and confirm data persists in the volume
- [ ] **Web mode**: `npm run build` + production server start, quick smoke (this is what Docker wraps, but test bare too)
- [ ] **Export verification**: open an exported site directly from disk/static server — internal links, images, srcset, favicon, collection item pages at depth, `sitemap.xml`, forms manifest
- [ ] **Late-landing fixes spot-check**: media picker link-to-any-file + type filter + first-row tooltips; non-Latin form keys/export filename transliteration; stale-project curtain (change active project in a second window)
- [ ] **Locales**: run the app in one non-English locale, click through main screens for missing keys
- [ ] **Upgrade data safety**: after the update playbook, confirm pre-existing projects open cleanly with media/usage intact

## 6. Release Day

- [ ] Set the real date in `CHANGELOG.md` and `docs-website/src/changelog.md` (both currently `TBC`)
- [ ] Build the docs website and deploy (deferred from the docs sprint)
- [ ] Commit, tag `0.9.9`, push tag
- [ ] GitHub release with **all** artifacts: `.dmg` + `.dmg.blockmap`, `.zip` + `.zip.blockmap`, `latest-mac.yml`, `Setup.exe` + `.exe.blockmap`, `latest.yml`
- [ ] Sanity-open `latest.yml` / `latest-mac.yml`: version says 0.9.9, filenames match uploaded assets

## 7. Post-Release

- [ ] Clean-machine install from the public GitHub release (both platforms if possible)
- [ ] Leave a 0.9.8 install running: confirm it detects 0.9.9 from the real feed and updates
- [ ] Delete this file

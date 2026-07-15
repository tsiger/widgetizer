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
- [x] Commit the preset-media change + delta — done (`102ecf30`); screenshot-route fix also committed (`c84bc0e2`)

## 2. Electron Builds

> Order matters on Windows: run the **unsigned** build for the update test first,
> then rebuild **signed** for the actual release so no unsigned artifact ships.

### Mac (run on Mac)

> Preliminary build done 2026-07-15. Boxes below stay open for the final signed
> release build + fresh-install smoke pass.

- [ ] `npm run electron:build:mac` (signed + notarized)
- [ ] Fresh install from the `.dmg`: app opens, no auto-maximize, port auto-selection works (launch two instances)
- [ ] Create a project from a preset, edit, save, preview, export
- [ ] Verify `latest-mac.yml`, `.zip`, and both `.blockmap` files exist in `dist-electron/`

### Windows (run here)

> Base fast path: the genuine release-day `Widgetizer-Setup-0.9.8.exe` (2026-04-26)
> exists in `dist-electron/` — move it aside and install it as the baseline; no
> base rebuild from the tag needed. The stale June 0.9.9 exe (495 MB, pre-slimming)
> gets deleted; the rebuild should land ~250 MB.

- [x] `npm run electron:build:win:unsigned` — package verified to contain
      `preset-media/` AND `updates/0.9.9/` (287 MB, was 495 MB pre-slimming)
- [x] Full **[Electron update playbook](core-electron-update-tests.md)** (0.9.8 → 0.9.9) PASSED:
      app auto-update, Arch theme update (0.9.9), opted-in project → 0.9.9, opted-out stayed 0.9.8
- [x] **Preset-media checks (new this release) PASSED:**
      - `latest/` has NO preset-media after the Arch update ✓
      - New Bedrock project via the updated app → pages + starter images seeded, usage tracked ✓
- [x] **Bug found & fixed during rehearsal:** preset thumbnails 404'd after an update
      (Bedrock arrived only in `latest/`; the `/themes` static route served the frozen
      root copy). Fixed in `c84bc0e2`, rebuilt, re-run — Bedrock thumbnail now shows. ✓
- [ ] After the rehearsal passes: `npm run electron:build:win` (signed) — final release artifacts
- [ ] Fresh install from the signed setup exe: same smoke pass as Mac
- [ ] Optional: fresh-install the 0.9.9 exe directly (no update) — new-user path; confirm
      images seed and `data/themes/arch/` has NO `preset-media/` copy

## 3. Arch Widgets & Settings Sweep

> Completed 2026-07-15: full sweep passed (all widgets + all theme/widget settings).

- [x] All 58 widgets: insert each, fill settings, check preview + export rendering
      (split by category; tick off per session)
- [x] Widget inserter previews show for every widget
- [x] Theme settings: every group (colors, typography, shapes, spacing, custom CSS/JS resize)
- [x] New setting types end-to-end: `date`, `gallery` (captions), `table`, `file`
- [x] Rich text: headings/images opt-ins, link editor, link-to-file (all media types + filter), stable internal links across a rename
- [x] New widgets extra attention: Table, Audio Player, Contact Form (form renders in export + forms manifest written), News/Projects/Services grids
- [x] Collections: create/edit/delete items, item pages, SEO, menu links, News archive
- [x] Spot-check presets: default Arch, Bedrock (new), plus 3-4 random others — create project, check starter media + menus

## 4. User Test Checklist

- [ ] Full pass of **[user-test-checklist.md](user-test-checklist.md)** on the packaged app (not dev mode)
- [ ] Log regressions as they're found; fix-or-defer decision per item

## 5. Suggested Extra Checks (new this release)

- [x] **Docker** (new install channel): `docker compose up --build` → create project, upload media, export; restart container and confirm data persists in the volume — done 2026-07-15
- [x] **Web mode**: `npm run build` + production server start, quick smoke (this is what Docker wraps, but test bare too) — done 2026-07-15
- [x] **Export verification**: open an exported site directly from disk/static server — internal links, images, srcset, favicon, collection item pages at depth, `sitemap.xml`, forms manifest — done 2026-07-15
- [x] **Late-landing fixes spot-check**: media picker link-to-any-file + type filter + first-row tooltips; non-Latin form keys/export filename transliteration; stale-project curtain (change active project in a second window) — done 2026-07-15
- [x] **Locales**: run the app in one non-English locale, click through main screens for missing keys — done 2026-07-15
- [x] **Upgrade data safety**: after the update playbook, confirm pre-existing projects open cleanly with media/usage intact — done 2026-07-15

## 6. Release Day

- [x] Set the real date in `CHANGELOG.md` and `docs-website/src/changelog.md` — set to 2026-07-16
- [ ] Build the docs website and deploy (deferred from the docs sprint)
- [ ] Commit, tag `0.9.9`, push tag
- [ ] GitHub release with **all** artifacts: `.dmg` + `.dmg.blockmap`, `.zip` + `.zip.blockmap`, `latest-mac.yml`, `Setup.exe` + `.exe.blockmap`, `latest.yml`
- [ ] Sanity-open `latest.yml` / `latest-mac.yml`: version says 0.9.9, filenames match uploaded assets

## 7. Post-Release

- [ ] Clean-machine install from the public GitHub release (both platforms if possible)
- [ ] Leave a 0.9.8 install running: confirm it detects 0.9.9 from the real feed and updates
- [ ] Delete this file

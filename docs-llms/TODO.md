# TODO — OSS builder (web + Electron desktop)

Open work for the OSS builder. Hosted-specific items are tracked separately in
`widgetizer-hosted/docs/TODO.md`.

Conventions still in force: commit only on the `experimentation` branch with
explicit permission, never switch branch / never push.

---

## Contents

_Legend: ✅ done · ⏸️ deferred · ⬜ open · ❌ wontfix — **29 done · 3 deferred · 3 open · 1 wontfix**_

- ✅ [1. Relative preview asset URLs (robustness) — DONE 2026-07-01](#1-relative-preview-asset-urls-robustness---done-2026-07-01)
- ❌ [2. Bundled theme updates on the OSS desktop app (product/design decision) — WONTFIX 2026-06-27](#2-bundled-theme-updates-on-the-oss-desktop-app-productdesign-decision)
- ✅ [3. Modernize pre-refactor `src/...` / `server/...` paths in `docs-llms/*` (docs hygiene) — DONE 2026-06-26](#3-modernize-pre-refactor-src--server-paths-in-docs-llms-docs-hygiene---done-2026-06-26)
- ⏸️ [4. Deferred — Playwright E2E smoke (OSS)](#4-deferred--playwright-e2e-smoke-oss)
- ✅ [5. Consolidate preview-dispatch logic (route-mapping half) — DONE 2026-06-25](#5-consolidate-preview-dispatch-logic-route-mapping-half---done-2026-06-25--findings-doc-follow-up-session-task-16)
- ✅ [6. Narrow-sidebar icon-grid + color-picker visual review — DONE 2026-06-26](#6-narrow-sidebar-icon-grid--color-picker-visual-review--c2-follow-up-session-task-18)
- ✅ [7. Missed port — theme-upload collection-schema gate not wired (`builder-server`) — new-theme install path DONE 2026-06-25 (update-import path → §22)](#7-missed-port--theme-upload-collection-schema-gate-not-wired-builder-server---new-theme-install-path-done-2026-06-25-update-import-path--22)
- ✅ [8. Missed port — `pageController` doesn't thread `projectId` into `cleanupDeletedPageReferences` (`builder-server`) — DONE 2026-06-25](#8-missed-port--pagecontroller-doesnt-thread-projectid-into-cleanupdeletedpagereferences-builder-server---done-2026-06-25)
- ✅ [9. Missed port — `Media.jsx` doesn't seed collection-item usage titles (`editor-ui`) — DONE 2026-06-25](#9-missed-port--mediajsx-doesnt-seed-collection-item-usage-titles-editor-ui---done-2026-06-25)
- ✅ [10. Missed port (tests only) — `createCollectionPreviewToken` guard tests (`builder-server`) — DONE 2026-06-26](#10-missed-port-tests-only--createcollectionpreviewtoken-guard-tests-builder-server---done-2026-06-26)
- ✅ [11. Missed port — link-picker Combobox group headers not rendered (`editor-ui`) — DONE 2026-06-26 (sub-item → §24)](#11-missed-port--link-picker-combobox-group-headers-not-rendered-editor-ui---done-2026-06-26-sub-item--24)
- ✅ [12. Missed port — richtext-embedded media not tracked as used (`builder-server`) — DONE 2026-06-26](#12-missed-port--richtext-embedded-media-not-tracked-as-used-builder-server---done-2026-06-26)
- ✅ [13. Missed port — `theme:update-delta` release tool not ported (OSS dev tooling) — DONE 2026-06-26](#13-missed-port--themeupdate-delta-release-tool-not-ported-oss-dev-tooling---done-2026-06-26)
- ✅ [14. Documentation port audit — content gaps from the master-commit doc changes — DONE 2026-06-27 (14c–14e via docs-llms reorg; 14a/14b public-docs)](#14-documentation-port-audit--content-gaps-from-the-master-commit-doc-changes)
- ✅ [15. Missed port — collection item pages leak the `page-{slug}` body class (`render-engine`) — DONE 2026-06-26](#15-missed-port--collection-item-pages-leak-the-page-slug-body-class-render-engine---done-2026-06-26)
- ✅ [16. Missed port — `refreshAllMediaUsage` aborts early on a project with no pages dir (`builder-server`) — DONE 2026-06-26](#16-missed-port--refreshallmediausage-aborts-early-on-a-project-with-no-pages-dir-builder-server---done-2026-06-26)
- ⏸️ [17. Test-strictness audit — ported tests may have dropped master's *exclusion* assertions (cross-cutting) — DEFERRED 2026-06-26 — **low (process)**](#17-test-strictness-audit--ported-tests-may-have-dropped-masters-exclusion-assertions-cross-cutting---deferred-2026-06-26--low-process)
- ✅ [18. Missed port (tests only) — depth-1 render smoke + depth-0 no-leak guard not ported (`builder-server`) — DONE 2026-06-26](#18-missed-port-tests-only--depth-1-render-smoke--depth-0-no-leak-guard-not-ported-builder-server---done-2026-06-26)
- ✅ [19. Missed port (tests only) — `renderCollectionItemPage` contract test not ported (`builder-server`) — DONE 2026-06-26 (tight scope)](#19-missed-port-tests-only--rendercollectionitempage-contract-test-not-ported-builder-server---done-2026-06-26-tight-scope)
- ✅ [20. Stale test comment — claims `remapCollectionItem{Link,Menu}Refs` "NOT ported" when they are (`builder-server`) — DONE 2026-06-26 (option b: comment + direct tests)](#20-stale-test-comment--claims-remapcollectionitemlinkmenurefs-not-ported-when-they-are-builder-server---done-2026-06-26-option-b-comment--direct-tests)
- ✅ [21. Dedup the cross-bundle `getStandalonePreviewTarget` copy + drop its dead `editor-ui` export (`editor-ui` + OSS preview runtime) — DONE 2026-06-26 — **low (cleanup)**](#21-dedup-the-cross-bundle-getstandalonepreviewtarget-copy--drop-its-dead-editor-ui-export-editor-ui--oss-preview-runtime---done-2026-06-26--low-cleanup)
- ✅ [22. Gate collection schemas on the theme **update-import** path too (`builder-server`) — DONE 2026-06-27 (option A) — **low/moderate**](#22-gate-collection-schemas-on-the-theme-update-import-path-too-builder-server--lowmoderate)
- ✅ [23. Widget-catalog enumeration logs spurious "Failed to parse schema" warnings (`builder-server`) — DONE 2026-06-26 — **low (log hygiene / signal-masking)**](#23-widget-catalog-enumeration-logs-spurious-failed-to-parse-schema-warnings-builder-server---done-2026-06-26--low-log-hygiene--signal-masking)
- ✅ [24. Missed port (defensive) — `updatePageWidgets` lacks the `pagesDir` existence guard (`builder-server`) — DONE 2026-06-26 — **trivial (robustness, likely-unreachable)**](#24-missed-port-defensive--updatepagewidgets-lacks-the-pagesdir-existence-guard-builder-server---done-2026-06-26--trivial-robustness-likely-unreachable)
- ✅ [25. Decide whether to anchor `EMBEDDED_MEDIA_PATH_RE` so foreign URLs don't mark local assets "used" (`builder-server`) — RESOLVED 2026-06-26 (keep master parity) — **low (correctness, master-parity tradeoff)**](#25-decide-whether-to-anchor-embedded_media_path_re-so-foreign-urls-dont-mark-local-assets-used-builder-server---resolved-2026-06-26-keep-master-parity--low-correctness-master-parity-tradeoff)
- ✅ [26. Extract the shared dropdown `<ul>` from `ui/Combobox` + `MenuCombobox` instead of the copy-pasted group header (`editor-ui`) — DONE 2026-06-26 — **low (DRY / maintainability)**](#26-extract-the-shared-dropdown-ul-from-uicombobox--menucombobox-instead-of-the-copy-pasted-group-header-editor-ui---done-2026-06-26--low-dry--maintainability)
- ✅ [27. Harden the `theme:update-delta` dev tool — version-tag parsing, quoted diff paths, util reuse (OSS dev tooling) — DONE 2026-06-27 — **low (dev-only, mostly latent)**](#27-harden-the-themeupdate-delta-dev-tool--version-tag-parsing-quoted-diff-paths-util-reuse-oss-dev-tooling---low-dev-only-mostly-latent)
- ✅ [28. Close the path-based storage exceptions for the hosted boundary (adapter discipline) — DONE 2026-07-02 (verified green); lifecycle 4b tail deferred → §30](#28-close-the-path-based-storage-exceptions-for-the-hosted-boundary-adapter-discipline---done-2026-07-02)
- ✅ [29. Loud stale-active-project detection in the OSS editor — DONE 2026-07-07 (curtain + focus/visibility + save-409 + BroadcastChannel fast-path; bootstrap-race follow-up → §36)](#29-loud-stale-active-project-detection-in-the-oss-editor---done-2026-07-07)
- ⏸️ [30. Extract project lifecycle duplicate/import into dir-explicit cores (`builder-server`) — **deferred** until hosted builds duplicate/import (blocker: `AssetStorageAdapter.copy`); the lifecycle tail of §28](#30-extract-project-lifecycle-duplicateimport-into-dir-explicit-cores)
- ✅ [31. Hosted theme save doesn't track theme media usage (`widgetizer-hosted`) — DONE 2026-07-02 — **moderate (data-integrity)**](#31-hosted-theme-save-doesnt-track-theme-media-usage-widgetizer-hosted---done-2026-07-02)
- ⬜ [32. Theme-upload update-import validation smells — `_validate_<ts>` collision + double per-version log (`builder-server`) — **investigate (low)**](#32-theme-upload-update-import-validation-smells-builder-server)
- ⬜ [33. Editor-ui duplication smells — slug-validator ternary + `useMediaState` localStorage pattern (`editor-ui`) — **investigate (low)**](#33-editor-ui-duplication-smells-editor-ui)
- ✅ [34. `copyThemeToProject` exclude-filter widened from dirs to entries (`builder-server`) — DONE 2026-07-07 (top-level-only guard + doc; original premise corrected)](#34-copythemetoproject-exclude-filter-widened-from-dirs-to-entries-builder-server---done-2026-07-07)
- ✅ [35. Hosted create-from-preset + Refresh Usage button don't track media usage (`widgetizer-hosted` + `builder-server`) — DONE 2026-07-02 (dir-aware core + getProjectBase contract) — **moderate (data-integrity)**](#35-hosted-create-from-preset--refresh-usage-button-dont-track-media-usage-widgetizer-hosted--builder-server---done-2026-07-02)
- ⬜ [36. Cold-boot race bounces the editor to the picker on an aborted active-project fetch (`editor-ui`) — **investigate (low/moderate)**](#36-cold-boot-race-bounces-the-editor-to-the-picker-on-an-aborted-active-project-fetch-editor-ui)

---

## 1. Relative preview asset URLs (robustness) — ✅ DONE 2026-07-01

**✅ DONE 2026-07-01.** Implemented as **Option B**: preview-mode `apiUrl` is now `""` (origin-relative
URLs) and `previewController` injects `<base href="/">` instead of `<base href="${SERVER_URL}">`. Two
source edits — `render-engine/src/renderEngine.js` (preview `apiUrl → ""`, cascading to image/file/forms
base + site-icon links) and `builder-server/src/controllers/previewController.js` (origin-root base tag +
the two `sharedGlobals.apiUrl` producers → `""`) — flip all five preview URL categories to root-relative;
`renderFooterAssets` + the enqueue resolver inherit the empty `apiUrl` unchanged. Full backend suite green
(1313); acceptance verified in-browser under a deliberately-wrong `SERVER_URL`: page + collection-item
previews emit `<base href="/">`, zero absolute `/api` URLs, and `masonry.js` loads from the real serving
port (not the pinned one) with no 404s — the original audit failure mode is gone. OSS-only; hosted verified
**inert** (its inline editor preview is same-origin, so the now-relative URLs re-resolve to the same
`APP_ORIGIN` target; three stale hosted comments were corrected). Original
finding below.

Surfaced 2026-06-19 while root-causing a parity-audit "masonry-gallery" false positive — a
preview that rendered completely unstyled, which turned out to be a `SERVER_URL`/port test
artifact (not a code bug). The preview render builds **absolute**
theme/widget asset URLs from `apiUrl = process.env.SERVER_URL || http://localhost:${PORT||3001}`
(`packages/builder-server/src/controllers/previewController.js`; emitted in
`packages/core/src/tags/renderFooterAssets.js` + `renderEngine.js`). If `SERVER_URL` (or the
default port) doesn't match the port actually serving the render, **all** preview CSS/JS 404 and
the preview renders unstyled (and JS-visibility-gated widgets like masonry-gallery lose their
content entirely). This bit the audit because exp ran on :4101 while its dev env pinned
`SERVER_URL=http://localhost:3001`.

**Idea:** make preview asset URLs **relative** (no host) so they always resolve to whatever origin
served the `/render/:token` document, immune to a `SERVER_URL`/port mismatch. **Not a regression**
(master uses the same absolute-URL scheme), and not a parity gap — purely hardening. Caveat: the
render iframe is cross-origin (`localhost:4101` vs editor `localhost:4100`), so confirm a relative
base resolves against the render doc's origin (it should, since the `<base href>`/doc origin is the
render server) and doesn't break the editor's same-origin/hosted-nested cases. Low priority.

---

## 2. Bundled theme updates on the OSS desktop app (product/design decision) — ❌ WONTFIX 2026-06-27

**WONTFIX note (2026-06-27):** Closed as not-a-problem. The original concern came from a
misunderstanding — it assumed bundled theme version bumps should reach existing installs by some
new auto-reconcile/refresh mechanism. They don't need to: from now on theme updates go **through
the existing theme-update system** (`themeUpdateService` / `/themes` apply-update, consuming the
`updates/<version>/` deltas produced by `theme:update-delta`, §13). The install-if-missing seed
behaviour is intentional and correct (it never clobbers user edits); reconciling the bundled seed
on app upgrade is explicitly *not* the chosen path. No code or product change required.

Surfaced 2026-06-19 during an Electron re-validation: a fresh v0.9.9 build showed
**Arch 0.9.6** when creating a new project. Root cause (not a build/refactor regression):

- The app serves themes from the **user data dir** (`getThemesDir()` →
  `~/Library/Application Support/widgetizer/data/themes`), seeded from the bundled themes
  (`THEMES_SEED_DIR`) on startup by `ensureThemesDirectory()`
  (`packages/builder-server/src/controllers/themeController.js`).
- That seed is **install-if-missing only** — `if (await fs.pathExists(dest)) continue;`
  (themeController.js:186). It never overwrites an installed theme, deliberately, so it
  doesn't clobber user edits.
- So a theme dir persisted by an **older installed app** (here 0.9.6) is never refreshed when
  a newer app bundles a newer theme. New projects scaffold from the stale data-dir copy.

This is the **OSS desktop counterpart of the hosted theme-update gap** (see
`widgetizer-hosted/docs/TODO.md` "theme version / library management"). There *is* an
explicit user-triggered update path (`themeUpdateService` / `/themes` apply-update), but
nothing reconciles the **bundled** seed version against the installed copy on app upgrade.

**To decide:** how should bundled theme version bumps reach existing installs?
- Auto-reconcile on startup when the bundled `theme.json` `version` > installed (with a
  strategy for user-modified themes — skip-if-dirty? prompt? fork-and-keep?).
- Or surface an in-app "theme update available" prompt driven by the bundled-vs-installed
  version compare, reusing `themeUpdateService`.
- Or leave manual and just document it.
Tie the decision to the hosted theme-update gap so OSS + hosted share a coherent
theme-versioning story. Not blocking; needs a product call, not just wiring.

---

## 3. Modernize pre-refactor `src/...` / `server/...` paths in `docs-llms/*` (docs hygiene) — ✅ DONE 2026-06-26

**Done note (2026-06-26):** Resolved as part of a **full `docs-llms/` reorg + rewrite** (multi-agent: 36-agent
audit → reorg plan → 30-doc rewrite wave → verification sweep). Every `src/...` / `server/...` citation across
`docs-llms/*` was repointed to its **verified** `packages/*` path (or kept as a legitimate residual `src/`
runtime asset — `previewRuntime.js`, `standalonePreviewTarget.js`, `placeholder.svg` — explicitly labelled as
such in `core-architecture.md` / `core-packages.md`). Path verification is clean: all 166 anchored file-path
citations in the active docs resolve on disk; all cross-doc `.md` links resolve; the only remaining
`src/...`/`server/...` strings are intentional **master** references inside this `TODO.md` and the archived
docs. The blanket "treat package paths as current / docs cite pre-refactor paths" caveat was **dropped** from
`CLAUDE.md` and `AGENTS.md` (the refactor description + authoritative-maps pointer kept); the per-doc "Path
note" header was removed too. Beyond §3's scope, the same reorg also renamed/disambiguated the two
design-system docs, archived three completed logs/trackers to `docs-llms/archive/`, and regenerated
`documentation-index.md`. Original finding below.

Surfaced 2026-06-24, while doing finding **D6** (updated `AGENTS.md` to the package layout)
and the accompanying doc-accuracy sweep.

Several `docs-llms/*` bodies still cite the pre-refactor monolith paths (`src/...`,
`server/...`) instead of the current package paths (`packages/builder-server/src/...`,
`packages/editor-ui/src/...`, `app/...`, etc.). Examples seen: `core-database.md` cites
`server/db/index.js` + `server/db/migrations.js`; `core-media.md` cites
`server/utils/mimeTypes.js` + `server/services/mediaUsageService.js`; `core-page-editor.md`
cites `src/utils/previewRuntime.js`. There are more.

This is **known, tolerated drift** — `CLAUDE.md` carries a blanket "the `docs-llms/*` bodies
sometimes cite pre-refactor `src/...`/`server/...` paths — treat the package paths as current"
note, so nothing is *misleading* to a reader who's read `CLAUDE.md`. We deliberately did **not**
chase it during D6: fixing one path in a doc that uses `server/...` throughout would be
inconsistent, and it's orthogonal to the findings remediation.

**Do it as a dedicated pass** when convenient: grep `docs-llms/` for `\bsrc/` and `\bserver/`,
map each to its package path (see `CLAUDE.md` / `docs-llms/core-architecture.md` for the
mapping), update in bulk, and once the bodies are clean, drop the blanket caveat from
`CLAUDE.md` + `widgetizer/CLAUDE.md` + `AGENTS.md`. Low priority (P3) — cosmetic accuracy, no
behavioural impact.

---

## 4. Deferred — Playwright E2E smoke (OSS)

No end-to-end browser tests exist yet (only `node:test` server + Vitest client/component
suites). Planned "later" for OSS: a **Web smoke** (create → edit → export). **Electron E2E is
deferred** (playwright-electron setup is its own task). Not blocking; the test-coverage audit
(`audit-prompt-test-coverage.md`) tracks coverage gaps meanwhile. (The hosted smoke is tracked
separately in `widgetizer-hosted/docs/TODO.md`.)

---

## 5. Consolidate preview-dispatch logic (route-mapping half) — ✅ DONE 2026-06-25  *(findings-doc follow-up; session task #16)*

Surfaced during OSS finding **C4 + #17** (unify the standalone site preview). The
`buildPreviewUrl(token)` half of the preview-helper consolidation already landed
(`cd2f5a48` — one shared definition in `editor-ui/src/lib/previewBase.js`, was copy-pasted
4×). The **route-dispatch** half is now done too: the open-a-standalone-preview mechanics —
which had been re-inlined in **three** places (`EditorTopBar` and `Sidebar` each hand-rolled
the electron-bridge-vs-`window.open` branch; `Sidebar` even hardcoded `` `/preview/${id}` ``
instead of the registry) — were folded into a single dispatch in
`editor-ui/src/lib/openSitePreview.js`:
- `openPagePreview(pageId)` / `openCollectionItemPreview(slugPrefix, slug)` resolve the route
  through the `previewBase` registries, then share one internal `openResolvedPreview(path)`.
- `EditorTopBar.jsx` + `Sidebar.jsx` now call `openPagePreview`; the collection forms keep
  calling `openCollectionItemPreview` (now also routed through the shared open).
- The old unused exported `openSitePreview(path)` was removed (imported nowhere).
- **Guard unified** (the one judgment call, agreed up-front): both page + item open paths now
  honour an embedding-host override (`/sites/:siteId/preview/...`) identically — electron bridge
  for in-app `/preview/...`, `window.open` for an app-relative host path, and **refuse**
  absolute/protocol-relative values. Inert today (no shell wires `setStandalonePreviewPath`
  yet) but removes the asymmetry that would have bitten the hosted full-parity work.
- Covered by `editor-ui/src/lib/__tests__/openSitePreview.test.js` (web open, electron bridge,
  host-override, absolute/protocol-relative refusal).

`previewLinkUtils` was deliberately **left out** of the fold — it parses arbitrary in-preview
hrefs (the navigation-guard concern), a different job from dispatching a known target. (Its own
cross-bundle dup is now tracked separately — §21.)

editor-ui change (OSS) → inherited by web/Electron/hosted. Natural companion to the **hosted
preview full-parity decision** (`widgetizer-hosted/docs/TODO.md` §7): if hosted moves to the
persistent `SitePreviewLayout` pattern, this single dispatch is what both repos' layouts call.

---

## 6. Narrow-sidebar icon-grid + color-picker visual review — ✅ DONE 2026-06-26  *(C2 follow-up; session task #18)*

**Done note (2026-06-26):** Eyes-on pass in the running app surfaced three concrete issues, all fixed:
- **Icon grid — stretched buttons.** `IconInput.jsx` hardcoded the cell at 40px; with the C2
  `.icon-grid-button { width: 100% }` fill, the narrow sidebar produced ~26×40 *rectangles*. Made the
  cell size width-aware (`cellSize` derived from the measured scroll-container width, capped at the 40px
  `baseCellSize` so wide contexts/Theme Settings are untouched, floored at `minCellSize`); `rowHeight`
  now follows it, so buttons are square at any panel width and the virtual-scroll math stays consistent.
- **Icon grid — empty-on-reopen bug** (pre-existing, unrelated to C2). The `scrollTop` state persisted
  across close→reopen; the fresh scroll container mounts at 0 while the virtualizer rendered rows for the
  stale offset (down in the spacer), so the list looked empty until the first scroll resynced it. Reset
  `scrollTop` (state + DOM) when the picker opens.
- **Color picker — overflow / horizontal scrollbar.** `react-colorful`'s fixed 200px square overflowed the
  (since-narrowed) sidebar. Scoped `.page-editor-settings .color-picker-popover .react-colorful` to
  `width: 100% !important; height: 160px !important` (the `!important` is required — react-colorful injects
  its `width: 200px` as an *unlayered* `<style>`, which beats this `@layer components` rule on cascade-layer
  order regardless of specificity), gave the popover `width: 100%`, and tightened the popover inner padding
  `p-3 → p-1` to reclaim width. Theme Settings keeps the default size (rule is sidebar-scoped).

Tests: `IconInput.test.jsx` green (4); lint clean. CSS-only/cosmetic + the one virtualization bugfix — no
unit surface for the visual sizing, verified in-app by the user. Original finding below.

Surfaced post-**C2** (compact settings-sidebar CSS, `c74d714f`): the icon-grid and color
picker in the narrow (~200 px) right page-editor settings sidebar looked slightly off after the
port. CSS-only, no behavioural impact — needs an eyes-on pass in the running app (the CSS has no
unit surface). Check the icon-grid fill/wrap and the color-picker sizing/alignment under
`.page-editor-settings`; adjust `styles/preset.css` / the `icon-grid-button` hook as needed.
Low priority, cosmetic.

---

## 7. Missed port — theme-upload collection-schema gate not wired (`builder-server`) — ✅ new-theme install path DONE 2026-06-25 (update-import path → §22)

**Status (2026-06-25):** the **new-theme install** path is now gated, restoring master parity:
`validateThemeCollectionSchemas(extractedThemeDir)` runs between the `latest/` removal and the
`fs.copy` commit in `uploadTheme` (`themeController.js`); an invalid theme (bad schema, duplicate
slugPrefix, or a preset shipping `collection-types/`) is rejected with **400 + per-collection
`errors`** before anything is written. Covered by a new `describe("uploadTheme collection-schema
validation")` block in `themes.test.js` (invalid-schema → 400, BLOCKER-1 preset-owned
collection-types → 400, valid-schema → 201). Also **manually verified** 2026-06-25: uploading a
theme with an invalid collection schema to `POST /api/themes/upload` returns 400 and installs
nothing; a valid one installs (201). The **update-import path** (importing new update
versions into an installed theme — an exp-only branch master never had) is **not** gated here; it
needs different handling because the effective theme only exists after `buildLatestSnapshot` merges
base + updates — tracked as **§22**. Original finding below.

Surfaced 2026-06-24 during the master-commit port audit, inspecting **`6e6fe472`**
(Collections Phase 1) against latest master.

The Collections feature was ported wholesale into the new package architecture, but **one
call site was missed**: `validateThemeCollectionSchemas` was ported into
`packages/builder-server/src/services/collectionService.js` (and is exercised by tests) yet is
**never called** — grep finds zero callers across `packages/app/electron`.

On **latest master** (`server/controllers/themeController.js:1436`, still live — not undone by a
later commit), `uploadTheme` runs the gate before committing an uploaded theme:

```text
const collectionValidation = await validateThemeCollectionSchemas(extractedThemeDir);
if (!collectionValidation.valid) {
  await fs.remove(tempDir);
  return res.status(400).json({ message: "Invalid theme: collection-type schema validation failed.", errors: ... });
}
await fs.copy(extractedThemeDir, themeDir);
```

On **experimentation**, `uploadTheme`
(`packages/builder-server/src/controllers/themeController.js:1419-1441`) is byte-identical to
master's new-theme install path **except this gate + its import are absent** —
`fs.copy(extractedThemeDir, themeDir)` runs with no validation.

**Effect (moderate, not security):** a theme shipping an invalid collection-type schema
(bad schema, reserved/duplicate `slugPrefix`, or a preset that ships `collection-types/` —
BLOCKER-1) is *installed* instead of rejected with a 400 + per-collection errors. Not a crash
risk — `listCollectionSchemas` is skip-invalid / never-throws, so bad schemas are silently
dropped at read time. What's lost is the **upfront rejection + theme-author error feedback**
(Collections spec Section 5 "Theme Upload Validation" parity).

**Fix (near-verbatim):** `validateThemeCollectionSchemas(themeSourceDir)` is path-based
(operates on the extracted temp dir) — no scope/adapter needed. Add the import + the
validation block between `fs.remove(extractedLatestDir)` and `fs.copy(extractedThemeDir, themeDir)`,
returning 400 on invalid — identical to master.

**Test-first (TDD):** no experimentation test covers the rejection behavior (the gate was never
wired). Master had coverage in `collections.test.js` / `themes.test.js`. Add a red `node:test`
in `builder-server` asserting `uploadTheme` returns **400 + `errors`** for a theme zip carrying
an invalid collection-type schema, then wire to green.

**Hosted impact:** none required — the fix lives in shared `builder-server`, so hosted inherits
it automatically. Hosted's server wires no theme-upload route today (grep empty); if it ever
exposes upload it gets the gate for free. No hosted-only concepts involved.

---

## 8. Missed port — `pageController` doesn't thread `projectId` into `cleanupDeletedPageReferences` (`builder-server`) — ✅ DONE 2026-06-25

**Status (2026-06-25):** fixed — both call sites in `pageController.js` now pass `scope.projectId`
as the 3rd arg (`deletePage` `:345`, `bulkDeletePages` `:411`), so the collection-item media-usage
re-sync fires on page delete, restoring master parity. Covered by a new
`describe("deletePage — re-syncs collection-item media usage")` block in `pages.test.js` that drives
the real controllers: a collection item links to the deleted page via a link whose href is a media
path, so clearing the link drops the reference and the re-synced usage index goes from
`["collection:portfolio/alpha"]` → `[]`. Two tests (one per call site); each verified to go red when
*only its own* call site is left un-threaded. Original finding below.

Surfaced 2026-06-24 during the master-commit port audit, inspecting **`eea285de`**
(Collections Phase 7 — link integrity) against latest master.

`cleanupDeletedPageReferences(projectFolderName, deletedPageUuid, projectId = null)` was ported
**faithfully** into `packages/builder-server/src/utils/linkEnrichment.js` — including the
optional `projectId` tail param and its media-usage re-sync block:

```text
const touched = await updateCollectionItems(collectionsDirFor(projectFolderName), (item) => …); // link cleanup — always runs
if (projectId) {
  for (…touched…) await syncCollectionItemMediaUsageOnWrite(projectId, type, slug, item, null);   // media re-sync — gated
}
```

But the **callers don't thread `projectId`**. On latest master (`pageController.js:333` & `:401`,
still live) both call sites pass `activeProject.id` as the 3rd arg:
`cleanupDeletedPageReferences(projectFolderName, deletedPageUuid, activeProject.id)`.

On experimentation (`packages/builder-server/src/controllers/pageController.js:345` & `:411`)
both pass only **two** args:
`cleanupDeletedPageReferences(scope.folderName, deletedPageUuid)` — so `projectId` is `null` and
the media re-sync never fires.

**Effect (low):** when a page is deleted, collection items linking to it still get their dead
links cleared (the `touched` rewrite is unconditional) — but the media-usage index is **not**
re-derived for those touched items. In practice clearing a page-link rarely changes an item's
media set, so the index usually stays correct; the gap is a stale-media-usage-entry edge case +
parity loss, not a crash or security issue.

**Fix (one-line × 2):** thread `scope.projectId` (already populated for OSS *and* hosted; used
two lines up at `pageController.js:113/123` for `syncPageMediaUsageOnWrite/Delete`) as the 3rd
arg at both call sites:
- `:345` → `cleanupDeletedPageReferences(scope.folderName, deletedPageUuid, scope.projectId)`
- `:411` → `cleanupDeletedPageReferences(scope.folderName, uuid, scope.projectId)`

**Test-first (TDD):** add a `node:test` asserting that deleting a page which a collection item
links to re-syncs that item's media usage (master covered the cleanup path in
`collectionLinkEnrichment.test.js`; the experimentation port has the function-level test but no
caller-threading assertion).

**Hosted impact:** none — pure `builder-server` change; `scope.projectId` is already set on both
OSS and hosted request scopes. No hosted-only concepts.

---

## 9. Missed port — `Media.jsx` doesn't seed collection-item usage titles (`editor-ui`) — ✅ DONE 2026-06-25

**Status (2026-06-25):** fixed. `Media.jsx` `loadUsageTitles` now also fetches collection schemas +
items and seeds the usage-title map with `collection:{type}/{slug}` → `"{displayName}: {item title}"`,
so the Media "Used in" badge shows the friendly label instead of the raw source string. The map-building
was extracted to a pure `buildUsageTitleMap({ pages, collections })` + `GLOBAL_USAGE_TITLES` constant in
`utils/mediaUsageDisplay.js` (next to `resolveUsageTitle`), so it's unit-tested without React;
`Media.jsx` just does the fetching (per-fetch `.catch(() => [])` so a collections failure can't blank the
page titles) and calls it. Used `schema.displayName` per master (so a News item reads "Article: …", since
Arch news `displayName` is "Article"). Covered by 8 new Vitest cases in `mediaUsageDisplay.test.js`
(collection seeding, end-to-end resolve, slug fallback, page-key precedence, multi-collection +
typeless-schema + empty-items guards, globals-only empty input, no-mutation).

**Parity verified** (adversarial review): the seeded key `collection:${schema.type}/${item.slug}` exactly
matches the backend `usedIn` writer `collection:${collectionType}/${itemSlug}`
(`builder-server/src/services/mediaUsageService.js:288`), so the labels actually resolve. Original
finding below.

Surfaced 2026-06-24 during the master-commit port audit, inspecting **`122311d8`**
(Collections Phase 14 — media library awareness of collections) against latest master.

Phase 14 had **two halves**. Half 1 — extract `resolveUsageTitle` into a shared
`mediaUsageDisplay.js` — was done (session task #20, the dedup). **Half 2 was missed:**
`Media.jsx` was supposed to also fetch collection schemas + items and seed the usage-title map
with `collection:{type}/{slug}` → `{displayName}: {item title}` entries.

On latest master (`src/pages/Media.jsx:118-139`, still live), `loadUsageTitles` does:

```js
const [pages, schemas] = await Promise.all([getAllPages(), getCollectionSchemas().catch(() => [])]);
// …seed pages…
const itemsLists = await Promise.all(schemaList.map((s) => getCollectionItems(s.type).catch(() => [])));
// …
nextMap[`collection:${schema.type}/${item.slug}`] = `${schema.displayName}: ${item.title || item.slug}`;
```

On experimentation (`packages/editor-ui/src/pages/Media.jsx`, the `loadUsageTitles` effect
~L109-141) only fetches **pages** (`getAllPages()`) and seeds the global + page keys — it never
fetches collections nor seeds any `collection:` key.

**Effect (low / cosmetic):** in the Media library "Used in" tooltip/badge, a media file used
inside a collection item shows the **raw source string** `collection:news/hello-world` instead of
the friendly `News: Hello World`. Degrades gracefully — `resolveUsageTitle` (the ported helper)
returns the raw `usageEntry` string when the map lacks the key (`mediaUsageDisplay.js:33`). No
crash, no data issue; purely a human-readable-label gap.

**Fix:** in `Media.jsx` `loadUsageTitles`, mirror master — also `getCollectionSchemas().catch(() => [])`,
then `getCollectionItems(schema.type).catch(() => [])` per schema (in parallel), seeding
`nextMap[\`collection:${schema.type}/${item.slug}\`] = \`${schema.displayName}: ${item.title || item.slug}\``.
Both query fns already exist (`collectionManager.getCollectionSchemas` / `getCollectionItems`,
Phase 10).

**Test-first (TDD):** master covered `resolveUsageTitle` (ported, 7 tests); add a `Media.jsx`-level
or resolver-integration test asserting a `collection:{type}/{slug}` key resolves to
`{displayName}: {title}` once seeded.

**Hosted impact:** none — pure `editor-ui` change, inherited by web/Electron/hosted via the
vendored package. No hosted-only concepts.

---

## 10. Missed port (tests only) — `createCollectionPreviewToken` guard tests (`builder-server`) — ✅ DONE 2026-06-26

**Status (2026-06-26):** added the `describe("createCollectionPreviewToken — guards")` block to
`packages/builder-server/src/tests/preview.test.js` mirroring master — asserts **400** on missing
`collectionType`, **404** on an unknown collection, and **400** on a collection whose schema exists
but ships no `template.liquid` (seeded via the scope-first adapter: a valid `collection-types/<type>/
schema.json` with no template sibling). Exact status + `error`/`message` assertions (no loose
`includes`). The guards already worked (this is a regression lock, not a fix); proved non-vacuous by
disabling each guard in turn and confirming only its own test goes red. Full `builder-server` suite
green (1245). The docs half of `c38b76af` is a non-issue (see note below). Original finding below.

Surfaced 2026-06-24 during the master-commit port audit, inspecting **`c38b76af`**
(docs + guard tests for collection item preview).

The collection-preview endpoint `createCollectionPreviewToken`
(`packages/builder-server/src/controllers/previewController.js`, route `POST /api/preview/collection`)
is **fully ported with its guards intact**: missing `collectionType` → 400, unknown collection
→ 404, template-less collection → 400 (`previewController.js` ~L315-327). What was **not** ported
is the guard-path **test coverage** master added in `server/tests/preview.test.js`
(`describe("createCollectionPreviewToken — guards")`, master L495-522). Experimentation's
`preview.test.js` has no collection-preview tests at all.

**Effect:** none functionally — guards work. Purely a regression-protection gap: these 400/404
guards are unprotected against future edits.

**Fix (test-only, TDD):** add a `createCollectionPreviewToken — guards` block to
`packages/builder-server/src/tests/preview.test.js` mirroring master — assert 400 on missing
`collectionType`, 404 on unknown collection, 400 on a collection with no `template.liquid`.
(Adapt to the scope-first signature: handler reads `req.scope` + `req.adapters.storage`.)

**Hosted impact:** none — `builder-server` test only.

**Note:** the *docs* half of `c38b76af` (core-collections.md §9 "Item preview") describes the
in-panel `CollectionItemPreview.jsx` UI that was later removed on master (582168d1) and never
existed on experimentation (#17). Experimentation's `core-collections.md` should describe the
navigable-preview UX instead — covered by the broader docs-accuracy follow-up (§3), not re-recorded here.

---

## 11. Missed port — link-picker Combobox group headers not rendered (`editor-ui`) — ✅ DONE 2026-06-26 (sub-item → §24)

**Status (2026-06-26):** fixed. `ui/Combobox.jsx` now renders a non-clickable uppercase section
header before the first option of each `group` (mirroring `MenuCombobox.jsx:79–90`:
`showHeader = option.group && (idx === 0 || filteredOptions[idx-1].group !== option.group)`, wrapped
in a `Fragment`), so the LinkInput picker shows "PAGES" / "NEWS" / … dividers instead of one flat
list. Backward-compatible — ungrouped options (other `Combobox` consumers) render no header. Covered
by a new `ui/__tests__/Combobox.test.jsx` (headers render on group change, not repeated within a
group, one-header-per-group structural count, option selectable, header NOT selectable, ungrouped =
no header) — red on the flat Combobox, green after. Full frontend suite green (664). The defensive
`updatePageWidgets` `pagesDir` guard sub-item was **excluded and moved to §24**. Original finding below.

Surfaced 2026-06-24 during the master-commit port audit, inspecting **`3f707b26`**
(Sort link picker entries alphabetically — pages, groups, items) against latest master.

`3f707b26` did two things: (a) make widget/item `link` settings able to target **collection
item pages** (not just pages), resolved/cleaned/remapped at render/delete/duplicate/preset-seed
time; and (b) present the LinkInput picker as an **alphabetically sorted, grouped** list
(a "Pages" group, then one group per collection, items A–Z within each), rendered with section
headers by the shared `<Combobox>`.

**Half (a) is fully ported** — verified end-to-end on experimentation: `useLinkTargets`
(editor-ui hook), `linkValueResolver.js`/`resolveStoredLink` (+ tests), `LinkInput.jsx`
(`isPage`/`isCollectionItem`/`collectionItemUuid`), and the entire backend chain
(`schemaHasLinkSetting`, `resolveLinkValue`/`resolveCollectionItemLinks` collection-item
resolution in both `render-engine` and `builder-server`, `hasLinkSettings` lazy-load in
`renderWidget`, `cleanupDeletedCollectionItemReferences` link-clearing across pages/globals/items,
`remapDuplicatedProjectUuids` collectionItemUuid remap, `remapCollectionItemLinkRefs` + its
preset-seed call site). No gap there.

**Half (b)'s rendering was missed.** The data layer already sorts + tags every option with a
`group` field — `useLinkTargets.js:51` (`group: "Pages"`) / `:70` (`group: groupLabel(schema)`),
and its own doc-comment claims "the shared `<Combobox>` renders (a 'Pages' group + one group per
collection)". But `packages/editor-ui/src/components/ui/Combobox.jsx:91` still renders the **flat**
pre-`3f707b26` list — `filteredOptions.map((option) => <li>…option.label…</li>)` — with no
group-header logic. Master's `Combobox.jsx` renders a header `<li>` above the first option of each
group (`showHeader = option.group && (idx === 0 || filteredOptions[idx-1].group !== option.group)`,
wrapped in a `Fragment`); ungrouped options render flat (no-op), so the change is backward-compatible
for the picker's other consumers.

(Note: menus use a *separate* `MenuCombobox` which **does** render collection groups — ported in
finding #11/`118a0830`. This gap is only the generic `ui/Combobox` used by `LinkInput`.)

**Effect (low / cosmetic-UX):** link-picker entries are still in the correct sorted order (Pages
A–Z, then each collection A–Z), but the **section header labels** ("PAGES", "NEWS", …) that
divide the groups are missing — the dropdown reads as one undifferentiated alphabetical-ish list.
No functional/data impact; collection-item targets still select and resolve correctly.

**Fix:** port master's grouped-rendering block into `ui/Combobox.jsx` — render a non-clickable
header `<li>` (the `text-xs font-semibold uppercase tracking-wide text-slate-400` style) before the
first option of each `option.group`, via the `showHeader` test above, wrapped in `Fragment`.
Backward-compatible (ungrouped options unaffected).

**Test-first (TDD):** add a Vitest `Combobox` test asserting that, given options carrying `group`,
a header row renders once per group above its first option (and that ungrouped options render no
header). Master had no dedicated Combobox test; this also closes that coverage.

**Hosted impact:** none — pure `editor-ui` change, inherited by web/Electron/hosted via the
vendored package.

**Minor sub-item (defensive, likely-unreachable):** `3f707b26` also added a
`if (!(await fs.pathExists(pagesDir))) return;` guard to `updatePageWidgets`
(`builder-server/src/utils/linkEnrichment.js:56`) — experimentation's copy calls `fs.readdir(pagesDir)`
with no guard. In the OSS new-project flow this can't throw: `scaffoldProjectContent`
(`projectController.js:303`) creates the pages dir **before** `seedPresetCollections` →
`remapCollectionItemLinkRefs` → `updatePageWidgets` runs (`:313`), and that call is wrapped in
try/catch (`:314`). Hosted uses its own scoped seeding, not this fs path. Worth adding the
one-line guard for parity/robustness alongside the Combobox fix, but not independently impactful.

---

## 12. Missed port — richtext-embedded media not tracked as used (`builder-server`) — ✅ DONE 2026-06-26

**Done note (2026-06-26):** Ported both missing halves into `mediaUsageService.js` — `EMBEDDED_MEDIA_PATH_RE`
+ `extractMediaPathsFromString` (now drives `collectMediaPaths`'s string branch; removed the dead
whole-string `isMediaPath`) and `recordMediaPaths(file)` (original `path` + all `sizes.*.path` variants),
threaded through `findFileIdsByPaths` and `refreshAllMediaUsage`'s `pathToFileId`. Both kept module-internal
(no API widening). TDD: 3 `node:test` cases in `mediaUsage.test.js` (`updatePageMediaUsage` + `refreshAllMediaUsage`
track a richtext-only `-large` variant; multi-path extraction incl. master's trailing-period over-match) — red
first, then green. Vacuity spot-check: reverting *each* half independently reds exactly those 3 and nothing else,
proving both load-bearing. Full backend suite 1248 green, lint clean. Export-copy end-to-end test deliberately
skipped (export prune is purely `usedIn.length > 0`, `exportController.js:722/803`, already covered) — fix is
covered-by-construction once usage tracking is correct.

Surfaced 2026-06-24 during the master-commit port audit, inspecting **`5940dada`**
(Add opt-in richtext images with automatic media resolution) against latest master.

`5940dada` has four parts. **Three are ported:** the editor (`ResolvedImage.js` TipTap NodeView +
RichTextInput media picker), the **sanitizer** `<img>` gating (`sanitizeRichText` adds `img` +
`src`/`alt` only when `allow_images`, `sanitizationService.js:54/57`, dispatched :230/:377), and
the **render-time resolution** of embedded `/uploads/…` paths to the served base
(`core/utils/richtextMedia.js` `resolveRichtextMediaInSettings`/`…InWidgetData`, wired at
`render-engine/renderEngine.js:697` for widgets and `collectionService.js:1115`
`prepareCollectionItemForRender` for collection items). So **inline richtext images render
correctly in preview.**

**The media-usage-tracking half was missed.** Master rewrote `mediaUsageService.js` so usage
scanning (a) finds upload paths embedded *anywhere* in a string — including a richtext `<img src>`
inside saved HTML — and (b) matches a media record by its `path` **plus every size variant**
(`sizes.{small,medium,large}.path`). Two functions were added and threaded through:

- `extractMediaPathsFromString(value)` via `EMBEDDED_MEDIA_PATH_RE =
  /\/uploads\/(?:images|files)\/[A-Za-z0-9._-]+/g`, replacing the old whole-string
  `isMediaPath()` check inside `collectMediaPaths`.
- `recordMediaPaths(file)` (original path + all size-variant paths), used in `findFileIdsByPaths`
  and `refreshAllMediaUsage`.

On **experimentation all three are absent** (grep: `extractMediaPathsFromString` /
`recordMediaPaths` / `EMBEDDED_MEDIA_PATH_RE` → zero hits). `collectMediaPaths`
(`mediaUsageService.js:24`) still adds only a value that *is* a bare upload path;
`findFileIdsByPaths` (`:154`) and `refreshAllMediaUsage` (`:402`) still key on bare `file.path`.

**Effect (moderate — a functional break for the very use case the feature enables):** export copies
a media record only when `file.usedIn.length > 0` (`exportController.js:721-722`; unused images are
pruned — `:776` "skipped … unused images"). An image inserted **only** into a richtext field
(e.g. an inline image in a News article body — `allow_images` is enabled on Arch News `body` +
Projects `description`) gets an **empty `usedIn`**, so it is **skipped on export** and the
exported/published page shows a broken `<img>`. It also isn't deletion-protected (shows as
"unused", so a user can delete a still-referenced image). Preview is fine (rendering half ported),
which **masks the bug until export/publish.** The two missing functions are a matched pair — a
richtext `<img>` embeds the `-large` **variant** path, which only matches its record via
`recordMediaPaths`, and is only seen at all via `extractMediaPathsFromString`. An image *also*
used in a normal `image` setting is unaffected (tracked via that, and export copies all its sizes).

**Fix (near-verbatim port):** in `packages/builder-server/src/services/mediaUsageService.js`, add
`EMBEDDED_MEDIA_PATH_RE` + `extractMediaPathsFromString` and switch `collectMediaPaths`'s string
branch to it; add `recordMediaPaths(file)` and use it in both `findFileIdsByPaths`
(`recordMediaPaths(file).some((p) => mediaPathSet.has(p))`) and `refreshAllMediaUsage`
(`for (const p of recordMediaPaths(file)) pathToFileId.set(p, file.id)`). Pure functions, no
scope/adapter surface. (Note: the regex's `.` allows the embedded match to include a trailing
sentence period in prose like `see /uploads/images/x.jpg.` — master accepted this; over-matching
only ever marks an asset "used", the safe direction. Keep parity unless we deliberately tighten.)

**Test-first (TDD):** master added `richtextMedia.test.js` + usage coverage. Add a `node:test`
asserting (1) `refreshAllMediaUsage` marks an image referenced only via a richtext `<img src>` (a
`-large` variant path) as used on its record, and (2) it is therefore copied by export. Red first
(both fail on current `mediaUsageService`), then port to green.

**Hosted impact:** none required — fix lives in shared `builder-server`; hosted's usage tracking
runs the same `mediaUsageService`, so it inherits the fix. No hosted-only concepts.

---

## 13. Missed port — `theme:update-delta` release tool not ported (OSS dev tooling) — ✅ DONE 2026-06-26

**Done note (2026-06-26):** Recovered `scripts/theme-update-delta.js` from `master` and re-added the
`theme:update-delta` npm script. **Not** verbatim — adapted to the repo's tested-script convention
(matching `preset-sync.js`): `export`ed the eight pure helpers (`parseSemver`, `parseVersionFromTag`,
`compareVersions`, `describeProgression`, `isExcludedRelPath`, `isDeletionEligible`, `parseDiffNameStatus`,
`buildPlan`) and replaced the bare `main().catch(...)` with an `isDirectRun` guard so importing the module
doesn't shell out to git. No logic changes. TDD: `scripts/__tests__/theme-update-delta.test.js` (18 Vitest
cases) covers version logic, the exclusion/deletion predicates, the `git diff --name-status` parser (incl.
prefix-stripping, out-of-theme skip, auto-required `theme.json`), and `buildPlan` bucketing — red first
(module absent), then green. Verified: `--dry-run` against `themes/arch` produces a real plan and writes
nothing; eslint clean on both files; `test:frontend` 682 green. Still ties into the open bundled-theme-update
story (§2).

Surfaced 2026-06-24 during the master-commit port audit, inspecting **`ac9a4f5c`** (Add
`theme:update-delta` script for bundled Arch releases) + **`c846b84e`** (its untracked-files note)
against latest master.

`scripts/theme-update-delta.js` and its `"theme:update-delta": "node scripts/theme-update-delta.js"`
npm entry are **absent on experimentation** (grep + `package.json`). The sibling preset/theme tools
*were* ported (`theme:sync`, `preset:sync`, `preset:media`→`pack-preset-media.js`,
`preset:templates`→`sync-preset-templates.js`); this one was missed.

**What it is:** a manual **release-time dev tool** that generates a theme's `updates/<version>/`
delta folder by git-diffing between release tags
(`npm run theme:update-delta -- themes/arch --from 0.9.8 --version 0.9.9`). The
`updates/<version>/` folder is the staged set of files the **theme-update runtime** applies to
existing installs.

**Effect (low, non-runtime):** no app/user impact. The tool's **output is already present** — the
`themes/` tree is byte-identical exp↔master, so Arch's existing `updates/…` deltas shipped. The
**runtime** that consumes them is intact (finding B1 — `UPDATABLE_PATHS` incl. `collection-types`).
What's lost is only the **ability to regenerate** delta folders when cutting a *future* Arch
version on this branch — a developer would otherwise hand-build `updates/<version>/`. Ties into the
unresolved bundled-theme-update story (§2).

**Fix:** port `scripts/theme-update-delta.js` verbatim (it's a standalone Node script: it shells out
to `git`, reads/writes files under a theme dir, no app/package imports — verify it doesn't assume
the pre-refactor layout; it operates on `themes/<theme>` paths which are unchanged) and re-add the
`theme:update-delta` npm script. Low priority — do it when the theme-update workflow is next
revisited (§2), not urgent.

**Hosted impact:** none — OSS-only release tooling; hosted has its own (separate) theme-management
story.

---

## 14. Documentation port audit — content gaps from the master-commit doc changes — ✅ DONE 2026-06-27

**Done note (2026-06-27):** 14a + 14b landed (verified against experimentation code, not blind-ported from
master). **14a** — `docs-website/src/theme-dev-objects-context.md` + `theme-dev-menus-snippets.md` now document
`currentCanonicalPath` (matched against each menu item's `canonicalPath`) instead of the removed `pageSlug`
global; confirmed against `packages/core/src/snippets/menu.liquid` + `render-engine`/`menuResolver`. **14b** —
`docs-website/src/theme-dev-setting-types.md` now documents the `gallery` (array of `/uploads/images/…` path
strings) and `table` (author-declared `columns` → array of row objects) setting types, with schema + Liquid
examples verified against `sanitizationService.js` and real Arch usage. Sweep done across all docs: the only other
`pageSlug` hits are intentional (this TODO's history, the archived findings log, and `future-mcp.md`'s unrelated
hypothetical MCP tool param); `docs-website/dist/*.html` is gitignored build output that regenerates from `src/`.
The same sweep also reconciled today's §22/§27 changes into `core-themes.md` + `theme-updates.md` (see those
commits). §2 (WONTFIX) needed no doc change — nothing promised bundled-theme auto-reconcile. Original finding below.

**Status (2026-06-26):** the **`docs-llms` sub-items are DONE** via the full docs-llms reorg/rewrite (see §3) —
**14c** (`theming-setting-types.md` richtext `allow_headings`/`allow_images`/`min_height` + gallery/table depth
+ the folded-in `file` setting type), **14d** (`rte_text`/`rte_blank` filters), and **14e** (collection-item
link targets documented in `core-collections.md` / `core-menus.md` / `theming-setting-types.md` /
`theme-preset-file-format.md`) all landed. **14f** needs no port (recorded only). **Remaining open: 14a + 14b**
— these are **public `docs-website/src/*` theme-author docs** (the removed `pageSlug` global; missing
gallery/table in `theme-dev-setting-types.md`), which were **out of scope** for this `docs-llms`-only pass. §14
stays open until 14a/14b are ported. Original finding below.

Surfaced 2026-06-24 on a **second pass** through the master-commit port audit, this
time reading the docs each commit touched (`docs-llms/*`, `docs-website/src/*`; `docs-entities/*`
Obsidian vault stays out, decided earlier). Goal: which doc *content* must land on experimentation,
and how much it needs rewriting for the package architecture.

**Framing — two doc layers, very different rewriting cost:**
- **`docs-website/src/*` = public theme-developer docs.** They describe the `theme.json`/schema format,
  Liquid globals/filters, and setting-type JSON — all **identical across OSS-monolith, the package
  refactor, and hosted**. Porting this content needs **essentially no architectural rewriting**: copy
  master's prose ~verbatim. These ship to theme authors, so a stale/missing entry here is the most
  user-visible.
- **`docs-llms/*` = internal architecture docs.** Bringing content here means porting the feature
  description **and** mapping master's `server/…`/`src/…` path citations to the package paths
  (`packages/builder-server/src/…`, `packages/editor-ui/src/…`, `packages/core/…`) — the same
  path-modernization already tracked in §3 — plus noting the scope-first / adapter-injected shape and
  hosted parity where relevant (exp's `core-collections.md` already models this: "a multi-tenant host
  swaps in its own scope-bound `/preview/collection` renderer").

**NOT a gap (already correct on exp), for the record:**
- `docs-llms/core-collections.md` — already describes the **navigable** item preview (saved-state,
  `/preview/collection` token, in-preview link bubbling) **and** the hosted scope-bound renderer
  (`core-collections.md:151`). Supersedes the removed in-panel `CollectionItemPreview` docs; the §10
  note's "docs follow-up" concern is resolved here. No action.
- Collections feature, `date` setting type, `format_date` filter, MP3/audio, per-image caption — all
  present in exp docs (`theming-setting-types.md`, `core-media.md`, `media.md`).

### 14a. **HIGH (theme-author-facing, near-zero rewrite)** — public theme-dev docs still document the removed `pageSlug` global

`docs-website/src/theme-dev-menus-snippets.md` and `theme-dev-objects-context.md` on exp still tell
theme authors to use the **`pageSlug`** global for menu active-state (`grep`: exp `pageSlug`=1 each,
`currentCanonicalPath`=0 each). But `pageSlug` was **removed from the render pipeline** (audit of
`f59a839b` — exp never carried it; menu active-state runs off `currentCanonicalPath` vs each item's
`canonicalPath`). So a theme author following exp's public docs writes a snippet against a
**non-existent global** → menu active-state silently never matches. Master's `f59a839b` rewrote both
docs to `currentCanonicalPath`; that doc change was not ported.
**Fix:** port master's `f59a839b` edits to both files verbatim (replace the `pageSlug` global
description + the `menu.liquid` active-item example with the `canonicalPath`/`currentCanonicalPath`
comparison). Architecture-agnostic — no rewrite. Do the same in any `docs-llms` body that still cites
`pageSlug` as a live global (`core-project-id-architecture.md` references it — verify it's historical,
not prescriptive).

### 14b. **MEDIUM (theme-author-facing, near-zero rewrite)** — public setting-types doc missing gallery + table

`docs-website/src/theme-dev-setting-types.md`: **gallery** (exp 0 / master 3) and **table** (exp 1 /
master 7) are undocumented for theme authors, though both setting types are fully shipped in exp code.
Master added them in `8fd16362` (+46 lines). (The `date` setting type, image `layout`/`framed`, and
richtext `allow_*`/`min_height` are **not** in master's public theme-dev doc either — they live only in
`docs-llms` — so they're out of scope for *this* file; see 14c.)
**Fix:** port master's gallery + table sections of `theme-dev-setting-types.md` ~verbatim (schema keys,
`columns` for table, the upload-path value contract). Architecture-agnostic.

### 14c. **MEDIUM (docs-llms, path-ref rewrite only)** — `theming-setting-types.md` missing richtext opt-in options + thin gallery/table

Exp's `docs-llms/theming-setting-types.md` lacks **`allow_headings`** (exp 0 / master 2),
**`allow_images`** (0 / 4), **`min_height`** (0 / 1), and has thinner **gallery** (4 / 11) and **table**
(12 / 18) coverage than master. These document real, shipped schema flags + their **render-time
sanitizer** behavior (h2–h4 / `<img>` gated per field; `--richtext-min-height`).
**Fix:** port master's `allow_headings`/`allow_images`/`min_height` subsections and backfill
gallery/table depth, updating any `server/services/sanitizationService.js` →
`packages/builder-server/src/services/sanitizationService.js` (and `src/core/…` → `packages/core/…`)
path citations. Note the richtext-image media-resolution + the **§12 usage-tracking gap** so the doc
doesn't over-promise "images survive export" until §12 lands.

### 14d. **LOW (docs-llms, near-zero rewrite)** — `rte_blank`/`rte_text` filters undocumented

Master documents the two RTE filters in `docs-llms/theming.md` (exp 0 / master 1); the filters
themselves are ported (`packages/core/src/filters/rteFilter.js`). **Fix:** port the `theming.md`
blurb (what `rte_text`/`rte_blank` do + the `{% if … | rte_text != blank %}` idiom).

### 14e. **LOW/MEDIUM (docs-llms, scope-aware rewrite)** — collection-item-as-link-target undocumented in feature docs

The `collectionItemUuid` link-target feature (`3f707b26`) is fully ported in code but was
undocumented in exp feature docs, whereas master documents it as a feature
in `core-collections.md`, `core-menus.md`, and `theming-setting-types.md`. **Fix:** add the
"a `link` setting can target a collection item page (resolves to its current slug, clears on delete)"
description to those exp docs, written in the scope-first idiom — the resolver runs in
`render-engine`/`builder-server` over injected `collectionItemsByUuid` maps, and hosted inherits it via
shared `builder-server` (mirror the phrasing exp's `core-collections.md` already uses).

### 14f. Obsolete / optional plan docs — **no port needed** (recorded so they're not mistaken for gaps)

Master `docs-llms` files absent on exp, all superseded:
- `plan-date-and-news-collection.md` — the date+News plan; **implemented** → covered by `core-collections.md` + `theming-setting-types.md`. Drop.
- `test-richtext-link-ui.md` — a manual test checklist (scratch); exp has its own `qa-issues/` + `qa-runs/` regime. Drop (or fold any still-relevant cases into a qa-run, optional).
- `future-collection-item-editor.md` — a **forward** idea (composable/editable item templates), not the shipped form. Optional to carry as a future-note; low value.
- `future-theme-package.md` — unbuilt `theme-package` script spec; ties to **§13** (the un-ported `theme:update-delta` tool) and the theme-update story (§2). Optional — bring only if/when that workflow is revisited.

**Priority within this item:** 14a/14b (public theme-dev docs) are the priority since they mislead
theme authors today; 14c–14e are `docs-llms` backfills (path-ref rewrites, no architectural rework);
14f needs no port. All are OSS-builder docs — none hosted-specific.

---

## 15. Missed port — collection item pages leak the `page-{slug}` body class (`render-engine`) — ✅ DONE 2026-06-26

**Done note (2026-06-26):** Restored the dropped override in `renderEngine.js` `renderPageLayout`
(`:782`): a caller may pass `bodyClass` to REPLACE the `page-{slug}` default, while `extraBodyClasses`
still appends (transparent-header channel) — `[baseBodyClass, extraBodyClasses].join(" ")`. Switched the
shared item-page call (`:921`) from `extraBodyClasses:` back to `bodyClass:`, so item pages render exactly
`collection-{type} item-{slug}` with no leaked `page-news/{slug}`. The `:914` comment is true again. Pages
never set `bodyClass`, so the `page-{slug}` default is unchanged. TDD red-first: (1) render-level in
`rendering.test.js` — `renderPageLayout` with `bodyClass` set asserts the exact override + no `page-` leak,
plus a transparent-header *append* guard; (2) tightened `collectionItemExport.test.js` from a substring
check to an **exact** body-class match + `!includes("page-news")`. Both red before the fix, green after; the
existing regular-page `page-{slug}` guard stayed green throughout. Satisfied the TODO's "render-engine-level"
ask via `rendering.test.js` (calls `renderPageLayout` directly) rather than standing up a new render-engine
suite. Full backend suite 1250 green, lint clean. Hosted inherits the fix (shared render-engine).

Surfaced 2026-06-25 from a colleague's port-gap report; researched and confirmed against latest
master. Master fixed this; the fix's mechanism was dropped during the package refactor.

**Symptom:** every collection item page renders a stray `page-{slugPrefix}/{slug}` body class it
shouldn't have (e.g. `<body class="page-news/hello-world collection-news item-hello-world">`).
A theme's page-specific CSS rule (`.page-{slug} { … }`) can then bleed onto item pages. The class
even contains a `/` (from the item's nested slug), so it's also a malformed selector token.

**Root cause — an override that became an append.** On master, `renderPageLayout`
(`server/services/renderingService.js:811-816`) computes a *default* `page-{slug}` body class but
lets a caller **override** it:

```js
const defaultBodyClass = pageData?.slug ? `page-${pageData.slug}` : "";
const baseBodyClass = contentSections.bodyClass !== undefined ? contentSections.bodyClass : defaultBodyClass;
const bodyClasses = [baseBodyClass, contentSections.extraBodyClasses || ""].filter(Boolean).join(" ");
```

The shared item-page renderer passes `bodyClass: \`collection-${schema.type} item-${resolvedItem.slug}\``
(`renderingService.js:967`), which **replaces** the `page-{slug}` default — so master item pages
render exactly `<body class="collection-portfolio item-alpha">` (asserted by
`server/tests/renderCollectionItemPage.test.js:191,226`, exact match).

On **experimentation** the override path is **gone**. `renderPageLayout`
(`packages/render-engine/src/renderEngine.js:782-783`) only ever does:

```js
const pageSlugClass = pageData?.slug ? `page-${pageData.slug}` : "";
const bodyClasses = [pageSlugClass, contentSections.extraBodyClasses || ""].filter(Boolean).join(" ");
```

— there is **no `contentSections.bodyClass` branch** (grep: `bodyClass` has zero non-test hits in
`render-engine`/`builder-server`). And the item-page call (`renderEngine.js:910-918`) passes the
item classes via **`extraBodyClasses:`** (append) instead of `bodyClass:` (override). Net: the
`page-{slug}` default is no longer suppressed and is *prepended* to every item page. Because
`buildCollectionItemPageData` sets `slug: \`${schema.slugPrefix}/${item.slug}\``
(`collectionService.js:1187`), the leaked class is `page-news/hello-world`.

The irony: the code comment directly above the call (`renderEngine.js:910`) still claims *"Item-specific
body class so a `.page-{slug}` index rule never leaks here."* — the comment's intent survived the
port but its implementation (the override) did not, so the comment is now false.

**Scope:** both preview and export. The body class is set inside the **shared**
`renderCollectionItemPage` (`renderEngine.js:844`), reached by both `previewController` (:387) and
`exportController` (:555) — so the leak shows in the in-editor preview **and** the exported/published
site.

**Why the test suite didn't catch it:** experimentation's `collectionItemExport.test.js:221` asserts
only `html.includes("collection-news") && html.includes("item-alpha")` — a substring check that
passes even with the stray `page-news/alpha` present. Master's exact-match assertion (the one that
would fail) wasn't ported.

**Effect (low/moderate — cosmetic-to-functional CSS correctness):** no crash, no data issue, and
item pages still carry their correct `collection-{type} item-{slug}` hooks. The risk is purely
style bleed: a theme that scopes rules with `.page-{indexSlug}` (a documented, supported pattern —
`docs-llms/theming.md:1732` lists "`page-{slug}` class for the current page" as a theme-author hook,
and `arch/layout.liquid:23` does emit `{{ body_class }}`) will have those rules unexpectedly apply
on item pages whose nested slug collides, plus the malformed slash-bearing token.

**Real-world impact today: none in the bundled theme** (checked 2026-06-25) — the only shipped theme
is `arch`, and a grep of its CSS finds **zero `.page-{slug}` selectors**, so the leaked class is
currently inert in published output. The bug is latent: it bites any custom/third-party theme that
uses the documented `page-{slug}` hook. So real but low-urgency — fix for correctness, not because
anything is visibly broken on Arch.

**Fix (near-verbatim port):** restore the override in `renderPageLayout`
(`packages/render-engine/src/renderEngine.js:782`) —
`const baseBodyClass = contentSections.bodyClass !== undefined ? contentSections.bodyClass : pageSlugClass;`
— and change the item-page call (`:917`) from `extraBodyClasses:` back to
`bodyClass: \`collection-${schema.type} item-${resolvedItem.slug}\``. Pages never set `bodyClass`,
so they keep the `page-{slug}` default unchanged. (Master's `extraBodyClasses` channel still exists
for the transparent-header case — `exportController`/`previewController` pass it independently — so
keep both fields supported, exactly as master's `[baseBodyClass, extraBodyClasses].join(" ")` does.)

**Test-first (TDD):** tighten/port the assertion — change `collectionItemExport.test.js:221` (and add
a render-engine-level case) to assert the item-page body class is **exactly**
`collection-{type} item-{slug}` and **does not** contain `page-`. Red on current code, green after
the override is restored.

**Hosted impact:** none required — pure `render-engine` fix in the shared item-page pipeline; hosted
renders item pages through the same `renderCollectionItemPageWithDeps`, so it inherits the fix. No
hosted-only concepts.

---

## 16. Missed port — `refreshAllMediaUsage` aborts early on a project with no pages dir (`builder-server`) — ✅ DONE 2026-06-26

**Done note (2026-06-26):** Replaced the top-of-function early `return` (`mediaUsageService.js`, was
`:417-420`) with master's `const pagesExist = await fs.pathExists(pagesDir)` flag; hoisted `let pageCount = 0`
and wrapped only the page-file read + per-page loop in `if (pagesExist) { … pageCount = pageFiles.length }`;
switched the summary message from `pageFiles.length` → `pageCount`. The globals/theme/collection scans +
`replaceMediaUsage` now always run, so a collections-only / freshly-imported project (no `pages/` yet) gets
its collection-item and theme-settings media tracked instead of left "unused". Pure control-flow change —
the scan bodies (incl. the §12 work) were already correct and untouched. TDD red-first: (1) updated the
existing "no pages directory" test to prove the theme-settings favicon is still tracked when `pages/` is
moved away (was asserting the now-removed `/no pages directory/i` early-return message); (2) new
collections-only test — no `pages/` dir + a collection item referencing media → its `usedIn` is non-empty.
Both red before the fix (one on the stale message, one on empty `usedIn`), green after; §12 tests in the same
file stayed green. Full backend suite 1251, lint clean. Hosted inherits via shared `builder-server`.

Surfaced 2026-06-25 from a colleague's port-gap report; researched and confirmed against latest
master. Master fixed this; the fix was not carried into the package port.

**Symptom:** the bulk media-usage recalc bails out the moment the **pages** directory is missing,
*before* it scans theme settings and collection items — so on a **collections-only** or
**freshly-imported** project (no `pages/` dir yet) the recalc is a no-op and every collection-item /
theme-settings image is left untracked (→ shows as "unused", skipped on export, deletable while in
use — the §12 family of consequences, here triggered by an unrelated cause).

**Root cause — an early `return` where master uses a flag.** On experimentation,
`refreshAllMediaUsage` (`packages/builder-server/src/services/mediaUsageService.js:393-396`) opens
with:

```js
// Check if pages directory exists
if (!(await fs.pathExists(pagesDir))) {
  return { success: true, message: "No pages directory found" };
}
```

This `return` happens **before** the theme-settings scan (`:460`), the collection-items scan
(`:476-502`), *and* before `mediaRepo.replaceMediaUsage(...)` (`:509`) — so nothing is recomputed
or even rewritten; the existing (here: empty) usage rows just stay.

On **master** (`server/services/mediaUsageService.js`) there is **no early return**. It captures a
flag and gates only the page-reading block on it, then continues to globals/theme/collections:

```text
const pagesExist = await fs.pathExists(pagesDir);
…
// Process each page (the pages dir may be absent on a freshly-imported or
// collections-only project; globals/theme/collections are still scanned).
let pageCount = 0;
if (pagesExist) {
  const allEntries = await fs.readdir(pagesDir, { withFileTypes: true });
  …
}
// Also scan global widgets … theme settings … collection items … (always run)
```

The package port carried the theme + collection scans faithfully (they're present at exp `:460`/`:476`)
but **re-introduced the top-of-function early `return`** master had already removed — so those scans
became unreachable on a no-pages project. (Tell-tale: exp's success message still reads
`${pageFiles.length} pages` (`:513`) — the master refactor renamed this to a `pageCount` initialised
to 0 outside the `if`.) The fix shipped in master's **`8e2a4aff`** (Collections Phase 6 — media
usage tracking).

**Precision on "skips collections/globals/theme":** the real losses are **collection items** and
**theme settings** (both live under the *project* dir, independent of `pages/`). The **global**
widgets dir is `pages/global` — it can't exist when `pages/` is absent, so no existing global data is
actually skipped; master scans it for symmetry/robustness.

**Triggers (why this is reachable, not theoretical):** `refreshAllMediaUsage` is hit by the explicit
**"Refresh all media usage"** action (`mediaController.refreshMediaUsage` → `POST /media/refresh-usage`,
`mediaController.js:795`) **and** by `refreshMediaUsageAfterStructuralChange` (`:528` → `:530`), which
runs on project **import** (`projectController.js:1068`), **creation** (`:351`), **duplication**
(`:594`), and **theme-update apply** (`themeUpdateService.js:316`). Import/duplication of a
collections-only project, or pressing the button on one, are the live exposures.

**Effect (low/moderate):** functional usage-tracking gap, scoped to projects whose `pages/` dir is
absent at recalc time. For a normally-edited project the per-write targeted updates
(`syncCollectionItemMediaUsageOnWrite` etc.) keep collection/theme usage current, so the bulk recalc
is a *safety-net/rebuild* path — its failure bites exactly when that net is most needed (right after
an import, or a manual "recalc everything" on a pages-less project). No crash, no security issue.
Compounds with **§12** (richtext-embedded media also untracked) and **§9** (raw collection labels)
on the same projects.

**Fix (near-verbatim port):** replace the early `return` with master's `const pagesExist = await
fs.pathExists(pagesDir)` flag, wrap the page-reading block in `if (pagesExist) { … }`, hoist a
`let pageCount = 0` for the message, and let execution fall through to the existing globals/theme/
collection scans + `replaceMediaUsage`. Pure control-flow change; the scan bodies already exist.
(Independent of §12's `recordMediaPaths`/`extractMediaPathsFromString` port, though both touch this
same function — coordinate the two edits.)

**Test-first (TDD):** add a `node:test` building a project with **no `pages/` dir** but a collection
item (and/or a favicon in theme settings) referencing a media file, call `refreshAllMediaUsage`, and
assert that file's `usedIn` is non-empty (and that `replaceMediaUsage` ran). Red on current code
(early return → empty), green after the flag refactor.

**Hosted impact:** none required — shared `builder-server` fix; hosted's recalc runs the same
function and inherits it. (Note hosted import/scaffold paths may always create `pages/`, masking the
bug there — but the fix is harmless and keeps parity.) No hosted-only concepts.

---

## 17. Test-strictness audit — ported tests may have dropped master's *exclusion* assertions (cross-cutting) — ⏸️ DEFERRED 2026-06-26 — **low (process)**

**Deferred (2026-06-26):** The one *proven* escape (the item-page body-class assertion) was already
fixed as part of §15 (exact match + `!includes("page-news")`). The broader sweep is defensive-only with
**no known active bug**: the mechanical grep yields ~375 `assert.ok(...includes(...))` hits, the vast
majority legitimate presence checks. Decided to defer the discretionary render/sanitize-output hardening
pass and instead tighten opportunistically when touching a suite. Revisit only if another weak-assertion
escape surfaces.

Surfaced 2026-06-25 from a colleague's port-gap report, generalising the **§15** root cause. Not a
single bug — a **methodology gap** in the master→experimentation test port worth one focused pass.

**The concrete instance (already actionable in §15):** the collection item-page body-class test
(`packages/builder-server/src/tests/collectionItemExport.test.js:221`) asserts only
`html.includes("collection-news") && html.includes("item-alpha")` — it checks the **right** classes
are *present* but never checks the **wrong** one (`page-{slug}`) is *absent*. Master's equivalent
(`server/tests/renderCollectionItemPage.test.js:191,226`) used an **exact-class** match
(`/<body class="collection-portfolio item-alpha">/`), which *excludes* anything extra. The port
relaxed exact-match → loose substring and **dropped the exclusion**, so the test stayed green the
entire time §15's `page-{slug}` leak was live. **We caught §15 by reading code, not from a red test.**
Fix is in §15's TDD note: restore exact-class + add `assert.doesNotMatch(html, /\bpage-/)` (or
equivalent) for the item-page body.

**The broader point (this item):** a loose `includes` proves *presence*, never *absence* — it can't
catch a regression that **adds** something wrong (an extra class, a leaked attribute, an
un-suppressed default). Where master asserted with `assert.match` / `assert.doesNotMatch` / exact
equality and the port substituted `assert.ok(x.includes(...))`, that **specific protection was lost**
even though coverage *looks* intact. §15 is proof this already happened at least once.

**Counter-evidence it's not everywhere (for calibration):** the *page* body-class case is still
strict on exp — `rendering.test.js:689` asserts the exact `class="page-about-us"`. So this is a
spot-check pass, not a rewrite-everything: the page path kept its rigor, the item path didn't.

**Recommended pass (the "quick look" the colleague asked for):** for the ported features, diff exp's
test assertions against master's and flag every place a master `match`/`doesNotMatch`/exact-equality
check became a substring `includes`/`ok` — prioritising rendered-HTML / class / attribute / sanitizer
output, where an *extra* wrong token is the realistic failure mode. Mechanical seed:
`grep -rn "assert.ok(.*\.includes(" packages/*/src/tests` then, for each on render/sanitize output,
check whether master's counterpart was stricter. Tighten in place (exact match, or add the paired
`doesNotMatch` exclusion). This dovetails with the existing test-coverage audit
(`audit-prompt-test-coverage.md`, referenced from both repos' TODOs) — fold the findings there or
track as discrete test-only TODOs.

**Scope/priority:** low, process-only — no production code changes, purely hardening
regression-protection. But cheap and high-leverage: the §15 escape shows a weak assertion is
*indistinguishable from real coverage* until something breaks. Do the body-class one with §15; batch
the rest as a single test-hardening pass.

**Hosted impact:** none directly (OSS `builder-server`/`editor-ui`/`render-engine` tests). The same
discipline applies to hosted's own ported suites if/when audited, but that's separate.

---

## 18. Missed port (tests only) — depth-1 render smoke + depth-0 no-leak guard not ported (`builder-server`) — ✅ DONE 2026-06-26

**Done note (2026-06-26):** Added `packages/builder-server/src/tests/depthRenderSmoke.test.js` — a
self-contained suite (own TEST_ROOT) driving the **real `exportProject`** controller (option a) so the
inlined `/uploads/`→`assets/` rewrite + markdown-alternate `<link>` injection are exercised, not just the
prefixer in isolation. Full master parity, both directions, 12 tests: **Gap 1** (depth-1 `news/alpha.html`,
`outputPathPrefix "../"`) asserts every path form carries `../` — asset-tag URL, `{% image %}` src (+lazy),
placeholder, preload `href`+`imagesrcset`, favicon/legacy/apple-touch/manifest (`site_icons` via a real SVG
favicon → Sharp-rasterized variants), the `/uploads/`→`../assets/` banner rewrite (+ `doesNotMatch(/\/uploads\//)`),
and the relative `alpha.md` markdown-alt. **Gap 2** (depth-0 `index.html`) is the no-leak guard —
`doesNotMatch(html, /\.\.\//)` — plus non-vacuity asserts of the canonical un-prefixed forms (the §15/§17
absence-check family, for path prefixes). Enriched shared `layout.liquid` emits the head/body forms so both
depths exercise the chain. Tolerant regexes for exp divergences (`?v=` on assets, `loading="lazy"`, bare-relative
preload → `../hero.jpg`, Prettier reflow). Non-vacuity spot-check: temporarily forcing the item
`outputPathPrefix` to `""` reds exactly the 5 prefix-driven asserts (asset/image/placeholder/preload/favicon),
proving they're live guards; the `/uploads`-rewrite + markdown-alt asserts stayed green (separate code paths,
correctly). Full backend suite 1263 green, lint clean. No production change. Hosted inherits the protected
machinery. (§19 is the sibling — `renderCollectionItemPage` return-contract test.)

Surfaced 2026-06-25 from a colleague's port-gap report; researched and confirmed. Master's
`server/tests/depthRenderSmoke.test.js` (Collections **Phase 17**) has **no equivalent on
experimentation** (no `*depth*` test file under any package). The depth/prefix **machinery itself is
fully ported** (`core/utils/linkPrefixer.js`, `assetTag`/`SeoTag`/`placeholderImageTag`/
`renderHeaderAssets`/`renderFooterAssets`, `render-engine/menuResolver.js`, `renderEngine.js`) and
*partially* exercised — so this is a **regression-protection gap, not a feature gap**.

Master's file has three `describe` blocks; **one is already covered on exp, two are not:**

- **✅ Already covered (not a gap):** the third block, *"menu active-state survives prefixing at
  depth"*, is reproduced by exp's `menuActiveState.test.js` — depth-0 (`:57`) and item-page depth
  (`:75`), asserting `is-active`/`aria-current` match by un-prefixed `canonicalPath` while the emitted
  `href` keeps the `../` prefix. No action.

- **❌ Gap 1 — depth-1 full path-chain smoke.** Master renders a layout at `outputPathPrefix: "../"`
  and asserts **every** emitted path form is prefixed: asset-tag URL, image `src`, placeholder image,
  **preload `href` + `imagesrcset`**, favicon / apple-touch / manifest refs, the `/uploads/` →
  `../assets/` rewrite (with `doesNotMatch(/\/uploads\//)`), and the markdown-alternate href.
  Exp's only depth coverage is `collectionItemExport.test.js:211-215`, which asserts just the **image
  `/uploads/`→`../assets/` rewrite** (1 of ~9 path forms) via a full export. The brittle, easy-to-
  regress forms — **preload/imagesrcset, favicon/apple/manifest, placeholder, asset-tag URL,
  markdown-alt** — are **not** asserted prefixed at depth anywhere on exp. A future edit to any one
  prefixer would ship a broken one-level-deep item page uncaught.

- **❌ Gap 2 — depth-0 no-leak regression guard.** Master renders the **same** layout at
  `outputPathPrefix: ""` (a root page) and asserts `assert.doesNotMatch(html, /\.\.\//)` — i.e. the
  depth machinery **never leaks `../` into root pages** — plus the canonical un-prefixed asset/favicon
  forms. This **exclusion/absence** assertion exists **nowhere** on exp (exp's depth coverage only ever
  renders item pages at depth-1, never asserts a root page stays clean). This is the same
  *absence-check* family as **§15/§17** — a loose presence check can't catch a `../` that wrongly
  appears; this is the symmetric guard to §15's body-class leak, for path prefixes.

**Effect (low — test-only):** no production impact today; the feature works. Pure regression-guard
loss across a **broad, brittle** path-prefixing surface (the whole reason master wrote a dedicated
smoke). Gap 2 is the higher-value of the two — it's the only guard that the depth-prefix logic doesn't
bleed into root pages.

**Porting nuance (can't copy verbatim):** master's test imports `rewriteStoragePaths` +
`markdownAlternateHref` from a standalone `server/utils/exportPostProcess.js`. On exp **those helpers
were inlined into `exportController.js`** (`:435-444`, `:597-605`) and the path-prefix primitive lives
in `core/utils/linkPrefixer.js`; `renderPageLayout` is now the **scope-first / deps-based**
builder-server signature. So adapt rather than copy: either (a) drive it through the real
`exportProject` like `collectionItemExport.test.js` does and assert the **full** prefixed path chain
(preload/imagesrcset/favicon/manifest/placeholder/markdown-alt) on the emitted item HTML **plus** a
root page with **no `../`**; or (b) call builder-server `renderPageLayout` with a deps/scope and
`outputPathPrefix` of `"../"` then `""`, mirroring master's two-direction assertions. Option (a) is
closer to exp's existing export-driven style and avoids re-deriving the inlined post-processing.

**Test-first (TDD):** add `packages/builder-server/src/tests/depthRenderSmoke.test.js` (or fold into
`collectionItemExport.test.js`) covering both directions: depth-1 → every path form carries `../` (and
no raw `/uploads/`); depth-0 → `doesNotMatch(/\.\.\//)` + canonical asset/favicon forms. Pairs
naturally with the **§17** test-strictness pass (both are about restoring dropped *exclusion*
assertions).

**Hosted impact:** none — OSS `builder-server` test only; the depth/prefix machinery is shared, so the
guard protects hosted's exported item pages too once added.

---

## 19. Missed port (tests only) — `renderCollectionItemPage` contract test not ported (`builder-server`) — ✅ DONE 2026-06-26 (tight scope)

**Done note (2026-06-26):** Added `packages/builder-server/src/tests/renderCollectionItemPage.test.js` —
scoped **tight** to the one piece of master's contract not already covered by §15/§18: the
`mainContentHtml` / `html` separation (the markdown-parity seam). Drives the real scope-first wrapper
`renderingService.renderCollectionItemPage(PROJECT_ID, args, { storage, scope })` over a self-contained
scaffold (LocalStorageAdapter, theme.json, a layout with `<!DOCTYPE>`/`<title>`/`<body class>` markers,
a NEWS schema/template/item). 8 tests across **publish ("../") and preview ("")**: the four-field return
shape; **`mainContentHtml` is the inner template only** (`<article class="news-item">` present,
`doesNotMatch(/<!doctype|<body|<title>/i)` — the load-bearing guard); `html` is the full laid-out page
(`<!DOCTYPE>` + `<body class="collection-news item-alpha">` + the inner content); and
`resolvedItem.slug`/`itemPageData.slug` (`news/alpha`). `headerData`/`footerData` passed null (engine
skips header/footer render), minimal `sharedGlobals` sufficed. Non-vacuity spot-check: temporarily folding
the layout into `mainContentHtml` (`return { ..., mainContentHtml: html }`) reds exactly the separation
assertion in both modes, the other 6 staying green — proving it's a live guard. Deliberately did NOT
re-port master's body-class/depth assertions (already covered by §15/§18). Full backend suite 1271, lint
clean. No production change. Hosted inherits the guarded seam.

Surfaced 2026-06-25 from a colleague's port-gap report; researched and confirmed. Master's
`server/tests/renderCollectionItemPage.test.js` (added in **`1aa6e92d`**, the finding-#2 follow-up that
extracted the **single shared item-page pipeline** behind both export and preview) has **no equivalent
on exp**. The shared function **is fully ported** — `renderCollectionItemPage` /
`renderCollectionItemPageWithDeps` exist in both `render-engine/renderEngine.js` and
`builder-server/renderingService.js`, and both `exportController` and `previewController` route through
it — so this is a **regression-protection gap, not a feature gap**.

**What master's test uniquely pins (the function's own return contract), and why exp's coverage
doesn't:** exp exercises item-page rendering **only through the full `exportProject`**
(`collectionItemExport.test.js`, which merely *mentions* `renderCollectionItemPage` in a comment, `:7`)
— it asserts the written files/HTML/.md, never the function's direct return shape. Master pins
`{ html, mainContentHtml, itemPageData, resolvedItem }` directly:
- **`mainContentHtml` is the INNER template output only — it must exclude the layout wrapper.** This is
  the load-bearing one: the export path feeds `mainContentHtml` to **markdown parity**, so if a refactor
  ever folded the layout into it (or returned the full page there), the *export file tests could still
  pass* while markdown export and preview silently break. Nothing on exp guards this two-value
  separation.
- `html` is the full laid-out page (header/main/footer through the layout).
- the item template receives the documented `collection`/`page`/`project` context.
- the item body class is **exactly** `collection-{type} item-{slug}` — the same exact-class assertion
  **§15/§17** call for; porting this test also closes that strict-assertion gap for the item body and
  would have caught §15's `page-{slug}` leak.
- exercised in **both** publish (`"../"`) and preview (`""`) modes.

**Effect (low / non-runtime):** no production impact; the pipeline works and is covered transitively by
the export suite. Pure loss of a focused contract guard on the shared render seam — the place finding #2
*explicitly* unified so the two callers "can't drift." Overlaps **§18** (also a test-only depth/render
port gap) and **§15/§17** (the dropped exact-class assertion).

**Porting nuance:** master calls `renderCollectionItemPage(projectId, args, …)`; exp's builder-server
wrapper is **scope-first** — `renderingService.renderCollectionItemPage(projectId, args, collectionDeps)`
resolves deps then delegates to `renderCollectionItemPageWithDeps(deps, args)`
(`renderingService.js:235/250`). Adapt the test to either the scope-first wrapper (build a scope +
local adapters, as `collectionItemExport.test.js` already does) or call
`renderCollectionItemPageWithDeps` with a hand-built `deps` bag — then assert the four-field return
contract in both modes.

**Test-first (TDD):** add `packages/builder-server/src/tests/renderCollectionItemPage.test.js` mirroring
master — assert the return shape, that `mainContentHtml` excludes the layout wrapper while `html`
includes it, the injected item context, and the exact item body class — in publish and preview modes.

**Hosted impact:** none — `builder-server` test only; the shared pipeline is inherited by hosted, so the
contract guard protects hosted's item-page render path too once added.

---

## 20. Stale test comment — claims `remapCollectionItem{Link,Menu}Refs` "NOT ported" when they are (`builder-server`) — ✅ DONE 2026-06-26 (option b: comment + direct tests)

**Done note (2026-06-26):** Chose option (b) — corrected the stale comment **and** added the missing direct
coverage. Rewrote the `collectionLinkEnrichment.test.js` header note (the "OMITTED … intentionally NOT ported
… absent" paragraph) to state the truth: both functions are present (`linkEnrichment.js:554`/`588`), wired
into duplication (`projectController.js:104-105`) + preset seeding, and now covered directly here. Added two
`describe` blocks (6 tests): `remapCollectionItemMenuRefs` (matched ref remapped incl. a **nested** submenu
item, unknown ref untouched, empty-map no-op, absent-menus-dir no-throw) and `remapCollectionItemLinkRefs`
(remap across **page widget + global header.json + collection item** link settings, unknown ref intact, and a
non-link value with no `href` is **not** touched — pinning the `isLinkObject` guard). Reused the existing
harness helpers (`writeMenu`/`writePageWidgets`/`writeItem`/`read*`) and the `remapDuplicatedProjectUuids`
block's shapes. Non-vacuity: temporarily no-op'ing both production functions reds exactly the two "remaps"
headline tests (the no-op/unknown/non-link cases correctly stay green — they assert non-change). Full backend
suite 1277, lint clean. No production change. Pairs with the §17/§19 test-hygiene theme.

Surfaced 2026-06-25 from a colleague's port-gap report. **Not a port gap — a misleading comment.**

The header doc-comment of `packages/builder-server/src/tests/collectionLinkEnrichment.test.js:20-23`
states the `remapCollectionItemLinkRefs` / `remapCollectionItemMenuRefs` block is *"OMITTED:
remapCollectionItemLinkRefs / remapCollectionItemMenuRefs are intentionally NOT ported to the new arch
yet (deferred to Phase 6 preset-seeding) and are absent from utils/linkEnrichment.js."*

**That's false on current exp.** Both functions are present, exported, **and wired into the
project-duplication remap path:**
- `remapCollectionItemMenuRefs` — `utils/linkEnrichment.js:554`
- `remapCollectionItemLinkRefs` — `utils/linkEnrichment.js:588`
- imported + called at `controllers/projectController.js:24-25` / `:104-105` (duplication uuid remap).

The comment was accurate **when written** (the functions were genuinely deferred to Phase 6
preset-seeding); Phase 6 then landed and ported them, but the test header was never updated. Consistent
with **§11**, which already records `remapCollectionItemLinkRefs` + its preset-seed call site as fully
ported ("No gap there").

**Effect (trivial):** zero runtime/test impact — the suite runs and the feature works (duplication
correctly remaps collection-item link/menu refs). The only harm is **misdirection**: a reader trusting
the comment might "re-port" already-present functions (risking a duplicate) or assume a feature gap that
doesn't exist.

**Fix (comment-only):** update the `collectionLinkEnrichment.test.js` header — remove the "NOT ported /
absent" note, and either (a) note the functions now live at `linkEnrichment.js:554/588` and are covered
elsewhere, or (b) add the missing `describe("remapCollectionItem{Link,Menu}Refs …")` block to this suite
if that direct coverage is still wanted (master had it; exp currently exercises them only via the
duplication integration test). Pairs with the §17/§19 test-hygiene theme. Trivial; do opportunistically.

**Hosted impact:** none — OSS test-comment only.

---

## 21. Dedup the cross-bundle `getStandalonePreviewTarget` copy + drop its dead `editor-ui` export (`editor-ui` + OSS preview runtime) — ✅ DONE 2026-06-26 — **low (cleanup)**

**Done note (2026-06-26):** Took option (b), adjusted for the cross-bundle reality. Extracted the pure mapper
into a single source of truth `src/utils/standalonePreviewTarget.js` (dependency-free, no `window`/`document`);
`previewRuntime.js` now `import`s it (resolves to `/runtime/standalonePreviewTarget.js` via the same
`express.static(STATIC_UTILS_DIR)` mount that serves the runtime) and its inline copy is gone. Deleted the dead
`getStandalonePreviewTarget` export from `editor-ui/src/utils/previewLinkUtils.js` (kept `isStandalonePreviewNavigationUrl`,
still consumed by `app/src/pages/SitePreviewLayout.jsx`). **Test moved, not dropped** (this was the catch with a naive
(a)): the 6 cases now live in `src/utils/__tests__/standalonePreviewTarget.test.js` and exercise the **live** function
instead of a dead twin — `previewLinkUtils.test.js` keeps only its `isStandalonePreviewNavigationUrl` block. Widened
the vitest `include` with `src/**/*.test.{js,jsx}` so the new test runs. **Packaging fix (would have broken the
packaged app):** `electron/builder.config.mjs` only asar-unpacked the single file `src/utils/previewRuntime.js`; since
the runtime now imports a served sibling, changed it to `src/utils/*.js` so every served runtime module is a real
on-disk file. Tests green (6 moved + 2 kept = 8); lint clean. **Update (2026-06-27): the deferred follow-up is
DONE — the repo-root `src/` folder is gone.** The two runtime files moved to `packages/core/src/runtime/`
(`previewRuntime.js` + `standalonePreviewTarget.js` + its test), served raw by path via the renamed
`STATIC_PREVIEW_RUNTIME_DIR` (→ `node_modules/@widgetizer/core/src/runtime`, mirroring `STATIC_CORE_ASSETS_DIR`);
not exported from the core index. Chose relocation over a build-pipeline lib-entry (they're already dependency-free
raw ES modules — bundling would add complexity for no gain). Also: dropped the dead leftover
`src/core/assets/placeholder.svg`; repointed the Electron `asarUnpack` glob + removed `src/utils` from `files`;
fixed the `lint` script (`eslint packages app server.js`) and removed the dead `src/**` eslint block + `src/**`
vitest include; fixed a stale `export.test.js` block that recreated `src/core/assets` on every run; updated all
docs that called `src/` "residual". Original finding below.

Surfaced 2026-06-25 while consolidating the standalone-preview dispatch (§5). The href→preview-path
mapper `getStandalonePreviewTarget(href)` (turns an in-preview link's href into a `/preview/:pageId`
or `/preview/collection/:prefix/:slug` route) exists in **two** copies:
- `packages/editor-ui/src/utils/previewLinkUtils.js:1` — exported, but **imported nowhere** (grep:
  only its sibling `isStandalonePreviewNavigationUrl` is consumed — by `app/src/pages/SitePreviewLayout.jsx`
  and hosted's `StandalonePreview.jsx` / `StandaloneCollectionPreview.jsx`).
- `src/utils/previewRuntime.js:42` — a full standalone copy, and the one **actually used at runtime**
  (`:604`), because it runs inside the no-referrer preview iframe (a separate bundle that can't import
  from the `editor-ui` package).

So the `editor-ui` `getStandalonePreviewTarget` is effectively **dead code**, while the live mapping is
the duplicated `previewRuntime.js` one — two definitions of the same route-shape parsing that can
silently drift (e.g. if the `/preview/collection/:prefix/:slug` shape ever changes, only one copy gets
updated). `previewLinkUtils.test.js` tests the dead copy, masking that it's unused.

**Effect (low):** no current bug — the two copies are in sync today. Pure maintainability / drift risk
plus a dead export carrying its own tests.

**Fix (options):** either (a) **delete** the unused `getStandalonePreviewTarget` export (+ its tests)
from `previewLinkUtils.js`, keeping `isStandalonePreviewNavigationUrl` (which *is* shared) and leaving
`previewRuntime.js` as the single owner; or (b) if the mapping is worth sharing across the bundle
boundary, factor it into a tiny dependency-free module both the `editor-ui` util and the injected
preview runtime import. (a) is simpler and matches today's usage; revisit (b) only if a third consumer
appears. Pairs with the §5 dispatch consolidation and the §17/§20 test-hygiene theme. Low priority.

**Hosted impact:** none — OSS-only; hosted consumes only `isStandalonePreviewNavigationUrl`, unaffected.

---

## 22. Gate collection schemas on the theme **update-import** path too (`builder-server`) — ✅ DONE 2026-06-27 (option A) — **low/moderate**

**Done note (2026-06-27):** Implemented **option (A)** — validate the merged/effective theme
pre-commit. The merge core of `buildLatestSnapshot` was extracted into a shared
`layerThemeSnapshot({ baseDir, updates, targetDir })` helper (copy base minus `updates/`+`latest/`,
then apply each update in ascending order incl. `deleted/` markers); `buildLatestSnapshot` now calls
it, so there's one merge implementation. The update-import branch of `uploadTheme` then merges
**installed base + installed updates + the incoming deltas** into a throwaway `_validate_<ts>/` dir,
runs `validateThemeCollectionSchemas` on it, and rejects with **400 + per-collection `errors`** if
invalid — *before* any update folder is copied into the installed theme, so a bad update leaves the
install untouched (the temp dir is always cleaned up in a `finally`). Because it validates the merged
result, it catches the cross-version case option B can't: a new update collection whose `slugPrefix`
collides with a base/earlier-version collection.

TDD: new `describe("uploadTheme update-import collection-schema validation")` in `themes.test.js` —
(1) invalid update schema → 400 + install untouched (version dir not created), (2) cross-version
slugPrefix collision → 400 mentioning "Duplicate slugPrefix" + untouched, (3) valid new-collection
update → 201 + imported. Each rejection test proven non-vacuous (both go red with the gate disabled,
the valid one stays green). Full `builder-server` suite green (1282); `themeUpdates` /
`themeUpdateService` (which exercise the refactored `buildLatestSnapshot`) green (55); lint clean.
Original finding below.

Surfaced 2026-06-25 finishing §7. The new-theme install path now rejects invalid collection-type
schemas (§7), but `uploadTheme`'s **update-import** branch (`themeController.js`, the `else` arm of
`if (isNewTheme)` — imports new `updates/<version>/` folders into an already-installed theme) does
**not** validate them. An update version can ship/modify a `collection-types/<type>/schema.json`
(`UPDATABLE_PATHS` includes `collection-types`, finding B1), so a bad schema introduced *by an update*
is currently applied unchecked — the same "silently dropped at read time, no upfront author feedback"
gap §7 closed for installs.

**Why it wasn't done with §7 (the real complication):** the install path validates the whole theme
sitting in a temp dir *before* `fs.copy`, so it's cleanly pre-commit. The update path is different —
new `updates/<version>/` folders are copied into the **installed** theme (`:1483`) and the *effective*
theme only exists once `buildLatestSnapshot` merges base + updates into `latest/` (`:1500`). So
validating "the theme the user will run" means validating the **merged** result, which doesn't exist
until after the installed theme has already been mutated. (Master never had this branch — update-import
via zip is exp-only — so there's no port to copy; this is new ground.)

**Effect (low/moderate):** an installed theme can be pushed into an invalid collection-schema state via
an update zip (broken schema, or a new update-introduced `slugPrefix` colliding with the base). Bad
schemas are skip-invalid at read time (no crash), so the loss is upfront rejection + author feedback,
same severity family as §7. Reachable only by the explicit theme-update-import action on a theme that
ships collection-types.

**Options (decide when picked up — the fork that paused §7):**
- **(A) Merged/effective, pre-commit (most correct):** assemble base + installed updates + new update
  deltas into a temp merged dir, `buildLatestSnapshot` there, validate that, and only commit the real
  copy if valid. Catches cross-version `slugPrefix` collisions; cost is staging the merge off to the
  side (mirrors `buildLatestSnapshot`) so the installed theme is never touched on failure.
- **(B) Per-update delta, pre-commit (simpler):** validate each new `updates/<version>/` collection-types
  subtree in isolation before copying. Small diff, no rollback; misses a base↔update prefix collision.
- **(C) Post-build + rollback:** copy, build `latest/`, validate the resolved snapshot, roll back the
  new version folders + rebuild on failure. Complete but mutates-then-reverts installed state — fragile.

Recommendation: **(A)** if we want it correct, **(B)** if we want it cheap and accept the narrow gap.
Add a `node:test` that imports an update version carrying an invalid collection schema and asserts
400 + the installed theme is left untouched (option A/B) or restored (option C).

**Hosted impact:** none — shared `builder-server`; hosted wires no theme-upload/update route today, and
inherits the gate if it ever does. No hosted-only concepts.

---

## 23. Widget-catalog enumeration logs spurious "Failed to parse schema" warnings (`builder-server`) — ✅ DONE 2026-06-26 — **low (log hygiene / signal-masking)**

**Done note (2026-06-26):** Took the **robust** guard (parity with `listCollectionSchemas`). Added a
`widgetFoldersWithSchema(folderRelPaths)` helper in `getProjectWidgets` (`projectController.js`) that
probes `storage.exists(scope, \`${relPath}/schema.json\`)` (via `Promise.all` + index filter) for **both**
enumeration spots — `widgets/<name>` and `widgets/global/<name>` — so `processWidgetFolder` is only ever
called on real widget folders. Stray entries (a macOS `.DS_Store`, a `README.md`) are dropped before any
read, so they no longer trip the catch's `console.warn`; the warning is now **self-honest** — it fires only
on a genuinely malformed `schema.json`. Updated the two stale comments accordingly. TDD: extended
`widgets.test.js` — seeded `.DS_Store` in both `widgets/` and `widgets/global/` plus a `broken-widget` with
invalid JSON, added a `console.warn`-capturing helper, and asserted (1) **no** "Failed to parse schema"
warning references a stray entry and (2) a real broken schema **still** warns (honest-signal survives).
Full backend suite **1279** green, lint clean.

**Platform note (why no Windows-red TDD):** the spurious warning only manifests on **macOS/Linux**, where
reading `widgets/.DS_Store/schema.json` (a file as a dir) throws `ENOTDIR`, which `LocalStorageAdapter.read`
re-throws → the warning. On **Windows** that same read returns `ENOENT`, which the adapter maps to `null`,
so no warning ever fired there — the new stray-entry test was already green on Windows pre-fix. The test
still locks the contract (red on macOS/Linux without the guard) and the fix makes the behavior
platform-independent. Original finding below.

Surfaced 2026-06-25 from a colleague's report; researched and confirmed against current code. Two
spots, one root cause, in `getProjectWidgets` (`projectController.js`).

**Symptom:** loading the editor's widget panel (the widget-catalog GET) logs, per stray non-folder
entry in the project's `widgets/` tree:
```
[ProjectController] Failed to parse schema for widget at widgets/.DS_Store: ENOTDIR: not a directory ...
```
typically from a macOS `.DS_Store`. The **widget list itself is correct** — the bad entry is read,
throws, is dropped to `null`, and filtered out (`:680`). The harm is purely the warning: it's noise,
and it reuses the **exact message a genuinely broken `schema.json` produces**, so a real failure can
hide in it.

**Root cause — the `isDirectory()` guard was lost in the adapter swap.** Commit **`d2737081`**
(2026-06-13, "fix hosted widget catalog — Sprint 2.6") replaced `fs.readdir(dir, { withFileTypes:
true })` + `.filter(e => e.isDirectory() && …)` with `storage.list(scope, …)`. `LocalStorageAdapter.list`
(`:51`) returns **plain names — files, dirs, dotfiles alike**, only hiding atomic temp files; no type
info. The directory guard that used to skip non-folders is gone at both enumeration spots:
- **Spot 1 (`:670–671`):** `storage.list(scope, "widgets")` → `.filter((name) => name !== "global")` —
  no folder/dotfile guard.
- **Spot 2 (`:675–676`):** `storage.list(scope, "widgets/global")` → no filter at all. (Latent — just
  hasn't fired because no junk has landed in `widgets/global/` yet; same bug.)
`processWidgetFolder` (`:639–652`) then reads `widgets/<name>/schema.json`; for a file like `.DS_Store`
that path throws **`ENOTDIR`** (and `storage.read` only maps `ENOENT`→`null`, re-throwing everything
else — adapter `:33`), so the catch `console.warn`s. Reported as exp-only (master keeps the
`withFileTypes` guard); but the fix lives in shared `builder-server`, so **hosted has the same latent
bug** (its cloud `list` likewise returns plain names) and inherits the fix.

**Reference for the correct pattern (already in-tree):** `listCollectionSchemas`
(`collectionService.js:227–236`) hit the identical "adapter lost `withFileTypes`" problem and guards it
by probing each name for its `schema.json` (`storage.exists(scope, schemaKey(name))`) before use. The
widget enumeration is the one place that didn't get the same treatment.

**Effect (low):** no functional/data/security impact — output is unaffected. It's log-noise + a
diagnostic-clarity regression (false alarms indistinguishable from a real broken-schema warning).

**Fix — guard the listing (primary), optionally harden the warning:**
- **Robust (mirror `listCollectionSchemas`):** keep only entries whose `schema.json` exists —
  `storage.exists(scope, \`widgets/${name}/schema.json\`)` for spot 1 and the `widgets/global/...`
  equivalent for spot 2. Excludes *any* stray entry, not just dotfiles. It's async, so resolve with a
  `Promise.all` map + filter rather than a sync `.filter`. With this, `processWidgetFolder` is only
  ever called on real widget folders, so its remaining `console.warn` becomes inherently honest (fires
  only on a genuinely malformed `schema.json`).
- **Quick (weaker):** add `&& !name.startsWith(".")` at `:671` and a `.filter((name) =>
  !name.startsWith("."))` at `:676`. Kills `.DS_Store`/dotfile junk but not a stray non-dotfile file —
  if taken, also make `processWidgetFolder`'s catch warn only on a JSON `SyntaxError` and stay silent
  on filesystem `ENOTDIR`/`ENOENT`, to cover the gap.

Recommend the **robust** guard (parity with the collections code, excludes all stray entries, and makes
the warning self-honest).

**Test-first (TDD):** add a `node:test` (builder-server) that seeds a project with one real widget
folder plus a stray plain file (e.g. `.DS_Store`) in **both** `widgets/` and `widgets/global/`, calls
`getProjectWidgets`, and asserts (a) the response still contains the real widget and (b) `console.warn`
was **not** called with "Failed to parse schema" (spy/capture `console.warn`). Red on current code
(warns), green after the listing guard. A second case with a genuinely malformed `schema.json` should
still warn — proving the honest-signal path survives.

**Hosted impact:** fix is shared `builder-server` — hosted's widget catalog runs the same enumeration
and inherits both the guard and the cleaner logs. No hosted-only concepts.

---

## 24. Missed port (defensive) — `updatePageWidgets` lacks the `pagesDir` existence guard (`builder-server`) — ✅ DONE 2026-06-26 — **trivial (robustness, likely-unreachable)**

**Done note (2026-06-26):** Added the one-line `if (!(await fs.pathExists(pagesDir))) return;` guard at the
top of `updatePageWidgets` (`packages/builder-server/src/utils/linkEnrichment.js`), matching master — a
missing `pages/` dir now early-returns cleanly instead of surfacing as a caught `readdir` ENOENT. Pure
defensive parity, no observable behavior change; no test added (per the finding). Full backend suite **1279**
green, lint clean. Original finding below.

Split out of **§11** (2026-06-26) when that item's Combobox fix landed — kept separate because it's a
different package/concern. `3f707b26` added a `if (!(await fs.pathExists(pagesDir))) return;` guard to
`updatePageWidgets` (`packages/builder-server/src/utils/linkEnrichment.js`); experimentation's copy calls
`fs.readdir(pagesDir)` with no guard.

**Effect (trivial / likely-unreachable):** in the OSS new-project flow this can't throw —
`scaffoldProjectContent` (`projectController.js`) creates the pages dir **before** `seedPresetCollections`
→ `remapCollectionItemLinkRefs` → `updatePageWidgets` runs, and that call is wrapped in try/catch. Hosted
uses its own scoped seeding, not this fs path. So purely a parity/robustness one-liner — a missing
`pages/` dir would otherwise surface as a caught readdir ENOENT rather than a clean early return.

**Fix:** add the one-line `if (!(await fs.pathExists(pagesDir))) return;` guard at the top of
`updatePageWidgets`, matching master. No test needed (defensive, no observable behavior change); add one
only if a no-`pages/` caller is ever introduced.

**Hosted impact:** none — shared `builder-server`; hosted doesn't reach this fs path. No hosted-only concepts.

---

## 25. Decide whether to anchor `EMBEDDED_MEDIA_PATH_RE` so foreign URLs don't mark local assets "used" (`builder-server`) — ✅ RESOLVED 2026-06-26 (keep master parity) — **low (correctness, master-parity tradeoff)**

**Resolution (2026-06-26):** Chose **option (a) — keep master parity, no code change.** The over-match only
ever goes in the **safe direction** (it can mark a local asset *used* when a foreign `/uploads/` URL collides
with its filename — never prunes a genuinely-referenced asset), the failure mode is benign (a stale,
undeletable "in use" entry / an extra file copied on export — no data loss, no broken page), the colliding
scenario is rare, and the regex is byte-identical to master + hosted's shared `mediaUsageService`. Not worth
diverging unless stale "used" entries become a real user complaint. If we ever revisit: anchor in shared
`builder-server` (so hosted inherits) and add a test that a foreign `/uploads/` URL does **not** mark the
same-named local record used. Original finding below.

Surfaced 2026-06-26 by the max-effort code review of the §12 work (CONFIRMED finding). The new
`EMBEDDED_MEDIA_PATH_RE = /\/uploads\/(?:images|files)\/[A-Za-z0-9._-]+/g` (`mediaUsageService.js:21`,
ported verbatim from master) substring-matches `/uploads/images|files/...` **anywhere** in a string. So a
setting value that merely *contains* that substring inside a foreign URL — e.g. an external link
`https://othercdn.com/uploads/images/logo.png`, or a code-field snippet — flags the **local** media record
whose path is `/uploads/images/logo.png` as **used**.

**Effect (low):** a real behavior change vs *old* exp (the removed `isMediaPath` was `startsWith`, so a
foreign URL never matched), but it is the **safe direction** — it over-marks an asset *used*, never prunes a
referenced one. Consequence is a stale, undeletable "in use" entry (the media manager refuses deletion / the
exporter copies an unreferenced file), never data loss or a broken page. It is **faithful to master** (same
regex), so this is a *deliberate-deviation* decision, not a port bug.

**Options:** (a) keep master parity (do nothing — the over-match is the safe direction, already documented in
§12's note); (b) anchor/guard so a match only counts when **not** part of a URL host — e.g. require the match
to be preceded by a boundary (`"` / `'` / whitespace / `(` / `>`) and not by `://...` — at the cost of
diverging from master and from hosted's identical `mediaUsageService`. **Recommendation: (a) keep parity**
unless stale "used" entries become a real user complaint; if we change it, change it in shared `builder-server`
so hosted inherits it. Test-first either way (a settings value with a foreign `/uploads/` URL must NOT mark the
same-named local record used).

**Hosted impact:** none unless we deviate — shared `builder-server`; hosted runs the same recognizer.

---

## 26. Extract the shared dropdown `<ul>` from `ui/Combobox` + `MenuCombobox` instead of the copy-pasted group header (`editor-ui`) — ✅ DONE 2026-06-26 — **low (DRY / maintainability)**

**Done note (2026-06-26):** Extracted the shared dropdown body into a new presentational
`packages/editor-ui/src/components/ui/ComboboxOptionList.jsx` (the `<ul>` + group-header `showHeader` logic +
option/empty-state `<li>` markup, `Fragment`-wrapped). Both `ui/Combobox.jsx` and `menus/MenuEditor/MenuCombobox.jsx`
now render `<ComboboxOptionList … />` instead of their own copy; each keeps its own open-state strategy (self-owned
`isOpen` vs controlled `isOpen`/`onOpenChange`) and passes its differing bits as props — `emptyText` ("No matching
pages found…" vs "No matching results…") and the z-index via `className` ("z-10" vs "!z-[99999]", which had already
drifted). The duplicated `Fragment` import was dropped from both. No behavior change — the existing
`Combobox.test.jsx` (6) + `MenuCombobox.test.jsx` (4) stay green as the regression net (10 passed); lint clean on all
three files. Original finding below.

Surfaced 2026-06-26 by the code review of the §11 work (CONFIRMED design smell). Porting the link-picker
group-header into `packages/editor-ui/src/components/ui/Combobox.jsx` was done by **copy-pasting** the
`showHeader` expression + `Fragment` wrapper + Tailwind header classes from `MenuCombobox.jsx`. The two
components' entire `<ul>` list bodies are now ~95% identical (differing only in state strategy —
self-owned `isOpen` vs external `isOpen`/`onOpenChange` — and a `z-10` vs `!z-[99999]` class that predates
this change). The duplication **predates** §11, but porting by copy-paste deepened it.

**Effect (low, no runtime bug):** every future change to link-picker dropdown rendering (header styling, a11y
role/aria, keyboard nav, empty-state) must be made in two places and kept in sync by hand; they have already
drifted (the z-index class). **Fix:** extract a shared presentational list (e.g. `ComboboxOptionList`) that
both components render, parameterised by the open-state strategy; collapse the duplicated `<li>`/header markup
into it. Keep the existing `Combobox.test.jsx` / `MenuCombobox.test.jsx` green as the regression net.

**Hosted impact:** none — OSS `editor-ui` only.

---

## 27. Harden the `theme:update-delta` dev tool — version-tag parsing, quoted diff paths, util reuse (OSS dev tooling) — ✅ DONE 2026-06-27 — **low (dev-only, mostly latent)**

**Done note (2026-06-27):** All four findings addressed in `scripts/theme-update-delta.js`.
- **CONFIRMED #1 (tag parsing):** `parseVersionFromTag` now anchors the semver to the **end** of the
  tag (optional `v`-prefix, preceded by start-or-separator) and rejects leading-zero components, so
  `release-2024.01.15` and `arch-1.2.3-rc.0.9.9` → `null` instead of a bogus baseline; `v0.9.8` /
  `0.9.8` / `arch-theme-1.2.3` still parse. Verified the default `findPreviousTag` auto-detection still
  picks `0.9.8` against the real tag set.
- **CONFIRMED #2 (quoted paths):** the `git diff` call now passes `-c core.quotePath=false`, and
  `parseDiffNameStatus` **throws** on a git-quoted (`"`-prefixed) or otherwise unparseable line rather
  than silently dropping it from the delta; genuinely out-of-theme lines stay a defensive skip.
- **REUSE #1 (semver):** the duplicated semver regex is gone — `parseSemver` is now re-exported from
  `packages/builder-server/src/utils/semver.js` (`parseVersion`); the script keeps its thin
  throw-on-invalid `compareVersions` wrapper (the shared one sorts-invalid-last). The unused `raw`
  field was dropped (test updated).
- **REUSE #2 (path safety):** `toGitPath` / `resolveInside` / `writePlan`'s containment check now use
  `isWithinDirectory` from `@widgetizer/core/pathSecurity` (kept the domain-specific `fail()` messages).

TDD: `scripts/__tests__/theme-update-delta.test.js` extended (18 → 22 cases): tag-parsing rejects
date/compound + pre-release tags, `parseDiffNameStatus` throws on quoted + unparseable lines, and the
`raw`-field assertion was removed. All 22 green; eslint clean on both files; manual `--dry-run` against
`themes/arch` produces a valid plan and writes nothing. Original finding below.

Surfaced 2026-06-26 by the code review of the §13 verbatim port. Four findings on
`scripts/theme-update-delta.js`, all **dev-only** (manual, `--dry-run`-gated release tool — a maintainer
producing a wrong/empty delta, never a runtime user). All are present in master too (verbatim port):

- **CONFIRMED — `parseVersionFromTag` greedily takes the last `x.y.z` token.** A date/compound tag like
  `release-2024.01.15` or `arch-1.2.3-rc.0.9.9` parses to `2024.01.15` / `0.9.9` and is fed to
  `compareVersions`, so `findPreviousTag` can pick the wrong baseline (or a date-tag outranks a real release
  and is filtered out, hiding it). Latent under the current `0.9.x` tag scheme. Fix: anchor the tag pattern
  (e.g. require a `v?`-prefixed standalone semver) / validate the tag shape.
- **CONFIRMED — `parseDiffNameStatus` drops quote-escaped paths.** Git's default `core.quotePath=true` wraps
  non-ASCII/special paths in `"..."` with octal escapes; such a line fails `gitPath.startsWith(prefix)` and is
  silently skipped ("Skipping unexpected diff line"), omitting that file from the delta. Latent — Arch's
  filenames are all ASCII. Fix: pass `-c core.quotePath=false` to the `git diff` call (and/or unescape), and
  treat an unexpected-but-in-prefix line as an error rather than a skip.
- **PLAUSIBLE — reuse over re-implement (×2):** `parseSemver`/`compareVersions` re-implement
  `packages/builder-server/src/utils/semver.js`, and `toGitPath`/`resolveInside`/`writePlan` re-implement
  `@widgetizer/core/pathSecurity` (`isWithinDirectory`/`assertWithin`). Both are workspace-importable from
  `scripts/`. Note: the script's `compareVersions` **throws** on invalid input (relied on + tested) whereas
  `semver.js` sorts invalid last — reuse needs a thin wrapper, not a blind swap.

**Effect:** low — no runtime/user impact; correctness of a maintainer-run release tool on edge-case tags or
filenames, plus DRY. **Fix:** do the two CONFIRMED hardenings (quotePath flag + tag-shape validation) when the
theme-update workflow is next revisited (ties into §2/§13); fold the reuse cleanups in opportunistically.

**Hosted impact:** none — OSS-only release tooling.

---

## 28. Close the path-based storage exceptions for the hosted boundary (adapter discipline) — ✅ DONE 2026-07-02

**✅ DONE 2026-07-02.** §28's own scope is complete and re-verified green: OSS builder-server suite
(1313) + hosted server suite (612) + both repos' lint all pass, and the code matches every claim below
— theme CRUD reads/writes via `storage.{read,write}(scope,'theme.json')` (`themeController.js`), render
reads go through the shared `…FromDir` readers (`projectContentFs.js`), `getMenuById` is deleted (zero
refs anywhere), and hosted's `buildCloudRenderDeps` imports the shared readers while `cloudProjectData.js`
keeps only the deliberately-lenient `readThemeData` + SQLite getters. The theme-settings fork stays (D).
The one open gap this work surfaced — hosted theme-save not tracking media usage (**§31**) — is now
**also fixed** (2026-07-02). The only remaining piece of the original exception set is the **deferred
lifecycle duplicate/import tail (§30)**, blocked on hosted needing it + the `AssetStorageAdapter.copy`
primitive. Full status history below.

**Status:** 🟢 OSS reads + theme-CRUD + dead-code slices **IMPLEMENTED** + C1/C2 promoted into the
docs-llms maps (2026-06-29; TDD, full backend suite + `npm run lint` green) — see "Implementation progress"
below. Hosted follow-on (D) **render-reader dedup IMPLEMENTED** (2026-06-30; hosted server suite 609 +
`eslint` green) — `cloudProjectData.js`'s `listPages`/`readGlobalWidget` now come from the shared OSS
`…FromDir` readers. The theme-settings fork was re-checked against code and **kept, not collapsed**
(collapsing would change ~9 behaviors — see D below). 🟡 remaining tails tracked separately: lifecycle
duplicate/import cores in **§30** (deferred); the hosted theme media-usage gap surfaced by D in **§31** (DONE 2026-07-02).
The unified architecture (three storage planes; the `projectDir` working-directory contract) lives in
`core-project-id-architecture.md` § Still-path-based exceptions.

### Implementation progress — 2026-06-29

OSS slices landed, behavior-preserving except the one semantic note called out below:

- **Shared reader family (Phase A).** New `packages/builder-server/src/utils/projectContentFs.js` —
  `listPagesFromDir` / `readGlobalWidgetFromDir` / `readThemeDataFromDir(projectDir)`: dir-explicit pure
  FS transforms (C2), barrel-exported from `index.js`, unit-tested in `tests/projectContentFs.test.js`.
- **E1b/E2 — render path wired.** `buildRenderDeps.listPages` → `listPagesFromDir(getProjectDir(folderName))`;
  `previewController` + `exportController` read globals/theme/pages via the `…FromDir` readers. The old
  folderName-based `listProjectPagesData` / `readGlobalWidgetData` are **deleted** from `pageController`
  (along with their now-unused `fs`/`path`/config-helper imports); their unit coverage folds into
  `projectContentFs.test.js`.
- **E1a — theme CRUD → storage adapter.** `getProjectThemeSettings` / `saveProjectThemeSettings` now use
  `storage.read/write(req.scope, 'theme.json')`; the manual `fs.access` project-existence check is gone
  (the `resolveActiveProject` middleware already guarantees it). Dead `readProjectThemeData` **deleted**.
  **Semantic note:** the GET is now **scope-driven, not `req.params.projectId`-driven** — `LocalScopeResolver`
  ignores the route param and returns the active project (parity with `getAllPages`; the POST write-guard
  already enforced `param == scope`). In OSS single-tenant they always coincide; for hosted this is the
  secure default (you read your authorized project, not an arbitrary route id).
- **E3 — dead `getMenuById` deleted** from `menuController` + its `menus.test.js` blocks (the uuid-backfill
  behavior stays covered via the live `getAllMenus` path). Zero references remain anywhere.

Docs landed: **C1/C2 + the three-planes boundary principle** are now in `core-project-id-architecture.md`
(rewrote the "Still-path-based exceptions" section — bullets 1–2 were stale, naming deleted functions) and
cross-referenced from `core-architecture.md` (Rendering Pipeline + the backend-utils table row for
`projectContentFs.js`).

Deferred (not started): the **hosted cross-repo follow-on (D)** (repoint `buildCloudRenderDeps`, delete
`cloudProjectData.js`'s content readers; collapse the now-redundant `projectThemes.js` theme settings fork).
Lifecycle duplicate/import cores (+ the `AssetStorageAdapter.copy` R2 blocker) are tracked separately in
**§30** (deferred).

**Context.** The backend is scope-first + adapter-injected, but a small set of
functions bypass the `StorageAdapter` and read the filesystem directly by
`folderName`. These work fine in OSS (single tenant) but are the spots where the
"no fork for hosted" claim has asterisks on it. Documented in
[`core-project-id-architecture.md` § Still-path-based exceptions](core-project-id-architecture.md#still-path-based-exceptions).

**The exceptions:**

1. `themeController.readProjectThemeData()` / `saveProjectThemeSettings` — resolve
   folderName via `getProjectFolderName()` and read `theme.json` directly.
2. `pageController.listProjectPagesData()` / `readGlobalWidgetData()` — take a
   folderName, build paths via `getProjectPagesDir()` / `getProjectDir()`.
3. `menuController.getMenuById()` — ~~the one render-path menu reader still using
   `fs-extra` / `path` directly~~. **Correction (2026-06-29):** verified to have
   **no production callers** — only `menus.test.js` exercises it as a "rendering
   helper". It is **dead-but-tested**, so the §28 proof-of-concept below is
   mis-targeted; treat this as "delete the dead export (or wire it)" rather than a
   port. (The live OSS render path that *does* read content without a scope is
   `buildRenderDeps` → `listProjectPagesData` / `readGlobalWidgetData` — exception 2.)
   **→ resolved: delete** (see Reads scoping outcome below).
4. **Project lifecycle directory ops** — create / rename / duplicate / import in
   `projectController.js` operate on directories by folderName with `fs-extra`.
   These are inherently filesystem-shaped (bulk directory copy / rename) and run
   in the OSS shell context. **→ scoped 2026-06-29, see 4a/4b below.**

**Why it matters.** Every exception is a spot where hosted has to either
reimplement the logic against cloud storage or accept OSS-only behavior. Confirmed
concretely: hosted **already forked** the exception-1/2 reads into
`widgetizer-hosted/server/render/cloudProjectData.js` (+ its own `buildCloudRenderDeps.js`)
precisely because the OSS functions hardcode the global `DATA_DIR` namespace and
`@widgetizer/builder-server` is barrel-only. Closing them keeps the "swapping local
FS for cloud is a wiring change in the shell, not a fork of the server" invariant honest.

**Difficulty split.**

- **Reads (1–2):** scoped — see "Reads scoping outcome" below. **Hybrid:** theme CRUD routes →
  storage adapter; render-path pages/globals/theme → shared `projectDir`-rooted readers (the engine
  is already `projectDir`-rooted + FS-bound). Payoff: hosted deletes the `cloudProjectData.js` fork.
  (Exception 3 `getMenuById` is dead → delete.)
- **Lifecycle (4):** *not* a per-key swap and *not* a wholesale relocation. Scoped
  below — the create path already shows the right pattern.

### Scoping outcome (all four exceptions) — 2026-06-29 (consolidated)

Re-verified against code: `storage.{read,write}(scope, rel)` resolves to the **same file** as raw
`projectDir` FS access (`LocalStorageAdapter.#projectBase` ≡ `getProjectDir`; `CloudStorageAdapter` ≡
`getProjectBase`) — the adapter is just a scope/`assertWithin`/atomic wrapper over the **same project
directory**. So the four exceptions are facets of one architecture with **three planes** (SQLite
metadata; content in the project working dir; media on the asset plane = R2 in hosted) and one
**boundary principle:** request-scoped per-key access → StorageAdapter; whole-directory FS-bound ops
(render + lifecycle) → `projectDir` working directory; media → AssetStorageAdapter; metadata → SQLite.
Decisions:

- **E1a — Theme CRUD routes → storage adapter.** `getProjectThemeSettings` / `saveProjectThemeSettings`
  (`themeController.js:1633`/`:1658`) move to `storage.read/write(req.scope, 'theme.json')` (scope is
  already attached via `resolveActiveProject`). Adapter `null → 404` preserves today's behavior; keep
  `sanitizeThemeSettings` + `updateThemeSettingsMediaUsage`. Matches `getAllPages` + hosted `projectThemes.js`.
- **E1b + E2 — Render-path reads → shared `projectDir`-rooted readers.** Add barrel-exported
  `listPagesFromDir` / `readGlobalWidgetFromDir` / `readThemeDataFromDir(projectDir)`. `buildRenderDeps`'
  `listPages` becomes `listPagesFromDir(getProjectDir(folderName))` (no scope threading needed); the
  preview/export controllers swap their globals/theme reads to the `…FromDir` readers. Consistent with
  the engine's existing `projectDir` reads; render is FS-bound by LiquidJS regardless.
- **Hosted follow-on (cross-repo) — ✅ render-reader dedup DONE 2026-06-30.** `buildCloudRenderDeps` +
  `render/renderProjectStream` + `routes/previewRender` now import the shared `…FromDir` readers from
  `@widgetizer/builder-server` (aliased `listPagesFromDir as listPages` / `readGlobalWidgetFromDir as
  readGlobalWidget`); `cloudProjectData.js`'s `listPages`/`readGlobalWidget` are **deleted**. Kept in
  `cloudProjectData.js`: `getProjectRow`/`getMediaFiles` (SQLite) and — deliberately — **`readThemeData`**:
  hosted's reader is **lenient** (missing `theme.json` → `{}`, still publishes) whereas the shared
  `readThemeDataFromDir` is **strict** (throws). That OSS-strict / hosted-lenient render divergence is
  pre-existing (not introduced here) and is documented at the code level on both sides (`projectContentFs.js`
  "strict by design"; `cloudProjectData.js` header). Verified line-for-line equivalent before the swap;
  covered by a new hosted render test for the non-null global-widget path. The `exportSite.js`
  export-orchestration fork stays (R2 media + publish pipeline — asset/publish planes, not a §28 read).
  - **Theme settings GET/POST fork — KEPT (earlier "collapsible" assessment reversed 2026-06-30).** Code
    re-check: `widgetizer-hosted/server/routes/projectThemes.js` is *already* adapter-based
    (`storage.{read,write}(scope,'theme.json')` + the shared `sanitizeThemeSettings`), so E1a did remove the
    DATA_DIR coupling — but collapsing onto the OSS Express handlers is **not** behavior-neutral. The OSS
    theme handlers sit on the **actor-scoped router hosted deliberately doesn't mount** (not owner-filtered),
    and adopting them would change ~9 behaviors (start writing theme media-usage rows, add the write-guard
    409, change error-envelope keys `error`→`message`, reject unprovisioned-but-authenticated callers instead
    of provisioning them, …). So the hosted route shell stays; only its stale "DATA_DIR-coupled" header
    comment was corrected. The media-usage omission this surfaced is its own item — **§31**. The
    `/locales/:lang` handler is bespoke (core-locale merge) and stays.
- **E3 — Delete dead `getMenuById`** + its `menus.test.js` blocks.
- **Missing `theme.json`: keep STRICT (no behavior change)** — GET → 404, render → throws.

Why hybrid (not adapter-everywhere): the adapter discipline earns its keep at the API boundary
(scope/authz, backend-agnostic); the scope-free, FS-bound render path naturally belongs with
`projectDir`, and routing it through the per-key adapter buys no R2-readiness (render needs a filesystem
anyway) while adding plumbing. Simplest fit without weakening the invariant.

Lifecycle (4) reuses the same `projectDir` helper family — `scaffoldProjectContent({ projectDir, … })`
(`index.js:53`) is the barrel-exported precedent that OSS `createProject` and hosted `POST /api/projects`
each wrap (hosted content is itself filesystem-backed under `data/users/<actorId>/projects/<folderName>/`;
only media is R2):

- **4a — Rename → OSS-only by design.** Hosted never renames (`folderName` is an
  immutable storage key; its `PATCH /api/projects/:id` won't touch it). Keep rename
  in `projectController`; mark it *intentional* — a code comment + a note in
  `core-project-id-architecture.md` § Still-path-based exceptions. No code move, no
  contract change.
- **4b — Duplicate / import → extract shared FS cores.** **Promoted to its own deferred item — see §30.**
  (Extract `duplicateProjectContent({srcDir,destDir})` / `importProjectContent({bundleDir,destDir})` next to
  `scaffoldProjectContent`; OSS controllers become thin wrappers; `remapDuplicatedProjectUuids` takes an
  explicit `destDir`.) Deferred until hosted builds duplicate/import; the genuine blocker is duplicate's
  **media** copy — `AssetStorageAdapter` has no `copy`. The C1/C2 contract it must honor is documented above.

**Effect:** moderate (architectural) — makes the boundary explicit rather than
accidental; 4a/4b keep the "no fork" claim honest for lifecycle. Not user-visible.

**Hosted impact:** positive — every closed exception is one less spot the hosted
product has to reimplement or work around (and 4b means duplicate/import become a
shell-wrapper job, not a re-fork, if/when hosted wants them).

---

## 29. Loud stale-active-project detection in the OSS editor — ✅ DONE 2026-07-07

**Done note (2026-07-07):** Implemented as decided (blocking curtain, client-only, no server change). A shared
`editor-ui` signal store `staleProjectStore` (`isStale`/`incomingName`/`markStale`/`clearStale`) is driven by
three producers: a focus/visibility hook `useStaleActiveProjectDetection` (re-probes `GET /api/projects/active`
on refocus and flips the flag both ways — so re-activating this project elsewhere and returning auto-dismisses),
`saveStore`'s existing `PROJECT_MISMATCH` 409 branch (rerouted from a toast to `markStale`), and a same-browser
`BroadcastChannel` fast-path (`activeProjectChannel`, announced from `setActiveProject`) so a *visible* stale tab
curtains instantly without waiting for focus. Consumer: a blocking `StaleProjectCurtain` overlay (names both the
incoming and this-tab's project; Reload → `/pages`). All pieces are opt-in exports wired only in the OSS shell
`app/src/App.jsx` via the editor `overlay` slot — scoped to the editor route (never blocks picker/preview) and
hosted opts out by not wiring them. Verified inert for hosted (per-request `CloudScopeResolver`; renders no
curtain; the rerouted 409 branch is unreachable there). Frontend suite green (743), lint clean. **Follow-up:** a
pre-existing cold-boot race in `fetchActiveProject`, surfaced by the curtain's reload, is tracked as **§36**.
Original scope below.

**Status:** ✅ DONE 2026-07-07 — scoped 2026-06-29. OSS-shell (`app/`) + `editor-ui` feature; orthogonal
to §28 (no `builder-server`/contract change). Grew out of the §28/E1a discussion of the OSS singleton
active-project model.

**Context.** OSS is single-active-project by design — `LocalScopeResolver` returns the singleton
`app_settings.activeProjectId`, and opening a project flips it globally via `setActiveProject`. So two
tabs/windows/browsers pointed at different projects can't both be live: a "stale" tab (whose client store
names a different project than the server's current active) **silently reads the active project's content**
(scope-driven GETs return the singleton), while its **writes are blocked 409** by the `resolveActiveProject`
write-guard (`PROJECT_MISMATCH`). The data is safe (writes can't reach the wrong project); the wart is the
silent-wrong **display** — the stale tab shows another project's pages/theme with no signal. There is no
cross-tab awareness today (`projectSwitchCoordinator` only resets stores on an *in-tab* switch).

**Decision (2026-06-29).** Keep OSS single-tenant (no real multi-tab for now) and make the staleness
**loud**, entirely client-side. **No server changes:**
- **GET behaviour unchanged** — content GETs stay scope-driven (return the active project); **no GET-side
  409 / read-guard.** A read-guard was considered and rejected: redundant with the curtain below, and
  inferior — a forced reload lands on the active project anyway, it's a broad `resolveActiveProject` change,
  it risks transient 409s from in-flight GETs during legitimate same-tab switches, and it would force
  exempting `GET /api/projects/active` + cold-boot (the very probe staleness detection relies on).
- **Keep the existing write-guard 409** — it's the data-safety floor (only thing stopping a stale tab from
  mutating the wrong project) *and* one of the curtain triggers below.

**Mechanism (client-only).** Detect staleness against the **server** — the single shared source of truth
(one local server; every tab/window/browser hits it), so it works across tabs *and* browsers.
BroadcastChannel/`localStorage` events are same-browser-profile only (can't cover Firefox↔Chrome), so they
can't be the foundation:
1. **Revalidate on focus/visibility** — when a tab becomes visible/focused, `GET /api/projects/active`
   (endpoint exists — `editor-ui/src/queries/projectManager.js`), compare to `projectStore`; if different,
   show a non-destructive curtain: *"Another tab/window switched to <name> — this view is out of date.
   Reload."* (Reload re-bootstraps to the active project — the accepted single-tab outcome.)
2. **React to the write-guard 409** (`PROJECT_MISMATCH`) — surface the same curtain instead of a generic
   error toast.
3. **(Optional) BroadcastChannel fast-path** — instant curtain for *same-browser* sibling tabs without
   waiting for focus. Polish, not load-bearing.

**Work.** `editor-ui`: a focus/visibility hook that probes `GET /api/projects/active` and compares to
`projectStore`; a curtain/overlay component + 409→curtain handling in the query layer; optional
BroadcastChannel. `app/` shell wires it once on mount (alongside the existing `registerProjectStore` /
`projectSwitchCoordinator`). No `builder-server` change.

**Why it matters / fire early.** Trigger the curtain on focus (not just at save time) so a stale tab with
unsaved edits warns the user **before** they invest more work that can only 409 on save (work-loss safety).
A background stale tab may show old data until focused — acceptable.

**Effect:** low/moderate — OSS-shell UX correctness; no server/contract change. No effect on hosted, which
is per-request scoped (`CloudScopeResolver`) and has no shared active-project to go stale — multi-tab works
there already.

---

## 30. Extract project lifecycle duplicate/import into dir-explicit cores

**Status:** ⏸️ deferred — scoped under §28 (2026-06-29), promoted to its own item 2026-06-29. The OSS
reads/theme-CRUD half of §28 is done; this is the **lifecycle (exception 4) tail**. Blocked on hosted
building duplicate/import (no consumer yet) and on the asset-plane copy primitive below.

**What.** Pull the bulk-filesystem bodies of `projectController.duplicateProject` / `importProject` into
directory-explicit cores — `duplicateProjectContent({srcDir,destDir})`,
`importProjectContent({bundleDir,destDir})` — next to `scaffoldProjectContent` (`index.js:53`),
barrel-export them, and leave the OSS controllers as thin wrappers (resolve dirs → call core → DB metadata).
Refactor `remapDuplicatedProjectUuids` (`utils/linkEnrichment.js:330`) to take an explicit `destDir` instead
of resolving `getProjectDir(folderName)` internally (the C2 reach-through). Behavior-preserving for OSS:
existing duplicate/import tests stay green, plus unit tests for each core on scratch `srcDir`/`destDir`.

**Why deferred — the media / asset-plane crux.** OSS `duplicateProject` does one
`fs.copy(originalDir, newDir)` that copies content **and** `uploads/` media together (OSS media lives under
the project dir). Hosted media is in **R2**, so a hosted duplicate must copy content via the core **and**
copy media separately on the asset plane — but `AssetStorageAdapter` has **no `copy`**. So a clean extraction
has to first decide (a) the asset primitive (a `download→upload` loop — no contract change — or add
`copy(scope, srcKey, destKey)`), and (b) whether the content core includes `uploads/` (OSS-convenient but
hosted-unusable) or excludes it (uniform asset-plane handling, but adds an OSS step for no current benefit).
That decision only pays off once hosted needs duplicate/import, so the extraction waits rather than baking in
a speculative shape. Import needs no new primitive (`AssetStorageAdapter.upload` already exists).

**Design contract it must honor:** the C1/C2 working-directory contract + the three-planes boundary
principle — see §28 and `core-project-id-architecture.md` § Still-path-based exceptions.

**Not in scope:** rename (4a) stays **OSS-only by design** (immutable hosted `folderName`) — a resolved
decision documented under §28, no code change.

**Effect:** moderate (architectural / hosted-readiness) — not user-visible; makes duplicate/import a
shell-wrapper job rather than a re-fork if/when hosted wants them.

---

## 31. Hosted theme save doesn't track theme media usage (`widgetizer-hosted`) — ✅ DONE 2026-07-02

**Done note (2026-07-02):** Fixed via **export-and-call** (the minimal path the finding pre-sanctioned).
`updateThemeSettingsMediaUsage` — previously unexported — is now re-exported from the
`@widgetizer/builder-server` barrel (`src/index.js`), and hosted's `POST /api/themes/project/:projectId`
(`server/routes/projectThemes.js`) calls it after the `storage.write`, wrapped in a **non-blocking**
try/catch, exactly mirroring OSS `saveProjectThemeSettings`. No scope/adapter plumbing was needed: the whole
tracking chain is DB-only through the shared `getDb()` singleton hosted already inits (`server/index.js`
`initDb`) — `readMediaFile(projectId)` (shared `media` table) → path match (incl. size variants) →
`updateMediaUsageForSource(projectId, 'global:theme-settings', ids)` (shared `media_usage`). TDD: new
`server/tests/routes/projectThemes.test.js` seeds a favicon media row, POSTs favicon-referencing theme
settings through the real header-driven `CloudScopeResolver` + `CloudStorageAdapter`, and asserts a
`media_usage` row for `global:theme-settings` — **red** (empty usage) before the fix, **green** after.
Hosted server suite **612** + lint green; OSS **1313** + lint green (barrel change). The theme route is
otherwise unchanged — the fork stays per §28 D (no behavior collapse). Original finding below.

**Status:** ✅ DONE 2026-07-02 — surfaced by §28 D (2026-06-30) while re-checking the theme-settings fork.
Hosted-repo fix; independent of the §28 read-closure (which is done).

**What.** `widgetizer-hosted/server/routes/projectThemes.js`'s `POST /api/themes/project/:projectId`
sanitizes + writes `theme.json` but **never calls `updateThemeSettingsMediaUsage`** (the OSS
`saveProjectThemeSettings` does). So media referenced **only** from theme settings (favicon, OG/social
image, any themed image) is never recorded as "used" in hosted's `media_usage`. Consequence: such an asset
shows as unused and can be reported/cleaned/safe-deleted while the live theme still references it → broken
favicon / social image on the published site.

**Why it exists.** The fork predates E1a and only ever did the storage write; the OSS media-usage tracking
was never ported into the hosted route. Grep confirms **zero** `mediaUsage` references in
`widgetizer-hosted/server` (non-test).

**Fix (when scheduled).** On the hosted theme save, after the `storage.write`, track usage the same way OSS
does — call the OSS `updateThemeSettingsMediaUsage(scope.projectId, sanitizedThemeData)` if it's reachable
from the `@widgetizer/builder-server` barrel (confirm; it's **not** exported today — `getProjectThemeSettings`/
`saveProjectThemeSettings`/`updateThemeSettingsMediaUsage` are all unexported), else export it or factor the
tracking into a shared helper. Verify against hosted's media-usage schema (shared SQLite `media_usage`) and
add a hosted route test asserting a favicon-only theme asset is recorded as used.

**Not in scope:** collapsing the theme route onto the OSS handlers — explicitly **rejected** under §28 D
(would change ~9 behaviors). This item fixes only the missing-tracking bug inside hosted's existing fork.

**Effect:** moderate (data-integrity / correctness) — prevents silent loss of theme-referenced media in
hosted. Not visible until an affected asset is cleaned up.

---

## 32. Theme-upload update-import validation smells (`builder-server`)

**Status:** ⬜ open (investigate) — surfaced 2026-07-01 reviewing OSS `1c831b4b` (§22: gate collection
schemas on the theme **update-import** path). Two minor smells in the new validation path; neither is a
confirmed bug, both worth a look.

**What.** `1c831b4b` added a pre-commit validation branch to `uploadTheme` (`themeController.js`) that
merges installed base + installed updates + incoming deltas into a throwaway dir via the extracted
`layerThemeSnapshot`, runs `validateThemeCollectionSchemas`, and cleans up in `finally`. Two things to
investigate:
- **Temp-dir name.** The throwaway merge dir is `_validate_${Date.now()}`. Two update-imports for the *same*
  installed theme landing in the same millisecond would collide on that name. Investigate whether concurrent
  uploads to one theme dir are reachable (route / serialization); if so, switch to a collision-proof name
  (`fs.mkdtemp`).
- **Log volume.** `layerThemeSnapshot` logs one line per applied version and now runs **twice** per
  update-import (build `latest` + `_validate_` merge), so the per-version `console.log` fires twice per
  upload. Investigate quieting it (log once, or gate behind a debug flag).

**Scope.** OSS-only surface — hosted doesn't reach theme upload (`widgetizer-hosted/server/routes/
projectThemes.js` imports only `sanitizeThemeSettings`; no `uploadTheme` caller). No hosted impact.

**Effect:** low — a same-ms collision would corrupt only one concurrent *validation* run (not the install),
and the double log is cosmetic. Confirm reachability before deciding to fix.

---

## 33. Editor-ui duplication smells (`editor-ui`)

**Status:** ⬜ open (investigate) — surfaced 2026-07-01 reviewing OSS `331ccf8b` (user-test-checklist batch).
Two DRY / maintainability smells to weigh; refactor-only, no behavior change intended.

**What.**
- **Slug-validation ternary duplicated.** The same `formatSlug(value).length > 0 ? … : …` validation is
  inlined in both `PageForm` and `CollectionItemForm`. Investigate extracting a shared rule/helper (a
  `validateSlug` next to the existing `formatSlug`, or a shared form rule) so the two forms can't drift.
- **`useMediaState` localStorage pattern.** `useMediaState` reads `localStorage` in a `useState` initializer
  **and** persists via an effect. Investigate a small reusable `usePersistentState` / `useLocalStorage` hook
  before this read-init + persist-effect shape is copy-pasted as more editor prefs are added.

**Scope.** Pure `@widgetizer/editor-ui`; a fix flows to web / Electron / hosted via the vendored package.

**Effect:** low (maintainability). Not user-visible; investigate whether the extraction is worth it now or
when a third consumer appears.

---

## 34. `copyThemeToProject` exclude-filter widened from dirs to entries (`builder-server`) — ✅ DONE 2026-07-07

**Done note (2026-07-07):** Resolved by verifying against the code and hardening — not by reverting the
speedup, which is a real ~200MB win for Arch. Two outcomes: (1) **documented** — `copyThemeToProject`'s
JSDoc now states `excludeDirs` is matched against **top-level entry names only** (not nested paths);
(2) **guarded** — a top-of-function check throws if an `excludeDirs` entry contains a path separator, so a
nested value fails loudly instead of silently never matching the single-segment filter. **The original
premise below was inaccurate:** the top-level-*file* worry doesn't hold — the old
`fs.rm(path, { recursive, force })` deleted a matching top-level *file* too, so a top-level file named e.g.
`templates` was absent under **both** old and new code (no divergence). The one *real* divergence is the
reverse — **multi-segment `excludeDirs` values**: the old loop `fs.rm`'d a nested path, whereas the new
filter only ever compares single top-level segments (`rel.split(sep)[0]`), so a nested exclude silently
no-ops. Unreachable today (the sole caller `utils/projectScaffold.js` passes `["templates"]`; the internal
excludes `updates`/`latest`/`presets` are all single-segment; Arch ships no top-level file colliding with an
exclude name — `presets` + `templates` are both dirs) — the guard just stops a future caller tripping it.
TDD: a new `themes.test.js` case asserts a nested `excludeDirs` entry rejects (red first, then green);
`builder-server` suite **1319** green, lint clean. Original finding below.

**Status:** ✅ DONE 2026-07-07 (investigate → resolved) — surfaced 2026-07-01 reviewing OSS `08039c82`
(speed up project creation by not copying excluded theme dirs). A behavior-parity question, almost certainly
benign.

**What.** `08039c82` replaced copy-everything-then-`fs.rm` with a single `fs.cp` whose `filter` skips
excluded **top-level** entries (`updates`, `latest`, `presets` + caller excludes such as `templates`) during
the copy — a real speedup (avoids copying then discarding the ~200MB `presets/` for Arch). But the semantics
widened subtly: the old `fs.rm` removed only directory *paths*, whereas the new `filter` excludes any
top-level *entry* whose name matches — so a top-level **file** named e.g. `templates` (not a dir) would now
also be skipped.

**Investigate.** Whether any theme ships (or could ship) a top-level file whose name collides with an
excluded dir name — none in `arch` today. If parity matters, make the filter dir-aware (exclude only when the
entry is a directory); otherwise document the intended semantics and close.

**Scope.** `copyThemeToProject` is called via `scaffoldProjectContent`, which hosted also uses
(`widgetizer-hosted/server/routes/projects.js`), so hosted inherits both the speedup and this semantic — a
fix flows through automatically. No hosted-only work.

**Effect:** negligible (theoretical edge case) — flagged for confirmation, not because a break is known.

---

## 35. Hosted create-from-preset + Refresh Usage button don't track media usage (`widgetizer-hosted` + `builder-server`) — ✅ DONE 2026-07-02

**Done note (2026-07-02):** Implemented the dir-aware-core fix (plan approved). Four parts, TDD throughout:
(1) extracted `refreshAllMediaUsageFromDir({ projectId, projectDir })` in `mediaUsageService.js` — the
folderName-based `refreshAllMediaUsage(projectId)` is now a thin wrapper (`getProjectDir(folder)` → core),
behavior-preserving for its OSS-only callers; barrel-exported. (2) Promoted `getProjectBase(scope)` to the
`StorageAdapter` contract — added the JSDoc property (`core/adapters.js`), the public delegate on
`LocalStorageAdapter` (Cloud already had it), and a `getProjectBase` invariants block in the shared storage
conformance suite (auto-covers both adapters) + a concrete "write lands under getProjectBase" test.
(3) **Symptom B:** `mediaController.refreshMediaUsage` now resolves `projectDir =
req.adapters.storage.getProjectBase(req.scope)` and calls the core — correct in both shells; the destructive
wipe is gone. (4) **Symptom A:** hosted `POST /api/projects` calls the core after seeding (non-blocking,
reusing the `projectDir` from L185). Tests: OSS `mediaUsage.test.js` dir-explicit case + `media.test.js`
storage-stub update; hosted `mediaRefreshUsage.test.js` (button) and `projectsMediaUsage.test.js`
(create-from-preset) — both driven through the real route + CloudStorageAdapter + DB and each proven red→green
by temporarily disabling the fix. Full suites green: OSS builder-server **1314** + Vitest **722** + lint;
hosted server **615** + lint. Original finding below.

**Status:** ✅ DONE 2026-07-02 — root-caused 2026-07-02 while checking a user report ("new project from a preset imports
and uses images, but they show *Unused*"). **Confirmed hosted** (2026-07-02);
OSS is correct by inspection (see below). Fix approach (dir-aware refresh core + a small adapter-contract
addition) is scoped below but **not yet implemented**. Sibling of §31, under the §28 boundary umbrella
(hosted has no working full media-usage rescan of its own).

**Symptom A — preset seeding.** After creating a hosted project from a preset, every preset-seeded image
shows **"Unused"** in the Media library (`file.usedIn` empty), even though preset pages/widgets reference
them. They are therefore deletion-unprotected and pruned on export/publish → broken images on the published
site. Same data-integrity family as §31, but on the bulk-seed path rather than theme-save.

**Symptom B — the "Refresh Usage" button (worse than inert).** The Media page's *Refresh Usage* button hits
the **shared** `mediaController.refreshMediaUsage` (`mediaController.js:783`) — mounted in hosted via the OSS
project-scoped router — which calls the same folderName-bound `refreshAllMediaUsage(projectId)`. In hosted it
scans the wrong global path, finds nothing, and `replaceMediaUsage` **deletes all `media_usage` rows for the
project and re-inserts nothing** — so it silently **wipes** usage (including any favicon usage §31 recorded on
the last theme-save), rather than rebuilding it. Same root cause; a second, live caller of the broken rescan.

**Root cause — two compounding facts, both hosted-specific:**

1. **The hosted create route runs no post-seed usage derivation.** OSS `projectController.js:370` calls
   `refreshMediaUsageAfterStructuralChange(newProject.id, "project creation")` *after* scaffold +
   `seedPresetCollections` + `seedPresetMedia` (and likewise for duplication `:621` / import `:1114`).
   Hosted's `POST /api/projects` (`widgetizer-hosted/server/routes/projects.js:171–230`) seeds content +
   media (`media_files` rows via `seedPresetMedia` → shared `mediaRepository`) but calls **no** usage
   refresh. Grep confirms zero media-usage refresh calls in hosted's create path.
2. **The full-rescan function isn't hosted-compatible anyway.** `refreshAllMediaUsage(projectId)`
   (`mediaUsageService.js:411`) reads *all* content via folderName FS — `getProjectPagesDir` /
   `getProjectThemeJsonPath` / `getProjectDir`, all rooted at the OSS-global `DATA_DIR/projects/<folder>`
   (`config.js:106`). Hosted content lives at the per-user `data/users/<actorId>/projects/<folder>`
   (`CloudStorageAdapter.getProjectBase(scope)`, used at `projects.js:185`). So even if hosted called it, it
   would scan the wrong empty path and *clear* usage via `replaceMediaUsage`. This is a **§28-class
   path-based exception** — `refreshAllMediaUsage` is folderName/global-`DATA_DIR`-bound.

**Why §31 didn't cover it, and why normal hosted editing is fine.** The *data-passed* trackers
(`updatePageMediaUsage(projectId, pageId, pageData)`, `updateThemeSettingsMediaUsage`,
`syncPageMediaUsageOnWrite`, …) take content as an argument + read `media_files` from the shared DB — no
folderName FS — so they work in hosted and fire on every in-editor save via the mounted OSS `pageController`.
§31 fixed the one *forked* route (theme-save). Only the **bulk preset-seed** path writes content directly
without a save, so it alone depends on the full rescan — the one function that's folderName-bound.

**OSS status (why OSS is *not* affected):** OSS `createProject` calls the refresh at `:370` after seeding,
and `getProjectDir(folder)` = `DATA_DIR/projects/<folder>` is exactly where OSS content is. Verified by code
inspection (ordering: scaffold `:322` → seedPresetCollections `:332` → createProject `:357` → seedPresetMedia
`:364` → refresh `:370`). If the reporter turns out to have been in OSS, re-open as a separate OSS bug.

**Fix (recommended — §28-aligned dir-aware core + a contract addition):**
- **Extract the dir-aware core.** `refreshAllMediaUsageFromDir({ projectId, projectDir })` next to
  `refreshAllMediaUsage` — read content via `fs` from the *passed* `projectDir`, read `media_files` from the
  DB (`readMediaFile(projectId)`), write `media_usage` (`replaceMediaUsage`). Mirrors §28's
  `projectContentFs.js` `…FromDir` readers (hosted's per-user project dir is itself filesystem-backed — only
  media is R2 — so an `fs` read of the correct `projectDir` works for both OSS and hosted; no async per-key
  adapter plumbing). `refreshAllMediaUsage(projectId)` becomes a thin wrapper that resolves
  `projectDir = getProjectDir(folder)` then delegates — behavior-preserving for its OSS-internal callers
  (`projectController` create/dup/import, `themeUpdateService`). Barrel-export the core.
- **Promote `getProjectBase(scope)` to the `StorageAdapter` contract** (`core/adapters.js` typedef +
  conformance suite). It already exists on hosted's `CloudStorageAdapter`; expose it publicly on
  `LocalStorageAdapter` (delegate to the existing private `#projectBase`). This is what lets a **shared**
  request handler resolve the per-tenant project dir without knowing OSS-vs-hosted layout — the missing piece
  the §28 audit didn't cover (it focused on render reads, which get `projectDir` from the shell, not on the
  media-usage rescan, which runs inside a shared controller).
- **Fix Symptom B (the button).** Change `mediaController.refreshMediaUsage` to
  `refreshAllMediaUsageFromDir({ projectId: req.scope.projectId, projectDir: req.adapters.storage.getProjectBase(req.scope) })`.
  Correct in both OSS (Local → OSS project dir) and hosted (Cloud → per-user dir); stops the destructive wipe.
- **Fix Symptom A (preset seed).** Hosted `POST /api/projects`: after seeding, call
  `refreshAllMediaUsageFromDir({ projectId, projectDir: adapters.storage.getProjectBase(scope) })`
  (non-blocking try/catch, mirroring OSS's `refreshMediaUsageAfterStructuralChange` wrapper at
  `projectController.js:370`).
- Same core is what hosted duplicate/import would reuse if §30 ever lands.

**Test-first (TDD):** hosted route test — create a project from a preset (or seed the fixture), POST/So the
create flow runs, then assert a preset-seeded image's `usedIn` is non-empty (references the seeding page/
widget). Red before (empty usage), green after. Plus a `builder-server` unit test for
`refreshAllMediaUsageFromDir` on a scratch `projectDir`, and confirm OSS `refreshAllMediaUsage` still passes.

**Effect:** moderate (data-integrity) — hosted preset projects currently ship with all seeded media
mis-flagged unused (deletable / pruned on publish). **Hosted impact:** the fix; OSS unaffected (behavior-
preserving wrapper).

---

## 36. Cold-boot race bounces the editor to the picker on an aborted active-project fetch (`editor-ui`)

**Status:** ⬜ open (investigate) — surfaced 2026-07-07 while verifying §29's stale-project curtain reload
(`window.location.assign("/pages")`). Pre-existing OSS bootstrap flakiness, independent of §29 (which only
exposed it).

**What.** `projectStore.fetchActiveProject` (`packages/editor-ui/src/stores/projectStore.js`) treats *any*
`getActiveProject()` failure as "no active project": its `catch` sets `loading:false` while leaving
`activeProject` null. `HomeRedirect` (`/`) and `RequireActiveProject` (editor routes) both read
`!activeProject && !loading` as "go to the picker" → `Navigate to="/projects"`. So on a cold boot whose first
`GET /api/projects/active` is **aborted** (the browser cancels an in-flight request on navigation — observed as
`NS_BINDING_ABORTED`) or otherwise errors, the user is bounced to `/projects` instead of their project's pages —
intermittently, since a retry that wins the race lands correctly.

**Evidence.** Network on a curtain reload showed the first `/api/projects/active` as `NS_BINDING_ABORTED`
followed by two `200`s returning the real active project (`audit-findings`). The multiple bootstrap requests
also smell of React StrictMode double-invoking App's `fetchActiveProject` effect in dev.

**Fix direction (investigate).** Distinguish "the fetch failed / was superseded" from "there is genuinely no
active project." Options: ignore `AbortError`/superseded requests in `fetchActiveProject` (don't null
`activeProject`, don't flip to the redirect state — let the newer fetch settle); and/or surface an explicit
error state rather than silently redirecting to the picker; and/or dedupe the double bootstrap so there is a
single in-flight fetch. Confirm the exact trigger (StrictMode double-mount vs a real redirect aborting the
request) before choosing.

**Scope.** OSS `editor-ui` (`fetchActiveProject`) + the OSS shell bootstrap (`app/src/App.jsx`). **Hosted
impact:** none — hosted seeds the project via the `seedProject` DI path (`projectStore.js`), not
`fetchActiveProject`, so it never hits this redirect.

**Effect:** low/moderate — intermittent wrong landing (picker instead of the project) on cold boot / reload;
data-safe and self-correcting on a manual navigation.

# Branch `experimentation` — Port-Completeness Findings

**Audit date:** 2026-06-23
**Question answered:** Did the `experimentation` branch (refactor into npm-workspace packages, destined to become the new "main") lose any functionality that exists in `master`?
**Scope compared:** merge-base `5f267eb5` → `master` HEAD `a6aeaac1` (111 commits) vs `experimentation` HEAD `c7dff686`.

> **Filename note:** requested as `branch-experimenentation-findings`; saved with the corrected spelling to match the real branch name. Rename if the literal spelling was intended.

---

## 1. Verdict

The port is **largely faithful and complete**, but **not** loss-free. The refactor itself is sound; the gaps below are discrete *port-misses* (functionality that existed in `master` and was not carried across the net-diff port `546a655d` + `9f60622b`).

- **2 × P0** — breaks shipped output / security
- **3 × P1** — lost feature or broken upgrade path
- **4 × P2** — data-integrity / cosmetic
- **Test-coverage erosion** — including the two suites that would have caught P0-A1 and P1-B1

None block the refactor. All are fixable by porting the named master commit into the package architecture.

### Findings index

| ID | Sev | Area | One-line | Status |
|----|-----|------|----------|--------|
| A1 | P0 | render/export | Depth-aware asset/favicon prefixing (Phase 15) never ported → broken links on every exported collection item page | ✅ `23e89190` |
| A2 | P0 | electron | Preview window missing `SAFE_PREVIEW_PATH` guard + collection-item support (security + desktop feature) | ✅ `583b52cf`,`4013e860` |
| B1 | P1 | theme update | `collection-types` dropped from `UPDATABLE_PATHS` → existing projects never get collection-schema updates | ✅ `c4966d40` |
| B2 | P1 | media | Image `caption` feature fully removed (DB → repo → UI → locale); dead residue left behind | ✅ `66125d85` |
| B3 | P1 | SEO | SeoTag Phase 18 og:image hardening unported → relative `og:image`/`twitter:image` on all pages | ✅ `561ff9fe` (+hosted) |
| C1 | P2 | storage | Atomic JSON writes dropped (`writeJsonAtomic` → plain `fs.writeFile`); crash can truncate item/`_order.json` | ✅ `ecff0dab` |
| C2 | P2 | editor CSS | Compact settings-sidebar styling (`1a102213`) partially unported; dead stub/classes left | ✅ `c74d714f` |
| C3 | P2 | media | Audio-inclusive upload error copy regressed ("images and PDF" / "Image size…") | ✅ `b980cebc` |
| C4 | P2 | preview | `SitePreviewLayout` dropped → page↔item preview remounts chrome (flash) | ✅ `cd2f5a48` (+hosted) |
| D1 | P1 | db/migrations | Migration v2 slot reused for `owner_id` → master-v2 DBs skip it; caption never lands | ✅ `66125d85` (+hosted) |
| D2 | P1 | editor UI | Shared `Table` lost sortable rows → collection reorder broken (overlaps QA-003) | ✅ `97e38324` |
| D3 | P2 | render | Menu active state / `aria-current` uses `.html` slug, not canonical path | ✅ `e60ef712` (+hosted) |
| D4 | P2 | media | MediaDrawer master fixes dropped (first-open reset, body portal, cache invalidation) | ✅ `81d75ccb` |
| D5 | P2 | media | Audio media UI labels/icons only partially ported | ⬜ open |
| D6 | P3 | docs | `AGENTS.md` still describes the pre-refactor `src/`+`server/` layout | ✅ `f6962890` (docs) |
| D7 | P1 | editor UI | Collection items not linkable in menus — picker fetch + select-mapping + grouped combobox dropped | ✅ `e60ef712` |

> **Status legend:** ✅ fixed (commit in the OSS `experimentation` repo unless noted) · ⬜ open. Full remediation detail — including every **deviation from `master` and why** — is in **§9**.

---

## 2. Method & coverage

The experimentation team performed a **net-diff port**, not a cherry-pick (per `546a655d`: *"Folds the net change from 5f267eb..origin/master into the workspace packages, re-expressed scope-first"*). The correct audit is therefore **final-state functionality**, not commit-by-commit.

Surfaces compared (all changed paths in master's net diff):

| Surface | Result |
|---------|--------|
| `themes/` | **Byte-identical** between branches — full Arch 0.9.9 theme port (collection-types, all grid widgets, audio-player, presets, media) is complete. |
| `scripts/` | 5 files = refactor import-path/signature updates only (clean). `theme-update-delta.js` **deleted** + `theme:update-delta` npm alias removed — dev tooling, see §5. |
| `server/` (62 files) | Audited across 6 feature agents → packages/builder-server, render-engine, core. |
| `src/` (103 files) | Audited across 3 feature agents → packages/editor-ui, app/src. |
| `electron/` (2 files) | Audited directly → **gap A2**. |
| `docs-entities/`, `docs-website/`, `future-rte-blank-filter.md` | See §5 (expected divergences). |

P0/P1 findings A1, A2, B1, B2 were independently re-verified by direct `git diff` / `grep` after the agent pass.

---

## 3. Confirmed faithful ports (no action)

- **Collections data layer** — schema validation, slug/uniqueness, CRUD, leftover-content (`_archived`), per-item validation status, bulk delete, media-usage scanning.
- **Collections rendering core** — `| collection` filter, menu/link depth-prefixing, stable-UUID menu targets, item-page export, canonical/sitemap/robots, markdown parity, single shared render pipeline.
- **Richtext** — `rte_blank`/`rte_text`, opt-in images + automatic media resolution, headings, link-to-file, DOMPurify + `| raw`; Arch fully migrated off the old blank-checks; 19/19 tests green. **Clean.**
- **Setting types & URL safety** — date/table/gallery sanitizers, `sanitizeHref`, `safe_url` filter, image-path allowlist. Byte-identical.
- **Media/audio/export** — `.mp3` MIME, HTTP 206 range streaming, 50 MB upload default + config, markdown export, export total-size, version pruning, image-quality settings, dev-mode HTML/WCAG validation.
- **Field controls & widget UX** — date/table/gallery inputs, richtext editor, YouTube re-save-loop fix, StrictMode crash fix, widget copy/paste + clipboard project-isolation, context menu (button + right-click + all close triggers), keyboard-delete guard, widget inserter (name/alias search, height, positioning, keyboard scroll), duplicate/rename, sticky page-form action bar.
- **Project/preset seeding** — `seedPresetMedia`, `seedPresetCollections`, project scaffold, `enrichNewProjectReferences` (preset link pageUuid fix), migrations runner.

Bonus improvements in experimentation (not regressions): IconInput gained DOMPurify SVG sanitization; menuResolver gained a `MAX_MENU_DEPTH` recursion cap.

---

## 4. Gaps

### P0 — breaks shipped output / security

#### A1 — Depth-aware asset/favicon prefixing never ported
- **Origin:** master `766fcdac` *"feat(collections): Phase 15 — depth-aware asset/tag path prefixing"*.
- **experimentation:** `packages/core/src/tags/assetTag.js`, `renderHeaderAssets.js`, `renderFooterAssets.js`, `placeholderImageTag.js` carry **no** `outputPathPrefix` handling (confirmed identical to the pre-feature merge-base). `prefixSiteIcons` exists nowhere; `packages/render-engine/src/renderEngine.js:502` passes `globals.siteIcons` raw.
- **master:** `src/core/tags/renderHeaderAssets.js` (adds `prefixSrcset` + `prefixInternalHref` + `outputPathPrefix`), `assetTag.js`, and `server/utils/siteIconHelpers.js` `prefixSiteIcons`.
- **Impact:** Item pages export one directory deep (`slugPrefix/item.html`) with `outputPathPrefix:"../"` (`exportController.js:537`), but these tags still emit **root-relative** `assets/...`. Result on every exported collection item page (News/Projects/Services): broken theme CSS/JS, broken `<link rel=preload>`, broken responsive `srcset`, and 404'd favicon/apple-touch-icon/`site.webmanifest`. Not masked by any post-process rewrite.
- **Remediation:** Port the Phase-15 prefix logic into the four core asset tags and add `prefixSiteIcons` to the render path; restore the depth-prefixing tests (see §6).

#### A2 — Electron preview window not hardened / extended
- **Origin:** master `582168d1` (touched `electron/main.js` + `preload.js`).
- **experimentation:** `electron/main.js:467` `openPreviewWindow(pageId)` → `/preview/${encodeURIComponent(pageId)}`; IPC handler at `:758` forwards a raw `pageId`; `electron/preload.js:22` bridges `pageId`. **No** `SAFE_PREVIEW_PATH` guard anywhere in `electron/`.
- **master:** `openPreviewWindow(previewPath)` validates against `SAFE_PREVIEW_PATH = /^\/preview\/(?:collection\/[a-z0-9-]+\/[a-z0-9-]+|[A-Za-z0-9_-]+)$/` before building the URL.
- **Impact:**
  - **Security:** the privileged preview window (carries the app preload bridge) can be pointed at remote content (e.g. `//evil.com/x`) via the `open-preview-window` IPC message — exactly the case master's guard blocks.
  - **Feature:** collection-item preview cannot open in the desktop app (only bare page IDs are handled). Web preview is unaffected (handled by routes).
- **Remediation:** Port the `SAFE_PREVIEW_PATH` allowlist and the `previewPath` (vs `pageId`) signature through `main.js` + `preload.js` (and the renderer caller).

### P1 — lost feature / broken upgrade path

#### B1 — `collection-types` dropped from theme-update `UPDATABLE_PATHS`
- **Origin:** master `17fcb4e8` *"feat(collections): Phase 9 — theme update, upload, and preset integration"* (BLOCKER-1 resolution).
- **experimentation:** `packages/builder-server/src/services/themeUpdateService.js:7` —
  `["layout.liquid", "assets", "widgets", "snippets", "locales", "screenshot.png"]` (no `collection-types`; no alternate handler in `applyThemeUpdate`).
- **master:** `server/services/themeUpdateService.js:21-31` includes `"collection-types"`.
- **Impact:** Theme updates no longer deliver new/changed collection-type schemas to **existing** projects. This is the documented delivery path for collections to old installs — now broken. (`widgets` is still present, so widget updates work.)
- **Remediation:** Add `"collection-types"` back to `UPDATABLE_PATHS`; restore the regression test (see §6).

#### B2 — Image `caption` feature fully removed
- **Origin:** master `b40996f7` *"Per-image caption field"* (moved caption from inline-gallery to a media-record field).
- **experimentation:** No `caption` column in `packages/builder-server/src/db/migrations.js`; `mediaRepository` never reads/writes it (`updateFileMetadata`, `insertMediaFile`, `getMediaFiles` handle only `alt`/`title`); MediaDrawer has no caption input; locale keys absent. **Dead residue:** the media-metadata route validates `body("description")` which the controller ignores, and `projectController.js:144` reads `entry.caption` on import but the repository silently drops it.
- **master:** migration v2 `ALTER TABLE media_files ADD COLUMN caption`; full read/write across repository + controller + `MediaDrawer.jsx:178-184` + locale.
- **Note (by design, not a loss):** experimentation reused the migration-v2 slot for `owner_id` (multi-tenant) — but the caption column was dropped with it rather than added as a later migration.
- **Impact:** Users cannot set or see image captions; partially-wired dead code remains. Corroborated independently by 3 audit agents.
- **Remediation:** Add a `caption` column migration; restore repository/controller/MediaDrawer/locale handling; rename the route's `description` field back to `caption`.

#### B3 — SeoTag Phase 18 og:image hardening unported
- **Origin:** master `38d1d2f4` *"feat(collections): Phase 18 — render helpers"*.
- **experimentation:** `packages/core/src/tags/SeoTag.js:98` `resolveImageUrl(rawValue, imagePath, siteUrl, …)` is the pre-Phase-18 version that emits relative og:image.
- **master:** `resolveImageUrl(rawValue, siteUrl, …)` returns `""` without a `siteUrl` (absolute-only).
- **Impact:** `og:image` and `twitter:image` emit relative paths instead of absolute URLs → social-share/SEO image previews break. Affects **all** pages and collection item pages.
- **Remediation:** Port the Phase-18 `resolveImageUrl` change (absolute-only social image URLs).

### P2 — integrity / cosmetic

#### C1 — Atomic JSON writes dropped
- **Origin:** master `d5986aec` *"feat(collections): Phase 2 — atomic JSON write helper"* (`server/utils/atomicFs.js`, spec §15).
- **experimentation:** `writeJsonAtomic`/`atomicFs` not ported; `packages/adapters-local/src/LocalStorageAdapter.js:37` `write` is a plain `fs.writeFile`. The service comment at `collectionService.js:802` wrongly asserts the adapter makes the atomic temp-file dance unnecessary; the `StorageAdapter` contract does not require atomicity.
- **Impact:** A crash mid-write (or concurrent write) can leave a truncated collection item or `_order.json`. Data-integrity regression.
- **Remediation:** Either make `LocalStorageAdapter.write` atomic (temp-file + rename) or restore `writeJsonAtomic` in the service path; correct the misleading comment.

#### C2 — Compact settings-sidebar styling partially unported
- **Origin:** master `1a102213` *"Compact the page-editor settings sidebar; fix YouTube input re-save loop"*.
- **experimentation:** Functional parts (YouTube fix, Gallery vertical-card) **were** ported; the CSS compaction was **not** — `SettingsPanel.jsx:120,132` still `px-4`; `styles/preset.css` has an empty `.page-editor-settings {}` stub and dangling `settings-action-btn` / `icon-grid-button` classes with no backing rules; missing `text-xs` labels/inputs, vertical radio group, icon-grid fill, smaller code/action-button text.
- **Impact:** The narrow (~200 px) right sidebar shows oversized text and a horizontally-scrolling icon picker. Cosmetic only.
- **Remediation:** Port the remaining `1a102213` CSS into `preset.css` / `SettingsPanel.jsx` (and the `RadioInput`/`IconInput`/`CodeInput` class hooks).

#### C3 — Audio-inclusive upload copy regressed
- **Origin:** master `299aa969` *"Add MP3 (audio) support"* (the experimentation port `422d2691` already caught the 50 MB + copy miss, but missed these strings).
- **experimentation:** `mediaController.js:150` rejection message says "images and PDF" (no audio); `:291` size reason says "Image size…" for any file.
- **master:** "images, audio (MP3), and PDF" / "File size…".
- **Impact:** Misleading rejection messages; the audio upload itself works. Cosmetic/messaging.
- **Remediation:** Update the two strings to the audio-inclusive copy.

#### C4 — `SitePreviewLayout` dropped
- **Origin:** master `582168d1` / `56006756` (unify item preview into the navigable site preview).
- **experimentation:** `SitePreviewLayout`/`PreviewStage`/`PreviewModeToggle` removed; `app/src/pages/PagePreview.jsx` and `CollectionItemPagePreview.jsx` are standalone sibling routes each owning their own toggle + iframe.
- **Impact:** Navigating page↔item in standalone preview now remounts the chrome/iframe (the flash master eliminated). Click-through navigation is functionally intact. Cosmetic.
- **Remediation:** Optional — reintroduce a shared persistent preview layout if the flash matters.

---

## 5. Expected divergences (NOT losses)

Listed so they are not mistaken for gaps:

- **`docs-entities/`** (Obsidian entity graph, 103 files) — absent in experimentation. Documentation artifact (`711c7ed7`), not app code. Almost certainly intentional.
- **`future-rte-blank-filter.md`** — absent; the feature it planned shipped (rte filters are present). Fine.
- **`theme-update-delta.js`** script + **`theme:update-delta`** npm alias — removed. Dev/release tooling (generates bundled-theme update deltas). Probably intentional, but note it *relates to B1* — together they weaken the "deliver collections to existing projects via theme update" path. Confirm intent.
- **5 modified scripts** (`preset-sync.js`, `sync-preset-templates.js`, `pack-preset-media.js`, `validate-locales.js`, `validate-theme-locales.js`) — refactor import-path/signature updates only. Clean.
- **Migration v2** differs by design: master v2 = `caption`; experimentation v2 = `owner_id` (multi-tenant). Intended — but see B2.
- **Architectural changes** — render-engine purity (no fs/scope, `deps` bag), scope-first adapters, plugin-nav registry, `apiBase`/`editorFetch`, `MAX_MENU_DEPTH` cap, IconInput SVG sanitization. Intended improvements.

---

## 6. Test-coverage erosion

The port consolidated tests; two deletions directly explain why P0-A1 and P1-B1 slipped through unnoticed:

| Lost coverage | Consequence |
|---------------|-------------|
| Depth-prefixing suite: `pathPrefixing`, `depthRenderSmoke`, `linkMenuPrefixing`, `linkPrefixer`, `renderCollectionItemPage`, `collectionItemPageData`, `exportPostProcess` (all absent) | No guard on A1 — no test asserts depth-prefixed asset/favicon hrefs on an item page. |
| `themeUpdateService` "replaces collection-types" regression test | No guard on B1. |
| `atomicFs.test.js` (7) | No guard on C1. |
| Media `caption` persistence (3) + audio range-request (7) | Caption silently lost; range feature works but is untested. |
| `sanitizeDateValue` validation tests | Impossible-date rejection (`2026-13-40`, `2026-02-30`) now untested. |
| ~80+ granular collection tests folded into ~39 higher-level ones | Lower regression resolution for gallery-required/table-column/date-coercion edges. |

---

## 7. Relationship to the in-flight QA run

This audit is **complementary** to the black-box QA run (`docs-llms/qa-runs/2026-06-22-web-app-experimentation.md`, issues `QA-001`–`QA-011`), which tests "does experimentation work?". This audit tests "did experimentation lose anything master had?". No findings here duplicate the open QA issues — B2 in particular is a *silent* drop with no UI surface to black-box test.

---

## 8. Codex review addendum (2026-06-23)

Method: compared `experimentation` against `master`/`origin/master` (there is no `main` ref in this checkout), read this findings document, and split independent review slices across three agents: backend/rendering, frontend/Electron, and broad/test-coverage.

### Overall agreement

I agree with the main direction of the audit. In particular:

- **A1 is still P0.** Depth-aware asset/favicon prefixing is not faithfully ported. Core tags still emit bare `assets/...` in publish mode, and `site_icons` are passed through without the master `prefixSiteIcons` behavior.
- **B1 is valid.** `collection-types` is absent from `UPDATABLE_PATHS`, so theme updates do not deliver changed collection schemas to existing projects.
- **B2 is valid.** Caption support was removed across migration/repository/controller/UI/locale paths. The lingering `description` validation and import-time `entry.caption` handling are dead residue.
- **C1/C3/C4 are directionally valid.** Atomic local JSON writes, audio-inclusive upload copy, and the shared standalone preview layout were all dropped or partially dropped.

### Severity corrections / overstatements

- **A2 should not be treated as a P0 remote-content/security issue as written.** Current Electron code still encodes the IPC argument into a local `/preview/...` path, so a payload like `//evil.com/x` does not load remote content. The real regression is that desktop collection-item preview is broken because `openSitePreview()` sends `/preview/collection/...`, while Electron still treats the argument as a page id. Keep as a real missing master hardening/feature-port issue, but downgrade to **P1/P2** rather than P0 security.
- **B3 impact is overstated.** `SeoTag` does not emit relative `og:image` on all pages; with `siteUrl` it can still produce absolute URLs. The missing master hardening is still important because without `siteUrl` it emits relative/rooted values, and collection item pages can produce malformed depth-derived paths such as `/../assets/...`.
- **C2 wording is stale.** Some compact-sidebar CSS did migrate, but key pieces are still missing: smaller settings-panel padding, text-size rules for inputs, radio/action/icon hooks, and icon-grid styling.
- **C4 is mostly cosmetic on the web path.** It matters more when paired with A2 because the unified preview layout was part of the navigable page/item preview experience.
- **The "no findings duplicate QA issues" claim is too strong.** The sortable-table regression below overlaps the black-box QA run's manual collection reorder issue.
- **Migration v2 should not be framed as simply "by design."** Reusing migration version `2` for a different schema change creates an upgrade-path hazard for databases that already recorded master v2.

### Additional missing findings

#### D1 — Migration version collision can skip schema changes

- **experimentation:** `packages/builder-server/src/db/migrations.js` uses migration v2 for `projects.owner_id`.
- **master:** migration v2 added `media_files.caption`.
- **Problem:** `runMigrations` skips any version already recorded in `schema_migrations`. A database upgraded through master v2 will skip experimentation's v2 and never receive `owner_id`; experimentation also needs a later migration for `caption`.
- **Impact:** Upgrade-path schema drift. This is more serious than the current note in B2 suggests.
- **Remediation:** Add forward-only migration versions for both missing schema changes; do not rely on a reused v2 slot.

#### D2 — Shared `Table` lost sortable row support

- **experimentation:** `packages/editor-ui/src/pages/CollectionItems.jsx` passes `sortable`, `getRowId`, `onReorder`, and `rowClassName` to `Table`, but `packages/editor-ui/src/components/ui/Table.jsx` ignores those props and renders a plain table.
- **master:** `Table` included the dnd-kit sortable implementation.
- **Impact:** Manual collection item reorder is broken. This overlaps QA-003 and should be treated as a master-port regression too.
- **Remediation:** Restore sortable support in the shared `Table` component, or move the sortable table behavior into `CollectionItems`.

#### D3 — Menu active state / `aria-current` regressed on collection item pages

- **experimentation:** `packages/core/src/snippets/menu.liquid` still compares `pageSlug | append: '.html'` against `item.link`.
- **master:** menu rendering compared canonical paths (`currentCanonicalPath` and `item.canonicalPath`), which avoids depth-prefix and collection-item mismatches.
- **Impact:** Collection item pages and some live preview morphs can lose active menu classes and `aria-current`.
- **Remediation:** Restore canonical-path active-state logic in the menu snippet and ensure single-widget preview/render paths pass `currentCanonicalPath`.

#### D4 — MediaDrawer master fixes were also dropped

- **First-open metadata reset:** `MediaDrawer` seeds `prevSelectedFileRef` with the selected file, which can skip the initial form reset when the drawer is mounted already-open from `ImageInput`.
- **Portal behavior:** the drawer now renders inline instead of through `createPortal(document.body)`, reintroducing stacking-context risks inside sortable/gallery rows.
- **Cache invalidation:** `useMediaMetadata` updates local media-page state but no longer invalidates the shared media cache, so page-editor image inputs can see stale metadata until cache expiry.
- **Impact:** Metadata editing can appear blank/stale in edge cases, and overlay layering can regress.
- **Remediation:** Restore master's null-sentinel reset, body portal, and `invalidateMediaCache()` call after metadata saves.

#### D5 — Audio media UI polish is only partially ported

- **experimentation:** upload handling accepts audio, but some UI labels/icons still treat every non-image as a generic file.
- **Impact:** Minor polish/accessibility regression: MP3s display less clearly in drawer/grid/list views.
- **Remediation:** Restore audio-specific labels/icons from master.

#### D6 — Repository guidance is stale

- **experimentation:** `AGENTS.md` still describes the old `src/` + `server/` layout and old test/lint paths, while the branch now uses package workspaces.
- **Impact:** Tooling/documentation drift for future agents and maintainers.
- **Remediation:** Update `AGENTS.md` to match the package layout, or point it at the newer workspace guidance.

#### D7 — Collection items can't be added to menus

> Not from the original audit or the Codex pass — **surfaced 2026-06-24 during D3 remediation**, manually testing the menu editor (no collection items appeared in a menu row's link picker).

- **experimentation:** `packages/editor-ui/src/components/menus/MenuEditor/index.jsx` fetched **only** `getAllPages()` for the link picker, and `SortableItem.jsx`'s select handler had **only** the `isPage` branch — so collection items never appeared in the combobox, and even if they had, a pick would be mis-stored as a custom URL. `MenuCombobox.jsx` had also been flattened (lost the per-group headers). Everything *behind* the UI already supported it (`menuResolver` resolves `collectionItemUuid`, `useLinkTargets` lists items, menu save persists the fields).
- **master:** `index.jsx` fetched pages **+ `hasItemPages` collection items**; `SortableItem.jsx` mapped an `isCollectionItem` pick to `collectionItemUuid`/`collectionType`/derived link (and resolved a stored ref back to its label); `MenuCombobox.jsx` rendered an uppercase header per group.
- **Impact:** Collection item pages (News/Projects/Services/…) could not be linked from any menu — a real lost feature (workaround: paste a custom URL, which loses the stable rename-following ref). Picker was also ungrouped.
- **Remediation:** Restore the option source, the select/display mapping, and the grouped combobox.

---

## 9. Remediation log (2026-06-24)

Findings worked through one-by-one on the `experimentation` branch (OSS) and `experimentation` (hosted), test-first, committed with permission. Commits are short SHAs; OSS repo unless tagged `[hosted]` / `[docs]`. **Every place we deliberately diverged from `master` is called out with the reason** — usually either (a) to preserve a fix made earlier on this branch, or (b) to respect the OSS/hosted package boundary.

### Done

**A1 — depth-aware asset/favicon prefixing** · `23e89190`
Ported master Phase-15 prefix logic into the four core asset tags + `prefixSiteIcons` on the render path; restored the depth-prefixing tests. Faithful port (re-expressed scope-first for the package layout).

**A2 — Electron preview hardening + collection-item support** · `583b52cf`, `4013e860`
Ported `SAFE_PREVIEW_PATH` + the `previewPath` (vs `pageId`) signature through `main.js`/`preload.js`/renderer; collection-item preview now opens in the desktop app.
- *Deviation from master:* extracted the guard into a standalone, unit-tested module `electron/previewPath.js` (`isSafePreviewPath`) rather than inlining it as master does — master's `electron/` had no test surface; this gives one (`previewPath.test.js`, 8 cases) and lets `vitest` cover it.
- *Severity note:* tracked as P0 in the original audit but, per the §8 Codex addendum, the remote-content/RCE framing was overstated (the IPC arg was already encoded into a local `/preview/...` path). The real regression was the broken desktop collection-item preview; the guard is defense-in-depth. Fixed regardless.

**B1 — `collection-types` in `UPDATABLE_PATHS`** · `c4966d40`
Added `"collection-types"` back; restored the "replaces collection-types" regression test. Faithful.

**B2 — image caption feature** · `66125d85` (with D1)
Restored caption across migration/repository/controller/MediaDrawer/locale; renamed the media-metadata route field `description` → `caption`.
- *Deviation from master (ties into D1):* master added caption in migration **v2**. experimentation had already reused the v2 slot for `owner_id` (multi-tenant). Rather than reuse/renumber, we added **forward-only** migrations — **v3 = `caption`, v4 = `owner_id` backfill** with a `columnExists` guard — so a DB upgraded through *either* branch's history converges. This is the D1 remediation; reusing v2 would have left master-v2 DBs permanently missing `owner_id`.

**B3 — SeoTag Phase-18 og:image (absolute-only)** · `561ff9fe`; `[hosted]` `7f68942`, `8d9b688`
Ported master's `resolveImageUrl(rawValue, siteUrl, mediaFiles)` verbatim (drops the `imagePath` param; returns `""` without `siteUrl`; builds `${siteUrl}/assets/images/${file}`); caller computes `ogImageUrl` once and omits `og:image`/`twitter:image` when unresolved (`summary` card instead of `summary_large_image`). Added an absolute-URL-passthrough test.
- *Hosted integration:* hosted plumbs `siteUrl` via `cloudProjectData.getProjectRow` and publishes images to `assets/images/`, so the core change works for hosted **with no production change** — but it surfaced two hosted **test** updates: `7f68942` asserts an absolute `og:image` when `siteUrl` is set (fixture gained `{% seo %}` + an `og_image`), and `8d9b688` bumped a shared-topology assertion because the new widgetizer migrations (D1 v3/v4) raised the migration count hosted runs against its shared DB (2 → 4).
- *Severity note:* §8 correctly flagged the original "relative on all pages" impact as overstated (with `siteUrl` master could already produce absolute URLs); the real fix is the absolute-only contract + dropping the depth-derived `/../assets/...` failure mode.

**C1 — atomic local JSON writes** · `ecff0dab`
New `packages/adapters-local/src/internal/atomic.js` (`writeFileAtomic` = UUID-tmp + rename; `isAtomicTmpFile`); `LocalStorageAdapter.write` delegates to it and `list()` filters orphan tmps. Corrected the misleading `collectionService.js` comment.
- *Deviation from master:* master kept `writeJsonAtomic` in the (server-side) service path. We put atomicity **in `LocalStorageAdapter`, not the adapter-agnostic service**, because `adapters-local` is OSS-only, the `StorageAdapter` contract doesn't require atomicity, and **hosted's R2 `PUT`s are already atomic** — pushing it into the shared service would have imposed a local-FS concern on the cloud path. Hosted unaffected.

**C2 — compact settings-sidebar CSS** · `c74d714f`
Ported the remaining `1a102213` CSS, all scoped to `.page-editor-settings` (theme-settings page + collection editor untouched): `text-xs` labels/inputs, `px-3` padding, vertical radio group, icon-grid fill, smaller inline code/action-button text; added the `radio-input-group` / `icon-grid-button` class hooks.
- *Note:* the YouTube fix + Gallery vertical-card + `RichTextInput` rules + `ImageInput`'s `settings-action-btn` hook were **already** present from the partial prior port; only the missing pieces were added. Tests pin the two new class hooks (CSS itself has no unit surface — lint + manual).
- *Follow-up:* a visual review of the icon-grid + color-picker in the narrow sidebar is still open (looked slightly off post-port).

**C3 — audio-inclusive upload copy** · `b980cebc`
The two missed strings in `mediaController.js`: rejection now lists "images, audio (MP3), and PDF"; size reason is type-agnostic ("File size…" not "Image size…"). Strengthened the existing size-limit test.
- *Note:* the `fileFilter` rejection string is left without a unit test by decision — it's a non-exported multer hook the controller tests don't reach; covered by lint + manual.

**C4 — unified standalone site preview + one-shot page preview** · `cd2f5a48`; `[hosted]` `a93252f`; `[docs]` `9e3b17e`
This bundles the documented **C4** with a related refactor (session item **#17**, "drop PreviewPanel from the standalone page"). editor-ui gained shared `previewBase.buildPreviewUrl` + `components/preview/{PreviewStage,PreviewModeToggle}`. OSS `/preview` is now a persistent `SitePreviewLayout` parent with **headless one-shot child resolvers** (`PagePreview` no longer mounts the live-edit `PreviewPanel`); page↔item navigation no longer remounts the chrome (the flash is gone).
- *Deviation 1 — `buildPreviewUrl`:* master's children inline `` `${BASE_URL}/render/${token}` `` (static base, **no `parentOrigin`**). We kept experimentation's builder (`getPreviewRenderBase()` + `?parentOrigin=`): the no-referrer preview runtime reads the editor origin from the URL to target its reply postMessages, and hosted overrides the render base. Copying master here would break the preview bridge and hosted's proxy.
- *Deviation 2 — boot-race gate:* master's `PagePreview` loads the page unconditionally. We kept the `activeProject` gate added earlier this branch (`225e2145`, below) — a cold-booted standalone preview window resolves `activeProject` a beat after first render, and an ungated load re-introduces the iframe-abort race. Adopting master verbatim would regress our own fix.
- *Deviation 3 — hosted scope:* hosted **adopted the shared chrome only** (`PreviewStage`/`PreviewModeToggle`/`buildPreviewUrl`); its routing and `PreviewPanel` usage are unchanged, so hosted page↔item still remounts (its own sibling routes). Full parity (a hosted persistent layout) is **deferred and assessed** in `experiment-docs/TODO.md §13` (lean: probably not worth it now — the click-through flash is the only benefit and it touches Clerk/`EditorProvider`-gated routes).

**D1 — migration version collision** · `66125d85`; `[hosted]` `8d9b688`
Resolved together with B2 via forward-only migrations v3 (`caption`) / v4 (`owner_id` backfill) — see B2 above. Hosted's shared-topology migration-count assertion updated to match.

**D2 — sortable rows in shared `Table`** · `97e38324`
The `CollectionItems` consumer was already fully wired (`sortable`/`getRowId`/`onReorder`/`rowClassName`, with `handleReorder` persisting via `reorderCollectionItems`) — only `packages/editor-ui/src/components/ui/Table.jsx` was missing the implementation, so the four props leaked onto the native `<table>` and rows rendered plain (also the QA-003 console warnings). Ported master's opt-in dnd-kit `sortable` mode (same path; `@dnd-kit/*` already in `editor-ui` deps): grip-handle column via `SortableTableRow`, `DndContext`/`SortableContext` with `restrictToVerticalAxis` + pointer/keyboard sensors, `handleDragEnd` → `onReorder(arrayMove(...))`. Faithful port; the non-sortable branch is behavior-identical so the 5 plain-table consumers (`Pages`/`Menus`/`Projects`/`MediaList`/`ExportHistoryTable`) are unaffected.
- *Test scope:* new `Table.test.jsx` pins the rendering contract (plain unchanged; sortable adds the handle column + per-row handles + correct empty-state colspan; `rowClassName` applied). The dnd-kit drag interaction itself is left to manual/e2e — not reliably reproducible in jsdom, and master shipped no test for it either.
- *Resolves* QA-003 (`qa-issues/QA-003-collection-table-ignores-sort-and-row-props.md`).

**D3 — canonical-path menu active state** · `e60ef712`; `[hosted]` `ddf58f1`
The menu snippet matched the active item with `pageSlug | append: '.html'` vs the **depth-prefixed** `item.link`, so collection item pages (and any nested-depth render) lost `is-active`/`aria-current`. Switched to matching the un-prefixed `currentCanonicalPath` global vs each item's `item.canonicalPath` (the `href` still emits the prefixed `link`) — most of the infra was already present (`menuResolver` emits `canonicalPath`; `renderEngine` defaults the global; the item-page paths already set it). Filled the gaps: page preview/export globals + the single-widget morph endpoint (reads it from the request) now set `currentCanonicalPath`, and the editor `previewManager` forwards it on every morph; the now-dead `pageSlug` global was dropped. Faithful to master.
- *Two-repo scope:* mirrored in hosted's parallel render pipeline (`renderPreviewPage.js` page + widget globals, `renderProjectStream.js` publish globals, `routes/previewRender.js` forwarding) — `ddf58f1`.
- *Test scope:* `menuActiveState.test.js` renders the real snippet via LiquidJS (active by `canonicalPath` at item-page depth despite `../` links; nested subitems; no-match guard); `previewManager.test.js` pins the morph request carrying `currentCanonicalPath`. Hosted `npm run test:server` is green (608) including the render + preview/export route suites.

**D4 — MediaDrawer master fixes** · `81d75ccb`
Three master fixes lost in the package port, restored to match master (editor-ui only → inherited by web/Electron/hosted, which vendors editor-ui):
1. *First-open reset* — `MediaDrawer` seeded `prevSelectedFileRef` with the initial `selectedFile`, so the populate-form effect saw "no change" on first mount and skipped the reset, showing blank alt/title/caption. `ImageInput` mounts the drawer **conditionally** (`{visible && file && …}`), i.e. already-visible with the file set, so it hit this every time (the Media page mounts the drawer persistently from `selectedFile=null`, so it was unaffected). Seeded the ref with a `null` sentinel (master's fix).
2. *Body portal* — the fixed overlay rendered inline; `createPortal`'d it to `document.body` so it escapes ancestor stacking contexts (a `@dnd-kit` sortable row's transform/z-index in `GalleryInput`).
3. *Cache invalidation* — `useMediaMetadata.handleSaveMetadata` updated local `setFiles` but never dropped the shared 30s media cache, so the page editor's image inputs served stale metadata until expiry. Added `invalidateMediaCache(activeProject.id)` after the save (`ImageInput`'s own save handler already did this; only the Media-page hook was missing it).
- *Deviation from master:* none functional — the only un-ported lines are the `lib/config` import path (the package refactor) and master's `isAudio`/audio-label branch, which is **D5**'s scope (same file, deferred deliberately).
- *Test scope:* `MediaDrawer.test.jsx` (first-open populate from an already-visible mount; overlay portaled to `document.body` not the container); `useMediaMetadata.test.js` (cache invalidated after a successful save).

**D7 — collection items linkable in menus** · `e60ef712`
Port regression surfaced 2026-06-24 while testing D3 (see §8 D7). The MenuEditor only fetched pages and only mapped page selections, so collection items couldn't be added to a menu; the picker had also lost its group headers.
- *Fix (editor-ui only → web/Electron/hosted):* `index.jsx` now sources options from the shared **`useLinkTargets`** hook (pages + `hasItemPages` collection items) **instead of its own `getAllPages()` fetch** — this both restores collection items *and* retires a duplicated link-target fetch, gaining the hook's cache + invalidation. `SortableItem.jsx` restores master's `isCollectionItem` select branch (store `collectionItemUuid`/`collectionType`/derived `slugPrefix/slug.html`, clear the other refs) and the `collectionItemUuid` display branch. `MenuCombobox.jsx` restores the per-group header rendering (the `group` field was already supplied).
- *Deviation from master:* master kept an inline pages+items fetch in `index.jsx`; we used the existing `useLinkTargets` hook (which postdates master's copy and is already the source `LinkInput` uses) — same option shape, less duplication.
- *Test scope:* `SortableItem.test.jsx` (pick a collection item → `collectionItemUuid` + derived link; pick a page → `pageUuid` + cleared item ref; stored ref shows its label); `MenuCombobox.test.jsx` (group headers render once per group and aren't selectable).

**D6 — stale repository guidance** · `f6962890`
Updated `widgetizer/AGENTS.md` to the package-workspace layout (it still described the pre-refactor `src/` + `server/` monolith): workspace-packages architecture + adapter/`scope` note, package directory layout, corrected Quick Reference (`test:frontend`, `lint:all`, `theme:sync`/`preset:sync`), and the `packages/builder-server/src/tests/` test/lint paths — mirroring the already-current `CLAUDE.md`.
- *Doc-accuracy sweep in the same commit:* `core-page-editor.md` (PreviewPanel is editor-only post-C4; "Previewing a Page" now describes the `SitePreviewLayout` + headless-resolver + `PreviewStage` structure); `core-media.md` (the B2 `caption` metadata field added to examples + drawer/hook/update descriptions); hosted `database-schema.md` (the D1 forward-only editor migration sequence v1–v4 — committed separately as `ba7d866`). Audited but already accurate: `core-hooks.md`, `core-architecture.md`, `core-security.md`, `core-pages.md` (B3 og:image), `core-file-assets.md`, hosted `oss-editor-integration.md`, `experiment-docs/*`.
- *Known tolerated drift (not touched):* several `docs-llms/*` bodies still cite pre-refactor `src/...`/`server/...` paths (e.g. `core-database.md` migration path) — covered by the blanket "treat package paths as current" note in `CLAUDE.md`; out of scope to chase here.

### Related fixes made during this work (not in the original findings)

**Standalone page-preview boot race** · `225e2145`
A freshly opened OSS preview window/tab cold-boots and `activeProject` resolves after first render; the `undefined → id` flip reset `PreviewPanel` mid-load and aborted the in-flight `/render/<token>` iframe (`ERR_ABORTED -3`). Found while testing A2 in Electron; **also affects the web app** (Electron just makes it reliably reproducible). Fixed by gating page load + preview mount on `activeProject` (mirrors hosted's `StandalonePreview`). This gate is what C4 Deviation 2 preserves.

**Export View/Download URLs built absolute** · `964894f7`
`getExportViewUrl`/`getExportDownloadUrl` now resolve against `API_URL` instead of being root-relative — fixes a dev-mode 404 / corrupt-zip download when the Vite origin ≠ API origin. Adjacent to the apiBase/editorFetch architecture work; surfaced while exercising preview/export on split dev ports.

### Open (not yet started)

**D5** (audio media UI labels).

Also open, tracked in `experiment-docs/TODO.md`: **§13** hosted preview full-parity decision; the route-**dispatch** half of the preview-helper consolidation (the `buildPreviewUrl` half landed in `cd2f5a48`).

### How to verify
OSS: `npm run test:frontend` (631), `npm test` (1237), `npm run lint:all`, `npm run validate:locales` (611 keys) — all green (D4 at `81d75ccb`; D3/D7 at `e60ef712`). Hosted: `npm run test:client` (57) + `npm run test:server` (608) + `eslint` — all green at `ddf58f1`. Manual checks: menu `is-active`/`aria-current` on a collection item page; adding a collection item to a menu (grouped picker → saves a `collectionItemUuid`); and the earlier preview click-through with no chrome flash on OSS.

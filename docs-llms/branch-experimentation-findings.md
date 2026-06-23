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

| ID | Sev | Area | One-line |
|----|-----|------|----------|
| A1 | P0 | render/export | Depth-aware asset/favicon prefixing (Phase 15) never ported → broken links on every exported collection item page |
| A2 | P0 | electron | Preview window missing `SAFE_PREVIEW_PATH` guard + collection-item support (security + desktop feature) |
| B1 | P1 | theme update | `collection-types` dropped from `UPDATABLE_PATHS` → existing projects never get collection-schema updates |
| B2 | P1 | media | Image `caption` feature fully removed (DB → repo → UI → locale); dead residue left behind |
| B3 | P1 | SEO | SeoTag Phase 18 og:image hardening unported → relative `og:image`/`twitter:image` on all pages |
| C1 | P2 | storage | Atomic JSON writes dropped (`writeJsonAtomic` → plain `fs.writeFile`); crash can truncate item/`_order.json` |
| C2 | P2 | editor CSS | Compact settings-sidebar styling (`1a102213`) partially unported; dead stub/classes left |
| C3 | P2 | media | Audio-inclusive upload error copy regressed ("images and PDF" / "Image size…") |
| C4 | P2 | preview | `SitePreviewLayout` dropped → page↔item preview remounts chrome (flash) |

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

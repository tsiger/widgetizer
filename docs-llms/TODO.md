# TODO — OSS builder (web + Electron desktop)

**Updated:** 2026-06-24

Open work for the OSS builder, migrated 2026-06-24 from the engagement-level
`experiment-docs/TODO.md` (parent repo) so each item lives with the project it
applies to. Hosted-specific items moved to `widgetizer-hosted/docs/TODO.md`.
Original engagement section numbers are kept in parentheses for traceability.

Conventions still in force: commit only on the `experimentation` branch with
explicit permission, never switch branch / never push.

---

## 1. Relative preview asset URLs (robustness) — discuss  *(was experiment-docs §10)*

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

## 2. Bundled theme updates on the OSS desktop app (product/design decision)  *(was experiment-docs §11)*

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

## 3. Modernize pre-refactor `src/...` / `server/...` paths in `docs-llms/*` (docs hygiene)  *(was experiment-docs §14)*

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

## 4. Deferred — Playwright E2E smoke (OSS) *(was experiment-docs §9, OSS portion)*

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

## 6. Narrow-sidebar icon-grid + color-picker visual review  *(C2 follow-up; session task #18)*

Surfaced post-**C2** (compact settings-sidebar CSS, `c74d714f`): the icon-grid and color
picker in the narrow (~200 px) right page-editor settings sidebar looked slightly off after the
port. CSS-only, no behavioural impact — needs an eyes-on pass in the running app (the CSS has no
unit surface). Check the icon-grid fill/wrap and the color-picker sizing/alignment under
`.page-editor-settings`; adjust `styles/preset.css` / the `icon-grid-button` hook as needed.
Low priority, cosmetic.

---

## 7. Missed port — theme-upload collection-schema gate not wired (`builder-server`) — ✅ new-theme install path DONE 2026-06-25 (update-import path → §22)  *(was experiment-docs §8)*

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

Surfaced 2026-06-24 during the master-commit port audit (`experiment-docs/widgetizer-master-commits.md`),
inspecting **`6e6fe472`** (Collections Phase 1) against latest master.

The Collections feature was ported wholesale into the new package architecture, but **one
call site was missed**: `validateThemeCollectionSchemas` was ported into
`packages/builder-server/src/services/collectionService.js` (and is exercised by tests) yet is
**never called** — grep finds zero callers across `packages/app/electron`.

On **latest master** (`server/controllers/themeController.js:1436`, still live — not undone by a
later commit), `uploadTheme` runs the gate before committing an uploaded theme:

```js
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

## 8. Missed port — `pageController` doesn't thread `projectId` into `cleanupDeletedPageReferences` (`builder-server`)  *(was experiment-docs §9)*

Surfaced 2026-06-24 during the master-commit port audit, inspecting **`eea285de`**
(Collections Phase 7 — link integrity) against latest master.

`cleanupDeletedPageReferences(projectFolderName, deletedPageUuid, projectId = null)` was ported
**faithfully** into `packages/builder-server/src/utils/linkEnrichment.js` — including the
optional `projectId` tail param and its media-usage re-sync block:

```js
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

## 9. Missed port — `Media.jsx` doesn't seed collection-item usage titles (`editor-ui`)  *(was experiment-docs §10)*

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

## 10. Missed port (tests only) — `createCollectionPreviewToken` guard tests (`builder-server`)  *(was experiment-docs §11)*

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

## 11. Missed port — link-picker Combobox group headers not rendered (`editor-ui`)  *(was experiment-docs §12)*

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

## 12. Missed port — richtext-embedded media not tracked as used (`builder-server`) — **moderate**  *(was experiment-docs §13)*

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

## 13. Missed port — `theme:update-delta` release tool not ported (OSS dev tooling) — **low**  *(was experiment-docs §14)*

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

## 14. Documentation port audit — content gaps from the master-commit doc changes  *(was experiment-docs §15)*

Surfaced 2026-06-24 on a **second pass** through `experiment-docs/widgetizer-master-commits.md`, this
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

The `collectionItemUuid` link-target feature (`3f707b26`) is fully ported in code but appears in exp
docs **only** in `branch-experimentation-findings.md` (a log), whereas master documents it as a feature
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

## 15. Missed port — collection item pages leak the `page-{slug}` body class (`render-engine`) — **low/moderate**  *(was experiment-docs §16)*

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

## 16. Missed port — `refreshAllMediaUsage` aborts early on a project with no pages dir (`builder-server`) — **low/moderate**  *(was experiment-docs §17)*

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

```js
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

## 17. Test-strictness audit — ported tests may have dropped master's *exclusion* assertions (cross-cutting) — **low (process)**  *(was experiment-docs §18)*

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

## 18. Missed port (tests only) — depth-1 render smoke + depth-0 no-leak guard not ported (`builder-server`) — **low**  *(was experiment-docs §19)*

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

## 19. Missed port (tests only) — `renderCollectionItemPage` contract test not ported (`builder-server`) — **low (non-runtime)**  *(was experiment-docs §20)*

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

## 20. Stale test comment — claims `remapCollectionItem{Link,Menu}Refs` "NOT ported" when they are (`builder-server`) — **trivial (comment-only)**  *(was experiment-docs §21)*

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

## 21. Dedup the cross-bundle `getStandalonePreviewTarget` copy + drop its dead `editor-ui` export (`editor-ui` + OSS preview runtime) — **low (cleanup)**

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

## 22. Gate collection schemas on the theme **update-import** path too (`builder-server`) — **low/moderate**

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

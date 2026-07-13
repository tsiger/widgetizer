# Plan — LINK-022→025: stable references for richtext links — ✅ IMPLEMENTED 2026-06-27

> **Implemented per this plan (all 5 phases), tested green** (backend 1307, frontend 713, lint + locales clean).
> - **Core:** `@widgetizer/core/richtextLinks` — resolve / cleanup (unwrap) / remap / enrich-by-href / strip / `schemaHasRichtextSetting` (35 unit tests).
> - **Sanitizer:** the two `data-*-uuid` attrs allowlisted (others stripped).
> - **Render:** wired in `renderEngine` (widgets) + `collectionService` (items); collection-item-map gate extended for richtext-only widgets/items in `renderEngine` + `renderingService`. Integration-tested via the real `renderWidget` path (root/nested/dangling).
> - **Integrity:** `linkEnrichment` enrich/cleanup/remap extended for richtext; **new** `enrichSeededRichtextLinks` called inside `seedPresetCollections` (stamps page + item uuids on seeded item bodies from hrefs); `sync-preset-templates` strips both attrs. Integration-tested (cleanup/enrich/remap + preset seed).
> - **Editor:** `StableLink` TipTap extension round-trips the attrs; inline target picker (`useLinkTargets`) gated by `allowInternalLinkTargets` — ON for widget/block/global + collection-item settings, OFF for theme settings; page↔item switches keep exactly one attr (external/unlink clears both).
> - **Decisions locked:** on-delete = unwrap; editor = inline row picker; integrity = data-attr scan (cleanup/remap/render) + href scan (enrich/backfill). Existing-content backfill (decision #4) deferred — presets + new links are covered.

---

## Plan (original, for reference)

**Status:** proposal, not yet implemented. Reviewer round 1 + round 2 folded in 2026-06-27.
R1: map-loading gate, dangling-uuid = clear, preset-tooling normalization, editor attr
clearing, theme-settings scope, package export, extra tests. R2: block-level gate
(`schema.blocks[].settings`) + block-only test, map availability by presence not `.size`
(+ omitted-vs-empty test), delete-wording made consistent with open decision #1,
existing-content backfill called out (open decision #4). R3: theme-settings picker prop-guard
(shared RichTextInput renders theme settings too), preset tooling splits page-uuid (strip,
re-derived at scaffold) vs collection-item-uuid (preserve, remapped at seed — creation order),
map-gate tightened to collectionItemsByUuid only (pagesByUuid loads before the gate). R4: preset
collection items carry NO source uuid (0/205; format docs forbid it) so the seed-time uuid remap
can't apply — corrected to strip data-collection-item-uuid + a NEW post-seed slug→seeded-uuid
enrichment (remap stays for project duplication only); added theme-settings guard test; delete test
made conditional on decision #1. R5: corrected remap labeling (remapCollectionItemLinkRefs = preset
seed `:106`; remapDuplicatedProjectUuids = duplication `:571`); post-seed pass must stamp BOTH
data-page-uuid AND data-collection-item-uuid on seeded collection-item richtext (scaffold enrich runs
before seeding); split scan modes (data-attr for cleanup/remap/render, href for enrich/backfill);
"no new call sites" corrected — preset enrichment adds one. R6: page↔item switch must set one uuid
attr and clear the other (+ tests); post-seed enrichment lives INSIDE `seedPresetCollections`
(`:49`, tested directly at `collectionPresetSeeding.test.js:129`) not a separate createProject call;
backfill wording updated to name both enrichment paths. Reviewer: "complete enough to implement."

## Problem
Structured `link` setting fields already store stable internal references
(`pageUuid` / `collectionItemUuid`) and get full lifecycle coverage: resolve-at-render,
cleanup-on-delete, remap-on-duplicate, enrich-on-preset-seed. **Richtext links do not** —
they are stored as raw HTML anchors (`<a href="about.html">`, `<a href="news/item.html">`),
so renaming/deleting a target can't update or clear them. LINK-022→025 ask for richtext
parity across **widget settings, block settings, global widgets, and collection-item richtext**.

## Core idea
Store the target uuid as a **data-attribute on the `<a>`** inside richtext HTML
(`data-page-uuid` / `data-collection-item-uuid`); the uuid is the source of truth, `href`
is a fallback/display value. Then mirror the two proven patterns already in the codebase:
- **Structured links** for the uuid lifecycle (resolve/cleanup/remap/enrich).
- **`richtextMedia.js`** for "scan richtext HTML string and rewrite at render time".

External (non-internal) URLs keep today's behavior (no data attrs).

## Scope (per the task)
LINK-022→025 enumerate four richtext locations: **widget settings, block settings,
global widgets, collection-item richtext**. **Theme-settings richtext is OUT of scope** —
it's not listed, even though it is also richtext and is sanitized at
`sanitizationService.js:375`. Flagged explicitly so it's a deliberate exclusion, not an
oversight; revisit only if the goal becomes "all richtext everywhere."

## Existing content / backfill (review)
This plan makes **newly authored** richtext links stable and re-derives **preset** links at project
creation via **two paths** (don't flatten these): page/global/menu richtext at **scaffold**
(`enrichNewProjectReferences`), and seeded **collection-item** richtext via the **post-seed**
enrichment inside `seedPresetCollections` (stamps both page + item uuids from hrefs). It does **not**
retroactively convert
richtext links already authored as raw `<a href>` in existing projects — those keep working off their
stored href but won't follow renames/deletes until re-authored. Two ways to handle:
- **(recommended for this pre-release project)** add a one-time enrichment pass that walks existing
  project richtext, matches each internal `href` slug → current uuid, and stamps the `data-*-uuid`
  (reuses the slug→uuid maps; same logic as preset enrichment). Aligns with "convert data in the same
  pass, no legacy shims."
- Or explicitly scope to new+preset links and **state the limitation** (this paragraph) so it's a
  deliberate choice, not a silent gap.
See open decision #4.

## Code anchors (verified)
- TipTap link mark: `packages/editor-ui/src/components/settings/inputs/RichTextInput.jsx`
  (`import Link from "@tiptap/extension-link"`, `setLink({ href })` ~L69-100).
- Picker data source already used by `LinkInput`: `useLinkTargets` hook (Pages group + per-collection groups).
- Render resolution to mirror: `packages/core/src/utils/richtextMedia.js`
  (`resolveRichtextMediaPaths` / `…InSettings` / `…InWidgetData`), wired at
  `render-engine/renderEngine.js:697` (widgets) and `builder-server/services/collectionService.js:1115` (collection items).
- Structured-link render resolver (depth-prefix logic to mirror): `renderEngine.js`
  `resolveLinkValue` (:154) / `resolveWidgetPageLinks` (:207); both already receive
  `pagesByUuid` + `collectionItemsByUuid` maps at the same render sites.
- Sanitizer richtext anchor allowlist: `builder-server/services/sanitizationService.js`
  `RICHTEXT_BASE_ATTR = ["href","target","rel","class"]` (:23), `sanitizeRichText` (:50).
- Link-integrity walkers: `builder-server/utils/linkEnrichment.js` —
  `enrichNewProjectReferences` (:190), `remapDuplicatedProjectUuids` (:320),
  `cleanupDeletedPageReferences` (:430), `cleanupDeletedCollectionItemReferences` (:498),
  `remapCollectionItemLinkRefs` (:589). All already wired into delete/duplicate/seed flows
  and currently only touch structured `link` settings.

## Phases

### Phase 1 — Storage model + editor (the only genuinely new UI)
- Extend the TipTap Link mark with `addAttributes` for `data-page-uuid` / `data-collection-item-uuid`
  so they round-trip into stored HTML.
- Add a page/collection-item target picker to the richtext link row (today a raw URL input),
  reusing `useLinkTargets`. Three kinds: external URL (today), page, collection item. Picking an
  internal target sets `href` to the current resolved path **and** the matching `data-*-uuid`.
- **(review) Keep the two uuid attrs mutually exclusive and never stale.** Every link-apply path must
  set the relevant attr and **clear the other**:
  - select a **page** → set `data-page-uuid`, clear `data-collection-item-uuid`;
  - select a **collection item** → set `data-collection-item-uuid`, clear `data-page-uuid`;
  - switch to **external URL / file link**, or **unlink** → clear **both**.
  TipTap mark updates otherwise replace only `href` and leave a stale `data-*-uuid`, so a link could
  carry both attrs and cleanup/render would act on the wrong target. Tests: page→item and item→page
  switches (and internal→external) leave exactly one (or zero) attr set.
- **(review, P1) Gate the internal-target picker behind a prop** (e.g. `allowInternalLinkTargets`).
  `RichTextInput` is shared: `SettingsRenderer.jsx:87` routes **every** richtext setting through it,
  including **theme settings** (admin `Settings.jsx:128` and the page-editor theme panel via
  `SettingsPanel.jsx:41`) — which are **out of scope** (see Scope). The picker must be **off by
  default** and enabled only by the in-scope settings hosts (widget/block/global/collection-item),
  so theme-settings richtext keeps today's plain URL link. (Alternatively, pull theme settings into
  backend render/lifecycle support — but that widens scope; the prop guard is the cheaper path.)

### Phase 2 — Sanitizer
- Add **only** `data-page-uuid` / `data-collection-item-uuid` to `RICHTEXT_BASE_ATTR` so DOMPurify
  keeps them; any other `data-*` stays stripped (test for this). Dangerous-protocol href checks unchanged.

### Phase 3 — Render-time resolution (mirror richtextMedia.js)
- New `packages/core/src/utils/richtextLinks.js`:
  `resolveRichtextLinks(html, { pagesByUuid, collectionItemsByUuid, outputPathPrefix })` — scan
  anchors with a `data-*-uuid`, rewrite `href` to the current resolved slug (depth-prefixed like
  `resolveLinkValue`).
- **(review) Add the package export** for the new module in `packages/core/package.json`
  (`"./richtextLinks": "./src/utils/richtextLinks.js"`), mirroring `./richtextMedia`.
- **(review) Dangling-uuid behavior = CLEAR, not fall back.** Match structured links
  (`collectionService.js:1030` returns `href: ""` when the item is gone): when the map **is loaded**
  and the uuid is absent → clear the link. Fall back to the stored `href` **only when the map is
  unavailable**, so the uuid stays the source of truth.
  - **(review) Availability is determined by map *presence*, never by `map.size`.** `undefined`/`null`
    (omitted by a non-resolving caller) → fall back; a **loaded-but-empty** `Map` → still clear a
    missing uuid. Inferring "unavailable" from `size === 0` would silently regress dangling-link
    cleanup for projects that legitimately have zero pages/items. Must-have test: omitted map vs
    empty map.
- **(review, P3) Fix the map-loading gate — `collectionItemsByUuid` only.** `pagesByUuid` is already
  loaded unconditionally before the gate (`renderEngine.js:620`), so page-link resolution is fine; it's
  the **collection-item** map that's gated on a `link`/`menu` setting (`renderEngine.js:650`,
  `renderingService.js:85`). A widget/collection item whose **only** internal reference is a richtext
  `data-collection-item-uuid` would skip that load and never resolve. Add `schemaHasRichtextSetting`
  and OR it into the collection-item-map gate. The existing gate
  checks **top-level schema settings AND block schemas separately** (`renderEngine.js:650`), and
  LINK-022/024 explicitly include **block** richtext — so the new check must scan both
  `schema.settings` **and** `schema.blocks[].settings` for a `richtext` setting.
- Wire next to the media resolution: `renderEngine.js:697` (widgets/blocks/globals) and
  `collectionService.js:1115` (collection items).
- Covers preview + export, root + nested-item depth.

### Phase 4 — Link integrity (extend linkEnrichment.js walkers)
**(review, P2) Two distinct scan modes** — keep them separate in `richtextLinks.js`:
- **By `data-*-uuid` attribute** — for **cleanup / remap / render** (the uuid is present and is the identity).
- **By internal `href`** (slug/path) — for **enrichment / backfill**, which run *after* the attrs were
  intentionally stripped (presets) or never existed (legacy content), and stamp/overwrite the attrs.

Extend each walker:
- `enrichNewProjectReferences` (scaffold) — scan richtext **hrefs**, stamp `data-page-uuid` for page links.
- `cleanupDeletedPageReferences` / `cleanupDeletedCollectionItemReferences` — scan by **data attr**; on
  delete, clear matching anchors (**unwrap to plain text** recommended; final form pending open
  decision #1 — keep this body's wording in step with whatever is chosen).
- `remapDuplicatedProjectUuids` (**project duplication**, `projectController.js:571`) — scan by **data
  attr**, remap source→new uuids in cloned richtext.
- `remapCollectionItemLinkRefs` (**preset seeding**, called inside `seedPresetCollections`,
  `projectController.js:106`) — the existing source-uuid remapper. For uuid-free presets its map is
  empty, so for richtext it's effectively a **no-op / compat path**; the real preset work is the new
  href-based post-seed enrichment below.
- **(review, P2) Where the new preset enrichment lives:** **inside `seedPresetCollections`** (next to
  the existing remappers at `projectController.js:105-106`, fn at `:49`) — **not** as a separate call in
  `createProject`. `seedPresetCollections` is exported and tested directly
  (`collectionPresetSeeding.test.js:129`); keeping the fix inside it preserves that contract and avoids
  a "seeded but not enriched unless called through `createProject`" split. (So no new `createProject`
  call site; cleanup/duplicate reuse existing sites; the new logic is a step within the seed helper.)

**(review, P1) Preset-tooling normalization — the two attrs must be handled DIFFERENTLY** because of
creation order:
- `enrichNewProjectReferences` runs during **scaffold** (`projectScaffold.js:79`), before preset
  **collection** items are seeded (`projectController.js:316`).
- **Strip BOTH `data-page-uuid` and `data-collection-item-uuid`** from preset templates in
  `sync-preset-templates.js` (mirror `stripLinkPageUuids`). Preset item files carry no `uuid` (verified:
  0 of 205 `themes/arch/presets/*/collections/*/*.json`; format docs forbid it,
  `theme-preset-file-format.md:621`) and the seed map only populates `if (raw.uuid)`
  (`projectController.js:90`) — so there's no source uuid to preserve. The href slug is the durable
  identity (format docs: "enriched … at seed").
- **Page/global/menu richtext** is processed at **scaffold** by `enrichNewProjectReferences`
  (`projectScaffold.js:79`): scan hrefs → stamp `data-page-uuid`.
- **(review, P1) Collection-item richtext is seeded LATER** (`seedPresetCollections`,
  `projectController.js:318`), *after* scaffold enrichment — so it never sees that pass. The **NEW
  post-seed enrichment must stamp BOTH** `data-page-uuid` (page links) **and** `data-collection-item-uuid`
  (item links) on seeded collection-item richtext, deriving each from the anchor's `href` slug/path via
  the pages + freshly-seeded-items maps. Implement it **as a step inside `seedPresetCollections`** (see
  P2 below), so the exported helper's direct test still covers it.
- **(review, P1) Labeling fix:** `remapCollectionItemLinkRefs` is the **preset-seed** source-uuid
  remapper (called inside `seedPresetCollections`, `projectController.js:106`) — for uuid-free presets
  its richtext effect is a no-op/compat path. **Duplication** is `remapDuplicatedProjectUuids`
  (`projectController.js:571`). The preset path for richtext item links is the href-based post-seed
  enrichment above, not the remap.

### Phase 5 — Tests
- Editor: Link mark persists `data-*-uuid`; **mutual-exclusion (review):** page→item and item→page
  switches leave exactly one attr set, and switching to external/file/unlink clears both.
- Sanitizer: the two known attrs survive; dangerous href still blocked; **unknown `data-*` is stripped (review)**.
- Resolver: rewrites href at root + nested depth; external URLs untouched; **dangling uuid with map
  loaded → cleared (not fallback); fallback only when map unavailable (review)**.
- **(review) Omitted map vs empty map:** `undefined`/`null` map → keep stored href; empty `Map` →
  clear the missing-uuid link (guards against the `size`-inference regression).
- **(review) Source-mode / quoting:** anchors authored via source mode and single-quoted attribute HTML
  still parse and resolve (the scan must not assume double quotes).
- Integrity: delete clears matching anchors **(assert the form chosen in decision #1 — unwrap vs
  neutralize, not hardcoded to "unwrap")**; project duplication (`remapDuplicatedProjectUuids`) remaps
  source→new uuids; stale-uuid cleanup.
- **(review, P1) Preset seed:** scaffold enrichment stamps `data-page-uuid` on page/global richtext;
  the **post-seed** pass stamps **both** `data-page-uuid` **and** `data-collection-item-uuid` on
  **seeded collection-item richtext** (page links + item links), derived from hrefs. Test a preset
  whose collection-item body links to both a page and another collection item.
- **(review, P2) Theme-settings guard:** a frontend test proving theme-settings richtext keeps the
  plain URL link flow — the internal-target picker is absent there, and it cannot author
  `data-page-uuid` / `data-collection-item-uuid` (the prop guard is off for theme settings).
- **(review) Map-gate:** a richtext-only widget AND a richtext-only collection item (no `link`/`menu`
  setting) still resolve their richtext item-links (proves the gate fix). **Include a block-only case**
  — a widget whose richtext link lives in a `blocks[].settings` richtext field (LINK-022/024 scope).
- Export: richtext page-link + item-link render correct relative paths at root and item depth.

## Sequencing & risk
- **Order:** 2 → 3 → 1 → 4 (sanitizer + render first so stored attrs survive/resolve; then editor
  to author them; then integrity). Each phase independently testable.
- **Biggest unknown:** the richtext link-picker UX (Phase 1) — wiring `useLinkTargets` into the
  TipTap link row. Everything else mirrors existing patterns.
- **Hosted impact:** none new — render resolver lives in `@widgetizer/core`, integrity in shared
  `builder-server`; hosted inherits both, same as structured links.

## Decisions
- **Dangling uuid — RESOLVED (review):** clear when the map is loaded and the uuid is absent; fall back
  to stored href only when the map is unavailable. Matches structured links (`collectionService.js:1030`).
- **Theme settings — RESOLVED:** out of scope per the task's enumerated four locations (see Scope).

### Still open (please weigh in)
1. **On-delete result:** unwrap the anchor to plain text (recommended) vs. leave a neutralized `href="#"`.
2. **Editor UI:** extend the existing inline URL row with a target dropdown (recommended) vs. a popover.
3. **Integrity strategy:** schema-agnostic string scan for `data-*-uuid` anchors (recommended, robust,
   matches mediaUsage's string-scan) vs. schema-aware traversal of declared richtext fields.
4. **Existing-content backfill:** one-time enrichment over existing projects (recommended for
   pre-release) vs. scope to new+preset links only and document the limitation (see "Existing content").

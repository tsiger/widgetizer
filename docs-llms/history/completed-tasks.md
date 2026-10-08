# Completed task records

This is history, not a work queue. Original section numbers remain retired.
For old bodies use `git show <Body at>:docs-llms/TODO.md`; the path is historical, not a live link.
The pre-cleanup snapshot is `f10e20ce`.

## Original completed records

| # | Item | Closed | Fix | Body at |
|---|------|--------|-----|---------|
| 1 | Relative preview asset URLs (robustness) | ✅ DONE 2026-07-01 | `8ca0d79f` | `efc6e957` |
| 2 | Bundled theme updates on the OSS desktop app (product/design decision) | ❌ WONTFIX 2026-06-27 | `87d2246e` | `efc6e957` |
| 3 | Modernize pre-refactor `src/...` / `server/...` paths in `docs-llms/*` (docs hygiene) | ✅ DONE 2026-06-26 | `2ddc2ef6` | `efc6e957` |
| 5 | Consolidate preview-dispatch logic (route-mapping half) | ✅ DONE 2026-06-25 | `10e33449` | `efc6e957` |
| 6 | Narrow-sidebar icon-grid + color-picker visual review | ✅ DONE 2026-06-26 | `3028aae3` | `efc6e957` |
| 7 | Missed port — theme-upload collection-schema gate not wired (`builder-server`) | ✅ DONE 2026-06-25 | `2ff036d7` | `efc6e957` |
| 8 | Missed port — `pageController` doesn't thread `projectId` into `cleanupDeletedPageReferences` (`builder-server`) | ✅ DONE 2026-06-25 | `618e4458` | `efc6e957` |
| 9 | Missed port — `Media.jsx` doesn't seed collection-item usage titles (`editor-ui`) | ✅ DONE 2026-06-25 | `8d1e22a4` | `efc6e957` |
| 10 | Missed port (tests only) — `createCollectionPreviewToken` guard tests (`builder-server`) | ✅ DONE 2026-06-26 | `ff0d0186` | `efc6e957` |
| 11 | Missed port — link-picker Combobox group headers not rendered (`editor-ui`) | ✅ DONE 2026-06-26 | `52c07216` | `efc6e957` |
| 12 | Missed port — richtext-embedded media not tracked as used (`builder-server`) | ✅ DONE 2026-06-26 | `0059c214` | `efc6e957` |
| 13 | Missed port — `theme:update-delta` release tool not ported (OSS dev tooling) | ✅ DONE 2026-06-26 | `4e129603` | `efc6e957` |
| 14 | Documentation port audit — content gaps from the master-commit doc changes | ✅ DONE 2026-06-27 | `87d2246e` | `efc6e957` |
| 15 | Missed port — collection item pages leak the `page-{slug}` body class (`render-engine`) | ✅ DONE 2026-06-26 | `4da0d2c0` | `efc6e957` |
| 16 | Missed port — `refreshAllMediaUsage` aborts early on a project with no pages dir (`builder-server`) | ✅ DONE 2026-06-26 | `9092e617` | `efc6e957` |
| 18 | Missed port (tests only) — depth-1 render smoke + depth-0 no-leak guard not ported (`builder-server`) | ✅ DONE 2026-06-26 | `01c9c393` | `efc6e957` |
| 19 | Missed port (tests only) — `renderCollectionItemPage` contract test not ported (`builder-server`) | ✅ DONE 2026-06-26 | `bfde3b9e` | `efc6e957` |
| 20 | Stale test comment — claims `remapCollectionItem{Link,Menu}Refs` "NOT ported" when they are (`builder-server`) | ✅ DONE 2026-06-26 | `cfd8678b` | `efc6e957` |
| 21 | Dedup the cross-bundle `getStandalonePreviewTarget` copy + drop its dead `editor-ui` export (`editor-ui` + OSS preview runtime) | ✅ DONE 2026-06-26 | `b73d237e` | `efc6e957` |
| 22 | Gate collection schemas on the theme **update-import** path too (`builder-server`) | ✅ DONE 2026-06-27 | `1c831b4b` | `efc6e957` |
| 23 | Widget-catalog enumeration logs spurious "Failed to parse schema" warnings (`builder-server`) | ✅ DONE 2026-06-26 | `1fdc361c` | `efc6e957` |
| 24 | Missed port (defensive) — `updatePageWidgets` lacks the `pagesDir` existence guard (`builder-server`) | ✅ DONE 2026-06-26 | `1fdc361c` | `efc6e957` |
| 25 | Decide whether to anchor `EMBEDDED_MEDIA_PATH_RE` so foreign URLs don't mark local assets "used" (`builder-server`) | ✅ RESOLVED 2026-06-26 | `6038ffff` | `efc6e957` |
| 26 | Extract the shared dropdown `<ul>` from `ui/Combobox` + `MenuCombobox` instead of the copy-pasted group header (`editor-ui`) | ✅ DONE 2026-06-26 | `8d3ba978` | `efc6e957` |
| 27 | Harden the `theme:update-delta` dev tool — version-tag parsing, quoted diff paths, util reuse (OSS dev tooling) | ✅ DONE 2026-06-27 | `e05d9c58` | `efc6e957` |
| 28 | Close the path-based storage exceptions for the hosted boundary (adapter discipline) | ✅ DONE 2026-07-02 | `e52dfe06` | `efc6e957` |
| 29 | Loud stale-active-project detection in the OSS editor | ✅ DONE 2026-07-07 | `5a792416` | `efc6e957` |
| 31 | Theme save doesn't track theme media usage (embedding-host-facing; fixed in `builder-server`) | ✅ DONE 2026-07-02 | `5996a17b` | `efc6e957` |
| 34 | `copyThemeToProject` exclude-filter widened from dirs to entries (`builder-server`) | ✅ DONE 2026-07-07 | `36d081d7` | `efc6e957` |
| 35 | Create-from-preset + Refresh Usage don't track media usage (embedding-host-facing; fixed in `builder-server`) | ✅ DONE 2026-07-02 | `cae73b17` | `efc6e957` |
| 36 | Cold-boot race bounces the editor to the picker on an aborted active-project fetch (`editor-ui`) | ✅ DONE 2026-07-07 | `2e0dc1c9` | `efc6e957` |
| 37 | `EmptyState.jsx` renders unstyled — `empty-state*` classes have no matching CSS (`editor-ui`) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 40 | OSS mounts allow-all `cors()` on the unauthenticated localhost API (`builder-server`) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 42 | Media upload allowlist trusts the client-declared MIME while serve derives Content-Type from the stored extension (`builder-server`) | ✅ DONE 2026-08-23 | `bef9e9ec` | `9279c720` |
| 45 | Dead code — empty branch in `mergeSettingsArray` (`builder-server`) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 46 | `buildLatestSnapshot` rebuilds `latest/` non-atomically (`builder-server`) | ✅ DONE 2026-08-23 | `d9c9a8bb` | `9279c720` |
| 48 | Unmerged `list-button` branch — SplitButton feature + independent `saveStore` fixes (`editor-ui`) | ✅ RESOLVED 2026-08-22 | `4bd1509a`, `d2a50a85` | `d2a50a85` |
| 50 | Structure-only undo/redo doesn't re-arm the autosave timer (`editor-ui`) | ✅ DONE 2026-08-23 | `d61ab806` | `9279c720` |
| 55 | Vitest setup lacks an i18n instance so provider-less component tests warn (`editor-ui` tests) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 56 | `EditorShell`/`PluginProvider` default-param object/array literals defeat memoization for a non-memoizing caller (`editor-ui`) | ✅ DONE 2026-08-23 | `9279c720` | `9279c720` |
| 59 | `getCachedThemeValue` — an in-flight loader can repopulate an invalidated cache entry (`builder-server`) | ✅ DONE 2026-08-23 | `d9c9a8bb` | `9279c720` |
| 60 | `layerThemeSnapshot` swallows per-update apply errors, so a partial snapshot can be promoted (`builder-server`) | ✅ DONE 2026-08-23 | `d9c9a8bb` | `9279c720` |

## Retired during the documentation cleanup

| ID | Outcome | Fix / evidence | Body at |
| --- | --- | --- | --- |
| T51 | Queued manual saves retain their error behaviour | `e209a8cc1` | `f10e20ce` |
| T52 | Re-entrant save observes the installed guard | `e209a8cc1` | `f10e20ce` |
| T62 | Packaged export operations serialize per project | `720e47df8` | `f10e20ce` |
| T68 | Consistent site-address joining | `b2783af4` | `f10e20ce` |
| T65 | Typed URLs remain authored; theme links use page_url/item_url | Groundwork and language fix `d0442659`; current Arch header uses page_url | `f10e20ce` |
| T75 | Domain review completed; documentation/task separation performed | R1–R8 and both walkthroughs recorded in domain coverage; this documentation cleanup | `f10e20ce` |
| T39 (partial) | Transaction fixes completed; only historical §39h remains deferred | Original body records 39a–g and 39i done; mediaInsertAtomicity/transactionBoundaries suites | `f10e20ce` |
| GH121 | Icon search marked completed on GitHub | [Issue #121](https://github.com/tsiger/widgetizer/issues/121), closed 2026-08-06 | GitHub issue |
| GH132 | Widget shortcuts marked completed on GitHub | [Issue #132](https://github.com/tsiger/widgetizer/issues/132), closed 2026-08-06 | GitHub issue |

## Resolved after the documentation cleanup

### T70 · Document flat widget assets

**Done · Low · Shared · 2026-09-21**

The owner chose flat widget assets as the supported contract instead of adding nested widget export support. Widget CSS/JS lives directly beside the template/schema, with widget-prefixed filenames unique across widgets and shared theme assets. Dependencies requiring subfolders belong in theme `assets/` and use `theme: true` when enqueued by a widget.

**Resolution:** documented in [Widget authoring](../theming-widgets.md#enqueuing-external-css--js), [Theming](../theming.md#asset-management-tags), the author checklist and [Export](../core-export.md#4-asset-copying). Documentation-only; export behaviour is unchanged. Automatic checks are reserved for the future theme-author CLI, with no upload/update validation work scheduled here.

**Body at:** `33cc699a:docs-llms/TODO-agents.md` (the original nested-export proposal). Resolution is recorded in the documentation changes accompanying this entry.

### LOGO-NOTES · Adding a logo while creating a project erased its notes

**Done · High · Shared · 2026-10-05**

The project update route ran `description` through `trim()` without `optional()`, so express-validator wrote `""` for a missing field and the repository stored it. The new-project form saves a picked logo with a partial update right after creating the project, which wiped the notes just entered.

**Resolution:** the update route marks `description` optional, so an update that leaves it out keeps the stored value; sending it (including empty) behaves as before. A route-level test in `projects.test.js` covers the partial update. Fix `5e413aa5`.

**Body at:** `df3aa2f4:docs-llms/TODO-agents.md`.

### HOME-SLUG-LINKS · Links to a page slugged "home" broke when Clean URLs was off

**Done · Medium · Shared · 2026-10-05**

`isHomeSlug` treats `index` and `home` as the homepage and both publish as the language's `index.html`, but `pageHref` only special-cased them with Clean URLs on, so links to a `home` page pointed at a missing `home.html`. Export also required a literal `index` at the root, standalone preview and the sidebar preview button looked only for `index`, and nothing stopped a language holding both slugs (one overwrote the other on export).

**Resolution:** the owner chose to keep `home` as a homepage alias and make it consistent. `pageHref` routes either home slug through `homeHref` in both URL modes; export accepts either slug as the default-language homepage and refuses a language holding both ("Export failed: two homepages"); page create gives the next free slug, renames onto the other home slug get 409 (the homepage may switch between them), and the editor save path refuses a rename onto any existing page; standalone preview falls back to `home` on a 404 for `index`; the sidebar preview button uses `isHomeSlug`. Creating a page with a taken slug keeps auto-suffixing (owner's choice). Not covered: concurrent creates (R1-COORD) and an embedding app's own publish pipeline. Fix `68e13846`.

**Body at:** `df3aa2f4:docs-llms/TODO-agents.md`.

### SEO-LANG · Fix multilingual search-engine output gaps

**Done · Medium · Shared · 2026-10-05**

Three gaps: the BreadcrumbList home crumb always named the Site URL root, so translated pages pointed search engines at the default homepage; numbered pagination copies emitted hreflang alternates pointing at page 1 with no self-reference, disagreeing with the sitemap; and a new language version copied a custom canonical URL, declaring the source's address canonical.

**Resolution:** the home crumb uses the folder of its own homepage (`el/`, or the root), matching the canonical and sitemap; page 2+ emits no alternates (owner chose omission over per-language page-N links); creating a page or item language version clears a custom canonical (owner's choice; other SEO fields still copy, duplicates unchanged). The same commit documents the one-homepage-per-language rule and the two-homepages export refusal from `68e13846`. User-facing messages keep naming only `index` (owner's choice). Fix `edb7c1df`.

**Body at:** `df3aa2f4:docs-llms/TODO-agents.md`.

### LINK-DIRTY · Choosing a page in a link picker left the editor permanently "unsaved"

**Done · High · Shared · 2026-10-06**

Selecting a page or collection item in a link field stored the dropped refs as keys set to `undefined`. The saved baseline is a JSON round trip, which drops them, and the dirty check compared with lodash `isEqual`, which counts a present-undefined key as different from an absent one. After a save the page never matched its baseline: Save stayed enabled, autosave re-sent identical content and the leave prompt warned until a reload. The data itself was saved correctly.

**Resolution:** every baseline comparison in `saveStore.js` (dirty checks, undo/redo reconcile, save gating) compares the live page and header/footer in saved (JSON) form, so a key holding `undefined` cannot keep the editor dirty; a value cleared from a saved one still counts. `LinkInput` removes the refs it drops instead of setting them to `undefined`. An older test asserting that an undefined-valued key is a change was reversed. Theme settings and menus already compared JSON forms. Fix `c1fb9844`.

**Body at:** `df3aa2f4:docs-llms/TODO-agents.md`.

### LINK-CACHE · Keep link-picker targets fresh after a change mid-load

**Done · Low · Shared · 2026-10-06**

In `useLinkTargets.js` a load in flight when `invalidateLinkTargetsCache` ran still wrote its older list into the cache afterwards, so a page created mid-load was missing from link pickers for up to 60 s, and its `finally` could delete a newer in-flight load for the same key.

**Resolution:** every invalidation bumps a generation counter; a load started before an invalidation still answers the picker that started it but does not write the cache, and a load clears only its own in-flight entry. Other tabs still refresh only after the 60 s cache window (unchanged). Fix `c1fb9844`.

**Body at:** `df3aa2f4:docs-llms/TODO-agents.md`.

### PAGE-SLUG-INPUT · Validate page and menu slugs sent in requests

**Done · Medium · Shared · 2026-10-06**

Page and menu routes checked `:id` only with `notEmpty`, Express decodes `%2F` in params, and the controllers built storage keys unchecked: `DELETE /api/pages/..%2Ftheme`, bulk delete with `"../theme"` and `DELETE /api/menus/..%2Ftheme` deleted the project's `theme.json`, a menu update could overwrite it, and the page save's body `slug` could write a page into another language folder. The review of the fix found the same flaw on every `/api/themes/:id` route, where `DELETE /api/themes/..%2Fprojects` removed every project.

**Resolution:** page and menu slugs (route params, the save's body `slug`, bulk-delete lists) and theme ids must be a single name (`segmentParam`/`segmentBody` over `isSafePathSegment`), not the strict collection form, so pages and menus a theme ships under other names (`About_Us.json`) stay manageable; collection routes keep `^[a-z0-9-]+$` through the same shared module. Route-level tests in `requestSlugs.test.js`. Fix `0fd5005a`.

**Body at:** `df3aa2f4:docs-llms/TODO-agents.md` (first write-up; the delete, menu and theme findings are recorded here).

### PRESET-ID-INPUT · Validate the theme and preset names when creating a project

**Done · Low · Shared · 2026-10-06**

`resolvePresetPaths` joined the request's `preset` straight into a path, and the `theme` field (checked only `notEmpty`) went through `getThemeDir` the same way, so a crafted create request scaffolded a project from folders outside the theme or the themes directory. The review found the same on the theme templates' stored `slug`, which named the page file written on creation and on theme update.

**Resolution:** `createProject` refuses a theme or preset that is not a single name (400); `scaffoldProjectContent` and `resolvePresetPaths` re-check both for embedding apps calling them directly; a template slug that is not a single name gives way to the template's file name. A safe but missing preset still falls back to the theme's root files, and a missing theme still fails in `copyThemeToProject` with cleanup. The imported backup's `theme` is left to BACKUP-TRUST. Fix `0fd5005a`.

**Body at:** `df3aa2f4:docs-llms/TODO-agents.md` (preset only; the theme and template findings are recorded here).

### BACKUP-TRUST · Validate everything a restored backup brings in

**Done · High · Shared · 2026-10-06**

Import checked only that ZIP entry names did not start with `..` or were absolute, then trusted the content: a planted `.theme-update-backup/.in-progress` made the next theme update delete a folder beside the project, a crafted media path made export copy a file from outside the project into the site, a crafted item slug made export write outside its folder, a small ZIP could unpack until the disk filled, and manifest fields and media translation languages went unchecked (a default-language translation overrode the real alt text).

**Resolution:** in two steps. `0fd5005a` keeps file-sourced paths inside their folder wherever they are used (recovery plan, export media copy, collection reader). `46119daa` checks the backup on the way in: import and theme upload unpack through `utils/zipSafety.js`, refusing a ZIP once its real unpacked bytes pass 100 times its size (owner's choice: a ratio only, no size or file-count ceilings), with per-entry length/CRC checks, plain entry names and no duplicate files; import drops top-level dot entries and refuses the whole backup (owner's choice) for media paths outside the upload folders, media text for the default or a missing language, non-slug item slugs, unsafe theme/preset names and wrongly-typed details. Real backups still import: the legacy `audios`/`videos` folders and an unchecked older Site Address are kept (owner's choice for the Site Address). Symlinks moved to SYMLINK-PATHS; a silently skipped item to SKIPPED-ITEM-NOTICE. Fixes `0fd5005a`, `46119daa`.

**Body at:** `df3aa2f4:docs-llms/TODO-agents.md`.

### COLLECTION-LIST-RACE · A slow collection list could show another collection's items

**Done · Medium · Shared · 2026-10-06**

`useCollectionItems.fetchItems` had no stale-response guard and loads one language after another, and the `collections/:type` route stays mounted across collections: open A, quickly open B, and if A's requests finished last B's screen listed A's items, with Delete, Duplicate and Reorder calling the API with type B and A's slugs (Delete could remove a B item sharing a slug). Review of the first fix found two more paths through the reused screen: a refresh due after an edit on A loading A's items into B, and a delete confirmation opened on A deleting from B after back/forward navigation.

**Resolution:** only the newest load sets items, errors or loading (a load ticket, bumped on type/project/language change, unmount or a newer refetch); `refetch` always loads for the current collection and does nothing after unmount; `CollectionItems` renders one screen per collection (keyed by type), holding the viewed language tab above the key so it still carries over. The separate translation-creation navigation went to TRANSLATION-CREATE-NAV. Fix `87e96448`.

**Body at:** `df3aa2f4:docs-llms/TODO-agents.md`.

### LANG-LOCK-CHECKS · Re-check language rules inside the write lock

**Done · Medium · Shared · 2026-10-06**

`updateProject` checked `readLanguages` against the row read before `withContentWriteLock`, and `createLanguage` records the new code only after seeding its menu and header/footer copies under that lock. A save changing the default to the code being added left `{defaultLanguage:"el", languages:["el"]}`: every later save, removing `el` and changing back were refused, pages were listed twice, and the seeded `menus/el/` and `pages/el/global/` were left unread with their media-usage rows. A stale `languages` list dropped the added language instead. Page writes also reserved slugs before the lock, so a write queued behind the add could create `pages/el.json`. Verification found the wider form: two page writes picking the same free slug before the lock, the second overwriting the first with both reporting success (create, duplicate, language version, rename, and `index`/`home`).

**Resolution:** `updateProject` re-runs `readLanguages` against the row read inside the section. `persistPageInSection` claims the slug inside the section (`claimPageSlug`) against current files and languages: a new page moves on to a free slug, a rename or a save whose file is gone is refused (`RESERVED_SLUG`, `SLUG_TAKEN`, `SECOND_HOMEPAGE`, 409), and a save keeps its own file only when the uuid matches. Fix `87fbf741`.

**Body at:** `87e96448:docs-llms/TODO-agents.md`.

### PARENT-TRANSLATION · Deleting a parent page detached its translated children

**Done · Medium · Shared · 2026-10-06**

A language version keeps the source's `parentPageUuid`, and breadcrumbs map it to the same-language sibling through the translation group. After a delete, `updatePagesViaStorage` (`linkEnrichment.js`) removed any `parentPageUuid` naming a deleted page in every language without checking for a surviving sibling: delete English `about` and Greek `team` lost its parent although Greek `about` existed. Language removal had the same gap.

**Resolution:** the sweep moves a child to the deleted parent's surviving version in the child's language, else in the default language, else clears it (owner decision: never a third language). A candidate that would make the child its own ancestor is skipped, counting only parent changes already written; while any page is unreadable, affected parents are left and reported as incomplete. Delete, bulk delete and `removeLanguage` pass the deleted pages' translation groups; the sweep indexes every page first, then rewrites one at a time. Fix `a7f32fe9`.

**Body at:** `a7f32fe9:docs-llms/TODO-agents.md`.

### EDITOR-LANG-UX · Smooth the editor's language rough edges

**Done · Low · Shared · 2026-10-07**

Three rough edges on multilingual sites. `LanguageMenu` offered every language without a sibling for creation, the page's own included, until `EditorTopBar`'s `allPages` loaded (or for good if it failed), and `CollectionItemForm` likewise for an unread group. The parent-page picker (`PageForm`) listed every language's pages unlabelled. The pages, collection and menus lists kept their language tab in component state, so every way back to a list (browser back, editor back, settings back/Cancel, after-create redirect) showed the default tab; widened from the original "create returns to the bare list" bullet.

**Resolution:** `useListLanguage` keeps a list's tab in `?language=` (replace), and back/Cancel/create links carry the content's language (`pagesListHref`, `itemsListHref`, `menusListHref`); collections carry the tab across collections; the sidebar links stay bare (owner decision). `ParentPagePicker` opens `ComboboxOptionList` (language filter opening on the selected parent's language, All, badges; pick-only mode is keyboard operable) and the page's own translations are not offered. The current language is always current in `LanguageMenu`, and creation is disabled until the versions are known (`siblingsState`). Fix `e4355fd9`.

**Body at:** `e4355fd9:docs-llms/TODO-agents.md`.

### MEDIA-MP4 · Support uploaded MP4 videos on site pages

**Done · Unrated · Shared · 2026-10-07**

Needed for the Widgetizer marketing site: upload an MP4, choose it in a page widget and play it in preview and exported pages. MP4 was rejected on upload and no setting or widget could play an uploaded video; the upload hook also passed `maxImageMB` to a validator expecting `maxSizeMB`, so client-side size rejection never ran.

**Resolution:** MP4 is an ordinary `file` upload under `/uploads/files/`. A `video` setting type (`FileInput` video mode) stores an MP4 path checked by `sanitizeVideoPath` everywhere values are sanitized and in `validate-theme.js`. Arch `video-embed` (renamed "Video") plays it natively ahead of the YouTube/Vimeo URL, with a poster and a decode-error message, shipped in `updates/0.9.10`. Review fixes in the preview runtime: media clicks keep their default action, and re-rendered widgets' assets are de-duplicated by resolved URL. Fix `b9c9fc13`.

**Body at:** `b9c9fc13:docs-llms/TODO-agents.md` (plan: `b9c9fc13:docs-llms/plan-mp4-support.md`).

### R-THEME-SAVE · Keep theme-settings saves in order

**Done · Medium · Shared · 2026-10-07**

Settings allowed a save while another was pending and `themeStore.saveSettings()` had no queue: save red, then blue, with blue's response arriving first, and the late red response rebaselined `originalSettings` to red, so the blue draft read dirty and Reset restored red while the server held blue. Two smaller gaps: `saveStore.save` sent the theme draft live after a discard during Phase 1, and `reconcileFromServer` bumped `activeLoadId`, leaving a running `loadSettings` on `loading: true` (Settings stuck on its spinner).

**Resolution:** the theme store runs one save at a time (a request made meanwhile joins a single follow-up that sends what is still unsaved), checks project and a never-decreasing generation before and after each request, and takes the server's returned copy with only the edits made after sending kept on top. Settings turns Save off while `saving`. `saveStore` checks its generation before Phase 2; a discard marks the draft (`discardDraft`) so a save landing on it takes the saved values as they are. `reconcileFromServer` reads the load counter without advancing it. Built together with GH147. Fixes `8958d183`, `119151a8`, `88c810cb`.

**Body at:** `88c810cb:docs-llms/TODO-agents.md`.

### GH147 · A stale tab's theme-settings save reverts a theme update

**Done · Medium · Shared · 2026-10-07**

`saveProjectThemeSettings` wrote the whole `theme.json` from the request body, and `themeStore` kept the copy it loaded until the project changed. A screen loaded before a theme update (another tab, or the same tab after Project details > Apply Update) saved its old copy back: `theme.json` returned to the old version and lost the update's new settings while the project row kept the new `theme_version`, so the update was never offered again.

**Resolution:** the editor saves only changed settings, each with the value it started from (`PATCH /api/themes/project/:projectId`); the server merges them into the stored file under the content-write section (`mergeThemeSettingChanges`, rules shared through `@widgetizer/core/themeSettingChanges`), sanitizes only those settings, and answers `{ theme, warnings }`. A setting changed elsewhere refuses the save (409 `THEME_SETTINGS_CHANGED`, nothing written); the screen keeps the edits on top of the current settings and says so (owner decision: autosave carries on in the editor). The whole-file POST stays and refuses a file from an older theme version (409 `THEME_VERSION_CHANGED`); the editor falls back to it on a code-less 404 (owner decision, marked for removal). The theme update holds the content-write section for its whole run; Apply Update invalidates the loaded settings; editor undo history is cleared on a theme version change (owner decision). Warnings render as text. Fixes `8958d183`, `119151a8`, `88c810cb`. [GitHub #147](https://github.com/tsiger/widgetizer/issues/147)

**Body at:** `88c810cb:docs-llms/TODO-agents.md`.

### STALE-BANNER · A project warning can hide a language-removed warning while saves stay suspended

**Done · Low · Shared · 2026-10-08**

`staleProjectStore.markStale` overwrote a `reason: "language"` warning with `"project"`, and the focus check's next `clearStale()` hid both while `saveStore.savingSuspended` stayed true: no banner, no autosave, and a manual save resolved `{ status: "suspended" }`, which `saveAndReport` ignored. Reached by: language removed, another tab switches project, this project re-activated. The banner also floated (`fixed`, `z-[60]`) over the editor toolbar, Save and toasts.

**Resolution:** the store tracks `languageRemoved` separately from the visible `reason`. The blocking project overlay takes the screen whichever warning arrives first (`markLanguageRemoved` keeps `"project"`), and the focus check's `clearProjectMismatch` restores the language banner instead of clearing it; `clearLanguageRemoved` drops a language hidden under a project warning when its session ends. A manual save resolving `"suspended"` shows a toast (`pageEditor.toolbar.saveSuspended`). The language banner is its own export, `StaleLanguageBanner`, mounted by the OSS shell in the editor Layout's `topbarBanner` slot, in the page flow. Fix `b10a6774`.

**Body at:** `b10a6774:docs-llms/TODO-agents.md`.

## Reconciliation decisions

- GitHub #115, #122, #126, #133, #134 and #135 have implementation evidence. Their remaining local entries are review/documentation/integration work, not instructions to rebuild the features. GitHub statuses were left unchanged.
- R1/R2/R6/R8 structural coordination is one deferred boundary, not four tasks. R5 nested references and shared traversal are one conditional task.
- Accepted behaviour is documented in domain pages: manual URLs remain authored, unknown imported media may remain missing, failed cleanup can leave dead references, theme update version recording is outside file rollback, and restart/cross-process limits are explicit.
- R3's regression-test discipline is a working constraint, not a new product feature. Optional audit suggestions remain conditional rather than becoming launch requirements.
- Old private-deployment details were not copied into the new task descriptions. Embedding tasks describe only public package contracts; results for a private application belong in its own documentation.

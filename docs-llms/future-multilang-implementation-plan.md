# Future: Multilanguage Implementation Plan

> **Status: build order for the design locked in `future-multilang-design.md`.** That doc says *what* and *why*; this one says *in which order* and *where*. Section references (§) below point at `future-multilang-design.md`. If the two disagree, the design doc wins and this one is wrong.
>
> Written 2026-09-09 against the code as it stands on `0.9.10`. File and function names were verified at that date; re-verify before relying on a line.

---

## Where this sits

Multilang is **stage 4 of the series** — groundwork → breadcrumbs → pagination → structured data → multilang, followed by two independent items (undo-history fix, rename to "Widgetizer Desktop") that wait on nothing. The series table, what each stage lands for the next, and the reading order are in `future-roadmap.md`. This doc's Phase 0 holds the shared groundwork steps (0 and 1 are stage 0; 3 ships in stage 3; 4 and the path half of 6 ship in stage 2) and marks each with the stage it lands in. By the time multilang starts, only step 2 is still open.

---

## Ground rules

1. **Land the steps in order.** Every step is a mergeable unit that leaves `npm test`, `npm run test:frontend` and `npm run lint:all` green. Later steps assume earlier ones.
2. **Single-language projects must not change behaviour at any step.** Until step 12 nothing is visible in the editor. A project with one language must export byte-for-byte what it exports today (allowing for the deliberate `<html lang>` change in step 19). Keep a fixture project and diff its export before and after each step.
3. **Language logic lives in the addressing layer (step 6), nowhere else.** A `language !== defaultLanguage` branch outside `@widgetizer/core`'s addressing helpers is a review blocker — that is the whole point of §Implementation Contracts.
4. **Persisted is empty; resolved is never empty** (§1a-i). Files in the root folder carry no `language`; every loaded model has one. No consumer writes its own fallback.
5. **Backend stays adapter-agnostic and scope-first.** New storage paths go through the `StorageAdapter` with `scope`; never assemble `pages/<lang>/…` outside the addressing layer.
6. **Do not cite the task tracker from code or docs.** Put the reason inline.

---

## Phase 0 — Prerequisites (no multilang code yet)

Four contracts the design calls blockers, plus the series' stage-0 filter. Each is independent of the others and of any language UI. Most of them ship in earlier stages of the series — the heading of each step says where; by the time multilang starts, only step 2 is still open.

### Step 0. `page_url` filter — one way for a theme to link to a page (series stage 0)

**Why:** `themes/arch/widgets/global/header/widget.liquid` builds the logo's home href with an inline `{% if globals.cleanUrls %}` that re-implements the home rule `pageHref` already owns; the header CTA default in the same widget's `schema.json` ships a raw `contact.html`. Every later theme link — the pager, the language switcher — needs the same shape logic, so it must exist once.

- `packages/core/src/filters/pageUrlFilter.js` (new) — `page_url` takes a slug and returns `pageHref(slug, { cleanUrls, outputPathPrefix })` read from `globals`; a matching `item_url: slugPrefix` wraps `itemHref`. Registered with the other core filters in `packages/render-engine/src/renderEngine.js`. Author-typed hrefs are untouched (§2a).
- `themes/arch/widgets/global/header/widget.liquid` — the logo href becomes `{{ 'index' | page_url }}`; the CTA default becomes a page link where the schema allows it.
- Multilang (step 8) later adds the target language as an optional argument; the filter's signature is designed for it now.

**Done when:** the header renders the same href as today at depth 0 and 1, under both Clean URLs values, with no conditional in the template; a filter test pins the four combinations.

### Step 1. One Site URL base helper (§Blocker 4) — *lands in stage 0 (groundwork)*

**Why first:** JSON-LD ids (stage 3), hreflang, per-language canonicals and sitemap entries all start from the Site URL, and today three code paths join onto it three different ways.

- `packages/core/src/utils/urlSafety.js` — `isValidSiteUrl` additionally rejects a query or hash. Keep accepting a path (GitHub-Pages-style `user.github.io/repo/` is a legitimate deploy).
- `packages/core/src/utils/internalHref.js` (beside `isHomeSlug`) — add `siteUrlBase(siteUrl)` returning a normalised directory base with one trailing slash, and `absoluteSiteUrl(siteUrl, path)` that joins a site-relative path onto it. Both pure.
- Route through them: `resolveCanonicalUrl` and `resolveImageUrl` in `packages/core/src/tags/SeoTag.js`; the item canonical in `buildCollectionItemPageData` (`packages/builder-server/src/services/collectionService.js`); `buildSitemap` and `buildRobotsTxt` in `packages/builder-server/src/services/seoArtifacts.js`.
- Delete the two private `isValidSiteUrl` copies (`seoArtifacts.js`, `collectionService.js`); import the core one.
- Form + controller: `app/src/components/projects/ProjectForm.jsx` and `packages/builder-server/src/controllers/projectController.js` surface the new rejection with a localized message (`packages/core/src/locales/en.json`, next to `siteUrlInvalid`).

**Done when:** `seoArtifacts.test.js` and a new `SeoTag` test cover a Site URL with a path, with and without a trailing slash, under both Clean URLs values, and every emitted URL (canonical, og:image, sitemap `<loc>`, robots `Sitemap:`) shares one base.

### Step 2. Collision-proof media-usage identities (§Blocker 1)

**Why:** usage rows are keyed by human-readable strings that collide once the same slug exists per language; deleting a Greek page could strip media its English sibling still uses.

- `packages/builder-server/src/services/mediaUsageService.js` — page sources become `page:<uuid>`; `collectionSource(type, slug)` becomes `collection:<uuid>`; global sources become `global:root:<type>` for the default language (language-coded variants come in step 7). `THEME_SETTINGS_USAGE_ID` stays.
- Every writer and reader of those ids: `updatePageMediaUsage`, `syncPageMediaUsageOnWrite`, `updateGlobalWidgetMediaUsage`, `refreshAllMediaUsage`, the delete paths in `pageController.js` / `collectionService.js`, and `packages/editor-ui/src/pages/Media.jsx` where usage titles are seeded from source ids.
- Existing rows: `refreshAllMediaUsage` already rebuilds from content; run it once per project on first open after upgrade (a `media_usage_schema` app setting in `settingsRepository.js` marks the rebuild done) rather than writing a row-rewrite migration.

**Done when:** `mediaUsage.test.js` and `collectionMediaUsage.test.js` prove two pages with the same slug in different folders keep independent usage, and deleting one leaves the other's media marked in-use.

### Step 3. Global widgets render with `page` and `project` in context (§Blocker 2) — *lands in stage 3 (structured data)*

**Why:** the footer's "Use business details" toggle (stage 3) and the header's language switcher (this stage) both read project and page data, but header/footer render through `renderWidget`, which receives none.

- `packages/render-engine/src/renderEngine.js` — `renderPageLayout` and `renderCollectionItemPage` pass the page object and project data into the two `renderWidget` calls for header/footer (today the last argument is `null`). `createBaseRenderContext` exposes them as `page` / `project` for global widgets the same way page-level widgets already see them.
- Preview's single-widget path (`renderSingleWidget` in `packages/builder-server/src/controllers/previewController.js`) supplies the current page too, so the canvas and the export agree.

**Done when:** a render test asserts a header template can read `page.slug` and `project.siteUrl`; `depthRenderSmoke.test.js` still passes unchanged.

### Step 4. Derived output depth (§Blocker 3) — *lands in stage 2 (pagination)*

**Why:** `exportController.js` passes `outputPathPrefix: "../"` as a literal; a paginated copy (`blog/page/2.html`) and a Greek news item both live two levels deep. Pagination needs this first, so it ships there; multilang only verifies it still holds at depth 3 (`el/news/story.html` is depth 2; `el/blog/page/2.html` is depth 3).

- `packages/core/src/utils/linkPrefixer.js` — add `outputPathPrefixFor(outputPath)` (`"news/story.html"` → `"../"`, `"el/news/story.html"` → `"../../"`, `"about.html"` → `""`).
- `packages/builder-server/src/controllers/exportController.js` (`exportProjectToDir`) — derive the prefix from the final output path for every page and item; no literals.
- `packages/builder-server/src/tests/depthRenderSmoke.test.js` — add a depth-2 case.

**Done when:** a depth-2 render resolves assets, internal links and the header logo correctly; the single-language export diff is empty.

---

## Phase 1 — Foundation (data model, still invisible)

### Step 5. Project languages setting (§1, §1a, §1b, §8a)

- `packages/builder-server/src/db/migrations.js` — the next migration version adds `default_language TEXT NOT NULL DEFAULT 'en'` and `languages TEXT NOT NULL DEFAULT '[]'` (JSON array of *additional* codes) to `projects`. Existing rows get `en` / `[]` (§1b). (Version numbers are not pinned here: stage 3 adds its own migration first.)
- `packages/builder-server/src/db/repositories/projectRepository.js` — `rowToProject` maps `defaultLanguage` / `languages`; `createProject` / `updateProject` write them.
- `packages/core/src/utils/languages.js` (new) — `LANGUAGE_CODE_RE` (`^[a-z]{2}(-[a-z0-9]{2,8})?$`), `RTL_LANGUAGES` (rejected in v1), `nativeLanguageName(code)`, `hreflangCase(code)` (`pt-br` → `pt-BR`), `languageDir(code)`. Shared by form and controller like `isValidSiteUrl` is.
- `packages/builder-server/src/controllers/projectController.js` — validate on create/update: codes match the regex, lowercase stored, RTL refused, default not in `languages`, **default language editable only while `languages` is empty** (§1a), **a code equal to an existing root page slug or collection `slugPrefix` is refused with the conflicting name** (§8a). Adding a language calls the seeding service (step 9); removing one calls the removal service (step 10). Manifest round-trip in `exportProject` / `importProject`; `duplicateProject` copies both fields.
- `packages/editor-ui/src/stores/projectStore.js` — nothing field-specific today; add `defaultLanguage`, `languages`, and a derived `isMultilang` (`languages.length > 0`) so every UI step gates on one selector.

**Done when:** project API tests cover every rejection above; a single-language project round-trips export/import/duplicate with `en` / `[]`.

### Step 6. The addressing layer (§Implementation Contracts) — *started in stage 2, extended here*

One module, pure functions, no I/O. Everything after this step calls it. Pagination creates `contentAddress.js` with output paths, public paths, preview mapping and reserved-name checks for pages, items and paged copies (see `future-pagination-design.md`, §Implementation contracts). This step adds the **language dimension** to every builder below — the shape of the module does not change, only its inputs.

- `packages/core/src/utils/contentAddress.js` (new). Inputs are always `{ language, defaultLanguage }` plus content identity. Provide at least:
  - `pageKey(slug)` → `pages/<slug>.json` or `pages/<lang>/<slug>.json`
  - `globalKey(type)` → `pages/global/<type>.json` or `pages/<lang>/global/<type>.json`
  - `menuKey(id)` → `menus/<id>.json` or `menus/<lang>/<id>.json`
  - `itemKey(type, slug)` → `collections/<type>/<slug>.json` or `collections/<type>/<lang>/<slug>.json`
  - `pageOutputPath(slug)` / `itemOutputPath(slugPrefix, slug)` → `el/contact.html`, `el/news/story.html` (language first on output, §8)
  - `publicPath(...)` → the site-relative URL honouring Clean URLs (`/el/contact` or `/el/contact.html`), built on `pageHref` / `itemHref`
  - `usageId.page(uuid)`, `usageId.item(uuid)`, `usageId.global(type)` → `global:root:<type>` / `global:<lang>:<type>`
  - `previewRoute.page(slug)` / `previewRoute.item(type, slug)` → `/preview/page/<lang>/<slug>`, `/preview/collection/<lang>/<type>/<slug>` (explicit namespace, §Assumptions)
  - `resolveLanguage(persisted, defaultLanguage)` — the single "empty means default" rule
  - `languageFromKey(key)` — inverse of the key builders, for directory listings
- `packages/core/src/utils/internalHref.js` — `pageHref` / `itemHref` gain a `language` argument (the target's) and compute the cross-language relative path from the rendering page's depth.

**Done when:** a Vitest suite pins every builder and its inverse for default and non-default languages, both Clean URLs values, and depths 0–2.

### Step 7. Storage and API readers/writers go through the addressing layer (§5, §8, §8a)

- **Pages** — `packages/builder-server/src/controllers/pageController.js`: every `pages/…` string becomes a `contentAddress` call. `getAllPages` lists the root folder plus each `pages/<lang>/` and stamps the resolved `language` on each model. `createPage` / `updatePage` accept `language`; `generateUniqueSlug` (`packages/builder-server/src/utils/slugHelpers.js`) checks uniqueness inside the language folder only. **Root page slugs equal to an enabled language code are refused** (§8a); the `page` reservation from stage 2 applies in every language folder. Page model gains `translationGroupId`; on create it is the page's own uuid (a group of one), so no backfill of existing pages is needed.
- **Globals** — `getGlobalWidgets` / `saveGlobalWidget` in `pageController.js` and `readGlobalWidgetFromDir` in `packages/builder-server/src/utils/projectContentFs.js` take a language.
- **Menus** — `packages/builder-server/src/controllers/menuController.js`: menus live in `menus/<lang>/`; list merges all folders and stamps `language`; create takes a language.
- **Collection items** — `packages/builder-server/src/services/collectionService.js`: `listCollectionItems`, `readCollectionItem`, `writeCollectionItem`, `deleteCollectionItem`, `duplicateCollectionItem`, `reorderCollectionItems` go through `itemKey`; uniqueness and `RESERVED_ITEM_SLUGS` (`index`) apply per language folder; **`RESERVED_SLUG_PREFIXES` grows the project's enabled language codes** (§8a); items gain `translationGroupId` like pages.
- **Filesystem-direct helpers** — `listPagesFromDir` in `projectContentFs.js` currently drops sub-directories via `isFile()`; make it enumerate language folders and skip only `global/`.
- **Delete cleanup** — `cleanupDeletedPageReferences` / `cleanupDeletedCollectionItemReferences` in `packages/builder-server/src/utils/linkEnrichment.js` scan every language's pages, globals and menus, not just the root.
- **Project lifecycle** — `duplicateProject`, `exportProject`, `importProject` in `projectController.js` copy the language folders verbatim; groups survive (§Core Model table).
- **Media usage** — `usageId.global(type)` now emits the language-coded form for non-default globals (step 2 left it root-only).

**Done when:** `collectionApi.test.js`, `collectionService.test.js` and the page API tests run their existing cases with the default language *and* again with `language: "el"`; a same-slug page in two languages coexists; a page slugged `el` is refused once `el` is enabled and vice versa.

### Step 8. Language-aware link resolution (§4a, §7a)

- `loadPagesByUuid` in `packages/render-engine/src/renderEngine.js` and `loadCollectionItemsByUuid` in `collectionService.js` load every language, and each entry carries its resolved `language`.
- `packages/render-engine/src/menuResolver.js` (`resolveMenuItemLinks`, `resolveMenuPageLinks`), the richtext resolution inside `renderWidget`, and the link-setting resolution pass the target's language into `pageHref` / `itemHref` so a cross-language link renders as `../el/contact` from an English page (§4a). Author-typed strings stay untouched (§2a).
- `canonicalPath` stays the file path, per language.
- Breadcrumb trails (stage 1, `future-breadcrumbs-design.md`) are per language automatically because menus are; a `parentPageUuid` that points at another language's page resolves to that page's translation sibling in the current language, else is ignored. Listing anchors live on per-language pages and need nothing.

**Done when:** `collectionLinkResolution.test.js` and a menu-resolver test cover same-language, cross-language and cross-depth targets under both Clean URLs values.

---

## Phase 2 — Language lifecycle (server)

### Step 9. Add a language: seed the skeleton (§2, §2a, §5a)

- `packages/builder-server/src/services/languageService.js` (new) — `addLanguage(scope, code)`: validate (step 5 rules), then in order: copy default menus into `menus/<code>/` with fresh uuids keeping an old→new map; copy header/footer into `pages/<code>/global/` rewriting only their **menu references** through the map (`resolveMenuSettings` / `schemaHasMenuSetting` in `menuResolver.js` know which settings hold menu ids). Page links inside menu items are **not** rewritten. No pages are copied.
- Wire from `projectController.updateProject` so the project form's "add" is the only entry point.

**Done when:** a test adds `el` to a fixture and asserts: Greek header points at Greek menu uuids, Greek menu items still point at English page uuids, `pages/el/` holds only `global/`.

### Step 10. Remove a language: destructive with counts (§1c)

- `languageService.removeLanguage(scope, code)` — refuses the default language; deletes `pages/<code>/` (pages + globals), `menus/<code>/`, every `collections/<type>/<code>/`, the language's media-translation rows (step 17), and the usage rows of everything deleted (through `mediaUsageService`, using step 2's ids). Binaries untouched.
- `languageService.countLanguageContent(scope, code)` → `{ pages, items, menus }` for the confirmation modal; exposed as `GET /projects/:id/languages/:code/summary`.

**Done when:** a test removes `el` and asserts the folders are gone, English content is untouched, and a media file used only by a deleted Greek page is no longer marked in-use.

### Step 11. "Create <lang> version" for pages and items (§Core Model, §3, §9a)

- `pageController.createLanguageVersion` and `collectionService.createItemLanguageVersion` — copy the source into the target language folder, **join the source's `translationGroupId`**, refuse if the group already has that language (the one-per-language invariant). Slug defaults to the source slug (per-language uniqueness makes that fine); the caller may pass another.
- `duplicatePage` / `duplicateCollectionItem` — explicitly assign a **fresh** group (the new uuid), so an ordinary duplicate is never a translation.
- `GET /projects/:id/translations/:groupId` → the group's members `{ language, uuid, slug, type }` for chips and menus.
- `LIMIT_KEYS.MAX_COLLECTION_ITEMS` keeps counting physically until hosted decides otherwise (§Hosted product questions).

**Done when:** tests cover join, invariant refusal, duplicate-gets-fresh-group, and that deleting any member leaves the rest of the group intact.

---

## Phase 3 — Editor UI (visible only when `isMultilang`)

Every component below renders nothing new while `projectStore.isMultilang` is false (§1). New strings go in `packages/core/src/locales/en.json`.

### Step 12. Project form: Languages section (§1, §1a, §1c, §1d)

- `app/src/components/projects/ProjectForm.jsx` — default-language select (disabled with an explanatory message once `languages` is non-empty), add-language picker (codes/native names, no flags, no RTL), remove-language action opening `ConfirmationModal` (`packages/editor-ui/src/components/ui/ConfirmationModal.jsx`, `variant: "danger"`) that shows the counts from step 10.
- Do not touch editor i18n; site language never changes the admin language (§1d).

### Step 13. Pages list: language tabs + status chips (§3)

- `packages/editor-ui/src/pages/Pages.jsx` — tabs above the table filter by language; "New page" inherits the active tab's language. Per row, one chip per *other* language: filled (open the sibling) or hollow ("Create <lang> version" → step 11's endpoint, then navigate).

### Step 14. Page editor: language menu, context follows the page (§4)

- `packages/editor-ui/src/components/pageEditor/EditorTopBar.jsx` (`pageEditorActions` slot) — a menu listing siblings and missing languages.
- `packages/editor-ui/src/components/pageEditor/PreviewPanel.jsx` and the global-widget fetch (`getGlobalWidgets` via `packages/builder-server/src/routes/preview.js`) request the page's language so the canvas shows that language's header/footer.

### Step 15. Pickers: all languages, grouped and filterable (§4a)

- `packages/editor-ui/src/components/settings/inputs/LinkInput.jsx`, `RichTextInput.jsx` and `packages/editor-ui/src/components/MenuEditor/index.jsx` — group options by language, filter defaulting to the current page's language, and show a small language tag on any item whose target is in another language. Seeded cross-language menu targets (§2a) need no special case.

### Step 16. Collections: the same three controls (§9a)

- `packages/editor-ui/src/pages/CollectionItems.jsx` (tabs + chips), `CollectionItemAdd.jsx` (inherit tab language), `CollectionItemEdit.jsx` + `packages/editor-ui/src/components/collections/CollectionItemForm.jsx` (language menu). Reuse the components from steps 13–14 rather than copying them.

### Step 17. Media: per-language alt/title/caption (§6)

- `migrations.js`, next version — `media_file_translations (media_file_id, language, alt, title, caption, PRIMARY KEY (media_file_id, language))`. Existing `media_files` columns remain the default language.
- `packages/builder-server/src/db/repositories/mediaRepository.js` — read/write translations; `NULL` (no row / null column) means inherit, `""` means intentionally blank. A `getMetadataForLanguage(fileId, language, defaultLanguage)` resolves the fallback in one place.
- `packages/core/src/tags/imageTag.js` — read `alt` / `title` through the resolved-for-language metadata the shell supplies (`mediaFiles` in `buildRenderDeps`, `packages/builder-server/src/services/renderingService.js`).
- `packages/editor-ui/src/components/media/MediaDrawer.jsx` — language pills above the three fields; the grid and uploads are unchanged.

**Done when:** a render test shows a Greek page using Greek alt text, falling back to English when absent, and honouring a deliberately empty Greek alt.

---

## Phase 4 — Rendering, preview, export

### Step 18. Preview routes with an explicit namespace (§Assumptions)

- `packages/builder-server/src/routes/preview.js` + `previewController.js` — `/preview/page/:lang/:slug` and `/preview/collection/:lang/:type/:slug` alongside the existing routes (which keep meaning "default language"). `createPreviewToken` / `createCollectionPreviewToken` carry the language.
- `packages/editor-ui/src/lib/previewBase.js`, `packages/editor-ui/src/utils/previewLinkUtils.js` and `packages/core/src/runtime/previewRuntime.js` — map a rendered internal link (either Clean URLs shape, any depth) back to the namespaced preview route using `contentAddress.previewRoute`.

**Done when:** clicking a Greek menu link in the canvas opens the Greek page; a cross-language link opens the other language's page.

### Step 19. `page.translations`, `<html lang>`, hreflang (§7, §7c, §7d)

- `packages/builder-server/src/services/renderingService.js` (`buildRenderDeps`) — build `translations` for the page or item being rendered: one entry per *exportable* language (§7b), each with `language`, `hreflang`, `label`, `href` (relative, via `pageHref` / `itemHref`), `seoUrl` (absolute, via step 1's helper), `active`, `fallback`, `dir`. Attach as `page.translations`; empty array for single-language projects.
- `packages/render-engine/src/renderEngine.js` — `page.language` / `project.languages` / `project.defaultLanguage` in the base context.
- `packages/core/src/tags/SeoTag.js` — emit `<link rel="alternate" hreflang="…">` for every entry where `fallback` is false, plus the self-reference (the `active` entry) and `x-default` (default-language sibling, else default-language homepage); emit nothing when the project is single-language (§7d).
- `themes/arch/layout.liquid` — `<html lang="{{ page.language }}" dir="{{ page.dir }}">` (replaces the hardcoded `en`). `page.dir` is derived from `languageDir(page.language)`.

**Done when:** a two-language fixture renders a valid hreflang set with self-reference and `x-default`; a single-language fixture renders none; `<html lang>` matches the page.

### Step 20. Export per language (§7, §7a, §7b, forms)

- `exportProjectToDir` in `exportController.js` — iterate the default language then each additional one; write pages to `contentAddress.pageOutputPath`, items to `itemOutputPath`, with depth from step 4. **A non-default language with no homepage is skipped and named in the export result** (`warnings: [{ code: "LANGUAGE_SKIPPED", language }]`) and surfaced as a prominent notice in the editor's export UI; a missing default homepage still throws as today.
- `seoArtifacts.js` — `buildSitemap` emits every exported language's pages and items with `xhtml:link` alternates from the same `translations` data; `buildRobotsTxt` Disallow paths include the language folder.
- `packages/builder-server/src/routes/export.js` — `resolveExportFile` already accepts nested paths; add an `exportView.test.js` case for `el/news/story` in both shapes.
- `packages/builder-server/src/services/formsManifestService.js` — form keys become language-qualified (`<lang>:<handleizedLabel>`), `page_path` comes from `contentAddress.publicPath`, so a copied-but-untranslated form never merges into the source stream and a partially translated one never fails the export (§Assumptions). `MAX_FORMS_PER_SITE` is counted per stream until hosted decides otherwise.

**Done when:** `collectionItemExport.test.js` and a new `multilangExport.test.js` verify the folder layout, the skipped-language warning, sitemap alternates and separate form streams; the single-language export diff against the pre-multilang fixture is empty except `<html lang>`/`dir`.

### Step 21. Collections render per language (§9)

- The `| collection` filter (registered in `renderWidget`, `renderEngine.js`) filters items to the rendering page's language; the shell's loader in `renderingService.js` lists per language.
- `renderCollectionItemPage` receives `translations` (step 19) so the switcher works on item pages.
- Listing links and item links follow §8's output order (`/el/news/story`).

**Done when:** `collectionFilter.test.js` and `renderCollectionItemPage.test.js` run under `el` and show only Greek items on a Greek page.

---

## Phase 5 — Theme, dates, migration, docs

### Step 22. Arch: switcher and no hardcoded site-facing copy (§7, §Phase Boundaries)

- `themes/arch/widgets/global/header/schema.json` + `widget.liquid` — a "Language switcher" setting rendering `page.translations` (labels are native names; `aria-current` on the active entry). Hidden when the array is empty.
- `themes/arch/layout.liquid` — the skip link's text moves into per-language header content or a header setting; the link itself stays. Document the rule in the theme-authoring docs: themes never hardcode visitor-facing strings.

### Step 23. Localized month names (§Localized month names)

- `packages/core/src/utils/dateFormat.js` — replace `MONTHS_SHORT` / `MONTHS_FULL` lookups with `Intl.DateTimeFormat(locale, { month, timeZone: "UTC" })`, keeping the `YYYY-MM-DD` split so no local `Date` is constructed. Format tokens and the app-level `dateFormat` setting are unchanged — only the month's language moves.
- `packages/core/src/filters/dateFilter.js` — pass `page.language` as the locale.

**Done when:** the date-format tests run for `en` and `el` and the numeric parts of every format are byte-identical to today.

### Step 24. Upgrade path for existing projects

- Nothing moves on disk: root content *is* the default language (§1a-i). Migration v6 sets `en` / `[]`. Usage ids were rebuilt in step 2. Group ids default to the page uuid (step 7). Existing exports are unaffected until a second language is added.

### Step 25. Documentation

- `docs-llms/core-architecture.md`, `core-packages.md` — the addressing layer and the language folders; `core-security.md` if the preview namespace touches the resolver contract.
- Theme docs — the `page.translations` contract (§7c) verbatim; it is frozen once Arch ships against it.
- `docs-llms/user-test-checklist.md` — add language add/remove, translate page, switcher, export layout.
- `docs-llms/documentation-index.md` — already lists this file; refresh key topics when steps change.

---

## Dependency summary

```
0 page_url filter ─┐  (stage 0)
1 Site URL helper ─┤  (stage 0)
2 usage ids ───────┤  (this stage)
3 global context ──┼─► 5 setting ─► 6 addressing ─► 7 storage/API ─► 8 links
4 derived depth ───┘  (3: stage 3; 4 and the path half of 6: stage 2)
                                                        │
                                                        ├─► 9 add ─► 10 remove ─► 11 create version
                                                        │                              │
                                                        │           12–16 editor UI ◄──┘
                                                        │           17 media
                                                        └─► 18 preview ─► 19 translations/hreflang ─► 20 export ─► 21 collections
                                                                                                         │
                                                                     22 theme ◄── 19          23 dates   24 upgrade   25 docs
```

Steps 0 and 1 are stage 0. Step 4 and the path half of step 6 ship inside pagination (stage 2). Step 3 ships inside structured data (stage 3). When multilang starts, step 2 is the only prerequisite left. Steps 12–17 can be built in parallel once 11 lands. Step 23 is independent of everything and is scheduled last only for that reason.

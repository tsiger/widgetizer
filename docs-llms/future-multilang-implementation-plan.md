# Future: Multilanguage Implementation Plan

> **Status: build order for the design locked in `future-multilang-design.md`.** That doc says *what* and *why*; this one says *in which order* and *where*. Section references (§) below point at `future-multilang-design.md`. If the two disagree, the design doc wins and this one is wrong.
>
> Written 2026-09-09 against the code as it stands on `0.9.10`. File and function names were verified at that date; re-verify before relying on a line.
>
> **Progress — 2026-09-18.** Steps 0–21 are built and committed (phases 0–4 complete; step 21 is `1775a245`). Each done step carries an **As built** note describing what it actually landed, which is the live record — read those before the prose above them. Phase 5 remains: steps 22–25.
>
> Hands-on testing started 2026-09-18 against a two-language project. Two things it found so far were **not** multilang bugs and are fixed or noted elsewhere: the runtime theme copy under `data/themes/` can be stale, so a project seeded before a `npm run theme:sync` misses recent theme changes (step 19's dynamic `<html lang>` among them); and the editor's unsaved-changes state was wrong in two ways, fixed in `90d1c6ef`.

---

## Where this sits

Multilang is **stage 4 of the series** — groundwork → breadcrumbs → pagination → structured data → multilang, followed by two independent items (undo-history fix, rename to "Widgetizer Desktop") that wait on nothing. The series table, what each stage lands for the next, and the reading order are in `future-roadmap.md`. This doc's Phase 0 holds the shared groundwork steps (0 and 1 are stage 0; 3 ships in stage 3; 4 and the path half of 6 ship in stage 2) and marks each with the stage it lands in. By the time multilang starts, only step 2 is still open.

---

## Ground rules

1. **Land the steps in order.** Every step is a mergeable unit that leaves `npm test`, `npm run test:frontend` and `npm run lint:all` green. Later steps assume earlier ones.
2. **Preserve existing correct single-language behaviour.** Keep a fixture project and diff its export before and after each step. Allow only explicitly tested corrections to generated URLs in step 1 and the deliberate `<html lang>` change in step 19; unrelated output must remain byte-identical. Step 1's Site URL validation feedback is also an intentional editor change before the language UI lands.
3. **Language logic lives in the addressing layer (step 6), nowhere else.** A `language !== defaultLanguage` branch outside `@widgetizer/core`'s addressing helpers is a review blocker — that is the whole point of §Implementation Contracts.
4. **Persisted is empty; resolved is never empty** (§1a-i). Files in the root folder carry no `language`; every loaded model has one. No consumer writes its own fallback.
5. **Backend stays adapter-agnostic and scope-first.** New storage paths go through the `StorageAdapter` with `scope`; never assemble `pages/<lang>/…` outside the addressing layer.
6. **Do not cite the task tracker from code or docs.** Put the reason inline.

---

## Phase 0 — Prerequisites (no multilang code yet)

Four contracts the design calls blockers, plus the series' stage-0 filter. Each is independent of the others and of any language UI. Most of them ship in earlier stages of the series — the heading of each step says where; by the time multilang starts, only step 2 is still open.

### Step 0. `page_url` filter — one way for a theme to link to a page (series stage 0)

**Why:** `themes/arch/widgets/global/header/widget.liquid` builds the logo's home href with an inline `{% if globals.cleanUrls %}` that re-implements the home rule `pageHref` already owns. Every later theme link — the pager, the language switcher — needs the same shape logic, so expose the existing helpers to templates rather than replacing them.

**Review note — existing preset links already work.** Anastis's `clean-urls-links` merge (`fdb936dc`) supplies the page/item helpers and their existing consumers. During project creation, `enrichNewProjectReferences` in `packages/builder-server/src/utils/linkEnrichment.js` connects matching template links such as `contact.html` to actual pages by adding `pageUuid`; this covers page and global widgets. The user verified a new Arch Consulting project shows the Contact page selected in the picker. A literal `.html` link in preset source is therefore not evidence of a defect. The base Arch header template also supplies an empty CTA link, distinct from the header schema's fallback default.

Schema defaults used when adding widgets later are a separate path: reproduce a failure there before proposing a fix. Do not introduce another reference format or rewrite working preset links. Preserve page-picker references and deliberately custom URLs; a missing target page must not acquire a fabricated reference.

- `packages/core/src/filters/pageUrlFilter.js` (new) — `page_url` takes a slug and returns `pageHref(slug, { cleanUrls, outputPathPrefix })` read from `globals`; a matching `item_url: slugPrefix` wraps `itemHref`. Registered with the other core filters in `packages/render-engine/src/renderEngine.js`. Author-typed hrefs are untouched (§2a).
- `themes/arch/widgets/global/header/widget.liquid` — the logo href becomes `{{ 'index' | page_url }}`. A CTA-default change is not an assumed deliverable; it requires a separately demonstrated failing case as described above.
- Multilang (step 8) later adds the target language as an optional argument; the filter's signature is designed for it now.

**Done when:** the header renders the same href as today at depth 0 and 1, under both Clean URLs values, with no conditional in the template; filter tests cover page and item links, including home. Verify the result in preview and export, and preserve preset/page-picker links following page slug changes.

### Step 1. One Site URL base helper (§Blocker 4) — *lands in stage 0 (groundwork)*

**Why first:** JSON-LD ids (stage 3), hreflang, per-language canonicals and sitemap entries all start from the Site URL, and today three code paths join onto it three different ways.

- `packages/core/src/utils/urlSafety.js` — `isValidSiteUrl` additionally rejects a query or hash. Keep accepting a path (GitHub-Pages-style `user.github.io/repo/` is a legitimate deploy).
- `packages/core/src/utils/internalHref.js` (beside `isHomeSlug`) — add `siteUrlBase(siteUrl)` returning a normalised directory base with one trailing slash, and `absoluteSiteUrl(siteUrl, path)` that joins a site-relative path onto it. Both pure.
- Route through them: `resolveCanonicalUrl` and `resolveImageUrl` in `packages/core/src/tags/SeoTag.js`; the item canonical in `buildCollectionItemPageData` (`packages/builder-server/src/services/collectionService.js`); `buildSitemap` and `buildRobotsTxt` in `packages/builder-server/src/services/seoArtifacts.js`.
- Delete the two private `isValidSiteUrl` copies (`seoArtifacts.js`, `collectionService.js`); import the core one. Preserve the distinction between an optional valid setting and a usable rendering base: core validation accepts an empty Site URL, while the existing private checks reject it to omit generated SEO output. Keep explicit missing-base handling so export without a Site URL still succeeds and skips only output requiring that base. Define safe handling for previously stored URLs rejected by the stricter validation; never crash export or silently invent a replacement address.
- In `buildRobotsTxt`, include the Site URL's base pathname in page/item `Disallow` paths as well as fixing the absolute `Sitemap:` address. For a site under `/bakery/`, a rule for `private` must target `/bakery/private`, not `/private`. This is a path correction, not a redesign of robots/noindex policy.
- Preserve explicit canonical overrides and external social-image URLs; only automatically generated site-relative addresses use the shared base.
- Form + controller: `app/src/components/projects/ProjectForm.jsx` and `packages/builder-server/src/controllers/projectController.js` surface the new rejection with a localized message (`packages/core/src/locales/en.json`, next to `siteUrlInvalid`).

**Done when:** `seoArtifacts.test.js` and SEO-tag/collection-item coverage exercise root and subfolder Site URLs, with and without a trailing slash, under both Clean URLs values. Every automatically generated absolute URL (canonical, og:image, sitemap `<loc>`, robots `Sitemap:`) shares one base, including the homepage; robots page/item paths retain the base pathname. Cover empty and invalid bases, query/hash rejection, and preservation of explicit overrides. Export diffs contain only the intended URL corrections.

### Step 2. Collision-proof media-usage identities (§Blocker 1) — *done 2026-09-16*

**Why:** usage rows are keyed by human-readable strings that collide once the same slug exists per language; deleting a Greek page could strip media its English sibling still uses.

- `packages/builder-server/src/services/mediaUsageService.js` — page sources become `page:<uuid>`; `collectionSource(type, slug)` becomes `collection:<uuid>`; global sources become `global:root:<type>` for the default language (language-coded variants come in step 7). `THEME_SETTINGS_USAGE_ID` stays.
- Every writer and reader of those ids: `updatePageMediaUsage`, `syncPageMediaUsageOnWrite`, `updateGlobalWidgetMediaUsage`, `refreshAllMediaUsage`, the delete paths in `pageController.js` / `collectionService.js`, and `packages/editor-ui/src/pages/Media.jsx` where usage titles are seeded from source ids.
- Existing rows: `refreshAllMediaUsage` already rebuilds from content; run it once per project on first open after upgrade (a `media_usage_schema` app setting in `settingsRepository.js` marks the rebuild done) rather than writing a row-rewrite migration.

**Done when:** `mediaUsage.test.js` and `collectionMediaUsage.test.js` prove two pages with the same slug in different folders keep independent usage, and deleting one leaves the other's media marked in-use.

**As built (2026-09-16):** `usageSource` in `mediaUsageService.js` mints `page:{uuid}`, `collection:{uuid}` and `global:root:{type}`; `THEME_SETTINGS_USAGE_ID` and `global:site-identity` are unchanged (both are project-wide, not per language). The writers take the content object or its uuid, so a rename no longer has a previous source to clean up — the `previousPageId` / `previousItemSlug` arguments are gone. Page deletion reads the uuid before the file is removed. Language folders do not exist yet, so the same-slug guarantee is proven with two identities rather than two folders. Deviation from the plan: instead of a `media_usage_schema` app setting, old rows are detected and rebuilt per project on first media list (`ensureUsageSourceFormat`, given the caller's working dir) — a global setting cannot record "done" for each project, and this also catches projects opened long after the upgrade. The rebuild stamps a uuid on any page or item file that lacks one, so no row is left keyed by a slug that a later save would orphan.

### Step 3. Global widgets render with `page` and `project` in context (§Blocker 2) — *lands in stage 3 (structured data)*

**Why:** the footer's Business details block (stage 3) and the header's language switcher (this stage) both read project and page data, but header/footer render through `renderWidget`, which receives none.

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

### Step 5. Project languages setting (§1, §1a, §1b, §8a) — *done 2026-09-16*

- `packages/builder-server/src/db/migrations.js` — the next migration version adds `default_language TEXT NOT NULL DEFAULT 'en'` and `languages TEXT NOT NULL DEFAULT '[]'` (JSON array of *additional* codes) to `projects`. Existing rows get `en` / `[]` (§1b). (Version numbers are not pinned here: stage 3 adds its own migration first.)
- `packages/builder-server/src/db/repositories/projectRepository.js` — `rowToProject` maps `defaultLanguage` / `languages`; `createProject` / `updateProject` write them.
- `packages/core/src/utils/languages.js` (new) — `LANGUAGE_CODE_RE` (`^[a-z]{2}(-[a-z0-9]{2,8})?$`), `RTL_LANGUAGES` (rejected in v1), `nativeLanguageName(code)`, `hreflangCase(code)` (`pt-br` → `pt-BR`), `languageDir(code)`. Shared by form and controller like `isValidSiteUrl` is.
- `packages/builder-server/src/controllers/projectController.js` — validate on create/update: codes match the regex, lowercase stored, RTL refused, default not in `languages`, **default language editable only while `languages` is empty** (§1a), **a code equal to an existing root page slug or collection `slugPrefix` is refused with the conflicting name** (§8a). Adding a language calls the seeding service (step 9); removing one calls the removal service (step 10). Manifest round-trip in `exportProject` / `importProject`; `duplicateProject` copies both fields.
- `packages/editor-ui/src/stores/projectStore.js` — nothing field-specific today; add `defaultLanguage`, `languages`, and a derived `isMultilang` (`languages.length > 0`) so every UI step gates on one selector.

**Done when:** project API tests cover every rejection above; a single-language project round-trips export/import/duplicate with `en` / `[]`.

**As built.** Migration v7 adds both columns; `packages/core/src/utils/languages.js` owns the shape, the RTL refusal, canonical casing and the picker list; `projectController` validates on create, update and import (duplicate inherits the row); `projectStore` exposes `useDefaultLanguage` / `useExtraLanguages` / `useIsMultilang`.

Two deviations:

- The §1a lock reads the **current** state, not the resulting one: while a project is single-language, one call may set a new default *and* add languages, exactly as two calls would. Once other languages exist the default is locked.
- The §8a reserved-name check (a language code equal to a root page slug or a collection `slugPrefix`) is **not** here. It needs the project's content, and project routes are actor-scoped — there is no `req.scope` for the project being updated, and fabricating one in the backend is exactly what the adapter contract forbids. It lands with the add-language service in step 9, whose routes are project-scoped, before any UI can enable a language (Phase 2 precedes Phase 3).

### Step 6. The addressing layer (§Implementation Contracts) — *done 2026-09-16*

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

**As built.** Every builder in `contentAddress.js` takes a trailing `{ language, defaultLanguage }`; `languageFolder` is the one place the comparison happens (`""` for the default, the code otherwise, a `TypeError` for anything that is not a language code, and a missing `defaultLanguage` reads as `DEFAULT_LANGUAGE`). Storage keys come with their directories (`pagesDir`, `globalsDir`, `menusDir`, `itemsDir`) so a listing never spells a folder either, and `parseContentKey` is the full inverse (`languageFromKey` is its language column). `pageHref` / `itemHref` / `pagedHref` / `pageUrlAt` / `pageSelfUrl` take the target's language; a non-default homepage is its folder (`el/`) under Clean URLs and in the canonical, `el/index.html` otherwise. No caller passes a language yet, so output is byte-identical.

Four deviations from the list above:

- `previewRoute.item` is keyed by **`slugPrefix`**, not collection type — the existing `/preview/collection/:prefix/:slug` route already resolves prefix → type, and the in-preview link mapper only ever sees the prefix. Routes always carry the resolved language (`/preview/page/en/contact`), and a paged copy is `/preview/page/<lang>/<slug>/page/<n>`; `parsePreviewRoute` is the inverse.
- `parsePagedPath` needs the project's additional codes: `el/page/2` is the Greek homepage's copy only when `el` is one, else a root page slugged `el`. The same ambiguity is why preview routes are namespaced.
- `isReservedPageSlug` / `isReservedSlugPrefix` take `{ languages }` (§8a) — the reservation is computed here, and root-only for pages, so step 7 passes the list rather than comparing codes itself.
- `isHomeSlug` moved into `contentAddress.js` (still exported from `internalHref.js`) so `internalHref` can build on the layer without an import cycle; `outputHref(outputPath, opts)` is the shared "link to this output path from this depth" step under `pagedHref`, and `homeHref(opts)` the one place a homepage becomes its directory under Clean URLs — `publicPath` collapses only the root `index.html`, because `news/index.html` may be a legacy item that must keep its address.

### Step 7. Storage and API readers/writers go through the addressing layer (§5, §8, §8a) — *done 2026-09-16*

- **Pages** — `packages/builder-server/src/controllers/pageController.js`: every `pages/…` string becomes a `contentAddress` call. `getAllPages` lists the root folder plus each `pages/<lang>/` and stamps the resolved `language` on each model. `createPage` / `updatePage` accept `language`; `generateUniqueSlug` (`packages/builder-server/src/utils/slugHelpers.js`) checks uniqueness inside the language folder only. **Root page slugs equal to an enabled language code are refused** (§8a); the `page` reservation from stage 2 applies in every language folder. Page model gains `translationGroupId`; on create it is the page's own uuid (a group of one), so no backfill of existing pages is needed.
- **Globals** — `getGlobalWidgets` / `saveGlobalWidget` in `pageController.js` and `readGlobalWidgetFromDir` in `packages/builder-server/src/utils/projectContentFs.js` take a language.
- **Menus** — `packages/builder-server/src/controllers/menuController.js`: menus live in `menus/<lang>/`; list merges all folders and stamps `language`; create takes a language.
- **Collection items** — `packages/builder-server/src/services/collectionService.js`: `listCollectionItems`, `readCollectionItem`, `writeCollectionItem`, `deleteCollectionItem`, `duplicateCollectionItem`, `reorderCollectionItems` go through `itemKey`; uniqueness and `RESERVED_ITEM_SLUGS` (`index`) apply per language folder; **`RESERVED_SLUG_PREFIXES` grows the project's enabled language codes** (§8a); items gain `translationGroupId` like pages.
- **Filesystem-direct helpers** — `listPagesFromDir` in `projectContentFs.js` currently drops sub-directories via `isFile()`; make it enumerate language folders and skip only `global/`.
- **Delete cleanup** — `cleanupDeletedPageReferences` / `cleanupDeletedCollectionItemReferences` in `packages/builder-server/src/utils/linkEnrichment.js` scan every language's pages, globals and menus, not just the root.
- **Project lifecycle** — `duplicateProject`, `exportProject`, `importProject` in `projectController.js` copy the language folders verbatim; groups survive (§Core Model table).
- **Media usage** — `usageId.global(type)` now emits the language-coded form for non-default globals (step 2 left it root-only).

**Done when:** `collectionApi.test.js`, `collectionService.test.js` and the page API tests run their existing cases with the default language *and* again with `language: "el"`; a same-slug page in two languages coexists; a page slugged `el` is refused once `el` is enabled and vice versa.

**As built.** One request-side helper, `packages/builder-server/src/utils/contentLanguage.js`: `requestLanguage(req, res)` reads `?language=` or `body.language`, resolves against `req.activeProject` and answers `400` for a code the project has not enabled (so no folder is ever created for one); `projectLanguageContexts(project)` drives every API listing (root first, then each enabled language); `languageFoldersIn(storage, scope, dir)` drives the scans that must touch every file present (delete cleanup). Pages, globals, menus and items all follow the same shape: keys from `contentAddress`, the folder as the only record of the language (`withoutLanguage` strips the field on write, reads stamp the resolved code), `translationGroupId` = own `uuid` on create and duplicate, preserved on update. `listPagesFromDir(projectDir, { defaultLanguage })` and `readGlobalWidgetFromDir(projectDir, type, lang)` walk the folders for the render path; the media-usage rescan does the same and `usageSource.global` now delegates to `usageId.global`. Export already places a non-default page at `el/<slug>.html` (its depth follows) with its markdown twin beside it, keys pagination plans by the language-qualified output path (a slug is no longer unique), and builds the sitemap, robots and forms manifest from the root pages only until step 20 lands per-language SEO artifacts. Project duplication walks the language folders and remaps `translationGroupId` with the regenerated uuids; a group named after a member that has since been deleted keeps its id, so the survivors stay together. The collection-item cap counts items across every language folder of the collection (physical counting, as decided). A uuid-less file's pending usage id carries its folder (`page:slug:el/about`) so same-slug translations cannot share a row, and `global:<lang>:<type>` counts as migrated so the one-time rebuild does not rerun on a translated site.

Two things deliberately left for later steps:

- The `slugPrefix` half of §8a ("vice versa": enabling a language whose code equals a collection prefix or a root page slug) is the add-language service's check (step 9); `isReservedSlugPrefix(prefix, { languages })` is ready for it, but theme schema validation runs without a project, so nothing enforces it there.
- The uuid loaders (`loadPagesByUuid`, `loadCollectionItemsByUuid`) and the `| collection` filter still read the root only; step 8 and step 21 own those.

### Step 8. Language-aware link resolution (§4a, §7a) — *done 2026-09-17*

- `loadPagesByUuid` in `packages/render-engine/src/renderEngine.js` and `loadCollectionItemsByUuid` in `collectionService.js` load every language, and each entry carries its resolved `language`.
- `packages/render-engine/src/menuResolver.js` (`resolveMenuItemLinks`, `resolveMenuPageLinks`), the richtext resolution inside `renderWidget`, and the link-setting resolution pass the target's language into `pageHref` / `itemHref` so a cross-language link renders as `../el/contact` from an English page (§4a). Author-typed strings stay untouched (§2a).
- `canonicalPath` stays the file path, per language.
- Breadcrumb trails (stage 1, `future-breadcrumbs-design.md`) are per language automatically because menus are; a `parentPageUuid` that points at another language's page resolves to that page's translation sibling in the current language, else is ignored. Listing anchors live on per-language pages and need nothing.

**Done when:** `collectionLinkResolution.test.js` and a menu-resolver test cover same-language, cross-language and cross-depth targets under both Clean URLs values.

**As built.** The target's language rides on the loaded entry and the project's default rides beside `cleanUrls`, so every resolver answers "which folder" from the two together. `loadCollectionItemsByUuid` takes language contexts and its entries gained `language`; pages already carried theirs from step 7. `defaultLanguage` joins `cleanUrls` as a trailing argument on the positional resolvers (`resolveMenuItemLinks`, `resolveMenuPageLinks`, `resolveCollectionItemLinks`, and the engine's private link resolvers) and as a field in the bags that already existed (`resolveMenuSettings`, `menuDeps`, the richtext deps, `buildBreadcrumbs`). The engine caches the project's language settings per render beside the Clean URLs stamp.

Three things the list above did not spell out:

- **`canonicalPath` is now the language-qualified file path** (`el/about.html`), built by `pageOutputPath` / `itemOutputPath` rather than string concatenation, and the exporter's `currentCanonicalPath` matches. Active-state matching therefore compares like with like. Preview still addresses pages by slug alone, which is fine while it is default-language only; step 18 gives it the namespace.
- **`ensureBreadcrumbs` finds a page by rebuilding its output path**, not by matching a slug — a slug is no longer unique across languages. When no page matches, the path is an item's, and a leading enabled-language segment is stripped before the collection prefix is resolved.
- **A trail stays inside its language**: `findHomePage` picks the home of the trail's language, and a `parentPageUuid` (or a listing anchor) pointing at another language is swapped for its `translationGroupId` sibling in this one, else dropped. `listingParentStatus` takes the language for the same reason. Listing pages are deduplicated by uuid once resolved, since a translated pair collapses to one page and one page is not an ambiguous choice, and `indexListingPages` keeps an anchor **per language** (`anchorByLanguage`, with `anchorPageUuid` as the cross-language fallback) so each language's own choice survives.
- **The collection reader carries the project's default language**, so omitting `lang` reads the root folder *and* stamps its items with the language that folder actually is. Without it a Greek-default project would treat its own root items as English and give them an `en/` folder.

---

## Phase 2 — Language lifecycle (server)

### Step 9. Add a language: seed the skeleton (§2, §2a, §5a) — *done 2026-09-17*

- `packages/builder-server/src/services/languageService.js` (new) — `addLanguage(scope, code)`: validate (step 5 rules), then in order: copy default menus into `menus/<code>/` with fresh uuids keeping an old→new map; copy header/footer into `pages/<code>/global/` rewriting only their **menu references** through the map (`resolveMenuSettings` / `schemaHasMenuSetting` in `menuResolver.js` know which settings hold menu ids). Page links inside menu items are **not** rewritten. No pages are copied.
- Wire from `projectController.updateProject` so the project form's "add" is the only entry point.

**Done when:** a test adds `el` to a fixture and asserts: Greek header points at Greek menu uuids, Greek menu items still point at English page uuids, `pages/el/` holds only `global/`.

**As built.** `languageService.addLanguage({ storage, scope, project, code })` validates, then seeds menus (fresh uuids, same ids, an old→new map) and copies the globals with only their **menu** settings repointed through that map — top-level and block settings alike, read from `widgets/global/<type>/schema.json`. A setting the schema does not declare is copied verbatim. The service returns the new list of codes; the controller writes the row **after** the seed succeeds, so a failure never records a language with nothing behind it. Seeding overwrites, so a retry after a partial seed converges (new uuids, and the globals follow them).

Three deviations, the first significant:

- **The entry point is a project-scoped `POST /api/languages`, not `updateProject`.** The plan's bullet said to wire it from `updateProject`, but step 5 had already found why that cannot work: project routes are actor-scoped, so there is no `req.scope` for the project being edited, and adding a language reads and writes that project's content. `updateProject` now **refuses a change to the `languages` set** (resending the current list is fine, so saving the form is never blocked) and `createProject` refuses a new project asking for more than one language. An **import is exempt** — its zip carries the language folders, so the manifest's list is already seeded. The validation rules that used to be exercised through `updateProject` (right-to-left refusal, lowercasing, the default-language clash) moved with the behaviour and are asserted in `languageService.test.js`.
- **§8a's reserved-name check lands here**, as step 5 predicted: a code equal to a root page slug, to a collection's `slugPrefix`, or to the reserved `assets` prefix is refused, naming the conflict, and nothing is seeded.
- **A copied global gets its own media-usage rows** (`global:<lang>:<type>`), so clearing the source's image never marks one the copy still shows as unused. **A menu setting is repointed whether it names the menu by uuid or by slug** — the renderer accepts both, but only the uuid identifies the copy, so a slug left alone would keep rendering the source language's menu. **Adding a language is serialized per project** (`createKeyedSerializer`) with the row read inside the section: two adds in flight would otherwise both extend the pre-seed list, and two adds of the same code would seed over each other's files.
- **`loadMenuMaps` now indexes every language's menus by uuid** (`bySlug` stays root-only, since a bare slug means the menu of the language being rendered). Without it the uuids this step writes into a translated header would resolve to nothing the moment step 19/20 render that header.

### Step 10. Remove a language: destructive with counts (§1c) — *done 2026-09-17*

- `languageService.removeLanguage(scope, code)` — refuses the default language; deletes `pages/<code>/` (pages + globals), `menus/<code>/`, every `collections/<type>/<code>/`, the language's media-translation rows (step 17), and the usage rows of everything deleted (through `mediaUsageService`, using step 2's ids). Binaries untouched.
- `languageService.countLanguageContent(scope, code)` → `{ pages, items, menus }` for the confirmation modal; exposed as `GET /projects/:id/languages/:code/summary`.

**Done when:** a test removes `el` and asserts the folders are gone, English content is untouched, and a media file used only by a deleted Greek page is no longer marked in-use.

**As built.** `removeLanguage` reads every content file's identity **before** deleting anything, then for each one clears the media-usage row **before** deleting the file — including the `page:slug:<folder>/<slug>` form a uuid-less file was recorded under. Both orders are about being retryable: a row is keyed by the uuid inside its file, so a file deleted first can never be matched again, while a row cleared first is simply cleared again by the retry. If a delete fails, the rows of every file that survived are rebuilt from their content before the error leaves the service, so nothing is ever reported unused while it is still on disk showing its images — otherwise the media library would offer to delete a binary that surviving content references. Only the failure path pays for that; a successful removal has nothing left to account for. A file that cannot be read aborts the whole removal with nothing touched, rather than being treated as one that merely has no uuid — that assumption would clear the wrong row and strand the real one. A collection folder left holding only its `_order.json` is still enumerated, so that leftover goes too. Uploaded binaries are shared and never touched. `countLanguageContent` returns `{ pages, items, menus }` for the modal and touches nothing; globals are not counted, since they are always a pair. Both refuse the default language and a code the site does not have (404).

- **The routes are `GET /api/languages/:code/summary` and `DELETE /api/languages/:code`**, project-scoped beside the add from step 9 and sharing its per-project serializer, so an add and a remove cannot interleave and two removals of the same code give one 200 and one 404. The row is written only after the content is gone, so a failure never leaves a language unlisted with its files still on disk.
- **Deletion goes through the storage adapter, file by file, enumerated by the addressing layer** — the adapter contract has no recursive delete, and a directory is not a thing a cloud adapter has. On the local filesystem this leaves the language's now-empty folders behind; nothing reads them (the row no longer lists the language, and every scan finds no files), and a re-add writes straight back into them.
- Per-language media **translation rows** are step 17's; there is nothing to delete yet.

### Step 11. "Create <lang> version" for pages and items (§Core Model, §3, §9a) — *done 2026-09-17*

- `pageController.createLanguageVersion` and `collectionService.createItemLanguageVersion` — copy the source into the target language folder, **join the source's `translationGroupId`**, refuse if the group already has that language (the one-per-language invariant). Slug defaults to the source slug (per-language uniqueness makes that fine); the caller may pass another.
- `duplicatePage` / `duplicateCollectionItem` — explicitly assign a **fresh** group (the new uuid), so an ordinary duplicate is never a translation.
- `GET /projects/:id/translations/:groupId` → the group's members `{ language, uuid, slug, type }` for chips and menus.
- `LIMIT_KEYS.MAX_COLLECTION_ITEMS` keeps counting physically until hosted decides otherwise (§Hosted product questions).

**Done when:** tests cover join, invariant refusal, duplicate-gets-fresh-group, and that deleting any member leaves the rest of the group intact.

**As built.** `packages/builder-server/src/services/translationService.js` owns the group: `groupIdOf` (the id joined, else the content's own uuid), `findPageInGroup` / `findItemInGroup` (one language folder — that is all the invariant needs), `findGroupMembers` (every language, pages and items, for the chips and the editor's language menu) and `resolveTargetLanguage`. `POST /api/pages/:id/translations` and `POST /api/collections/:type/:slug/translations` create the version; `GET /api/translations/:groupId` reads the group.

- **The source language comes from `?language=`, the target from `body.targetLanguage`.** They cannot share the name `language`, because `requestLanguage` already reads that as the language of the content being addressed. Translating a translation works the same way, so a group grows from whichever member is open.
- **A source is never rewritten.** `translationGroupIdOf` in `@widgetizer/core/contentAddress` falls back to the content's own uuid, so a source that stood alone already answers to the id its versions carry — the earlier write-back was both unnecessary and unsafe, since it saved a snapshot read before the new version was written and would undo an edit made in between. Everything that resolves a group uses that one helper, the breadcrumb builder's cross-language parent lookup included; reading only the stored field there would lose the sibling of a page that has never been rewritten.
- **Content with neither a uuid nor a group is refused** (`assertHasIdentity`), because an id named after it would differ on every request: the versions could not find each other and the one-per-language rule could not hold. An ordinary save stamps the uuid, and the message says so.
- **The check, the slug and the write are one operation per project** (`serializeTranslationOps`, shared by the page and item paths, with fresh reads inside). Run concurrently they would both find the language free and create a second member of the same group, which the one-per-language lookups would then hide. A file that cannot be read during the check aborts the creation: "absent" would be a guess, and a wrong one lets a second member in.
- **A translated item counts against `MAX_COLLECTION_ITEMS`** like any other, across every language folder, and its slug goes through the same reserved-name rule (`index`, `page`) as an ordinary item.
- **The slug defaults to the source's** (`contact` in every language), takes an explicit one when given, and is made unique inside the target folder either way.
- **A listing anchor is kept**, unlike a duplicate: a duplicate is a second page in the SAME language and would fight the original for the anchor, while a translation is that language's own listing page, which step 8's per-language anchors expect. If the target language already had an anchor for that collection the project ends up with two, which the save-time sweep resolves; the trail meanwhile picks the first in slug order.
- Duplication already assigned a fresh group in step 7; the test here pins it so a copy can never be mistaken for a translation.

---

## Phase 3 — Editor UI (visible only when `isMultilang`)

Every component below renders nothing new while `projectStore.isMultilang` is false (§1). New strings go in `packages/core/src/locales/en.json`.

### Step 12. Project form: Languages section (§1, §1a, §1c, §1d) — *done 2026-09-17*

- `app/src/components/projects/ProjectForm.jsx` — default-language select (disabled with an explanatory message once `languages` is non-empty), add-language picker (codes/native names, no flags, no RTL), remove-language action opening `ConfirmationModal` (`packages/editor-ui/src/components/ui/ConfirmationModal.jsx`, `variant: "danger"`) that shows the counts from step 10.
- Do not touch editor i18n; site language never changes the admin language (§1d).

**As built.** The Languages block sits at the foot of the **Site** tab, beside the other site-wide publishing settings, rather than in a tab of its own. `app/src/components/projects/LanguagesSection.jsx` holds the list, the add picker (native names and codes, no flags, RTL never offered because `SUPPORTED_LANGUAGES` excludes it) and the removal confirmation, which reads the step 10 summary first so it can name what will be deleted instead of warning in the abstract.

- **The default language is a form field; the list is not.** Adding or removing copies or deletes content the moment it happens, so neither can wait for Save nor be undone by Cancel — the section says so in as many words. The form holds `languages` in state only to know whether the default is still editable, and never submits it, so `updateProject`'s refusal from step 9 is never tripped.
- **The list appears only once the project exists.** A new project has no content to copy into a second language, and `createProject` refuses one anyway.
- **The default select is disabled once another language exists**, with the help text switching to the reason (§1a).
- **The three calls go through `editorFetchJson`**, which prepends the shell's api base, parses the body and throws the server's own message. `apiFetch` with a bare path returns a raw `Response` that never throws, and in the dev shell a missing `/api` is answered by the SPA with a 200 and an HTML body — so Add reported success on a 404 and cleared the list, and a removal's counts were never read. Verified against the running backend: the bare path answers 200 text/html, the prefixed one 404 with `{"message":"…"}`.
- **A successful add or remove drops the projects-list cache and refreshes the store's active project**, or reopening Project details inside the 30-second window would restore the old list and the old lock.
- **The default language and the language actions are held apart in both directions.** Adding or removing is blocked while the default has been changed but not saved, because the server would lock the language it still holds rather than the one on screen and the next Save would be refused; and the default select is frozen while a request is in flight, because the response decides whether it locks and a change made meanwhile would be locked in against the language the server actually has. The section reports its busy state to the form for the second half.
- **A stored regional default (`pt-br`) is added to the select's options** when it is not one of the offered base codes, since an option-less select renders blank and, while multilang, a disabled blank.
- `LanguagesSection.test.jsx` initialises **real translations** rather than echoing keys: the confirmation's whole job is to state counts, and a key-echoing test would not notice if those counts never reached the sentence. It pins the singular too ("1 page", not "1 pages").

### Step 13. Pages list: language tabs + status chips (§3) — *done 2026-09-17*

- `packages/editor-ui/src/pages/Pages.jsx` — tabs above the table filter by language; "New page" inherits the active tab's language. Per row, one chip per *other* language: filled (open the sibling) or hollow ("Create <lang> version" → step 11's endpoint, then navigate).

**As built.** `getAllPages` already returns every language, so the tabs, the count and the chips are all derived from that one response — no request per row, and the chips are correct again the moment the list reloads. A row's siblings are found by `translationGroupIdOf`, so the untranslated source, which records no group of its own, is still matched by its uuid.

- **Which language a page is opened in travels in the URL** (`?language=` on the editor and on the settings form), because a slug is no longer unique. Saving needed nothing: the loaded page carries its own `language` and both save paths send the page back, so the server resolves the same folder it was read from. Only the **load** was language-blind, so `getPage(id, language)` and `pageStore.loadPage(pageId, language)` gained the argument. That is a small piece of step 14's plumbing, taken early because the alternative was a filled chip that opens a different language's page.
- **A new page inherits the active tab's language** (`/pages/add?language=…`), which `PagesAdd` puts in the create body.
- Everything is gated on `isMultilang`: with one language the list has no tabs, no chips column, and the same links it always had.
- **Review turned up one omission repeated in four places: a slug names a page only once you also say which language.** Delete, bulk delete and Duplicate sent the slug alone and so acted on the default language's page; renaming dropped the language from the redirect and reopened the wrong one; the empty-state "New page" bypassed the active tab because the tabs were nested inside `hasPages`; and the editor's own page switcher listed every language's pages under one set of slugs. All four now carry the language — the row's for a row action, the tab's for a new page, the edited page's for the switcher. Pinned by `packages/editor-ui/src/pages/__tests__/PagesLanguages.test.jsx` and the switcher tests in `EditorTopBar.test.jsx`.

### Step 14. Page editor: language menu, context follows the page (§4) — *done 2026-09-17*

- `packages/editor-ui/src/components/pageEditor/EditorTopBar.jsx` — a menu listing siblings and missing languages.
- `packages/editor-ui/src/components/pageEditor/PreviewPanel.jsx` and the global-widget fetch (`getGlobalWidgets` via `packages/builder-server/src/routes/preview.js`) request the page's language so the canvas shows that language's header/footer.

**As built.** The menu sits beside the page switcher in the top bar and shows the page's own language code. Every site language is listed: one that exists opens its sibling, one that is missing creates it through step 11's endpoint and opens the result. The menu went next to the switcher rather than into the `pageEditorActions` slot — that slot belongs to the embedding shell (hosted's Publish button), and taking it would have displaced someone else's control.

- **Finding a sibling and filling a gap is now one shared hook**, `packages/editor-ui/src/hooks/useTranslationVersions.js`, used by the pages list and by the editor. Group resolution is the part that keeps biting (an untranslated source records no group of its own), so it happens in exactly one place. Step 16 passes its own `createVersion` and toast keys rather than copying any of this.
- **Every link into the page editor is built by `packages/editor-ui/src/lib/contentRoutes.js`** (`pageEditorHref`, `pageSettingsHref`, `pageAddHref`). Step 13 had to fix the same dropped-language bug in four separate call sites; there is now one place to drop it from.
- **The canvas gets the right chrome because the globals follow the page**: `loadPage` asks for the globals of the language the page *came back in* (`pageData.language`), not the language in the URL — a default-language load passes no argument and must still resolve to the root folder. Saving mirrors it: `saveGlobalWidget` takes the page's language, so editing a Greek header writes `pages/el/global/header.json`. The server already accepted `?language=` on both (step 7).
- **The sidebar's "Preview site" picks the default language's homepage**, since every language now has an `index`. The standalone preview window itself is still default-language-only — it resolves `/preview/:pageId`, which step 18 replaces with a namespaced route.
- **Review, both about state written outside the moment that owns it.** (1) The globals were stored the instant they arrived, before `loadPage` re-checked `activeLoadId` — so an English load overtaken by a Greek one still dropped the English header onto the Greek page, and the next save wrote it into the Greek file. Reading them now *returns* the pair (`readGlobalWidgets`, no longer a store action) and the page and its globals are committed together, under the one guard. (2) A version created from the menu was only visible once the caller reloaded its list, which the navigation away usually did — but a navigation guard can cancel that, leaving the menu offering to create it again for a 409. The hook keeps what it created and patches it in until the caller's list carries it.

### Step 15. Pickers: all languages, grouped and filterable (§4a) — *done 2026-09-17*

- `packages/editor-ui/src/components/settings/inputs/LinkInput.jsx`, `RichTextInput.jsx` and `packages/editor-ui/src/components/MenuEditor/index.jsx` — group options by language, filter defaulting to the current page's language, and show a small language tag on any item whose target is in another language. Seeded cross-language menu targets (§2a) need no special case.

**As built.** Neither LinkInput nor MenuEditor needed touching: both render `ui/ComboboxOptionList`, which is where the filter, the headers and the tag now live — one place, so a fourth picker would inherit them. `useLinkTargets` supplies the raw material: every option carries its `language`, and the list is built language-major (the default first) so an unfiltered view reads as one block per language.

- **"Which language am I editing" is a context, not a store read.** `lib/editingLanguage.jsx` is provided by the page editor (the page's language), the collection item form (the item's) and the menu structure page (the menu's). The pickers sit deep inside those forms and have no other way to know; reading a store would have been wrong the moment two kinds of content share one input, which is exactly what `SettingsRenderer` is.
- **The filter opens on that language and resets to it every time the list opens** — it is a detour, not a setting. "All" is the escape hatch, and only then does the language join the group header (`Pages · Ελληνικά`). An option carrying no `language` at all is never filtered out, so a non-link picker built on the same list still works.
- **The collection listing is per language**, unlike `getAllPages`, so `useLinkTargets` asks once per language rather than changing what every other caller of that endpoint receives — step 16 can decide that separately. A single-language project makes exactly the same one call it always did. One language failing to load does not lose the others.
- **Richtext's picker is a native `<select>`** and cannot carry a filter row, so the language being edited simply leads and the rest follow, each option tagged `(el)`. That grouping is `lib/linkTargetGroups.js` — extracted so it is testable without mounting the editor.
- Copy in these pickers stays hardcoded English, matching every other string in the same components (`"Link URL"`, `"No matching pages found…"`); none of them are wired to i18n yet.
- **Review: the target cache is keyed by the languages as well as the project.** Adding or removing a language, or changing the default, keeps the same project id, so the old key kept serving options built for the previous set — a new language's pages missing, a removed one's still selectable, for the whole TTL. The key is now `projectId\nen,el` and the effect depends on that string; `invalidateLinkTargetsCache(projectId)` drops every language entry the project holds.

### Step 15a. Menus list and editor per language (§5) — *done 2026-09-17; gap found during step 15*

The server has been language-aware since step 7 (`GET /menus` merges every folder and stamps `language`; get/update/delete/duplicate all take `?language=`), but `packages/editor-ui/src/queries/menuManager.js` never sent one. So the Menus list showed every language's menus with nothing to tell them apart, and opening one always edited the default language's file — the same bug class step 13 fixed for pages.

- `menuManager.js` — `getMenu`/`updateMenu`/`deleteMenu`/`duplicateMenu` take a language; `createMenu` sends the one being looked at.
- `pages/Menus.jsx` — language tabs (no chips: menus are seeded copies with fresh uuids, not a translation group).
- `pages/MenusAdd.jsx`, `MenusEdit.jsx`, `MenuStructure.jsx` — carry `?language=` the way the page routes do, through `lib/contentRoutes.js`.

**As built.** Exactly the shape of step 13, minus the chips. Reads and removals name the language in the query (`getMenu`, `deleteMenu`, `duplicateMenu`); **create and update carry it in the body**, as pages do — a menu object holds its own `language` and the whole object goes back, so a save cannot address another language and there is no second source of truth to disagree with. The tabs sit outside the has-any-menus branch, so a language whose menus were all deleted can still take a new one. `menuStructureHref` / `menuSettingsHref` / `menuAddHref` join the page builders in `lib/contentRoutes.js`.

- **The audit turned up a fourth call site the write-up had missed: `MenuSelectInput`**, the menu setting on a header or footer. It lists `getAllMenus()`, which has returned every language since step 7 — so a Greek header offered two identically-named menus and picking the wrong one silently rendered English labels. It now stays inside the language being edited. **This is deliberately not §4a's rule**: a page may exist in only one language, so hiding link targets would make it unlinkable, but menus are seeded as a per-language set and every language has its own. A value that already points elsewhere is still listed (tagged `Main (en)`) so it reads as what it is instead of as "none".
- **Review, both mine to own.** (1) The tabs were still inside the has-any-menus branch although the note claimed otherwise, so an empty project could not choose a language before creating its first menu; they now sit above it, as on the pages list. (2) A **legacy slug** value resolves to the DEFAULT language's menu, not the edited language's. `loadMenuMaps` builds `bySlug` from the root folder alone, so that is the menu which actually renders; resolving it to the Greek menu would have shown one thing and rendered another. The option is labelled `Main (en)` so the mismatch is visible, and picking any menu stores a uuid and ends the ambiguity for good. **Carried into the render phase, unresolved:** `loadMenuMaps`'s own comment says a bare slug means "the menu of the language being rendered", which is not what it does — see the note on step 19.

### Step 16. Collections: the same three controls (§9a) — *done 2026-09-17*

- `packages/editor-ui/src/pages/CollectionItems.jsx` (tabs + chips), `CollectionItemAdd.jsx` (inherit tab language), `CollectionItemEdit.jsx` + `packages/editor-ui/src/components/collections/CollectionItemForm.jsx` (language menu). Reuse the components from steps 13–14 rather than copying them.

**As built.** "Reuse rather than copy" was taken literally, because this was the third copy of the tabs and the second of the chips and the menu. They are now `components/content/LanguageTabs.jsx`, `TranslationChips.jsx` and `LanguageMenu.jsx`, each rendering nothing while the site has one language so a caller just places it. Pages, menus and items use the tabs; pages and items use the chips; the page editor and the item form use the menu — `EditorTopBar` lost its inline copy in the process. The four strings that describe a translation group rather than a page moved to `common.languages.*`.

- **The item listing is per language**, unlike `getAllPages`, so `useCollectionItems` asks once per language and merges (keyed by the language list, like the link-target cache). Tabs, count and chips all read that one list. Each language keeps the order its own `_order.json` gave it, and a drag-reorder replaces only the active language's block and names it on the way to the server.
- **The item editor's language menu reads `GET /api/translations/:groupId`** rather than loading every language's list to answer a question about one item. The members come back carrying their own uuids, so the group's id is put back on them before they are indexed — without that, each member would index under itself and every language would look missing. A group that cannot be read leaves the menu offering to create, which is the safe direction: the server still refuses a duplicate with a 409.
- **The empty state is per language**, so a language with nothing in it yet shows its own "create the first one" button, in that language. The tabs sit above both branches.
- `lib/contentRoutes.js` gained `itemEditHref` / `itemAddHref` beside the page and menu builders; every mutation (`delete`, `bulk-delete`, `duplicate`, `discard-archived`, `reorder`) now names its language, and create/update carry it in the body as everywhere else.
- **A lint surprise worth knowing:** rewriting the two existing effects in `CollectionItems.jsx` made the react-hooks compiler stop bailing on that component, which surfaced three pre-existing complaints (two `set-state-in-effect`, one `static-components`). Deriving the active language's list during render instead left both effects untouched, which is the better shape anyway — the tab handler clears the selection rather than an effect watching it.
- **Review found the assumption carried over from pages to be false for items, twice.** A page's settings form spreads the loaded page, so its `language` rides along on save; **the item form submits only `slug`, `settings` and `seo`**, so a Greek item was saved over the English one sharing its slug (or 404'd when there was none), and discarding archived fields cleared the English item's. Both now name the item's language explicitly — the loaded item's, falling back to the URL's. Third: a **new** item has nothing to read a language from, so `/collections/news/add?language=el` opened its link pickers in English; `CollectionItemAdd` seeds the form's `initialData` with the language it will be saved in. `PagesEdit` also gained `language` in its load deps, so it matches the other two edit routes.

### Step 17. Media: per-language alt/title/caption (§6) — *done 2026-09-18*

- `migrations.js`, next version — `media_file_translations (media_file_id, language, alt, title, caption, PRIMARY KEY (media_file_id, language))`. Existing `media_files` columns remain the default language.
- `packages/builder-server/src/db/repositories/mediaRepository.js` — read/write translations; `NULL` (no row / null column) means inherit, `""` means intentionally blank. A `getMetadataForLanguage(fileId, language, defaultLanguage)` resolves the fallback in one place.
- `packages/core/src/tags/imageTag.js` — read `alt` / `title` through the resolved-for-language metadata the shell supplies (`mediaFiles` in `buildRenderDeps`, `packages/builder-server/src/services/renderingService.js`).
- `packages/editor-ui/src/components/media/MediaDrawer.jsx` — language pills above the three fields; the grid and uploads are unchanged.

**Done when:** a render test shows a Greek page using Greek alt text, falling back to English when absent, and honouring a deliberately empty Greek alt.

**As built.** Migration v8 adds `media_file_translations`; the `media_files` columns stay the default language, so nothing is backfilled and a single-language project is byte-identical. The columns there are **nullable on purpose** — NULL (or no row) inherits, `""` is a deliberate blank — and a row whose three fields are all NULL is deleted rather than kept.

- **The tag resolves, the shell does not.** The plan sketched the shell handing over already-resolved metadata, but `createBaseRenderContext` does not know which page it is about to render, while the tag does: `page.language` has been in the Liquid scope since step 7. So `mediaFiles` keeps every language's metadata and `{% image %}` picks, through `@widgetizer/core/mediaMetadata`'s `resolveMediaMetadata` — one place that both the tag and anything else asking the same question can share. Design §6 reads the same way ("the tag already reads metadata at render time and just picks the current language").
- **`PUT .../metadata?language=` writes a translation**, and only then does "absent" become meaningful: for a translated language a field left out of the body is stored as NULL, and alt is no longer required (the default language still requires it, and still writes `media_files`). The drawer sends only what was written, plus an explicit `""` for alt when "empty on purpose" is ticked — the one field where inheriting instead of blanking is an accessibility problem. Title and caption in a translation are inherit-or-write; the table can hold `""` for them if a use ever appears.
- **Removing a language drops its media metadata** (`deleteMediaTranslationsForLanguage`), last in `removeLanguage` so a failure above leaves the rows for the retry. Binaries and the default language are untouched — the library is shared, which is the point of staying in one project.
- The drawer's language choice is tied to the file it was made for rather than reset by an effect: the drawer stays mounted between openings, so a different file opens on the default language again.
- **Two save paths, not one:** `useMediaMetadata` (the Media page) and `ImageInput`'s own copy both PUT metadata, and both needed the language. Only the first was in the plan.
- Caption is stored and edited per language but no theme reads the library's caption today (widget blocks carry their own), so nothing renders it yet.
- **Review, three, all about the edges of the same table.** (1) `writeMediaData` — the full rewrite that **project duplication and ZIP import** both use — re-inserted every file without its translations, so a duplicated project came back English and a deliberate blank came back as "inherit"; `insertMediaFileStatements` now carries them. (2) The route's `.optional().trim()` turned an explicit `null` into `""` **before the controller ran**, which is precisely the difference between inherit and deliberately blank — now `.optional({ nullable: true })`, and the chain is exported as `metadataValidators` so that rule has a test of its own, since a controller-only test cannot see what the sanitizers changed. (3) **`media_meta` is a second consumer** of media metadata beside `{% image %}` and still answered in the default language; it reads `page.language` through the same `resolveMediaMetadata` now. Resolving at render time is only correct if every consumer does it.

---

## Phase 4 — Rendering, preview, export

### Step 18. Preview routes with an explicit namespace (§Assumptions) — *done 2026-09-18*

- `packages/builder-server/src/routes/preview.js` + `previewController.js` — `/preview/page/:lang/:slug` and `/preview/collection/:lang/:type/:slug` alongside the existing routes (which keep meaning "default language"). `createPreviewToken` / `createCollectionPreviewToken` carry the language.
- `packages/editor-ui/src/lib/previewBase.js`, `packages/editor-ui/src/utils/previewLinkUtils.js` and `packages/core/src/runtime/previewRuntime.js` — map a rendered internal link (either Clean URLs shape, any depth) back to the namespaced preview route using `contentAddress.previewRoute`.

**Done when:** clicking a Greek menu link in the canvas opens the Greek page; a cross-language link opens the other language's page.

**As built.** `/preview/page/:lang/:slug`, `/preview/page/:lang/:slug/page/:n` and `/preview/collection/:lang/:type/:slug` sit beside the flat routes, which keep meaning the default language. Both the route matcher and the href mapper insist the language slot holds an actual language code, so `/preview/collection/a/b/c` stays nonsense rather than becoming an item in language "a".

- **A preview renders at the site root**, whatever page it is showing (`outputPathPrefix` is `""`), so its links are already root-relative: `el/contact.html` is the Greek page and `contact.html` the default language's. Reading that needs only the enabled codes, which now travel to the iframe on the injected script tag (`data-languages`, `data-default-language`, both filtered through `LANGUAGE_CODE_RE` so nothing else can ride along). `getStandalonePreviewTarget` still resolves against an `outputPath` and handles `../` properly, because an author-typed href can climb.
- **`currentCanonicalPath` is language-qualified in the preview too** (`pageOutputPath` / `itemOutputPath`). Step 8 made breadcrumbs find a page by rebuilding its output path; without the language folder a translated preview found nothing and its menu active-state matched the wrong page.
- **The Preview buttons name the language** — the page editor's, the item form's and the items list's. The sidebar's "Preview site" stays on the flat route, which is the default language, which is what it already picks.
- `getStandalonePreviewTarget` cannot import `contentAddress` (only the two runtime files are served to the iframe), so the route shapes are spelled in both places; a test asserts the mapper's output equals what `previewRoute.*` builds for the same input.
- **Review, three, and the third went wider than the preview.** (1) `pageOutputPath(slug, pageNumber, lang)` — I passed the language options into the **page-number** slot, so the canonical path came out unqualified and the fix did nothing. (2) The item preview read `pages/global/` for its header and footer whatever language it was showing. (3) `previewItem` never carried its language — and chasing that turned up the real cause: **`buildCollectionItemPageData` never set `language` at all**, so `page.language` is empty on every item page, in export as much as in preview. Step 17's media metadata reads exactly that, so translated alt text could never have reached an item page. An item page is a page; it answers the same way now.
- **Round two: the arity fix overcorrected.** Passing the real page number made `currentCanonicalPath` `blog/page/2.html`, and `ensureBreadcrumbs` matches pages by their FIRST copy's path — so a numbered preview found no page and rendered no trail. It asks for page one now, as export does; the numbered crumb comes from `paginationPlan.current`, not from this path.
- **`writeProjectsData` silently dropped `default_language` and `languages`** — the same full-replacement writer that lost the media translations in step 17. Only tests call it today, so nothing shipped was wrong, but a test seeding a translated project got a single-language one back. It carries both columns now.

### Step 19. `page.translations`, `<html lang>`, hreflang (§7, §7c, §7d) — *done 2026-09-18*

- `packages/builder-server/src/services/renderingService.js` (`buildRenderDeps`) — build `translations` for the page or item being rendered: one entry per *exportable* language (§7b), each with `language`, `hreflang`, `label`, `href` (relative, via `pageHref` / `itemHref`), `seoUrl` (absolute, via step 1's helper), `active`, `fallback`, `dir`. Attach as `page.translations`; empty array for single-language projects.
- `packages/render-engine/src/renderEngine.js` — `page.language` / `project.languages` / `project.defaultLanguage` in the base context.
- `packages/core/src/tags/SeoTag.js` — emit `<link rel="alternate" hreflang="…">` for every entry where `fallback` is false, plus the self-reference (the `active` entry) and `x-default` (default-language sibling, else default-language homepage); emit nothing when the project is single-language (§7d).
- `themes/arch/layout.liquid` — `<html lang="{{ page.language }}" dir="{{ page.dir }}">` (replaces the hardcoded `en`). `page.dir` is derived from `languageDir(page.language)`.

**Done when:** a two-language fixture renders a valid hreflang set with self-reference and `x-default`; a single-language fixture renders none; `<html lang>` matches the page.

**As built.** `buildTranslations` lives in `@widgetizer/core/translations` and answers for pages and items alike; the engine calls it once per render and caches it on `sharedGlobals` beside the breadcrumbs, so header, footer, layout and every widget see the same array. It reads what the render already has — `pagesByUuid`, `collectionItemsByUuid`, the language settings, `cleanUrls`, `outputPathPrefix` — so no new dep crosses the engine boundary.

- **A language publishes only if it has a homepage** (§7b), and that is decided from the pages already loaded rather than from a separate readiness check.
- **`href` and `seoUrl` really cannot be one field**, and a homepage proves it: `publicPath` deliberately collapses only the ROOT `index.html` (`el/index.html` could be a legacy item), so a translated homepage's address comes from `homeHref`, which knows it is one. A switcher link is depth-prefixed; the absolute form never is.
- **hreflang follows §7d exactly**: every entry that is not a fallback, plus the self-reference (the active entry is an ordinary entry, so it is simply included), plus `x-default` at the default language — the one place a fallback is legitimate. A set of one language emits nothing, so a single-language project is byte-identical.
- **`page.dir` ships from day one** even though everything v1 accepts is `ltr`, so adding an RTL language never changes a theme that already shipped. Arch's `<html>` reads both, and the same change went into `themes/arch/updates/0.9.10/` — a theme change lands in two places or existing projects stay on the old file.
- **Review, three.** (1) `collectionItemsByUuid` carried only where an item ended up — `slugPrefix`, `slug`, `language` — so matching a translation group found nothing and every language fell back to a homepage; it carries the identity now, and the item preview takes its uuid and group from the SAVED item rather than the synthetic `"preview"`. (2) `seoUrl` was built from the link helper, so with Clean URLs off a homepage's hreflang said `index.html` while its own canonical said `/`. It comes from `pageUrlAt` now — the same helper the canonical tag uses, because an hreflang that contradicts the canonical describes a page that says it lives somewhere else. (3) Changing the renderer's slug rule left the **editor picker** on the old one, so a Greek header rendered its Greek menu while the picker said `Main (en)`; the picker follows language-first, root-fallback too.
- **The item carried from step 15a is fixed here**: `loadMenuMaps`'s `bySlug` is now a map per language, and `resolveMenuSettings` takes the language being rendered. A uuid still names one menu anywhere; a bare **slug** means this language's menu of that name, and only falls back to the root when the language has none. That is what its comment always claimed.

### Step 20. Export per language (§7, §7a, §7b, forms) — *done 2026-09-18*

- `exportProjectToDir` in `exportController.js` — iterate the default language then each additional one; write pages to `contentAddress.pageOutputPath`, items to `itemOutputPath`, with depth from step 4. **A non-default language with no homepage is skipped and named in the export result** (`warnings: [{ code: "LANGUAGE_SKIPPED", language }]`) and surfaced as a prominent notice in the editor's export UI; a missing default homepage still throws as today.
- `seoArtifacts.js` — `buildSitemap` emits every exported language's pages and items with `xhtml:link` alternates from the same `translations` data; `buildRobotsTxt` Disallow paths include the language folder.
- `packages/builder-server/src/routes/export.js` — `resolveExportFile` already accepts nested paths; add an `exportView.test.js` case for `el/news/story` in both shapes.
- `packages/builder-server/src/services/formsManifestService.js` — form keys become language-qualified (`<lang>:<handleizedLabel>`), `page_path` comes from `contentAddress.publicPath`, so a copied-but-untranslated form never merges into the source stream and a partially translated one never fails the export (§Assumptions). `MAX_FORMS_PER_SITE` is counted per stream until hosted decides otherwise.

**Done when:** `collectionItemExport.test.js` and a new `multilangExport.test.js` verify the folder layout, the skipped-language warning, sitemap alternates and separate form streams; the single-language export diff against the pre-multilang fixture is empty except `<html lang>`/`dir`.

**As built.** Pages already wrote to `pageOutputPath` from step 7, so this step is the rest of what "export a language" means.

- **An enabled language is not an exportable one** (§7b). A non-default language with no homepage is dropped whole and named in the export result (`warnings: [{ code: "LANGUAGE_SKIPPED", language }]`), which the editor shows above the structured-data notice; the default language still fails the whole export, because skipping it would publish a site with no `/`. The export publishes the languages the PROJECT has enabled — a folder on disk for a language nobody enabled is stale content, not a language.
- **Chrome, items and forms were all still root-only.** A translated page wore the English header; items were written once at `news/<slug>.html` whatever their language; every language's forms merged into one stream. Now each exported language has its own globals, its own item pass under its own folder, and its own form keys (`el:contact`, `page_path` at the page's real address) — a copied form collects that language's submissions, and merging them would mix the streams or fail the export the moment a translated field drifted.
- **Sitemap and robots describe every published language.** Alternates come from step 19's `translations`, by the same §7d rules as the hreflang tags, and the `xhtml` namespace is declared only when something uses it — so a single-language sitemap is byte-identical to the one before languages. A paginated copy is its own URL but not its own translation: page 2 of the Greek blog is not the alternate of page 2 of the English one. Robots blocks a page at the address it is published under, language folder included; a bare `/private` does not protect `/el/private`.
- **The fail-fast validation reads every exported language, not the default one.** An untranslated required field is a broken page whichever language it is in; validating only the root would have published the site with a silent hole in it. By the same token a collection is empty only when no exported language has an item — having a second language is not a reason to demand a `template.liquid` nothing would render.
- **A page's canonical is the address it was written to.** Both remaining hand-built addresses now go through `publishedUrls.js` — `pageUrlAt` carries `page.language` (which also fixes the `rel=prev`/`rel=next` pair on numbered copies) and a new `itemUrlAt` gives the item pages theirs. A translated page that canonicalized to the root address was telling crawlers to index the English page, or nothing, instead of itself; an explicit `canonical_url` still wins over both.
- `pageCounts` is keyed by the language-qualified path of page one, the key the plans already use, so two languages of one slug keep their own totals.

### Step 21. Collections render per language (§9) — *done 2026-09-18*

- The `| collection` filter (registered in `renderWidget`, `renderEngine.js`) filters items to the rendering page's language; the shell's loader in `renderingService.js` lists per language.
- `renderCollectionItemPage` receives `translations` (step 19) so the switcher works on item pages.
- Listing links and item links follow §8's output order (`/el/news/story`).

**Done when:** `collectionFilter.test.js` and `renderCollectionItemPage.test.js` run under `el` and show only Greek items on a Greek page.

**As built.** The renderer already knew the language of the page it was drawing (`page.language`, in scope since step 7); the collection reader simply was not being told. `makeCollectionItemsLoaderFactory` now reads `globals.currentPageData?.language` and passes it to `reader.sorted` / `reader.read`, with the language in the per-render cache key.

- **No fallback.** A collection with no items in a language lists nothing there, rather than the default language's items under translated page furniture — the same rule §7b applies to pages.
- **The pager counts what the listing draws.** `countCollectionItems` and `planPagination` take the language too. Two languages of one slug can paginate over different totals, which is the whole point of keying the plans by output path in step 20.
- **Every pager URL comes off the plan, so the plan carries the language.** `planPagination` stamps `language` + `defaultLanguage` on it and `buildPaginationContext` passes both to `pagedHref` — otherwise page two of a Greek listing walks the reader out of the Greek site. A listed item's bare menu slug resolves in the listing's language too, the same rule step 19 gave the rest of the render.
- **A morph resolves its own address.** The editor sends a bare slug, so `renderSingleWidget` rebuilds `currentCanonicalPath` from the page it was given (`pageOutputPath(slug, 1, lang)`) and derives the listing's page slug from `page.slug` rather than from that path — the "no slash" test there exists to exclude ITEM pages, and a language folder was making every translated page look like one. Without this a morphed header on a Greek page drew the trail, and the active state, of whatever sat at that slug in the default language.

---

## Phase 5 — Theme, dates, migration, docs

### Step 22. Arch: switcher and no hardcoded site-facing copy (§7, §Phase Boundaries) — *done 2026-09-19*

- `themes/arch/widgets/global/header/schema.json` + `widget.liquid` — a "Language switcher" setting rendering `page.translations` (labels are native names; `aria-current` on the active entry). Hidden when the array is empty.
- `themes/arch/layout.liquid` — the skip link's text moves into per-language header content or a header setting; the link itself stays. Document the rule in the theme-authoring docs: themes never hardcode visitor-facing strings.

**As built.** `snippets/language-switcher.liquid` renders the entries; the header calls it twice, once inside the navigation panel for small screens and once in the bar for wide ones, and `landmark: false` drops the `<nav>` on the nested copy so a page never has two landmarks with the same name. `{% render %}` gets no parent scope, so `page.translations` is passed in — the reason the first attempt rendered nothing.

- **The skip link moved into the header widget**, because its text has to be per language and the layout has no settings of its own to read. It is still the first thing in the body: the header is the first thing the layout renders.
- **The header's own strings became settings too** — `skip_link_text`, `nav_label`, `menu_title`, `menu_close_label`, `language_switcher_label` — each with its English wording as the default, so nothing changes for a site that never touches them. The toggle button now reads `aria-label="{{ menu_title }}"` with its existing `aria-expanded`, which is the disclosure pattern and says the same thing in fewer strings.
- **The rest of the theme still hardcodes about sixty visitor-facing strings** — carousel `Previous`/`Next`, `Pagination`, audio-player controls, and so on (brand names like `Facebook` are not translatable and do not count). Settings do not scale to that, so it wants a mechanism rather than more settings; recorded as its own tracker item.
- **A missing snippet takes the whole header down**, not just the switcher. `cleanUrlsExport.test.js` copied only `widget.liquid` and `schema.json` out of Arch and started failing for that reason; it now copies `snippets/` too. The update folder ships the snippet, so an existing project applying the update gets both.

**Done when:** `archLanguageSwitcher.test.js` drives the real Arch header through an export and pins the §7c contract: every published language by its native name at that page's address, the active one marked, a fallback to a language's homepage, nothing at all on a single-language site, and the labels reading whatever the settings say.

### Step 23. Localized month names (§Localized month names) — *done 2026-09-19*

- `packages/core/src/utils/dateFormat.js` — replace `MONTHS_SHORT` / `MONTHS_FULL` lookups with `Intl.DateTimeFormat(locale, { month, timeZone: "UTC" })`, keeping the `YYYY-MM-DD` split so no local `Date` is constructed. Format tokens and the app-level `dateFormat` setting are unchanged — only the month's language moves.
- `packages/core/src/filters/dateFilter.js` — pass `page.language` as the locale.

**Done when:** the date-format tests run for `en` and `el` and the numeric parts of every format are byte-identical to today.

**As built.** `formatDateOnly(value, format, locale)` takes a third argument, defaulting to `en`. Only the MONTH comes from `Intl`; the day, year and separators are still assembled by hand, so which format a site uses never changes with its language — that is the site owner's choice, and `MM/DD/YYYY` stays `03/04/2026` in every language.

- **Greek needs the genitive in a date** — `4 Μαρτίου`, not the standalone `Μάρτιος`. Asking `Intl` for `{ month }` already gives the in-a-date form, so nothing extra was needed; the test guards it in case a future change reaches for a standalone API.
- **The timezone-safe contract survives.** The value is still split as a string, and the formatter is given a UTC date at day 15 — far from any month boundary, so no calendar or rounding can land it on a neighbour.
- **The editor stays English**, because its caller passes no locale. The filter passes `page.language`.
- `MMMM D, YYYY` in Greek reads `Μαρτίου 4, 2026`, which is an English order with a Greek month. That is correct by the design's rule: a Greek site picks `D MMMM YYYY`, and localizing must not silently re-order a format the owner chose.

### Step 24. Upgrade path for existing projects — *verified 2026-09-19, nothing to build*

- Nothing moves on disk: root content *is* the default language (§1a-i). Migration v6 sets `en` / `[]`. Usage ids were rebuilt in step 2. Group ids default to the page uuid (step 7). Existing exports are unaffected until a second language is added.

**As verified.** The claim was measured rather than argued: a worktree at `269ea9ec` — the last commit before multilang began — exported an ordinary single-language project, HEAD exported the same one, and the two bundles were compared file by file. Nine files each, and the ONLY difference in any of them was `manifest.json`'s own timestamp. Every page, the sitemap and robots are byte-identical.

Checked alongside it, against the real `data/` on this machine:

- Every project row carries `default_language = 'en'` and `languages = '[]'`; none is missing them.
- No content moved: the only language folder under any project's `pages/` belongs to the two-language test project.
- A single-language export has no `hreflang`, no `dir` and no language folder, and its `<html>` has no `lang` — because step 19's layout reaches a project only when it takes the theme update. So even the one deliberate change waits for that.

**A first attempt that did not work, recorded so nobody repeats it.** Re-exporting real projects whose content had not changed since their last export, and diffing against those older bundles, proves nothing: every pre-multilang export also predates breadcrumbs, pagination and structured data, so the differences are dominated by stages that are not this one. Isolating multilang needs the two-checkout comparison above.

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

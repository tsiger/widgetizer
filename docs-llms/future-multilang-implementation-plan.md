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

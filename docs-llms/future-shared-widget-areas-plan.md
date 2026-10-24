# Shared widget areas — build plan for the first version

**Status: built on the 1.0.0 branch (all eight steps), not yet released.** Scope agreed on 2026-10-22 (owner, Claude, Codex). The idea and its open questions are in [future-shared-widget-areas.md](future-shared-widget-areas.md). GitHub: [#163](https://github.com/tsiger/widgetizer/issues/163), milestone OSS - 1.0.0.

## What the first version is

Arch gets one area, **Before footer**. The owner fills it with ordinary widgets, per language, and it shows on every page. Everything that already handles page content handles it too: save, autosave, undo, preview, export, links, media, languages, duplicate, backups, theme updates. The code is generic from the start, so a second area is a theme change, not an app change.

Out of this version: After header (transparent-header interaction), moving widgets between page and area (copy/paste covers it), a recovery screen for areas a theme removed, conflict warnings for two windows (areas are last-save-wins, like header and footer), and forms in areas: the Core Form widget cannot be added to an area in this version (hidden from the area's widget picker, refused on paste and by the area save), because export's forms list reads only pages.

## Decisions

- **Declaration.** `theme.json` gets `"sharedAreas": [{ "id": "before_footer", "label": "tTheme:areas.before_footer" }]`. The id is the lasting identity (`^[a-z][a-z0-9_]*$`); the label can change without disconnecting content. The order of the list is the order in the editor.
- **Placement.** The layout writes `{{ shared_areas.before_footer | raw }}`. Liquid decides where; the declaration decides what exists. An empty area renders as an empty string.
- **Storage.** `pages/global/areas/<id>.json`, and `pages/<lang>/global/areas/<id>.json` for other languages: `{ "widgets": {}, "widgetsOrder": [] }`. Not a page: no slug, SEO, uuid or URL. A missing file is an empty area; an unreadable one is an error, never treated as empty and never overwritten.
- **Header and footer stay as they are.** Areas sit beside them; nothing is migrated.
- **Widget ids are unique across page and areas** (they already are `widget_<uuid>`), so the editor finds a widget's owner by its id. Copy/paste and duplicate already make new ids.
- **`widget.index` stays page-only.** Area widgets get `index: null`, so an area section never becomes the page's H1 or its priority image. They also get `widget.area` (the area id).
- **Collection widgets are allowed; their page roles are not.** `listing_anchor` and `paginate` are hidden for area widgets in the editor, cleared on paste into an area, and refused by the area save.
- **No forms in areas yet.** `core-form` is left out of an area's widget picker, dropped with a notice on paste into an area, and refused by the area save and by the theme checker in area starting content. Lifting this means adding areas to `buildFormsManifest` (`formsManifestService.js`).
- **Limits.** An area has its own widget ceiling (the existing per-page maximum, applied to the area alone). Block limits and setting checks are the same as on pages.
- **Removed areas.** A saved area the theme no longer declares keeps its file. The editor lists it as "Not shown by this theme" (read-only, no recovery controls yet). It still counts for links, media usage, languages and backups. Declaring the same id again reconnects it.
- **Starting content.** `templates/global/areas/<id>.json` in the theme, overridable per preset. Today project creation, theme updates and `preset-sync.js` treat every template that is not header/footer as a page (uuid, slug, timestamps), so area files need their own branch there. Adding a language copies the default language's area, like header/footer. A theme update adds the file only where none exists, so an area the owner emptied stays empty.

## Steps

Each step ends with its tests passing and is reviewable on its own. Codex reviews after steps 3, 6 and 8. Media usage comes with the save (step 2) and the area traversal for links comes before the lifecycle work (step 5 before step 6), so each step can finish with its tests passing.

### 1. Core contract

- `packages/core/src/utils/sharedAreas.js` (new, exported): `readAreaDeclarations(themeJson)` returns valid `{ id, label }` entries and the problems found; `AREA_ID_RE`.
- `contentAddress.js`: `areasDir(lang)`, `areaKey(id, lang)`, a `KEY_SHAPES` entry so `parseContentKey` recognises area files, `usageId.area(id, lang)` → `area:<root|lang>:<id>`.
- Tests: declarations (valid, duplicate id, bad id, missing label), keys round-trip through `parseContentKey`.

### 2. Server: read and save

- `builder-server/src/services/sharedAreaService.js` (new), scope-first through the storage adapter: `readArea(storage, scope, id, lang)` (missing → empty, unreadable → throws), `listAreas(storage, scope, lang)` (declared areas with their content, plus retained ones).
- `projectContentFs.js`: `readAreasFromDir(projectDir, lang)` for render and export, alongside `readGlobalWidgetFromDir`.
- Routes (new `routes/sharedAreas.js`, registered in `setupBuilderServer.js`): `GET /api/shared-areas?language=` returns `{ declared: [{ id, label, shown: true }], retained: [{ id }], areas: { <id>: { widgets, widgetsOrder } } }`; `PUT /api/shared-areas/:id` saves one area.
- The save mirrors `persistPageInSection`: inside `withContentWriteLock`, `assertLanguageStillEnabled`, `assertIntroducedMediaExists` against the previous file, the widget ceiling, refusal of `listing_anchor`/`paginate`, `storage.write(areaKey(...))`, then media usage (a usage failure is a warning, as for pages). Only an area the theme declares can be saved (a retained one stays as it is until the theme shows it again), and a `core-form` widget is refused.
- `mediaUsageService.js`: `extractMediaPathsFromArea`, `updateAreaMediaUsage`, `removeAreaFromMediaUsage`, and areas in `refreshAllMediaUsageFromDir`. `editor-ui/src/utils/mediaUsageDisplay.js`: `area:<root|lang>:<id>` reads as "Before footer (Shared area, Ελληνικά)", like the header's "(Global, Ελληνικά)".
- Tests (`sharedAreas.test.js`): round-trip, missing vs unreadable, refused roles and forms, ceiling, removed language, introduced missing media, retained area listed, an image used only in an area counts as in use and survives a usage refresh.

### 3. Rendering

- `render-engine/src/renderEngine.js`: `renderSharedAreas(deps, areasById, themeSettings, renderMode, sharedGlobals)`, exported from the package and wrapped in `builder-server/src/services/renderingService.js` like the other render functions, renders each area's widgets in order through `renderWidget` with `index: null` and `area`, returning `{ <id>: html }`. `renderPageLayout` adds `shared_areas` to the layout context. `renderCollectionItemPage` takes `areasData` beside `headerData`/`footerData` and renders the areas after the item context exists, so breadcrumbs and translations are the item's.
- Area widgets render with `data-widget-id` as today plus `data-area="<id>"`, which the editor preview uses for selection.
- Every page-level caller passes areas: `previewController.generatePreviewHtml` (from the request body, so unsaved edits show; the editor's `PreviewPanel.jsx` and the standalone `app/src/pages/PagePreview.jsx` both send `sharedAreas` beside `globalWidgets`), `previewController.createCollectionPreviewToken` (from disk, like its header/footer), and `exportController.exportProjectToDir`: areas join the per-language snapshot beside `globalsFor`, are rendered fresh for each page (normal, numbered and item pages) so active menu items and relative links are right, and their enqueued assets flow into the page like any widget's.
- `renderSingleWidget`: an area widget gets `index: null`.
- Tests: an area renders on a normal page, a numbered page, an item page and a translated page; empty area renders nothing; an area-only widget's script is enqueued; `widget.index` is null.

### 4. Arch

- `theme.json`: declare `before_footer`, label in Arch's locale files.
- `layout.liquid`: `{{ shared_areas.before_footer | raw }}` between `</main>` and the footer.
- No starting content in the base theme (the area starts empty). Optionally one preset gets starting content to exercise the path.
- `scripts/validate-theme.js`: check declarations, warn when a declared area is never placed in `layout.liquid` or the layout names an undeclared one, validate `templates/global/areas/*.json` (and preset copies) like a starter page's widgets, refusing `listing_anchor`/`paginate`. Skill reference + `node scripts/build-theme-skill-contract.js`.
- The Arch version bump and its `updates/<version>/` folder come with the release, not here.

### 5. Links

- `linkEnrichment.js`: one area traversal for the filesystem and storage paths (all languages, retained areas included), used wherever `updateGlobalWidgets` / `updateGlobalWidgetsViaStorage` are: delete cleanup of pages, items and menus, language removal, new-project enrichment, duplicate remap, item link remap, seeded richtext enrichment, theme-update additions.
- Tests: deleting a linked page, item or menu clears the reference in an area in every language, retained areas included.

### 6. Project lifecycle

- **Create**: `scaffoldProjectContent` (through `processTemplatesRecursive`) copies `templates/global/areas/` as area files, not pages: no uuid, slug or timestamps. `enrichNewProjectReferences` stamps their links. Same branch in `preset-sync.js` `syncTemplatesToProject`.
- **Languages** (`languageService.js`): `seedGlobals` also copies each area into the new language, remapping menu ids through each widget's own schema; `assertSeedIsSafe` checks the area files it will copy; `removeLanguage` deletes the language's areas (references and usage included); `restoreUsageOfSurvivors` covers areas.
- **Duplicate / backup / import**: files travel with the folder already; `remapDuplicatedProjectUuids` and the import usage rebuild need the area traversal from step 6.
- **Theme update** (`themeUpdateService.applyThemeUpdateToDir`): add an area's starting file only where the project has none, as an area file rather than a page, and seed it into the project's other languages too (with menu remapping, as when adding a language); `enrichThemeUpdateAdditions` covers added area files.
- Tests: create with starting content, add/remove language, duplicate, backup round-trip, theme update keeps an emptied area empty.

### 7. Editor

- **State** (`pageStore.js`): `sharedAreas` and `originalSharedAreas`, loaded in `loadPage` for the page's language, included in the temporal snapshot so undo covers them; `declaredAreas` / `retainedAreas` for display.
- **Actions** (`widgetStore.js`): resolve a widget's owner by id (page or an area) inside the existing actions, so add, duplicate, copy, paste, delete, reorder, settings and blocks work unchanged for area widgets. `addWidget` / `pasteWidget` take an optional area id. Paste into an area clears `listing_anchor`/`paginate`.
- **List** (`WidgetList.jsx`): a group per declared area after the page widgets, labelled with the area name and "Shared · <language>", collapsible, with Add widget when empty; retained areas as a read-only "Not shown by this theme" group. Reordering stays within one owner.
- **Selection** (`PageEditor.jsx`): the selected widget and its schema come from the same owner-aware lookup, not only `page.widgets[selectedWidgetId]`, so an area widget opens its settings.
- **Settings** (`SettingsPanel.jsx`): the listing controls are hidden for area widgets.
- **Picker** (`WidgetSelector.jsx`): adding to an area leaves out `core-form`; pasting one into an area is refused with a notice.
- **Save** (`saveStore.js`): dirty check per area against its baseline, save only dirty areas, rebaseline each area from the snapshot it sent when its own save succeeds (a failed area stays dirty; edits made during the save stay dirty). Autosave, leave-page protection and undo-after-save follow from the dirty check.
- **Preview** (`PreviewPanel.jsx`, `previewManager.js`): send `sharedAreas` with the page for preview tokens; a structural change in an area (add, remove, reorder) refreshes the preview; a settings change re-renders that widget as today. `SelectionOverlay.jsx` / `previewRuntime.js`: a click inside `[data-area]` selects that widget in its area.
- Tests: area edit marks dirty and saves only that area; partial failure keeps the failed area dirty; undo after save; paste into area clears listing roles; delete key in an area.

### 8. Docs and checks

- Domain docs: a shared-area entity page, plus the header/footer, editing, languages, output and themes pages. `theming.md` / `theming-widgets.md` for authors; the theme skill reference.
- `user-test-checklist.md`: a Shared areas section (add, edit, translate, link, image, export, numbered and item pages, duplicate, backup, theme update with an emptied area).
- `future-shared-widget-areas.md`: mark the first version as built and keep the open questions.

## Test journeys before calling it done

Edit a shared image and link on one page and see it on another; switch language; undo after saving; export and open an article and page 2 of a split listing; delete the linked page; duplicate the project and restore a backup; apply a theme update after emptying the area.

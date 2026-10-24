# Shared areas

[Map](../README.md) · [Header and footer](global-widget.md) · [Widgets](widget.md) · [Language lifecycle](../operations/languages.md)

## Plain-language guide

### What is a shared area?

A shared area is a named place in the page layout, such as **Before footer**, that the theme provides and the site owner fills with ordinary widgets. Whatever is in it shows on every page of that language, in the same spot. Arch has one area, Before footer, between the page content and the footer.

It is not a page and has no address of its own. It is a list of widgets that every page borrows.

### What can you do?

In the page editor, each area appears below the page's own widgets, marked as shared. You can add, edit, duplicate, reorder and delete widgets in it, with their blocks and settings, exactly as on a page. Copy and paste works between the page and an area in both directions; a pasted widget is an independent copy.

Two things are not available in an area:

- **Forms.** The form widget cannot be added or pasted into an area yet.
- **"Main X page" and "Split into pages".** Both belong to one page, so a listing widget in an area shows neither option. A latest-news list in an area is fine; it just cannot be the collection's main listing or be split into pages.

### How far do changes reach?

Saving an area change affects every page in that language. English and Greek have separate areas: adding a language starts it with a copy of the default language's area (menus pointed at that language's copies), and after that each is edited on its own.

Deleting a page never deletes an area. When a linked page, item or menu is deleted, links in areas are cleared the same way as on pages, in every language.

### When are changes saved?

With the page: Save and autosave include a changed area, undo covers it, and leaving with an unsaved area change asks first. If an area saved but something else in the same save failed, the area stays saved and the rest stays unsaved.

If two windows edit the same area, the last save wins, as for the header and footer.

### When a theme stops showing an area

The content is kept. The editor lists it as "not shown by this theme", its images stay protected from deletion, its links stay maintained, and backups carry it. If the theme brings the area back under the same id, the content shows again.

## Technical details

| Concern | Current behavior |
| --- | --- |
| Declaration | `theme.json` `sharedAreas: [{ id, label }]`; `id` matches `^[a-z][a-z0-9_]*$` and is the lasting identity, `label` may change |
| Placement | `{{ shared_areas.<id> \| raw }}` in `layout.liquid`; an area the layout does not print never shows |
| Default storage | `pages/global/areas/<id>.json` |
| Additional-language storage | `pages/<code>/global/areas/<id>.json` |
| Shape | `{ widgets, widgetsOrder }`, like a page's widgets; no slug, uuid or SEO |
| Missing file | An empty area |
| Unreadable file | Reported as an error; never treated as empty or overwritten; left out of rendering |
| API | `GET /api/shared-areas?language=` (declared, retained, content); `PUT /api/shared-areas/:id?language=` saves one declared area |
| Save checks | Language still enabled, no newly introduced missing media, the per-page widget ceiling applied to the area alone, no `core-form`, no `listing_anchor`/`paginate` set |
| Rendering | Each widget renders with `widget.index` null (never the page's first section) and `widget.area` set; area widgets see the current page's context (menus, breadcrumbs, translations, link depth) |
| Preview | The editor sends unsaved areas with the page; other previews use the saved ones. Preview mode wraps each area in `<div data-shared-area="<id>" style="display: contents">` so the editor can find it; published output has no wrapper and an empty area prints nothing |
| Export | Areas are read once per language for the whole build and rendered per page, including numbered pages and item pages |
| Media usage | Source `area:root:<id>` or `area:<code>:<id>`; retained areas are scanned too |
| Starting content | `templates/global/areas/<id>.json` in the theme or a preset (a preset's own file wins); copied on project creation; a theme update adds it only to languages that have no file for that area |

Forms in areas are blocked because export's forms list reads page content only.

Implementation: [sharedAreas (core)](../../../packages/core/src/utils/sharedAreas.js), [sharedAreaService](../../../packages/builder-server/src/services/sharedAreaService.js), [sharedAreaController](../../../packages/builder-server/src/controllers/sharedAreaController.js), [renderEngine](../../../packages/render-engine/src/renderEngine.js) (`renderSharedAreas`), [linkEnrichment](../../../packages/builder-server/src/utils/linkEnrichment.js), [languageService](../../../packages/builder-server/src/services/languageService.js), [widgetStore](../../../packages/editor-ui/src/stores/widgetStore.js), [saveStore](../../../packages/editor-ui/src/stores/saveStore.js).

Tests: [sharedAreas](../../../packages/builder-server/src/tests/sharedAreas.test.js), [sharedAreasRender](../../../packages/builder-server/src/tests/sharedAreasRender.test.js), [sharedAreasLifecycle](../../../packages/builder-server/src/tests/sharedAreasLifecycle.test.js), [editor stores](../../../packages/editor-ui/src/stores/__tests__/sharedAreas.test.js).

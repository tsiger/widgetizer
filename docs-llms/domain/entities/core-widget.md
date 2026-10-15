# Built-in widgets

[Map](../README.md) · [Widget](widget.md) · [Forms](form.md) · [Core widgets reference](../../core-widgets.md)

## Plain-language guide

### What comes with Widgetizer?

Widgetizer supplies three built-in widgets alongside the sections supplied by a theme. A theme can choose to hide this built-in catalog.

| Widget | What you can change | What it owns |
| --- | --- | --- |
| Spacer | Desktop height, mobile height, and whether it appears on mobile | Space within its page version; no blocks |
| Divider | Line color, thickness, width, and surrounding padding | A visual separator within its page version; no blocks |
| Form | Heading, form name, button text, appearance, fields and optional sidebar | Page-owned settings and blocks; [export and identity rules](form.md) also apply |

Add, duplicate, copy, reorder, delete and save these like other page widgets. Editing a Greek spacer does not change the English page. Deleting a form widget removes that section from the next saved build; it does not manage submissions already received by a hosting service.

### Where do their designs come from?

Their definitions ship with the app, while theme sections come from the project's installed theme. An app update can therefore change built-in widget behavior independently of a theme update. They still render inside the theme's page layout.

## Technical details

The complete built-in inventory at `30304f3a` is `core-spacer`, `core-divider`, and `core-form`, under [core widget definitions](../../../packages/core/src/widgets/). They are widget subtypes, not separate storage resources: each instance lives in its page's `widgets` map and `widgetsOrder`.

- `GET /api/widgets` merges core and project-theme schemas. `theme.json` with `useCoreWidgets: false` excludes core definitions from the catalog; absent/true includes them. This does not delete existing instances.
- Core schemas carry `isCore: true`; core editor labels come from the shared core widget locales. Themes can supply additional widget definitions, but cannot override a `core-` template by adding a same-named theme folder.
- Rendering checks the `core-` prefix first and reads from `deps.coreWidgetsDir`; globals use the project's `widgets/global/`, and other widgets use the project's `widgets/`. The catalog opt-out is not a render-time deletion/migration policy.
- Core definitions are app resources outside project-scoped storage. Instance content still follows ordinary project/language ownership and save rules.
- Built-in visitor text now comes from the core locales' `site` dictionary, with English/Greek supplied independently of a theme. Theme values override core in the same language; English fills untranslated keys. Spacer and Divider emit no visitor text. Shipped in `22a93fa5`; see [form localization](form.md#languages-and-current-boundaries).

Implementation: [coreWidgetsController](../../../packages/builder-server/src/controllers/coreWidgetsController.js), [project widget catalog](../../../packages/builder-server/src/controllers/projectController.js), [render engine](../../../packages/render-engine/src/renderEngine.js).

Tests: [coreWidgets](../../../packages/builder-server/src/tests/coreWidgets.test.js), [widgets](../../../packages/builder-server/src/tests/widgets.test.js), [widgetStore](../../../packages/editor-ui/src/stores/__tests__/widgetStore.test.js). These cover catalog/render/editor paths, not every visual combination with every theme.

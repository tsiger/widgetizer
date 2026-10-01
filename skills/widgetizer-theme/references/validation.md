# Validation and evidence

## What validity means

Treat these as separate claims:

1. **Package accepted:** archive/manifest/version/collection checks pass.
2. **Render contract satisfied:** schemas, Liquid, defaults, assets, and links render correctly.
3. **Editor integration verified:** settings, selection, blocks, duplication, replacement, and interactive behavior work.
4. **Export verified:** real output includes the necessary files and works at its output depths.
5. **Update compatibility verified:** an existing customized project survives the intended update.

A theme may satisfy the first and fail every later claim. Report actual evidence and remaining checks. A screenshot alone does not verify links, editing, or export.

## Static review for every affected surface

- Parse changed JSON and match widget/block/setting IDs, types, value shapes, and order arrays. Check every referenced widget/snippet/asset exists with matching filename case.
- Check source definitions are separate from runtime page/item data; no stale sample project UUIDs or user-specific values.
- Confirm required archive paths and numeric theme version. Check screenshot content/dimensions independently of the importer.
- Check widget targeting attributes and block/setting scopes. Confirm all supported setting options have corresponding rendering behavior.
- Compare asset basenames across widgets and shared assets; ensure widget CSS/JS is enqueued and static binaries are in an exportable location.
- Review `raw` uses, plain URL output, rich-text handling, and missing/empty/default cases. Do not use render sanitization as a substitute for correct source values.
- Check translations and source examples using the relevant locale validation plus manual coverage of dynamic labels.
- For collections, validate definitions and the effective update snapshot, not just each individual delta; verify item templates, required fields, output prefixes, listing declarations, and pagination.
- For presets, check the chosen template/menu directories are complete because fallback is directory-level. Match image references with manifest entries and actual binaries/variants.

## Exercise behavior in an isolated target

For a new theme, use a disposable project and a clean install of the package. For a narrow change, test the affected feature plus any output/lifecycle boundary it crosses.

| Surface | Useful exercise |
| --- | --- |
| Defaults | Add the widget from the picker; render empty settings, cleared strings, false/zero, missing images, zero blocks, and long text. |
| Identity and interaction | Add two instances, duplicate one, reorder blocks/widgets, edit settings, select hidden blocks, delete and re-add. Confirm independent behavior and no stale handlers. |
| Content references | Select internal pages/items/menus, rename a target, and verify links remain correct. Test missing/deleted optional destinations. |
| Collections | Empty/list-only/item-page collections, item template, gallery/table fields, and enough items for pagination when supported. |
| Localization | Another page language, untranslated words, deliberately empty defaults, localized media text, and language-switch fallback. |
| Output depth | Homepage and inner page, nested collection item, translated page, and numbered pagination page as applicable; Clean URLs both ways when the theme builds links. |
| Export | Inspect actual output files and rendered HTML, then open/serve the export and check stylesheet/script/media requests and navigation. Preview success is insufficient. |
| Updates | Start from the old package, customize a setting/page/item/menu, apply the update, verify retained content and new defaults/definitions. |

Assess visible focus, semantic controls, accessible names, responsive overflow, and motion preferences for affected UI. These are authoring checks, not importer checks. If no running app/browser is available, do the possible static/render checks and name the unverified editor/export interactions.

## Existing repository checks

These commands apply when working in the Widgetizer repository with its dependencies installed. They are not prerequisites that every external theme consumer already has.

- `node scripts/validate-theme-locales.js <theme-id>`: selected theme and core locale checks. Inspect the reported theme source; see localization for limitations.
- `node --test packages/builder-server/src/tests/themes.test.js`: importer, library, preset-resolution, and locale-serving regression tests.
- `node --test packages/builder-server/src/tests/themeWidgets.test.js`: bundled Arch widgets; passing does **not** certify a new theme.
- `node --test packages/builder-server/src/tests/rendering.test.js`: core rendering/default/link behavior.
- `node --test packages/builder-server/src/tests/collectionService.test.js`: collection validation/data behavior.
- `node --test packages/builder-server/src/tests/themeUpdateApplyToDir.test.js`: update application contract.

Run checks relevant to the change, not every suite for every theme edit. Existing tests check implementation behavior; a new theme still needs its own rendered-artifact checks. Test helpers must keep their data under a disposable root; do not probe updates against a real project.

There is no single shipped command that certifies every theme schema, interaction, translation, and export. Do not invent `theme:validate` or imply that locale validation covers all those dimensions. The skill-format validator likewise verifies the skill's naming/frontmatter/scaffold shape, not Widgetizer theme correctness.

## Maintainer source map

Audit baseline: repository commit `6b010847644b7d9f2e116406afbf8f3e3ca5b997`, app version `0.9.10`, reviewed 2026-10-01. This records what was inspected, not a minimum-version declaration or promise of compatibility with every other release.

The working guidance lives in the bundled references. The links below are repository-maintainer evidence; external users should not need to fetch them to follow the skill. Permanent domain docs describe application behavior. Update the skill's concise authoring guidance when those contracts change, rather than copying whole manuals into the skill.

| Contract | Implementation | Related evidence/reference |
| --- | --- | --- |
| ZIP/manifest, effective source, preset selection | [themeController](../../../packages/builder-server/src/controllers/themeController.js), [semver parser](../../../packages/builder-server/src/utils/semver.js) | [theme tests](../../../packages/builder-server/src/tests/themes.test.js), [theme guide](../../../docs-llms/theming.md) |
| Project copy and source-to-page instantiation | [projectScaffold](../../../packages/builder-server/src/utils/projectScaffold.js), [templateHelpers](../../../packages/builder-server/src/utils/templateHelpers.js) | [theme domain](../../../docs-llms/domain/entities/theme.md) |
| Update preservation | [themeUpdateService](../../../packages/builder-server/src/services/themeUpdateService.js) | [update tests](../../../packages/builder-server/src/tests/themeUpdateApplyToDir.test.js), [update reference](../../../docs-llms/theme-updates.md) |
| Registered Liquid surface and context | [renderEngine](../../../packages/render-engine/src/renderEngine.js), [tags](../../../packages/core/src/tags), [filters](../../../packages/core/src/filters) | [rendering tests](../../../packages/builder-server/src/tests/rendering.test.js), [item rendering tests](../../../packages/builder-server/src/tests/renderCollectionItemPage.test.js) |
| Settings and widgets | [supported types](../../../packages/core/src/config/settingTypes.js), [SettingsRenderer](../../../packages/editor-ui/src/components/settings/SettingsRenderer.jsx), [widget defaults](../../../packages/editor-ui/src/stores/widgetStoreHelpers.js) | [field reference](../../../docs-llms/theming-setting-types.md), [widget guide](../../../docs-llms/theming-widgets.md) |
| Editor targeting and lifecycle | [previewRuntime](../../../packages/core/src/runtime/previewRuntime.js) | [Arch widget tests](../../../packages/builder-server/src/tests/themeWidgets.test.js) |
| Asset origin, queuing, export | [assetUrl](../../../packages/core/src/utils/assetUrl.js), [exportController](../../../packages/builder-server/src/controllers/exportController.js) | [tag path tests](../../../packages/core/src/tags/__tests__/pathPrefixing.test.js), [export reference](../../../docs-llms/core-export.md) |
| Collections and structured data | [collectionService](../../../packages/builder-server/src/services/collectionService.js), [mapping validation](../../../packages/core/src/structuredData/collectionTypes.js) | [collection tests](../../../packages/builder-server/src/tests/collectionService.test.js), [collection reference](../../../docs-llms/core-collections.md) |
| Starter images/items | [projectController](../../../packages/builder-server/src/controllers/projectController.js) | [media seeding tests](../../../packages/builder-server/src/tests/presetMediaSeeding.test.js), [item seeding tests](../../../packages/builder-server/src/tests/collectionPresetSeeding.test.js) |
| Visitor strings, defaults, languages | [siteStringsService](../../../packages/builder-server/src/services/siteStringsService.js), [t filter](../../../packages/core/src/filters/siteStringFilter.js) | [site-string tests](../../../packages/builder-server/src/tests/siteStrings.test.js), [locale validator](../../../scripts/validate-theme-locales.js), [language domain](../../../docs-llms/domain/multilingual.md) |

## Known limits to retain in the guidance

- Import checks do not validate all widget schemas, screenshots, Liquid output, locale coverage, or item-template existence.
- Locale checking requires an English file and group labels but does not check every dynamic string, placeholder, or translated leaf type.
- Widget settings/block data do not have complete save-time schema validation. `maxBlocks` is an editor limit.
- Asset queues and exported widget basenames can collide; origin inside an isolated snippet differs from a widget's top-level template.
- Gallery/table fields are supported; Arch's choice to use repeated image blocks is not a platform prohibition.
- Plain theme CSS/classes, default preset IDs, standard block types, and reveal effects from Arch are design conventions.
- The core menu snippet currently emits three nesting levels. Backend acceptance of deeper data is not evidence that a particular theme renders it.
- Theme updates preserve authored data but do not supply arbitrary theme switching, schema migrations, or content translation.

Keep unresolved or newly discovered runtime defects separate from authoring requirements. Describe the current limitation and test it; do not silently change application code during a theme-only task.

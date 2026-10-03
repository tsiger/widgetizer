# Validation

## What validity means

Treat these as separate claims:

1. **Rules followed:** the validator reports no errors.
2. **Package accepted:** the app imports the theme (archive, manifest, version and collection checks pass).
3. **Renders correctly:** schemas, Liquid, defaults, assets and links produce the intended page.
4. **Works in the editor:** settings, selection, blocks, duplication, replacement and interactive behavior work.
5. **Exports correctly:** the real output includes the necessary files and works at its output depths.
6. **Updates safely:** an existing customized project survives the intended update.

A theme may satisfy the first two and fail every later claim. Report which of these you actually checked. A screenshot alone does not verify links, editing or export.

## Run the validator

```
npm run validate:theme -- <theme-folder>
```

Run from a Widgetizer source checkout with its dependencies installed (Node >=20.19.5). The theme path can be absolute or relative to that checkout. Add `--json` for machine-readable output, or `--strict` to make warnings fail too. Exit codes are 0 for no errors, 1 for findings that fail the check, and 2 for invalid command usage. No running web server is needed, and the checker does not modify the theme or create a project.

Each finding names the file, severity, rule and explanation. Review findings against the intended behavior; reproduce suspected checker defects instead of changing theme or app rules blindly. The skill's contract file is an authoring reference. Validation reads the current app source, uses the same configured LiquidJS engine with strict filter checking, and reuses the app's collection-schema validation.

What it checks:

- **Package:** required files and folders, JSON object shapes, manifest fields and numeric version, PNG header/dimensions (1280 x 720 for the theme, 1024 x 1024 for presets), warnings for build tooling inside the theme. Image content and screenshot accuracy require visual inspection.
- **Settings everywhere** (theme, widgets, blocks, collections): only real setting types and properties, unique ids, labels, option lists, and defaults whose shape matches the type, including font stacks and weights from the font catalog and icon names from `icons.json`.
- **Reserved names:** settings the app reads from one specific group (`favicon`, `date_format`, custom code, font pickers) are in that group.
- **Liquid:** LiquidJS parses the templates, including nested blocks and `{% liquid %}`, and rejects unknown tags/filters. Additional checks cover custom argument names, required arguments, literal snippets/assets, and foreign objects that were not assigned locally. Author-defined local variables are valid.
- **Settings used in templates:** direct `widget.settings.x` and `theme.group.x` references, including literal bracket keys, are compared with the theme's own definitions. Direct plain-text output through `raw` is flagged; rich text without `raw` receives a warning.
- **Editor contract:** `data-widget-id`, block order and `data-block-id`.
- **Layout:** main content, header and footer, asset hooks, and the tags that theme settings depend on.
- **Assets:** enqueued files exist, and no two CSS/JS files share a name across widgets and `assets/`.
- **Starter pages and menus:** page shape, every widget and block type exists, every stored setting is declared and has the right shape, order arrays match, internal links and menu ids point at something.
- **Locales:** schema `tTheme:` labels, group names, literal `t` keys and default-key references are checked against English, including core visitor strings.
- **Collections and presets:** the app's collection-schema rules, item-template presence, preset overrides and starter widget/block data. Core widget values use their complete app schemas.
- **Updates:** version folder and manifest checks. These do not certify an assembled update or preservation of existing project content.

The checker does not render or export the supplied theme. Computed setting keys, aliases whose values depend on runtime data, dynamic snippet/translation names, preset image binaries, assembled updates, browser behavior, accessibility and visual quality need additional checks. A successful run is a static-check result, not certification of every theme behavior.

If a source checkout is unavailable, use the manual review below and report automated validation as pending. There is currently no standalone validator in the distributed skill or validation button in the desktop app.

## Checking by hand

Use this when the app checker is unavailable, and for what it cannot see. Manual review is not equivalent to an automated pass.

- Parse changed JSON and match widget/block/setting IDs, types, value shapes and order arrays. Check every referenced widget, snippet and asset exists with matching filename case.
- Check source definitions are separate from runtime page/item data; no sample-project UUIDs or user-specific values.
- Confirm required archive paths and numeric theme version. Check the screenshot shows the real theme.
- Check widget targeting attributes and block/setting scopes. Confirm every option a setting offers has matching rendering behavior.
- Compare asset basenames across widgets and shared assets; ensure widget CSS/JS is enqueued and static binaries are in an exportable location.
- Review `raw` uses, plain URL output, rich-text handling, and missing/empty/default cases.
- Check translations, including labels created by JavaScript and keys built at runtime.
- For collections, check the definitions and the effective result after updates, not just each delta; verify item templates, required fields, output prefixes, listing declarations and pagination.
- For presets, check the chosen template/menu directories are complete because fallback is directory-level. Match image references with manifest entries and actual binaries/variants.

## Exercise behavior in the running app

For a new theme, use a disposable project created from a clean install of the theme. For a narrow change, test the affected feature plus any output or lifecycle boundary it crosses. Never test against a project that holds real content.

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

Assess visible focus, semantic controls, accessible names, responsive overflow, and motion preferences for affected UI. If no running app or browser is available, do the possible static checks and name the editor/export checks that are still open.

## Known limits of the platform

- Import checks do not validate widget schemas, screenshots, Liquid output, locale coverage, or item-template existence.
- Widget settings and block data have no complete save-time schema validation. `maxBlocks` is an editor limit, not a server rule.
- An unknown filter is skipped without an error, and an unknown tag argument is ignored. The app will not tell you; the validator will.
- Asset queues and exported widget file names can collide; asset origin inside an isolated snippet differs from a widget's top-level template.
- The core menu snippet emits three nesting levels. The app accepting deeper data does not mean a theme renders it.
- Theme updates preserve authored data but do not supply theme switching, schema migrations, or content translation.

If you find what looks like a defect in the app itself, describe it and work within the current behavior. Do not change application code during a theme task.

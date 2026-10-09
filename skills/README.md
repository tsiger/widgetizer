# Skills (maintainer notes)

Agent Skills for people who build with Widgetizer. Each skill folder contains portable authoring guidance and assets. Executable theme validation belongs to the app checkout; the skill explains when that validation is available and when it remains pending. These maintainer notes are not part of a distributed skill.

For skill/tooling progress and remaining work, see [STATUS.md](STATUS.md). Premium theme planning and development progress live with the private theme sources in `WIDGETIZER-PREMIUM-THEMES.md`; keep the collection notebook there rather than in this skill folder or Google Drive.

## widgetizer-theme-design

The [design skill](widgetizer-theme-design/SKILL.md) covers the theme brief, selective questions, visual references, direction selection, a working responsive preview with a compact style guide and representative layouts, supplied or generated imagery, and a simple editing model. It works alongside the technical skill below.

Each exploration records its intended character and the design choices that express it, then checks the whole preview against that brief. If the character is unclear and the author has not delegated the choice, the agent asks before building the preview. Premium themes can pursue different levels of intensity, with layouts and motion suited to each theme's character.

The Widgetizer premium collection's standing design rules live in [theme-collections/widgetizer-premium.json](theme-collections/widgetizer-premium.json). Read them for Common and new themes in that collection. This repository-specific brief stays outside the portable skills, so other theme authors keep their own preferences.

Curated design examples and quality criteria for the completed theme are still to develop. The preview guidance includes an initial desktop/mobile visual review. The shared widget pool will grow from actual theme work. Repository themes normally live under `themes/`; the premium collection uses a separate private source repository connected through `THEMES_EXTRA_ROOTS`. The skill does not relocate existing themes. App discovery of external sources does not make the development sync scripts use those roots; see [STATUS.md](STATUS.md).

## widgetizer-theme

Teaches an agent to build and change Widgetizer themes.

```
skills/widgetizer-theme/
  SKILL.md                 authoring workflow and app validation handoff
  references/              the platform rules, one topic per file
  assets/starter-theme/    minimal working theme the agent copies to start
  references/contract.json    generated authoring catalog
  agents/openai.yaml       display metadata for OpenAI's skill UI
```

### Keeping it true to the app

`references/contract.json` is generated from the source: app/LiquidJS versions, setting types, LiquidJS built-ins, registered custom tags and their argument names, registered filters, core widgets/snippets/visitor strings, default image sizes, collection sorts and structured-data rules, and font stacks/weights. It records names and selected metadata, not the full behavior of the app.

```bash
node scripts/build-theme-skill-contract.js           # regenerate
node scripts/build-theme-skill-contract.js --check   # exit 1 when stale
```

`packages/builder-server/src/tests/themeSkill.test.js` runs with `npm test` and fails when:

- `contract.json` no longer matches the source (a tag, filter, setting type, font or core string was added, renamed or removed),
- the starter theme stops passing the validator, importing as a ZIP, becoming a project, or exporting,
- Arch (the theme or any of its presets) gets a validator error,
- the validator regresses on malformed Liquid/JSON, schema references, core options, custom names, asset URLs, scope handling, or preset data.

The prose in `references/` is hand-written: when theme behavior changes, update the matching reference in the same change. Reserved setting groups, setting/schema property lists and targeted authoring diagnostics in the app checker also need review. The catalog generator extracts custom argument names from the registered tag implementations' use of `options`; changing that implementation pattern requires updating extraction and its tests.

### App-owned validation

`scripts/validate-theme.js` exposes `validateTheme(themeDir)` and the CLI below. It reads the current app catalog, full core widget schemas and shared collection validation. `createLiquidEngine()` from `@widgetizer/render-engine` configures both runtime rendering and validation, so the checker uses the app's actual registered Liquid dialect with `strictFilters: true`. Runtime rendering retains its existing options.

LiquidJS parses templates and supplies scope analysis; the checker walks that parsed structure for Widgetizer-specific diagnostics. Its analysis APIs require regression coverage when LiquidJS changes. Optional render variables remain allowed; strict variable rendering is not used as a blanket authoring rule.

Run the validator on any theme folder with:

```bash
npm run validate:theme -- themes/arch
```

This runs without starting the app and does not write into the supplied theme or runtime projects. `--json` returns findings; `--strict` makes warnings fail. Arch must stay at zero errors. A warning must be reviewed, not automatically converted into a platform requirement.

Static validation is separate from import, rendering, browser checks, export and update preservation. The starter test exercises real import/project/export; it does not certify those behaviors for every theme the checker accepts. Dynamic references, preset media binaries and assembled updates need explicit verification. See the skill's validation reference for current coverage.

### Trying the skill locally

Claude Code discovers project skills in `.claude/skills/`. That folder is gitignored here, so link the skill into it once:

```bash
cmd //c mklink //J .claude\\skills\\widgetizer-theme skills\\widgetizer-theme
```

Scratch themes go in `themes/__<name>/`, which git ignores. Preview one with `npm run theme:sync -- --theme __<name>`.

### Where each reference comes from

Audited against app version 0.9.10. When a contract changes, these are the places to re-read.

| Reference | Implementation | Docs and tests |
| --- | --- | --- |
| theme-structure-and-lifecycle | `packages/builder-server/src/controllers/themeController.js`, `utils/semver.js`, `utils/projectScaffold.js`, `services/themeUpdateService.js`, `packages/core/src/tags/themeSettings.js`, `tags/FontsTag.js` | `docs-llms/theming.md`, `docs-llms/theme-updates.md`, `tests/themes.test.js`, `tests/themeUpdateApplyToDir.test.js` |
| liquid-and-render-context | `packages/render-engine/src/renderEngine.js`, `packages/core/src/tags/`, `filters/`, `snippets/` | `docs-llms/theming.md`, `tests/rendering.test.js`, `tests/renderCollectionItemPage.test.js` |
| widgets-and-settings | `packages/core/src/config/settingTypes.js`, `packages/editor-ui/src/components/settings/SettingsRenderer.jsx`, `stores/widgetStoreHelpers.js`, `packages/core/src/runtime/previewRuntime.js` | `docs-llms/theming-setting-types.md`, `docs-llms/theming-widgets.md` |
| assets-and-browser-behavior | `packages/core/src/utils/assetUrl.js`, `packages/core/src/tags/`, `packages/builder-server/src/controllers/exportController.js`, `packages/core/src/runtime/previewRuntime.js` | `docs-llms/core-export.md`, `docs-llms/core-form-widget.md`, `packages/core/src/tags/__tests__/pathPrefixing.test.js` |
| templates-collections-and-presets | `packages/builder-server/src/controllers/themeController.js`, `controllers/projectController.js`, `utils/projectScaffold.js`, `services/collectionService.js`, `packages/core/src/structuredData/collectionTypes.js` | `docs-llms/core-collections.md`, `docs-llms/theme-presets.md`, `tests/collectionService.test.js`, `tests/presetMediaSeeding.test.js`, `tests/collectionPresetSeeding.test.js` |
| localization | `packages/builder-server/src/services/siteStringsService.js`, `packages/core/src/filters/siteStringFilter.js`, `packages/editor-ui/src/stores/widgetStoreHelpers.js` | `docs-llms/domain/multilingual.md`, `tests/siteStrings.test.js`, `scripts/validate-theme-locales.js` |

### Not done yet

- The remaining visual-design guidance in `widgetizer-theme-design`, beyond the brief, reference handling, direction selection and editing model already covered.
- The flow for desktop-app users (data folder paths, sync into a test project), and publishing to a public repository. See `docs-llms/future-skills-theme.md`.

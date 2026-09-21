# Theme, schema, template, and preset

[Map](../README.md) · [Theme operations](../operations/themes.md) · [Theme authoring](../../theming.md)

## Plain-language guide

### What is a theme?

A theme supplies the website's design tools and rules: available widgets and blocks, their controls, page layout, fonts, visual assets, and any supported collections.

A project starts with its own installed copy of a theme. Your written content belongs to the project, while the theme provides ways to arrange and display it.

### What are the related parts?

| Part | Everyday meaning |
| --- | --- |
| Theme library | The themes available when starting projects. |
| Theme version | A particular release of a theme's designs and capabilities. |
| Schema or definition | The list of controls and allowed content that a widget, block or collection offers. |
| Template | A starting page design, or a common design used to display entries such as articles. |
| Preset | A coordinated starting look and set of example content within a theme. |
| Theme settings | Shared choices such as colors, fonts and branding where the theme provides them. |
| Theme assets | Supporting pictures, icons, fonts and other design resources supplied with the theme. |
| Theme translations | Translations of theme-provided editor labels; these do not translate your own page text. |

### What can you do?

Choose a theme and preset when creating a project, change the shared theme settings, install theme packages in the library, and check for or apply updates to an existing project. A library theme cannot be deleted while a project uses it.

Updating an existing theme version is different from replacing the project with an unrelated theme. The handbook does not describe an automatic migration between arbitrary themes.

### What changes after an update?

An update can change the appearance or available controls across the website. It tries to retain your existing content and matching customized settings, and may add new starter pages or menus. A changed collection definition may require you to fill in new information.

The shared definitions and theme settings affect every language. Existing English and Greek content remain separate; an update does not translate either version.

The rendering system supplies language-selector destinations: a related page when available, otherwise that language's homepage. Arch 0.9.10 draws the selector when enabled in its header settings. Visitor text uses theme locale strings; date formatting localizes month names without changing the chosen date order. Existing project themes change when their update is applied. See [output rules](../operations/output.md#multilingual-boundary-at-this-snapshot).

### Saving and example

Save changes to theme settings to keep them. Applying a theme update is its own operation, not an unsaved page edit.

For example, saving a new shared font changes the typography wherever the theme uses that setting, including translated pages. The text itself stays the same. Export again to produce website files using the new appearance.

## Technical details

These are definitions and starting content from which projects are built. Keep the library source and the installed project copy distinct when reasoning about updates.

| Object | Role / lifetime |
| --- | --- |
| Theme library entry | Installed source with metadata, versions, assets and authoring resources |
| Latest theme snapshot | Source assembled from the base and applicable update folders |
| Installed project theme | Copied layout, widgets, snippets, assets, collection definitions, settings and other theme resources |
| Widget/block schema | Defines editor fields, defaults, allowed blocks and constraints |
| Widget Liquid template | Renders a widget instance; does not own its content |
| Page template | Seeds a new stored page or global during project scaffolding; not a live parent of every created page |
| Collection template | Renders an item page from current item data |
| Preset | Chooses initial templates/menus/settings and optional collection/media seed data during creation |
| Theme settings | Project-wide values stored with the project's theme data; shared across languages |
| Theme/core locales | Editor labels and schema strings; distinct from authored visitor-facing content |
| Icon/font assets | Definition/rendering resources; not automatically media-library records |

A project retains its installed version and update preference. Updating the library snapshot is separate from applying an update to an existing project. Applying an update merges settings while preserving matching customized values, replaces updatable definition/assets paths, and adds missing starter pages/menus without overwriting existing content. This is not an arbitrary theme-switch migration.

Implementation: [themeController](../../../packages/builder-server/src/controllers/themeController.js), [themeUpdateService](../../../packages/builder-server/src/services/themeUpdateService.js), [projectScaffold](../../../packages/builder-server/src/utils/projectScaffold.js), [themeStore](../../../packages/editor-ui/src/stores/themeStore.js).

Tests: [themes](../../../packages/builder-server/src/tests/themes.test.js), [themeUpdateService](../../../packages/builder-server/src/tests/themeUpdateService.test.js), [themeUpdates](../../../packages/builder-server/src/tests/themeUpdates.test.js), [preset media](../../../packages/builder-server/src/tests/presetMediaSeeding.test.js), [preset collections](../../../packages/builder-server/src/tests/collectionPresetSeeding.test.js), [themeStore](../../../packages/editor-ui/src/stores/__tests__/themeStore.test.js).

Review: new default-language starter content added by an update is not the same operation as seeding every additional language. Changes to shared schemas can affect every language's existing content.

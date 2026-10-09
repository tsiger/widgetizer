# Protected Custom Widgets — Feature Proposal

**Status:** Early proposal for discussion, recorded 21 September 2026. Not implemented or scheduled. Saving this specification does not settle its open decisions.

## 1. Purpose

Allow a project owner to add their own widgets without placing them inside theme-owned folders that are replaced during theme updates.

The intended user is someone comfortable editing widget files. Their website should still use Widgetizer's normal visual editing experience.

**The promise: theme updates preserve custom widget files and the content entered into those widgets.**

Preserving files does not guarantee that a widget remains compatible with every future change to its theme.

## 2. The basic experience

A project has an optional `custom-widgets` folder alongside its existing `widgets` folder.

```text
My project/
  widgets/
    slideshow/
    testimonials/

  custom-widgets/
    custom-pricing/
      schema.json
      widget.liquid
      preview.png
      custom-pricing.css
      custom-pricing.js
```

The owner adds a widget folder, refreshes the editor, and finds the widget in the existing widget picker.

They can then add it to pages, change its settings, arrange its blocks, duplicate it, and save or export normally.

The first version requires no plugin installation screen, marketplace, account, or package manager.

## 3. Ownership and protection

The two folders have different owners:

| Location | Owner | What a theme update does |
| --- | --- | --- |
| `widgets` | The installed theme | Replaces it with the new theme version |
| `custom-widgets` | The project owner | Leaves it unchanged |

This protection must cover more than the normal "Update theme" button:

- Successful theme updates leave custom files unchanged.
- Failed or interrupted updates do not remove or replace them.
- Theme and preset synchronization tools do not write into them.
- Theme packages do not populate or take ownership of the protected folder.
- Updating Widgetizer itself does not treat them as bundled application files.

The folder belongs to one project. Editing it does not change other projects using the same theme.

"Protected" does not mean immune to deliberate project operations. Duplicating and backing up a project include it; deleting the whole project deletes it.

## 4. Widget format and naming

Custom widgets use the existing widget format: a definition of their controls, a template, and optional supporting files.

They follow the same flat-folder rule agreed for theme widgets. Scripts and styles sit directly beside the widget's main files.

Each widget needs a stable, unique identity. Its friendly display name can change without breaking existing uses.

Recommended naming:

- Widget identity: `custom-pricing`
- Stylesheet: `custom-pricing.css`
- Script: `custom-pricing.js`

A prefix is a useful convention, but must not silently change how existing theme widgets are interpreted.

**Custom widgets add new choices; they do not override existing theme or built-in widgets.**

If two definitions claim the same identity, Widgetizer must explain the conflict rather than choose whichever was loaded last. It must never show controls from one definition while rendering another.

The existing special header/footer identities and built-in widget identities remain reserved.

Asset filenames must also be unique across custom widgets, theme widgets and shared theme assets, because exported widget scripts and styles share one folder.

## 5. Discovery and refresh

Widgetizer discovers custom widgets when it loads the project's widget choices.

A missing or empty `custom-widgets` folder is normal. Existing projects need no conversion.

Valid custom widgets appear in the existing picker, with their normal name, search terms and optional preview image. A small "Custom" label distinguishes their origin without creating another editing workflow.

For the first version:

- Refreshing or reopening the editor is the supported way to discover externally added or changed files.
- The owner should save pending content edits before refreshing.
- Automatic watching and immediate reloading of files are optional later improvements.
- Refresh must update the relevant widget definitions and previews consistently; it must not keep showing old controls against a new template.

One unreadable custom widget should not make the entire widget picker unusable. The problem should identify the affected widget.

## 6. Normal editing behaviour

Custom widgets participate in the existing editor rather than introducing separate content storage or editing rules.

They support:

- Widget and block settings, including the existing setting types.
- Starting values and starter blocks.
- Conditional controls.
- Adding, duplicating, copying, pasting, reordering and deleting.
- Existing block and widget limits.
- Save, autosave, Undo and Redo.
- Unsaved-change protection when navigating away.
- Live preview selection and editing.
- Multiple instances of the same widget on a page.

Saved content remains in the page that contains the widget. The custom folder contains the widget's definition and supporting files, not the owner's individual page edits.

Future [shared widget areas](future-shared-widget-areas.md) should be able to use these same custom widgets. This feature does not depend on shared areas being implemented first.

## 7. Rendering and existing widget capabilities

Every operation that reads a widget's definition must find the same source.

That includes more than displaying its template:

- Resolving settings and block defaults.
- Rich-text handling.
- Menu and internal-link controls.
- Collection lists.
- Collection main-listing selection and numbered pages.
- Breadcrumbs derived from collection listings.
- Transparent-header support.
- Language-aware content and dates.

The existing rules continue to apply. For example, a custom collection widget on a normal page may use pagination, but still follows the current one-paginating-widget-per-page rule.

Custom widgets can use the theme's existing settings, styling, shared scripts and snippets. Those are dependencies on the theme—not protected copies owned by the custom widget.

A widget written specifically for Arch does not become theme-independent merely because it lives in the protected folder.

## 8. Preview, scripts, styles and export

Custom widgets must work in:

- The live editor preview.
- The separate saved-site preview.
- Exported pages and downloadable website exports.
- Translated pages and generated numbered pages.

Their preview images, scripts and styles must resolve from the custom folder rather than accidentally from a similarly named theme widget.

Existing enqueue behaviour remains:

- Widget-owned scripts and styles resolve from that widget.
- `theme: true` deliberately refers to the theme's shared assets.
- Repeated requests for the same shared library remain deduplicated.
- Script/style preloads point to the same files as the corresponding requests.

Export must include the custom scripts and styles required by rendered widgets, following the existing flat asset rules. Clean URLs, nested page addresses and cache-busting should work exactly as they do for theme widgets.

Editable widget definitions belong in project backups. A published website export contains the rendered result and required public assets, not the custom widget's editable source package.

The first version should keep the existing supported widget-file model. It does not introduce an additional system for custom fonts, nested libraries or private snippet folders. Any such additions need their own explicit rules.

## 9. Languages and translations

The same custom widget definition is available across a project's languages. Each translated page keeps its own widget settings and blocks, just as it does today.

Creating another language version copies existing content according to the current rules. It does not automatically translate the owner's words or keep later edits synchronized.

There are two different translation needs:

1. **Owner-entered content:** headings, descriptions, buttons and other editable values.
2. **Author-supplied wording:** editor labels, built-in visitor text and translated starting values.

The first should work through the normal page-language system.

The second needs a protected home if custom widgets are to supply their own translation files. Adding new wording to the theme's ordinary language files would leave that wording vulnerable to updates.

**Recommended direction:** allow optional custom translation files inside the protected custom-widget area, with names belonging to the custom widgets so they cannot replace unrelated theme wording.

The exact file arrangement is still open. It should support the existing translation features without requiring edits to theme-owned files.

A simple custom widget should remain possible without translation files, using readable control labels and editable visitor-facing text.

## 10. Links, media and content protection

Custom widgets must participate in the normal content-maintenance rules.

For widget settings, block settings and supported rich text:

- Selected page/article links follow renames and address changes.
- Deleted destinations receive the existing link cleanup.
- Deleted menus receive the existing selection cleanup.
- Manually typed addresses keep their current behaviour.
- Project duplication and restoration preserve or reconnect references appropriately.

Images and downloadable files selected through normal controls must remain tracked as used. Existing protection against deleting media still needed by saved content must apply.

Hardcoded addresses or media references hidden inside author-written templates and scripts are not automatically equivalent to links and media selected through Widgetizer. The feature should not promise to discover and rewrite arbitrary custom code.

Custom widgets retain the existing rules for handling rich text and authored code. Reading templates and serving assets must remain confined to their permitted project locations.

## 11. Forms: an explicit boundary

Today, the exported description of forms specifically recognizes the built-in `core-form` widget.

A custom widget containing form markup—or a renamed copy of the built-in form—is not automatically recognized as a Widgetizer-managed form.

Therefore, this first feature does not promise automatic form integration for arbitrary custom widgets.

The existing built-in form continues working normally. Supporting additional form widget types would require a separate, deliberate extension to the form system.

This limitation must be documented clearly, particularly for owners who copy an existing form to customize it.

## 12. Theme updates and compatibility

A theme update must preserve custom files and saved custom-widget content.

However, it may change things a custom widget depends on:

- Theme colors or styling conventions.
- Shared scripts.
- Theme settings.
- Snippets.
- Collection definitions.

The owner remains responsible for adapting their widget when those dependencies change.

There is no automatic merging of custom code with newer theme code. A copied-and-modified Arch widget becomes the owner's maintained version.

The first version does not need a compatibility marketplace or an automatic dependency manager. It needs a clear ownership promise and honest documentation of its limits.

## 13. Moving existing custom widgets

Support a documented route for people who already added their own widgets under the theme's `widgets` folder.

The preferred behaviour is:

1. Move the widget's folder into `custom-widgets`.
2. Keep its existing unique widget identity.
3. Refresh the editor.
4. Existing page uses continue working without losing settings or blocks.

This requires every relevant lookup to recognize the new source. It should not require rewriting every page merely because the widget moved.

Associated custom scripts, styles and translation files must move into supported protected locations too.

The old and new folders must not remain as competing definitions.

A modified copy using the identity of an actual Arch widget is a different case. It needs a new identity and a deliberate way to reconnect its existing uses. An automatic migration tool is not included in the first version.

## 14. Missing or broken custom widgets

If the owner removes a custom folder, saved instances must remain in their pages. Widgetizer must not silently delete their content or substitute another widget.

The editor should identify the unavailable widget and preserve enough information for the owner to restore the files or remove the instance deliberately.

Restoring the same valid definition should reconnect the saved content.

**Proposed export behaviour:** a page using an unavailable custom widget should produce a clear export failure rather than a supposedly successful website containing a missing-widget message.

This is a proposed improvement for this feature, not a claim about the current exporter.

Ordinary missing-file, unreadable-definition and identity-conflict handling belongs to loading the feature safely. Broader authoring checks—such as the full flat-folder and asset-naming audit—remain work for the future author CLI.

## 15. Copying, backups and restoration

Project duplication must include the custom folder and leave the duplicate independent of the original.

Project backups must include custom definitions, supporting files and protected translations. Restoration on another computer must retain them without requiring a separate installation step.

Changing the project's storage folder must preserve them.

Older projects and backups without custom widgets remain valid.

The current whole-project copy and backup paths provide a useful foundation, but these behaviours need explicit verification rather than being assumed from how copying happens today.

## 16. Work deliberately outside the first version

- A general plugin framework.
- Plugin management screens or a marketplace.
- Downloading or automatically updating custom widgets.
- Custom backend services or application screens.
- Overriding built-in widgets, theme widgets, headers or footers.
- Registering new collection types through custom widgets.
- A general system for arbitrary custom forms.
- New nested widget asset support.
- Automatic migration of modified theme widgets.
- Dependence on the proposed shared-area feature.

The deliverable is a protected place for additional project widgets, fully connected to the existing builder.

## 17. What must be demonstrated before release

The feature is complete when we can show that:

1. A custom widget appears, previews correctly and supports normal settings and blocks.
2. Its saved uses work after refreshing and reopening the project.
3. A real theme update preserves its files and page content.
4. Theme and preset synchronization cannot overwrite its protected folder.
5. A custom collection widget supports the existing listing, breadcrumb and pagination behaviour.
6. Custom images, downloads, links and menus receive normal usage tracking and reference updates.
7. English and another language work without storing required custom wording in replaceable theme files.
8. Scripts, styles and previews work in the editor and exported site, with Clean URLs both on and off.
9. Copying and restoring a project preserve the custom widget and its content.
10. Moving an existing uniquely named widget into the protected folder preserves its existing uses.
11. Missing definitions and identity conflicts never silently select a different widget or erase content.
12. Projects without custom widgets behave as before.

## 18. Decisions still to confirm

- Confirm `custom-widgets` as the folder name.
- Choose the protected arrangement for optional translation files.
- Confirm the refresh/reopen workflow for the first version.
- Confirm that missing custom widgets should block affected exports.
- Decide whether a convenient "Open custom widgets folder" action is worth including initially.

Everything else should aim to reuse the existing widget experience rather than invent another one.

## Current implementation reference

These are starting points from the 21 September 2026 code review, not instructions to redesign every listed component:

- [Project widget discovery](../packages/builder-server/src/controllers/projectController.js) and [widget picker](../packages/editor-ui/src/components/pageEditor/WidgetSelector.jsx): currently discover theme/core definitions and identify choices by widget type.
- [Rendering](../packages/render-engine/src/renderEngine.js): separate source lookups exist for widget rendering, listing breadcrumbs, pagination and transparent-header support.
- [Page saving](../packages/builder-server/src/controllers/pageController.js): pagination checks read widget definitions from the theme's widget folder.
- [Preview assets](../packages/builder-server/src/controllers/previewController.js) and [asset URLs](../packages/core/src/utils/assetUrl.js): preview routing must resolve the same source as rendering and discovery.
- [Export](../packages/builder-server/src/controllers/exportController.js): widget asset selection currently scans the theme's widget tree and copies selected script/style filenames into the output assets folder.
- [Theme updates](../packages/builder-server/src/services/themeUpdateService.js): explicitly listed theme-owned paths are replaced wholesale; project content outside those paths is not part of the swap.
- [Theme copying](../packages/builder-server/src/controllers/themeController.js), [theme sync](../scripts/theme-sync.js) and [preset sync](../scripts/preset-sync.js): broad copies and sync exclusions need to respect project ownership of the proposed folder.
- [Visitor wording](../packages/builder-server/src/services/siteStringsService.js), [project language files](../packages/builder-server/src/controllers/themeController.js) and [editor translation loading](../packages/editor-ui/src/hooks/useThemeLocale.js): currently combine theme/core wording, with no protected custom source.
- [Form export](../packages/builder-server/src/services/formsManifestService.js): specifically recognizes `core-form`.
- [Media tracking](../packages/builder-server/src/services/mediaUsageService.js) and [link maintenance](../packages/builder-server/src/utils/linkEnrichment.js): existing page/widget/block content handling is a foundation to verify with custom definitions.
- [Project operations](../packages/builder-server/src/controllers/projectController.js): whole-project copying, backup walking and restore copying provide a foundation for portability.
- [Widget authoring](theming-widgets.md), [theme lifecycle](core-themes.md) and [export rules](core-export.md): existing contracts this proposal should preserve.

---
name: widgetizer-theme
description: "Build, extend, fix and review themes for Widgetizer, the visual website builder: new themes, widgets, header/footer, starter pages, menus, collections, presets and theme updates. Use whenever someone wants to create or change a Widgetizer theme or widget, asks why a theme does not render or show up in the editor, or wants a theme checked. Not for filling an existing site with content."
---

# Widgetizer Theme

Build themes that install, edit, preview and export correctly in Widgetizer. This skill carries authoring references, a generated capability catalog and a starter theme. Widgetizer owns the executable validator.

## The one rule that matters most

Widgetizer uses LiquidJS with its own tags, filters and render data. Standard LiquidJS constructs work; Shopify-specific objects and theme features do not automatically apply.

- Follow the references for Widgetizer's file shapes, settings, custom tags and supplied objects. Authors choose their own widget types, setting IDs and local Liquid variables.
- When a platform feature is unclear, check the matching app source or documentation before using it. An omission from these concise references is not proof that a feature cannot exist.
- When a design needs something the platform lacks, build it from what exists (plain HTML, CSS, JavaScript, blocks, settings) or tell the author it is not possible.
- `references/contract.json` is a generated authoring snapshot: app and LiquidJS versions, setting types, tag/filter names, custom tag argument names, core widgets/snippets and font stacks/weights. It is a catalog, not a complete behavior specification. The app validator uses the current app source.

## Workflow

### 1. Understand the request

Work out which job this is: a new theme, a new or changed widget, starter pages or a preset, or an update to a theme people already use. For a change to an existing theme, read that theme's files first and follow its conventions; do not restyle it toward the starter.

For a new theme, use the supplied brief and clarify missing choices that materially affect the work:

- What is the site for, and who visits it?
- Which pages should the theme start with?
- How should it feel? Any sites they like, colors or fonts they want or want to avoid?
- Does it need repeating content with its own pages (posts, projects, team, menu items)?

### 2. Find the workspace

- **Inside the Widgetizer repository:** themes live in `themes/<theme-id>/`. A folder whose name starts with two underscores (`themes/__my-theme/`) is ignored by git; use that for experiments and tests.
- **Anywhere else:** build the theme in its own folder, then zip that folder (the folder itself is the single root of the ZIP) and upload it on the app's Themes page.

The theme id is the folder name. Use lowercase letters, digits and hyphens (plus the two leading underscores for a scratch theme).

### 3. Start from the starter theme

For a new theme, copy `assets/starter-theme/` from this skill to the new theme folder. Then change `name`, `author` and `description` in `theme.json`.

The starter is deliberately plain. It exists to give you a structure that already works: layout, header with menu and language switcher, footer, two sample widgets (one with blocks and JavaScript), a home page, a menu, icons, a locale file. Keep the structure and the patterns; replace everything visual. Rename or delete the sample widgets as the design needs.

Read [structure and lifecycle](references/theme-structure-and-lifecycle.md) before changing `theme.json` or adding folders.

### 4. Build, reading the reference for each part

| Working on | Read first |
| --- | --- |
| `layout.liquid`, snippets, tags, filters, escaping, links | [Liquid and render context](references/liquid-and-render-context.md) |
| Widget schemas, blocks, setting types, editor attributes | [Widgets and settings](references/widgets-and-settings.md) |
| CSS/JS files, icons, images, widget JavaScript, editor events | [Assets and browser behavior](references/assets-and-browser-behavior.md) |
| Starter pages, menus, collections, pagination, presets | [Templates, collections, and presets](references/templates-collections-and-presets.md) |
| Editor labels, visitor-facing words, languages | [Localization](references/localization.md) |
| Shipping changes to a theme people already use | [Structure and lifecycle](references/theme-structure-and-lifecycle.md#distributed-updates) |

A sensible order for a new theme: theme settings and base CSS, then header and footer, then widgets one at a time, then starter pages and menus, then locale strings.

The references mark each rule's strength. **Enforced** means the app rejects a violation. **Contract** means the feature silently fails without it. **Convention** is a recommendation. A theme that imports without error has only passed the Enforced rules.

### 5. Use Widgetizer's validator

```
npm run validate:theme -- <theme-folder>
```

Run this from a Widgetizer source checkout with its dependencies installed; the theme folder may be outside the checkout. Add `--json` for a machine-readable report. Run it after meaningful structural changes and before handoff. Fix errors, review warnings, and rerun. Do not change app rules or the generated catalog merely to silence a theme finding.

Outside a source checkout, perform the available manual checks in [validation](references/validation.md) and state that app validation remains pending. The distributed skill carries no separate validator, and the desktop app does not yet expose this command in its UI.

A clean run means the static checks found no errors. LiquidJS checks syntax; app checks compare the theme's definitions and references. Rendering, export, editor behavior and visual quality remain separate checks.

### 6. Put it in front of the author

Inside the Widgetizer repository:

1. `npm run theme:sync -- --theme <theme-id>` copies the theme into the app's installed themes.
2. The author creates a project from the theme in the app.
3. `npm run theme:sync -- --theme <theme-id> --project <project-folder>` then keeps that project in step with your edits while it runs. It leaves the project's pages and menus alone, so changes to `templates/` and `menus/` only show in a newly created project.

Do not start or restart the app yourself unless the author asks; tell them what to run and what to look at. Never sync over a project that holds real content.

Outside the repository, hand over the ZIP and the upload step.

### 7. Report honestly

Say where the theme is, what you built, the validator result, and what has and has not been looked at in the running app. Keep these apart: validator passed, rendered in the editor, exported. Do not call a theme finished on a validator pass alone. [Validation](references/validation.md) lists what to exercise in the editor and in an export.

## Things that go wrong most often

- Renaming a widget type, setting id, block type or collection type in a theme that already has sites. Stored content is keyed by those names and is left behind.
- Looping `widget.blocks` instead of `widget.blocksOrder`.
- `| raw` on anything that is not rich text, a layout variable or trusted theme SVG.
- Forgetting `data-widget-id`, `data-block-id` or `data-setting`, so the editor cannot select or live-update the element.
- Widget JavaScript that only runs on page load. The editor replaces widget markup without reloading the page.
- Two CSS or JS files with the same name in different widgets. Export puts them in one folder.
- Hard-coded `/assets/...` or `page.html` URLs instead of the asset tags and link filters.
- Real-looking contact details in starter content. Use `hello@example.com`, `(555) 010-0199`, `example.com`.

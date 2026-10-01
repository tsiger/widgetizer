---
name: widgetizer-theme
description: "Create, edit, and technically review Widgetizer themes, widgets, collection definitions, presets, and theme update packages. Use for theme implementation and compatibility work; choosing a theme and filling a user's website with content is a separate workflow."
---

# Widgetizer Theme

Produce a theme that can be installed, edited, previewed, and exported using Widgetizer's existing contracts. This skill covers technical authoring; it does not prescribe a visual style, widget catalog, premium features, or number of presets.

This is the repository-maintained draft, audited against Widgetizer 0.9.10 on 2026-10-01. It has not been installed or published. The references contain the working instructions; repository source links are evidence for maintainers, not files that a theme consumer must have. For another app version, check changed contracts before relying on version-sensitive behavior.

## Start with the task and the correct copy

Determine whether the request concerns a new theme, a widget, a preset, or an update to a distributed theme. Identify the intended source directory and app version from available context. Read [structure and lifecycle](references/theme-structure-and-lifecycle.md) for new themes, packaging, and updates. Do not mistake a project's installed theme copy or generated `latest/` snapshot for the maintained source.

Use an existing theme as implementation evidence, not as a universal design specification. Arch's CSS classes, color schemes, spacing system, typography, scripts, and named block types belong to Arch. New themes may choose different implementations while retaining the editor/render contracts.

## Load the relevant contract

| Work | Read |
| --- | --- |
| Layouts, snippets, tags, filters, escaping, URL construction | [Liquid and render context](references/liquid-and-render-context.md) |
| Widget schemas, blocks, settings, defaults, editor targeting | [Widgets and settings](references/widgets-and-settings.md) |
| Asset paths, export, JavaScript initialization, editor events | [Assets and browser behavior](references/assets-and-browser-behavior.md) |
| Starter pages, menus, collection schemas/items, pagination, presets | [Templates, collections, and presets](references/templates-collections-and-presets.md) |
| Editor labels, visitor strings, localized defaults, language links | [Localization](references/localization.md) |
| Any completed change or technical review | [Validation](references/validation.md) |

Read only the references relevant to the change. For a new theme, begin with structure, Liquid, and widgets; load the remaining contracts when implementing their features.

## Apply rules at their actual strength

The references distinguish:

- **Enforced:** an existing importer, validator, or save path rejects a violation. The named check's scope matters.
- **Contract:** required for the advertised feature to work, even when the application accepts malformed files or falls back silently.
- **Convention:** a deliberate authoring recommendation, not proof of runtime validity.

Unknown properties, a successful import, or a successful Liquid parse do not establish feature support. Use the documented shapes and verify rendered behavior. Do not introduce Shopify objects, unsupported tags, nested block systems, or new manifest capabilities by analogy.

## Author within scope

1. Preserve existing theme identity and content compatibility unless the request calls for a new identity or migration. Renaming widget types, setting IDs/groups, block types, or collection types can strand stored content.
2. Implement the requested capability using the relevant schemas and templates. Use actual JSON without comments or trailing commas. Keep user values out of source schemas; source defaults and installed project values have different ownership.
3. Keep editor targeting attributes, autoescaping, raw HTML boundaries, snippet scope, and portable asset/link handling intact. Make defaults and empty states render without depending on demo content.
4. For distributed themes, follow the update contract. Do not synchronize source over authored pages, menus, collections, uploads, or customized project settings.
5. Validate the changed surface using the checklist and available environment. A missing running app is a verification limitation, not permission to modify an unrelated project. Report checks actually performed and checks still outstanding.

## Finish with reviewable evidence

Report the output location, technical changes, validation results, and material compatibility limitations. Separate package checks, render checks, editor checks, and export checks; do not call a theme fully verified when only its JSON or skill frontmatter was checked.

For maintenance, use the source map in [validation](references/validation.md#maintainer-source-map). Permanent domain docs remain authoritative for application behavior; keep these references as focused authoring guidance, and resolve contradictions against implementation/tests instead of duplicating whole manuals.

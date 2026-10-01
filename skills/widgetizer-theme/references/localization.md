# Localization

## Keep the three kinds of words separate

| Words | Ownership and mechanism |
| --- | --- |
| Editor labels/help/options | Schema strings such as `tTheme:intro.name` resolved from theme editor locales |
| Visitor UI words | `site` dictionary in `locales/<language>.json`; rendered with `t`, or through localized widget defaults |
| Authored site content | The owner's page/global/menu/collection data in each content language; not automatically translated by a theme locale |

**Contract:** English is the fallback dictionary. Theme locales are part of the installed project's theme copy; changing the library's locale file does not immediately change existing projects. Core widget locale data is app-owned and merged beneath theme values.

**Convention:** supply English labels and visitor words, then the languages promised by the theme. Additional translations are not required for the ZIP to import. Literal editor labels also work. The repository locale check requires `locales/en.json` and verifies theme setting group names as `global.<group>.name`, even when the individual controls use direct labels.

For the sample `intro` widget and `colors` global group:

```json
{
  "global": { "colors": { "name": "Colors" } },
  "intro": {
    "name": "Introduction",
    "settings": { "heading": { "label": "Heading" } }
  },
  "site": {
    "common": { "next": "Next", "pagination": "Pagination", "language": "Language" },
    "gallery": { "position": "Image {{ number }}" }
  }
}
```

Only include the label keys actually used by translated schemas. A `tTheme:` key loses its prefix for lookup; the JSON does not contain `tTheme:` in its property names. Dotted schema keys describe nested JSON objects.

## Visitor dictionary lookup

```liquid
<button aria-label="{{ 'site.common.next' | t }}">{{ 'site.common.next' | t }}</button>
<span>{{ 'site.gallery.position' | t: number: forloop.index }}</span>
```

The filter supports named `{{ placeholder }}` substitutions. It tries page language, default language, and English; the loader also merges English beneath each locale and theme words over core words. Therefore fallback is not a translation-completeness guarantee. An unknown key renders its final segment with underscores changed to spaces; treat that as a missing translation, not acceptable final copy.

Leave translated strings autoescaped. Do not add `raw` just because a dictionary could contain HTML. Keep markup in templates and words in the dictionary.

## Localized defaults

For editable visitor wording whose default should follow the page language:

```json
{
  "id": "next_label",
  "type": "text",
  "label": "Next button label",
  "defaultKey": "site.common.next"
}
```

`defaultKey` is for widget/block defaults. The server provides a `resolvedDefault` suggestion and the renderer resolves an absent value in the page language. Do not write `resolvedDefault` into authored source schemas; it is runtime enrichment. Do not assume this mechanism is applied to every global theme or collection field merely because those also use settings.

With **only `defaultKey`**, the suggestion remains unstored until the owner edits the setting. With **both a literal `default` and `defaultKey`**, widget creation stores the resolved default. Use both when the value must exist in stored content, such as a form field label used by submission handling.

A starter block can name separate initial words:

```json
{
  "type": "field",
  "settings": { "label": "Your name" },
  "defaultKeys": { "label": "site.core_form.name_field" }
}
```

This example assumes the parent defines a `field` block and relies on the corresponding core visitor string. Runtime `resolvedDefaults` is enrichment, not a source property to invent.

An explicit empty string is the owner's choice. Do not replace it with a translation using a `blank` check or unconditional Liquid `default`; distinguish missing (`nil`) from deliberately empty content when applying a fallback.

## Script-generated labels

Browser JavaScript has no Liquid translation filter. Pass words via escaped HTML data:

```liquid
<div data-next-label="{{ 'site.common.next' | t }}"></div>
```

Read the attribute through `dataset` and put it into `textContent` or an appropriate attribute. Avoid interpolating translated text directly inside executable JavaScript strings. Include labels for lightboxes, carousels, dialogs, and controls generated after page load.

## Page language, dates, and switching

Use `page.language` and `page.dir` on the document. `format_date` preserves the selected format while localizing date words. Image metadata can vary per language without duplicating the media library.

`page.translations` contains the site's configured language entries: `language`, `hreflang`, `label`, `href`, `seoUrl`, `active`, `fallback`, `dir`. It is empty for a single-language site. A fallback link points at that language's homepage when a translated counterpart is unavailable. Use the supplied `href`; do not construct a path by replacing a language segment.

```liquid
{% if page.translations.size > 1 %}
  <nav aria-label="{{ 'site.common.language' | t }}">
    {% for translation in page.translations %}
      <a href="{{ translation.href }}" lang="{{ translation.hreflang }}"{% if translation.active %} aria-current="true"{% endif %}>{{ translation.label }}</a>
    {% endfor %}
  </nav>
{% endif %}
```

If moved into a snippet, pass `page` or the translations array explicitly. `seo` emits associated hreflang metadata; do not add a competing hardcoded set.

## Locale verification

Inside this repository, `node scripts/validate-theme-locales.js <theme-id>` checks a selected theme plus core widget locales. It resolves known theme roots; it is not a generic arbitrary-folder validator. Review its resolved source in the output so a symlink or additional root does not validate the wrong copy.

It checks schema references, global group-name keys, literal visitor `t` uses and `defaultKey`/`defaultKeys` references against English, including inherited core visitor keys. Additional-language missing/extra keys and unused keys can be warnings. It does not prove dynamic keys exist, all literal text was extracted, string leaves have the correct types, or interpolation placeholders agree across languages. Check those explicitly when relevant.

Evidence: [dictionary service](../../../packages/builder-server/src/services/siteStringsService.js), [translation filter](../../../packages/core/src/filters/siteStringFilter.js), [widget default persistence](../../../packages/editor-ui/src/stores/widgetStoreHelpers.js), [locale check](../../../scripts/validate-theme-locales.js), [multilingual behavior](../../../docs-llms/domain/multilingual.md).

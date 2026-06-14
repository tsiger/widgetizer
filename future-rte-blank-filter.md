# future-rte-blank-filter

A reusable Liquid filter for detecting visually-empty richtext (RTE) values.

## Problem

Richtext fields are never truly `blank` when "empty" — the editor leaves behind
markup like `<p></p>`, `<p><br></p>`, or `<p>&nbsp;</p>`. So the usual guard
`{% if widget.settings.foo == blank %}` always thinks the field has content,
even when it looks empty. This breaks:

- visibility toggles ("only render this block if filled")
- conditional layout (padding fallbacks, spacing)
- empty animated/wrapper divs that emit even with no content

`== blank` only works for `text` / `textarea`. As more fields move to
`richtext`, every widget that drives layout off content presence needs the same
`strip_html | replace | strip` chain re-derived by hand.

### Prior art in the codebase

This pattern was first worked around inline in the footer widget
(commit `bffeff29`, "Update the footer of the Blank preset with some footer
content"):

```liquid
{%- assign copyright_html = widget.settings.copyright | default: '' -%}
{%- assign copyright_text = copyright_html | strip_html | replace: '&nbsp;', '' | replace: '&#160;', '' | strip -%}
{% if copyright_text == blank %} ... {% endif %}
```

The goal here is to lift that one-off chain into a shared filter.

## Proposed filter

`src/core/filters/rteFilter.js` — expose two filters from one file since they
share normalization:

```js
/**
 * Rich-text (RTE) helpers.
 *
 * rte_text  — collapse an RTE value to its plain text (strip tags, nbsp, whitespace)
 * rte_blank — boolean: is the RTE value visually empty? (<p></p>, <p><br></p>, &nbsp; …)
 *
 * Usage:
 *   {% assign t = widget.settings.copyright | rte_text %}{% if t != blank %}…{% endif %}
 *   {% unless widget.settings.copyright | rte_blank %}…{% endunless %}
 */
export function registerRteFilters(engine) {
  const toText = (html) => {
    if (!html || typeof html !== "string") return "";
    return html
      .replace(/<[^>]*>/g, "")        // strip tags
      .replace(/&nbsp;|&#160;/g, "")  // non-breaking spaces
      .replace(/\s+/g, " ")           // collapse whitespace
      .trim();
  };

  engine.registerFilter("rte_text", toText);
  engine.registerFilter("rte_blank", (html) => toText(html) === "");
}
```

### Registration

Follows the existing filter pattern in
`server/services/renderingService.js` (~lines 25-29 import, ~97-101 register),
alongside `registerHandleizeFilter`, `registerSafeUrlFilter`, etc.

```js
import { registerRteFilters } from "../../src/core/filters/rteFilter.js";
// ...
registerRteFilters(engine);
```

## Usage examples

### Footer (replace the inline chain)

```liquid
{%- assign copyright_text = widget.settings.copyright | rte_text -%}
...
{% if copyright_text == blank %} padding-block: 8rem;{% endif %}
...
{% if copyright_text != blank %}
  <div class="footer-copyright w-rte" data-setting="copyright">
    {{ widget.settings.copyright | raw }}
  </div>
{% endif %}
```

Note: always output the **raw original** (`| raw`) for display — `rte_text` is
only for the emptiness test, never for rendering.

### rich-text widget `text` block

Currently `themes/arch/widgets/rich-text/widget.liquid` always renders the text
block div even when empty (stray reveal-animated empty div). Guard it:

```liquid
{% when 'text' %}
  {% unless block.settings.text | rte_blank %}
    {% assign size_class = 't-' | append: block.settings.size %}
    {% assign style_class = '' %}
    {% if block.settings.uppercase %}{% assign style_class = style_class | append: ' t-uppercase' %}{% endif %}
    {% if block.settings.muted %}{% assign style_class = style_class | append: ' t-muted' %}{% endif %}
    <div class="w-body w-rte {{ size_class }}{{ style_class }} reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}" data-block-id="{{ blockId }}" data-setting="text">
      {{ block.settings.text | raw }}
    </div>
  {% endunless %}
```

LiquidJS allows `{% if x | filter %}` inline, so the `rte_blank` boolean reads
cleanly in conditions. Use `rte_text` when you also want the stripped value for
something else (meta description fallback, `aria-label`, etc.).

## Rollout candidates

Audit Arch widgets for richtext fields whose presence drives layout/visibility
and migrate them off hand-rolled `strip_html` chains or broken `== blank`
checks:

- footer copyright (done inline — migrate to filter)
- rich-text `text` block (skip empty blocks)
- header tagline / contact lines
- card descriptions
- any block conditionally shown based on RTE content

## Open considerations

- **Editor parity**: this normalization is server-side (render engine). The
  React page editor won't know about it. If we ever want the editor to show an
  "empty block" state, that needs a parallel JS check on the frontend (could
  share the same `toText` helper if extracted to a framework-agnostic module).
- **Entity coverage**: current regex handles `&nbsp;` / `&#160;`. If other
  whitespace entities show up in practice (`&#xa0;`, `&ensp;`, `&emsp;`,
  `&thinsp;`), extend the replace.
- **Tests**: add `server/tests/rteFilter.test.js` covering `<p></p>`,
  `<p><br></p>`, `<p>&nbsp;</p>`, real content, null/non-string input, and
  whitespace-only.

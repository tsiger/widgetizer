---
description: Reference for theme objects and context in Widgetizer. Available data objects, attributes, and where they can be accessed.
---

Theme development relies on a shared set of data objects. Some are available everywhere, while others only exist in `layout.liquid`. This page documents the core objects and their attributes.

# Context Overview

### Available in `layout.liquid`

- `theme`
- `page`
- `project`
- `header`
- `main_content`
- `footer`
- `body_class`

### Available in widget templates

- `theme`
- `widget`
- `block` (inside block loops)
- `page` (the page being rendered, the same object the layout gets)
- `project`
- `pagination` (only in the widget that splits its page into pages)

### Available in collection item templates

- `theme`
- `item`
- `collection`
- `page`
- `project`

> **Note:** Header and footer see `page` and `project` too, so a footer can show the site's business details. The `item` and `collection` objects exist only in a collection type's `template.liquid`; see [Collections](theme-dev-collections.html).

# Theme Object

The `theme` object exposes settings defined in `theme.json`. See [Theme Manifest & Settings](theme-dev-manifest-settings.html) for how groups and IDs map to Liquid:

```
theme.{group}.{setting_id}
```

Example:

```liquid
{{ theme.colors.standard_bg_primary }}
{{ theme.typography.heading_font.stack }}
```

Nested example:

```liquid
{{ theme.typography.heading_font.weight }}
{{ theme.general.enable_reveal_animations }}
```

# Widget Object

Available in widget templates as `widget`:

- `widget.id`: Unique instance ID
- `widget.type`: Widget type string
- `widget.settings`: Widget-level settings
- `widget.blocks`: Block objects keyed by ID
- `widget.blocksOrder`: Ordered list of block IDs
- `widget.index`: 1-based position on the page (may be `null`)

# Block Object

Within block loops:

- `block.id`: Block ID
- `block.type`: Block type string
- `block.settings`: Block-level settings

Example loop:

```liquid
{% for blockId in widget.blocksOrder %}
  {% assign block = widget.blocks[blockId] %}
  {{ block.type }}
  {{ block.settings.text }}
{% endfor %}
```

For schema structure and block patterns, see [Widgets & Blocks](theme-dev-widgets-blocks.html).

# Pagination Object

Available as `pagination` in the one widget that splits its page into pages, and as
`page.pagination` in `layout.liquid` on that page. It is absent everywhere else, including
when the whole collection fits on one page.

- `pagination.current`: The page being shown, starting at 1
- `pagination.total`: How many pages there are (always 2 or more)
- `pagination.perPage`: Items per page
- `pagination.totalItems`: Items in the collection
- `pagination.prevHref`: Link to the previous page, or `null` on page 1
- `pagination.nextHref`: Link to the next page, or `null` on the last page
- `pagination.pages`: Every page, each with `number`, `href` and `current`

All links are already correct for the page's depth and the Clean URLs setting. See
[Splitting a List into Pages](theme-dev-widgets-blocks.html) for how to enable it.

# Page Object

Available in `layout.liquid`, widget templates and collection item templates:

- `page.id`
- `page.uuid`
- `page.name`
- `page.slug`
- `page.created`
- `page.updated`
- `page.seo.description`
- `page.seo.og_title`
- `page.seo.og_image`
- `page.seo.og_type`
- `page.seo.twitter_card`
- `page.seo.robots`
- `page.seo.canonical_url`
- `page.breadcrumbs` — the trail for this page, Home first and this page last;
  empty on the homepage, except on its page 2 and later (`Home › Page 2`). Also on `globals.breadcrumbs` inside every widget, so a
  header can draw it. Each entry has `label`, `href` (already depth- and
  Clean-URLs-aware), `canonicalPath`, `current` and `home`, plus `pageNumber` on
  the numbered crumb of page 2 and later. See
  [Breadcrumbs](theme-dev-liquid-assets.html#breadcrumbs) for the ready-made
  snippet.
- `page.pagination` — on a page split into pages, the same object the splitting
  widget gets. See [Pagination Object](#pagination-object).

> **Note:** A collection item page exposes a `page` object too, built from the item (`page.slug` is `"{slugPrefix}/{slug}"`, `page.name` is the item title). This lets item pages flow through the same layout and SEO as regular pages. See [Collections](theme-dev-collections.html).

# Project Object

Available in `layout.liquid`, widget templates and collection item templates:

- `project.id`
- `project.name`
- `project.siteTitle`
- `project.description`
- `project.theme`
- `project.siteUrl`
- `project.cleanUrls`
- `project.created`
- `project.updated`
- `project.identity` — the site identity and business details the site owner entered in Project details (see below)

### `project.identity`

Every field is always present, and empty values are blank strings.

- `project.identity.kind`: `organization`, `person` or `localBusiness`
- `project.identity.category`: the chosen category, e.g. `restaurant`
- `project.identity.name`: the public name, or the Site Title when none is set
- `project.identity.description`: short description
- `project.identity.logo`: the logo's media path. Render it with `{% image src: project.identity.logo %}`
- `project.identity.email`
- `project.identity.telephone`
- `project.identity.telephoneHref`: a ready `tel:` link
- `project.identity.priceRange`
- `project.identity.profiles`: social profile URLs keyed by network (`facebook`, `instagram`, `twitter`, `linkedin`, `youtube`, `tiktok`, `pinterest`, `github`, `mastodon`, `bluesky`, `discord`, `reddit`, `telegram`, `threads`, `whatsapp`); only the ones set
- `project.identity.hasProfiles`: `true` when at least one profile is set
- `project.identity.address`: `null`, or `streetAddress`, `addressLocality`, `addressRegion`, `postalCode`, `addressCountry` (two letters) and `label`
- `project.identity.openingHours`: the week as runs of consecutive days with the same hours. Each run has `firstDay`, `lastDay` (`monday` … `sunday`), `days`, `closed` and `ranges` (each with `opens` and `closes`, `HH:MM`). Days the owner left unstated are skipped.

```liquid
{% if project.identity.hasProfiles %}
  {% for profile in project.identity.profiles %}
    <a href="{{ profile[1] | safe_url }}">{{ profile[0] }}</a>
  {% endfor %}
{% endif %}

{% for run in project.identity.openingHours %}
  <p>
    {{ run.firstDay | capitalize }}{% if run.lastDay != run.firstDay %}–{{ run.lastDay | capitalize }}{% endif %}:
    {% if run.closed %}Closed{% else %}{% for range in run.ranges %}{{ range.opens }}–{{ range.closes }}{% unless forloop.last %}, {% endunless %}{% endfor %}{% endif %}
  </p>
{% endfor %}
```

Widgetizer also publishes these details to search engines on its own, so a theme only uses `project.identity` to show them to visitors. When your theme has its own social link settings, prefer `project.identity.profiles` when `hasProfiles` is true and fall back to your settings otherwise.

# Item and Collection Objects

Available only inside a collection type's `template.liquid` (item pages). Full details on the [Collections](theme-dev-collections.html) page.

`item`, the current collection item:

- `item.id`
- `item.uuid`
- `item.slug`
- `item.url` (relative URL to the item page, depth-aware)
- `item.created`
- `item.updated`
- `item.settings.*` (the item's fields, per the collection schema)

`collection`, the collection type's schema:

- `collection.type`
- `collection.slugPrefix`
- `collection.hasItemPages`
- `collection.defaultSort`
- `collection.settings` (the field definitions)

# Layout-Only Variables

The layout has access to rendered content placeholders. The three content placeholders are pre-rendered HTML and require the `raw` filter (see [Autoescaping & the `raw` filter](theme-dev-liquid-assets.html#escaping-model)):

- `{{ header | raw }}`
- `{{ main_content | raw }}`
- `{{ footer | raw }}`
- `{{ body_class }}` (page slugs are prefixed with `page-`, e.g., `page-about`)
- `{{ site_icons }}`: precomputed favicon / apple-touch-icon paths, typically consumed by a `site-icons` snippet

These are not available inside widget templates.

### Global Variables (Available Everywhere)

The following globals are available in all templates, including inside `{% render %}` snippets:

- `currentCanonicalPath`: The un-prefixed path of the page being rendered (e.g., `about.html`, or `portfolio/project-alpha.html` for a collection item page). The core `menu.liquid` snippet compares it against each menu item's `canonicalPath` to mark active items with the `is-active` class, matching on the canonical path (rather than the displayed `href`) so active state still works when item links are depth-prefixed with `../`.
- `filePath`: Base path for resolving file assets (PDFs uploaded via the `file` setting type). Use it as `{{ filePath | append: '/' | append: filename }}` so links work in both preview and exported output. See [Setting Types](theme-dev-setting-types.html#media-types) for the `file` setting and its template usage.

# Practical Guidance

### Use Theme Settings in CSS

Output CSS variables with `{% theme_settings %}` and use them in `base.css` or widget styles.

### Use Page and Project Sparingly in Widgets

Widgets should be reusable across pages, so rely mostly on `theme` and `widget` data inside widget templates. Reach for `project` for site-wide facts, such as `project.identity` in a footer or contact widget, and for `page` only when a widget really depends on the page it sits on.

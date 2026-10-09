# Templates, collections, and presets

## Starter pages and global instances

**Contract:** `templates/*.json` seeds editable pages when a project is created. A template is not a live parent whose later edits automatically change those pages. For a populated starter, start with `templates/index.json`; keep the filename and `slug` consistent. A deliberately blank starter can omit ordinary pages. The page's display/title source is `name`, not a top-level `title` property.

```json
{
  "name": "Home",
  "slug": "index",
  "widgets": {
    "opening": {
      "type": "intro",
      "settings": { "heading": "Our practice" },
      "blocks": {
        "first-point": { "type": "point", "settings": { "text": "Thoughtful spaces" } }
      },
      "blocksOrder": ["first-point"]
    }
  },
  "widgetsOrder": ["opening"]
}
```

Every `widgetsOrder` key must identify an actual widget instance. Each instance `type` must resolve to a supplied theme widget or an enabled core widget. Every ordered block key must exist and use a declared block type. Omit `blocks`/`blocksOrder` for blockless widgets. Use explicit block instances when authoring pages; schema `defaultBlocks` does not backfill them at render time.

`templates/global/header.json` and `footer.json` contain a **single widget instance** (`type`, `settings`, optional `blocks`/`blocksOrder`), not a page's `widgets` map. Their schemas/templates reside at `widgets/global/<type>/`.

**Convention:** use readable stable widget/block keys; snake_case versus kebab-case is not an engine restriction. Omit project UUIDs, creation timestamps, and project-specific references from starter content. Let scaffolding generate identities. Omit demo SEO by default so a fictional business's metadata does not become a user's authored SEO; this is an authoring convention, not a JSON parser restriction.

## Menus and links

`menus/<id>.json`:

```json
{
  "id": "primary",
  "name": "Primary navigation",
  "items": [
    { "label": "Home", "link": "index.html", "items": [] },
    { "label": "Contact", "link": "contact.html", "items": [] }
  ]
}
```

The second link assumes the theme supplies a contact page. Use `items` arrays for child menus. A menu item uses `label`/`link`; a schema `link` field uses `text`/`href`/`target`. Do not swap the two shapes.

Store a menu's source ID in a `menu`-typed setting. Scaffolding assigns project identities and enriches declared internal references. Do not put menu IDs in arbitrary text fields and expect them to resolve. The core menu snippet renders three levels; deeper data requires a theme renderer and must respect the application's separate menu limits.

Starter internal links use `index.html`, `contact.html`, or `<slugPrefix>/<item-slug>.html`. The project/render pipeline resolves supported stable references and output shape. Do not copy UUIDs from another project. Template-built links use the URL filters; resolved links are already ready for their current depth/language.

## Collection definitions

Collections are optional. Put schemas in `collection-types/<type>/schema.json`; when `hasItemPages` is true, supply `template.liquid` there as well. This template renders the live item, not a seeded page instance.

```json
{
  "type": "projects",
  "schemaVersion": 1,
  "displayName": "Project",
  "displayNamePlural": "Projects",
  "slugPrefix": "work",
  "hasItemPages": true,
  "defaultSort": "manual",
  "settings": [
    { "id": "title", "type": "text", "label": "Title", "usedAsTitle": true, "required": true },
    { "id": "body", "type": "richtext", "label": "Story", "allow_headings": true }
  ]
}
```

**Enforced by collection schema validation:**

- `type` matches `^[a-z0-9-]+$` and the folder name; `settings` is an array of supported fields with IDs.
- Exactly one non-header field has `usedAsTitle: true`, and it is `text`.
- At most one non-header field has `usedAsDate: true`, and it is `date`.
- Schema-level blocks and setting keys `multiple`, `repeater`, and `blocks` are unsupported. Items are flat records; use `gallery` or `table` fields for supported repeated content.
- `defaultSort`, if supplied, is `manual`, `created_desc`, `created_asc`, `title_asc`, `title_desc`, `date_desc`, or `date_asc`. Date sorting requires the date field.
- Item-page `slugPrefix` matches the slug pattern and is not `assets`; omitted prefix defaults to `type`. Effective prefixes must be unique across collections on theme import, including after applying updates.
- Tables have nonempty columns with unique safe IDs and supported `text` column types.
- A supplied `structuredData` mapping must match the supported type/field rules below.
- Presets must not contain `collection-types/`.

**Contract:** provide the item template when advertising item pages; the schema validator is not a complete template-existence/render check. Keep setting IDs unique and define all values your templates use. `schemaVersion` is bookkeeping, not an automatic migration script. Avoid collisions with generated page paths; `page` is reserved as a page/item slug, and a collection prefix `page` can conflict with homepage pagination during export.

An item-page template reads `item.settings`, `collection`, `page`, and `theme`. It produces the item's main content; the engine surrounds it with header/footer and the theme layout. Do not embed another complete HTML document inside it.

## Listings, anchors, and pagination

A listing widget declares `"collection": { "type": "projects" }` at schema top level. A listing that supports pagination also names the numeric per-page setting:

```json
{
  "collection": { "type": "projects", "perPageSetting": "limit" },
  "settings": [
    { "id": "limit", "type": "number", "label": "Items per page", "default": 6, "min": 1 }
  ]
}
```

This is a fragment to merge into a full widget schema. The editor injects the `listing_anchor` and, when supported, `paginate` controls. Do not invent a second settings system for those controls.

```liquid
{% assign entries = 'projects' | collection: limit: widget.settings.limit %}
{% for entry in entries %}
  {% if entry.url %}
    <a href="{{ entry.url | safe_url }}">{{ entry.settings.title }}</a>
  {% else %}
    <span>{{ entry.settings.title }}</span>
  {% endif %}
{% endfor %}
{% if pagination %}
  <nav aria-label="{{ 'site.common.pagination' | t }}">
    {% for step in pagination.pages %}
      <a href="{{ step.href }}"{% if step.current %} aria-current="page"{% endif %}>{{ step.number }}</a>
    {% endfor %}
  </nav>
{% endif %}
```

Define the visitor string used here. `entry.url` is absent/null for a list-only collection. Results contain prepared settings and stable record identity. The theme is responsible for a useful empty state.

**Enforced on page save:** at most one paginating widget per page; positive whole-number items per page; valid collection/perPageSetting configuration. Pagination makes that widget an anchor. Anchor coordination clears competing anchors/pagination for the collection on other pages.

The engine supplies `pagination.current`, `.total`, `.perPage`, `.totalItems`, `.prevHref`, `.nextHref`, and `.pages` entries (`number`, `href`, `current`). Pagination can be absent when all items fit on one page. The filter's slice is applied to the active listing widget only. Use supplied hrefs; do not calculate nested page URLs yourself.

## Structured data

The audited core supports `BlogPosting` as a collection mapping type. It requires `headline` -> a text setting, and accepts `datePublished` -> date, `description` -> text/textarea, `image` -> image, `articleBody` -> richtext/textarea. Mappings contain **setting IDs**, not values.

```json
{
  "structuredData": {
    "type": "BlogPosting",
    "headline": "title",
    "articleBody": "body"
  }
}
```

Use the mapping only for an actual article-like collection, with fields that exist. Core renders supported JSON-LD through `seo`; do not fabricate additional supported mapping types or duplicate core's graph in Liquid. Missing site configuration/content can omit nodes or produce export warnings without making the theme ZIP invalid.

## Presets

Register variants in `presets/presets.json`:

```json
{
  "default": "studio",
  "presets": [
    { "id": "studio", "name": "Studio", "description": "A practice website" },
    { "id": "portfolio", "name": "Portfolio", "description": "Work-led presentation" }
  ]
}
```

`liveDemo` is optional. A root-backed/default entry can fall through without its own folder. An absent preset directory falls back silently; verify IDs deliberately so a typo does not masquerade as a working preset.

`presets/<id>/preset.json` contains `{"settings": {"background": "#f6f3ed"}}`: a flat setting-ID map overriding matching global **defaults**. It does not redefine the setting schema. Unknown IDs do not add settings.

| Dimension | Resolution |
| --- | --- |
| Templates | Use the preset's entire `templates/` directory when present, otherwise root templates. No per-file merge. |
| Menus | Use the preset's entire `menus/` directory when present, otherwise root menus. No per-menu merge. |
| Settings | Apply supplied ID overrides to matching global defaults. Missing file means no overrides; malformed JSON causes creation to fail. |
| Collection item data | Seed optional `presets/<id>/collections/`; collection definitions remain theme-owned. |
| Screenshot | `presets/<id>/screenshot.png` when present, otherwise the theme screenshot. A distinct preview is recommended. A square 1024 x 1024 PNG (unlike the theme's own 1280 x 720 screenshot); the app shows preset previews square and crops anything else. |
| Starter images | `presets/<id>/media/`, then matching seed-root `preset-media/<id>/`, then effective theme-root `preset-media/<id>/`. |

Presets do not replace widgets, layout, CSS, snippets, locales, or collection definitions. Use settings and content to express variants. A full multipage preset and a particular number of variants are product choices, not package validity requirements.

Seed an item at `collections/projects/courtyard-house.json` within a preset:

```json
{
  "slug": "courtyard-house",
  "schemaVersion": 1,
  "settings": { "title": "Courtyard House", "body": "<p>A sheltered family home.</p>" }
}
```

Leave out runtime IDs/timestamps. Use filename-matching slugs and satisfy collection required fields. References to internal item/page hrefs are enriched/remapped during creation; do not hand-author foreign UUIDs.

## Starter media contract

Supply actual image binaries under `media/images/` and `media/manifest.json` under the selected preset-media location. Its top-level `files` array describes each original image's `filename`, `originalName`, MIME `type`, byte `size`, upload `path`, `width`, `height`, `alt`, `title`, `caption`, and `sizes` map for pre-generated variants. Each size entry names its upload `path`, `width`, and `height`. Paths/filenames must agree with the binaries and content references.

This seed route copies originals/variants and registers metadata; it does not manufacture missing derivative files. A manifest is not a substitute for the binaries, and copying binaries alone is not a complete seed. For a shared `preset-media/` library across releases, keep filenames stable and preserve files still referenced by older presets.
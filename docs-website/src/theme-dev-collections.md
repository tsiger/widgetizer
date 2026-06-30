---
description: Build collections (CMS content types) in Widgetizer themes. Define collection schemas, list items with the collection filter, and render item pages.
---

Collections let a theme define **content types** — News, Projects, Services, Team, FAQ, and so on — that site owners fill with many uniform records called **items**. The theme ships the type definition (a schema, and optionally an item-page template); the site owner authors items in the editor. Themes can then list those items in widgets and, when enabled, give each item its own page.

Collections are **theme-owned**: there's no "create a collection type" button. The types a project has are whatever its theme ships. For the end-user side (managing items), see [Collections](collections.html).

# Defining a Collection Type

A collection type is a folder under `collection-types/` in your theme:

```
themes/my-theme/
└── collection-types/
    └── news/
        ├── schema.json       # the type definition + item fields
        └── template.liquid   # item-page template (only when hasItemPages)
```

The folder name is the type's machine id. Here's a complete `schema.json` (the Arch `news` type):

```json
{
  "type": "news",
  "schemaVersion": 1,
  "displayName": "Article",
  "displayNamePlural": "News",
  "description": "Articles, updates and announcements.",
  "icon": "Newspaper",
  "slugPrefix": "news",
  "hasItemPages": true,
  "defaultSort": "date_desc",
  "settings": [
    { "type": "header", "id": "content_header", "label": "Content" },
    { "type": "text", "id": "title", "label": "Title", "required": true, "usedAsTitle": true },
    { "type": "date", "id": "date", "label": "Publication date", "usedAsDate": true },
    { "type": "textarea", "id": "excerpt", "label": "Excerpt" },
    { "type": "image", "id": "featured_image", "label": "Featured image" },
    { "type": "richtext", "id": "body", "label": "Body", "allow_headings": true, "allow_images": true }
  ]
}
```

### Top-Level Schema Keys

| Key | Required | Description |
| :-- | :-- | :-- |
| `type` | Yes | Machine id; must be lowercase letters/numbers/hyphens and match the folder name |
| `settings` | Yes | The item's fields (see below) |
| `displayName` / `displayNamePlural` | — | Singular and plural labels shown in the editor |
| `icon` | — | Icon id for the editor sidebar |
| `slugPrefix` | — | URL/output prefix for item pages (defaults to `type`; `assets` is reserved) |
| `hasItemPages` | — | `true` → each item renders its own page (requires `template.liquid`) |
| `defaultSort` | — | `manual`, `created_desc`, `created_asc`, `title_asc`, `title_desc`, `date_desc`, `date_asc` |
| `schemaVersion` | — | Bookkeeping value carried onto items for future migrations |

### Item Fields

Fields use the same [setting types](theme-dev-setting-types.html) as widgets (`text`, `textarea`, `richtext`, `image`, `gallery`, `date`, `table`, `select`, etc.). An item is a **flat record**, so the repeater-style keys (`blocks`, `repeater`) aren't allowed — use a `table` or `gallery` for repetition within a field.

A few flags are specific to collection fields:

- **`usedAsTitle: true`** — exactly one `text` field. It supplies the item's title and its auto-generated slug.
- **`usedAsDate: true`** — at most one `date` field. It becomes the sort key for `date_desc` / `date_asc` (items with a blank date sort last).
- **`required: true`** — the item fails validation until the field has a value.

# Listing Items: the `collection` filter

Pull items into any widget or template with the `collection` filter. Pass the type id and options:

```liquid
{% assign posts = 'news' | collection: limit: 6, sort: 'date_desc' %}
```

**Options:** `limit` (use `0` for all items), `offset`, and `sort` (any of the `defaultSort` values).

Each returned item has this shape:

```liquid
{
  id, uuid, slug,
  url,        // relative URL to the item page, or null when hasItemPages is false
  created, updated,
  settings    // the item's fields — already link-resolved and sanitized
}
```

`url` is computed for the current page depth, so it's correct whether you link from the homepage or from another item page.

### Example: a Card Grid

```liquid
{% assign posts = 'news' | collection: limit: widget.settings.limit, sort: 'date_desc' %}

{% if posts.size > 0 %}
  <ul class="news-grid">
    {% for item in posts %}
      <li class="news-card">
        {% if item.settings.featured_image != blank %}
          {% image src: item.settings.featured_image, size: 'medium', srcset: true, sizes: '(max-width: 768px) 100vw, 400px' %}
        {% endif %}

        {% if item.settings.date != blank %}
          <time datetime="{{ item.settings.date }}">{{ item.settings.date | format_date }}</time>
        {% endif %}

        <h3>
          {% if item.url %}<a href="{{ item.url }}">{{ item.settings.title }}</a>
          {% else %}{{ item.settings.title }}{% endif %}
        </h3>

        {% if item.settings.excerpt != blank %}
          <p>{{ item.settings.excerpt }}</p>
        {% endif %}
      </li>
    {% endfor %}
  </ul>
{% endif %}
```

> **Note:** Read fields through `item.settings.*` (e.g. `item.settings.title`), not `item.title`. The top level only carries `id`, `uuid`, `slug`, `url`, `created`, and `updated`.

# Item Pages (template.liquid)

When `hasItemPages: true`, add a `template.liquid` to the type folder. Each item renders as a standalone page at `slugPrefix/item-slug.html`.

Item templates have access to two objects:

- `item` — the current item (`item.slug`, `item.settings.*`, etc.)
- `collection` — the type's schema (`collection.slugPrefix`, `collection.settings`, …)

```liquid
<article class="news-article">
  <div class="widget-container">
    <h1>{{ item.settings.title }}</h1>

    {% if item.settings.date != blank %}
      <p class="meta">
        <time datetime="{{ item.settings.date }}">{{ item.settings.date | format_date }}</time>
      </p>
    {% endif %}

    {% if item.settings.featured_image != blank %}
      {% image src: item.settings.featured_image, size: 'large', class: 'news-image', alt: item.settings.title %}
    {% endif %}

    {% if item.settings.body != blank %}
      <div class="rte">{{ item.settings.body | raw }}</div>
    {% endif %}
  </div>
</article>
```

A few things happen automatically for item pages:

- **They render inside your `layout.liquid`** — header, `main_content`, and footer wrap the template, just like a regular page.
- **SEO is wired for you.** Title, description, Open Graph, and canonical tags come from the item; you don't add SEO markup in `template.liquid`.
- **Links are depth-aware.** Item pages live one directory deep, so internal links and assets are prefixed with `../` during export. Use the `{% image %}` tag and `item.url` / menu links and it's handled — don't hand-build `/uploads/...` paths.
- **Richtext is escaped by default.** Render `richtext` fields with `| raw` (see [Autoescaping](theme-dev-liquid-assets.html#autoescaping-the-raw-filter)). Embedded images and internal links inside richtext resolve automatically.

# Where Item Data Lives

The theme ships the **schema and template**; the site owner's **item data** lives separately in the project:

```
collection-types/{type}/schema.json      # from your theme
collection-types/{type}/template.liquid  # from your theme
collections/{type}/{slug}.json           # one file per item (authored by the user)
collections/{type}/_order.json           # manual ordering (defaultSort: "manual")
```

Theme updates can ship new/changed collection **types** (schema and template); the user's **items** under `collections/` are never touched.

# Export Output

When you export the site, each item page is written to `{slugPrefix}/{slug}.html` and included in `sitemap.xml`. With Markdown export enabled, a `.md` alternate is written too. Only collection types with `hasItemPages: true` and a `template.liquid` produce pages; types without item pages exist purely to feed widgets via the `collection` filter.

# Authoring Checklist

- [ ] `collection-types/{type}/schema.json` with a unique lowercase `type` matching the folder
- [ ] Exactly one `usedAsTitle` text field; at most one `usedAsDate` date field
- [ ] `slugPrefix` set (or rely on the default `type`)
- [ ] If `hasItemPages: true`, a `template.liquid` that renders `item.settings.*`
- [ ] Richtext fields rendered with `| raw`
- [ ] A widget (or page) that lists items via the `collection` filter
- [ ] Seed demo items in a [preset](theme-dev-structure.html) so the type looks complete out of the box

# Related Pages

- [Collections](collections.html) — the end-user guide to managing items
- [Setting Types](theme-dev-setting-types.html) — the field types a schema can use
- [Liquid Tags & Filters](theme-dev-liquid-assets.html) — the `collection`, `format_date`, and `image` references
- [Theme Objects & Context](theme-dev-objects-context.html) — the `item` and `collection` objects

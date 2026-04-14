# Arch Theme Preset File Format Reference

Structural reference for the JSON files that make up an Arch preset. This document covers file shapes, field requirements, and naming conventions — not design strategy. For design decisions, see [theme-preset-generator.md](theme-preset-generator.md).

---

## 1. Directory Structure

The preset system supports partial presets through fallback to the theme root.
A preset may technically override only settings, only templates, or only menus.

However, **Arch presets are authored as full presets by convention**.

For Arch preset generation, every non-default preset should include:

```
themes/arch/presets/{preset-id}/
  preset.json                  # Theme settings overrides
  screenshot.png               # Preset preview image
  templates/
    index.json                 # Homepage
    about.json                 # One file per page
    contact.json
    ...
    global/
      header.json              # Header configuration
      footer.json              # Footer configuration
  menus/
    main-menu.json             # Primary navigation
    footer-menu.json           # Footer navigation
```

Why this convention exists:

- it keeps each preset self-contained
- it avoids hidden inheritance from root demo content
- it makes review and maintenance easier
- it better matches Arch's goal of each preset being a complete industry-specific site

### Screenshot exception

During generation, agents may reuse the root blank screenshot (`themes/arch/screenshot.png`) as a temporary placeholder.

If no custom screenshot is being created yet:

- copy `themes/arch/screenshot.png` into the preset as `screenshot.png`
- do not block preset creation on final screenshot production
- do not omit `screenshot.png`; use the blank placeholder until a real preview is created

The screenshot can be replaced later with a real preset preview.

The `preset-id` is a lowercase, hyphenated slug (e.g., `saffron`, `hue-and-co`).

---

## 2. preset.json

Flat map of setting overrides applied to `theme.json` defaults at project creation time.

```json
{
  "settings": {
    "standard_bg_primary": "#fafaf8",
    "standard_bg_secondary": "#f0ede6",
    "standard_text_heading": "#1a1c2b",
    "standard_text_content": "#3a3c4a",
    "standard_text_muted": "#7a7c88",
    "standard_border_color": "#dddbe0",
    "standard_accent": "#b8860b",
    "standard_accent_text": "#ffffff",
    "standard_rating_star": "#d4a017",
    "highlight_bg_primary": "#1a1c2b",
    "highlight_bg_secondary": "#111220",
    "highlight_text_heading": "#ffffff",
    "highlight_text_content": "#c8c6d0",
    "highlight_text_muted": "#8a889a",
    "highlight_border_color": "#3a3c4a",
    "highlight_accent": "#d4a843",
    "highlight_accent_text": "#1a1c2b",
    "highlight_rating_star": "#d4a017",
    "heading_font": {
      "stack": "\"Playfair Display\", serif",
      "weight": 700
    },
    "body_font": {
      "stack": "\"Source Sans 3\", sans-serif",
      "weight": 400
    },
    "corner_style": "slightly-rounded",
    "spacing_density": "default",
    "button_shape": "auto"
  }
}
```

### Required fields

All 18 color tokens must be present. Typography and style fields:

| Field | Type | Source of valid values |
|-------|------|-----------------------|
| `standard_bg_primary` through `highlight_rating_star` | Hex color string (e.g., `"#1a1c2b"`) | Any valid hex |
| `heading_font` | `{ "stack": "...", "weight": number }` | [arch-fonts-list.csv](arch-fonts-list.csv) — exact stack string and available weight |
| `body_font` | `{ "stack": "...", "weight": number }` | Same as above |
| `corner_style` | `"sharp"`, `"slightly-rounded"`, `"rounded"` | `theme.json` schema |
| `spacing_density` | `"compact"`, `"default"`, `"airy"` | `theme.json` schema |
| `button_shape` | `"auto"`, `"pill"`, `"sharp"` | `theme.json` schema |

---

## 3. Page Template JSON

Each page is a single JSON file in `templates/`. The filename is the page slug with `.json` extension.

### Structure

```json
{
  "name": "Contact",
  "slug": "contact",
  "widgets": {
    "widget_id_1": {
      "type": "map",
      "settings": { ... },
      "blocks": {
        "block_id_1": {
          "type": "info",
          "settings": { ... }
        },
        "block_id_2": {
          "type": "info",
          "settings": { ... }
        }
      },
      "blocksOrder": ["block_id_1", "block_id_2"]
    },
    "widget_id_2": {
      "type": "accordion",
      "settings": { ... },
      "blocks": { ... },
      "blocksOrder": [...]
    }
  },
  "widgetsOrder": ["widget_id_1", "widget_id_2"],
  "id": "contact",
  "created": "2026-04-03T10:00:00.000Z",
  "updated": "2026-04-03T10:00:00.000Z"
}
```

### Field reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name (e.g., `"Our Menu"`, `"About Us"`) |
| `slug` | Yes | URL slug — must match the filename without `.json` (e.g., `"contact"`, `"about"`) |
| `id` | Yes | Same as `slug` |
| `created` | Yes | ISO 8601 timestamp |
| `updated` | Yes | ISO 8601 timestamp |
| `widgets` | Yes | Object keyed by widget instance IDs (see §3.1) |
| `widgetsOrder` | Yes | Array of widget instance IDs defining render order |

**Do not include `uuid`** in preset templates. UUIDs are generated automatically when a project is created from the preset.

### 3.1 Widget instance IDs

Widget instance IDs are the keys in the `widgets` object. They are freeform strings that:

- Use `snake_case`
- Are descriptive of the widget's role on the page
- Must be unique within the page
- Must appear in `widgetsOrder` to be rendered

Examples: `"hero_banner"`, `"menu_starters"`, `"team_section"`, `"contact_map"`, `"faq"`

### 3.2 Widget object shape

```json
{
  "type": "banner",
  "settings": {
    "height": "large",
    "color_scheme": "highlight-primary"
  },
  "blocks": {
    "hero-heading": {
      "type": "heading",
      "settings": {
        "text": "Welcome",
        "size": "6xl"
      }
    }
  },
  "blocksOrder": ["hero-heading"]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Widget type — must match a widget directory name in `themes/arch/widgets/` |
| `settings` | Yes | Object of setting values. Only include settings you want to set — omitted settings use the schema default. Keys must exist in the widget's `schema.json`. |
| `blocks` | Conditional | Object keyed by block IDs. Required if the widget has block types. Omit entirely for blockless widgets (e.g., `image`, `scrolling-text`). |
| `blocksOrder` | Conditional | Array of block IDs defining render order. Required when `blocks` is present. |

### 3.3 Block IDs

Block IDs are the keys in the `blocks` object. They are freeform strings that:

- Use `kebab-case`
- Are descriptive of the block's content
- Must be unique within the widget
- Must appear in `blocksOrder` to be rendered

Examples: `"hero-heading"`, `"hero-text"`, `"starter-1"`, `"quote-2"`, `"info-hours"`

Footer blocks conventionally use `snake_case` IDs that mirror the block type pattern (for example `logo_text_1`, `menu_block_1`). See §5.

### 3.4 Block object shape

```json
{
  "type": "heading",
  "settings": {
    "text": "Our Story",
    "size": "3xl"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Block type — must match a block type in the parent widget's `schema.json` |
| `settings` | Yes | Object of setting values. Keys must exist in the block's settings definition in the widget schema. |

### 3.5 Widgets without blocks

Some widgets have no block types (e.g., `image`, `scrolling-text`). For these, omit `blocks` and `blocksOrder` entirely:

```json
{
  "type": "image",
  "settings": {
    "fullwidth": true
  }
}
```

### 3.6 Settings: only include what you set

Widget and block settings that are omitted fall back to the default defined in `schema.json`. Omit settings that match the default unless they are structural settings whose explicit presence improves readability.

In practice, keep key structural settings such as `color_scheme`, `layout`, and alignment-related settings explicit when they define how the preset is composed, even if they match the default.

---

## 4. Header Template

Located at `templates/global/header.json`. The header is a global widget with settings but no blocks.

```json
{
  "type": "header",
  "settings": {
    "logoText": "Saffron",
    "contactDetailsLine1": "(555) 234-5678",
    "contactDetailsLine2": "247 Elm Street, Brooklyn",
    "contact_position": "logo",
    "ctaButtonLink": {
      "href": "reservations.html",
      "text": "Reserve a Table",
      "target": "_self"
    },
    "ctaButtonStyle": "primary",
    "full_width": true,
    "sticky": true,
    "transparent_on_hero": true,
    "color_scheme": "standard-primary"
  }
}
```

### Available settings

| Setting | Type | Notes |
|---------|------|-------|
| `logoImage` | Image path | Logo image — leave empty to use `logoText` |
| `logoMaxWidth` | Number (50–300) | Max width in px for logo image. Default: 150 |
| `logoText` | String | Text logo — shown when no `logoImage` is set. Default: `"Arch"` |
| `contactDetailsLine1` | String | First line of contact info (phone, email, etc.) |
| `contactDetailsLine2` | String | Second line (address, service area, etc.) |
| `contact_position` | `"logo"` or `"menu"` | Where contact details display. Default: `"logo"` |
| `headerNavigation` | Menu ID string | Which menu to use. Default: `"main-menu"` |
| `center_nav` | Boolean | Center the navigation. Default: `false` |
| `ctaButtonLink` | Link object (see §7) | CTA button in header |
| `ctaButtonStyle` | `"primary"` or `"secondary"` | CTA button style. Default: `"secondary"` |
| `full_width` | Boolean | Full-width header. Default: `true` |
| `sticky` | Boolean | Sticky on scroll. Default: `false` |
| `transparent_on_hero` | Boolean | Transparent overlay on hero widgets. Default: `false` |
| `transparent_logo` | Image path | Alternate logo for transparent state |
| `color_scheme` | Color scheme string | Header background scheme. Default: `"standard-primary"` |

---

## 5. Footer Template

Located at `templates/global/footer.json`. The footer is a global widget with settings and blocks (max 4 blocks).

```json
{
  "type": "footer",
  "settings": {
    "copyright": "© 2026 Saffron Restaurant. All rights reserved.",
    "color_scheme": "highlight-primary"
  },
  "blocks": {
    "logo_text_1": {
      "type": "logo_text",
      "settings": {
        "text": "<p>A short description of the business.</p>"
      }
    },
    "text_block_1": {
      "type": "text_block",
      "settings": {
        "title": "Opening Hours",
        "text": "<p>Mon–Fri: 9 AM – 5 PM</p>"
      }
    },
    "menu_block_1": {
      "type": "menu_block",
      "settings": {
        "title": "Quick Links"
      }
    },
    "social_block_1": {
      "type": "social_block",
      "settings": {
        "title": "Follow Us"
      }
    }
  },
  "blocksOrder": ["logo_text_1", "text_block_1", "menu_block_1", "social_block_1"]
}
```

### Footer settings

| Setting | Type | Notes |
|---------|------|-------|
| `copyright` | String | Copyright text in the bottom bar |
| `layout` | `"first-featured"`, `"last-featured"`, `"equal"` | Column layout. Default: `"first-featured"` |
| `color_scheme` | Color scheme string | Footer background. Default: `"highlight-primary"` |

### Footer block types

| Block type | Settings | Notes |
|------------|----------|-------|
| `logo_text` | `logo_text` (text — overrides header logo text), `logo` (image), `logo_width` (range 50–300), `text` (richtext) | Brand column — logo/name + description. The `logo_text` setting defaults to the header's `logoText` if omitted. |
| `text_block` | `title` (text), `text` (richtext) | Freeform text column — hours, address, tagline, anything |
| `menu_block` | `title` (text), `menu` (menu ID, default: `"footer-menu"`) | Navigation links column |
| `social_block` | `title` (text) | Social media icons from global theme settings |

---

## 6. Menu JSON

Located in `menus/`. Each menu is a separate JSON file.

```json
{
  "id": "main-menu",
  "name": "Main Menu",
  "items": [
    { "label": "Home", "link": "index.html", "items": [] },
    { "label": "Menu", "link": "menu.html", "items": [] },
    { "label": "About", "link": "about.html", "items": [] },
    {
      "label": "More",
      "link": "",
      "items": [
        { "label": "Gallery", "link": "gallery.html", "items": [] },
        { "label": "FAQ", "link": "faq.html", "items": [] }
      ]
    }
  ]
}
```

### Field reference

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Menu slug — must match the filename without `.json` (e.g., `"main-menu"`) |
| `name` | Yes | Display name (e.g., `"Main Menu"`, `"Footer Menu"`) |
| `items` | Yes | Array of menu item objects |

### Menu item object

| Field | Required | Description |
|-------|----------|-------------|
| `label` | Yes | Display text in the navigation |
| `link` | Yes | URL — use `"{slug}.html"` for internal pages (e.g., `"about.html"`, `"index.html"`) |
| `items` | Yes | Array of child menu items (empty array `[]` for leaf items). Supports up to 4 nesting levels. |

**Do not include `pageUuid`** in preset menu templates. UUIDs and `pageUuid` references are generated and enriched automatically at project creation time based on matching page slugs.

**Do not include `uuid`, `created`, or `updated`** in preset menu files. These are added at project creation.

### Naming convention

- Primary navigation: `main-menu.json` (id: `"main-menu"`)
- Footer navigation: `footer-menu.json` (id: `"footer-menu"`)

The header defaults to `"main-menu"` and the footer's `menu_block` defaults to `"footer-menu"`. These can be overridden in the header/footer settings if needed.

---

## 7. Link Objects

Link objects appear in button blocks and the header CTA. The format:

```json
{
  "href": "about.html",
  "text": "Learn More",
  "target": "_self"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `href` | Yes | URL — use `"{slug}.html"` for internal pages, full URL for external |
| `text` | Yes | Button/link display text |
| `target` | Yes | `"_self"` for same tab, `"_blank"` for new tab |

**Do not include `pageUuid`** in link objects in preset templates. It is added automatically at project creation.

### Button blocks with two links

Some button blocks support a second link (`link_2`, `style_2`):

```json
{
  "type": "button",
  "settings": {
    "link": {
      "href": "menu.html",
      "text": "View Menu",
      "target": "_self"
    },
    "style": "primary",
    "link_2": {
      "href": "reservations.html",
      "text": "Reserve a Table",
      "target": "_self"
    },
    "style_2": "secondary",
    "size": "large"
  }
}
```

---

## 8. Color Scheme Strings

Used in widget `color_scheme` settings, the header, and the footer:

| Value | Role |
|-------|------|
| `"standard-primary"` | Default page surface |
| `"standard-secondary"` | Soft alternate surface for visual banding |
| `"highlight-primary"` | High-emphasis dark/colored surface |
| `"highlight-secondary"` | Alternate emphasis surface |

---

## 9. Preset Registry Update

After creating a preset, add an entry to `themes/arch/presets/presets.json`:

```json
{
  "id": "{preset-id}",
  "name": "Preset Name",
  "description": "Industry label"
}
```

---

## 10. What Preset Templates Do Not Include

Preset templates are **simpler** than project files. The following fields are added automatically at project creation and must **not** be present in preset templates:

| Field | Where | Added by |
|-------|-------|----------|
| `uuid` | Pages, menus | Generated at project creation |
| `pageUuid` | Menu items, link objects | Enriched at project creation by matching page slugs |
| `seo` | Pages | Added with defaults at project creation |

Keep preset templates minimal — they represent the starting content, not the full runtime state.

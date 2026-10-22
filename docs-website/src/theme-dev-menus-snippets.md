---
description: Create menus and snippets for Widgetizer themes. Reusable navigation structures and Liquid partials for clean, consistent code.
---

Menus and snippets are reusable building blocks that keep themes clean and consistent. Menus define navigation data, and snippets encapsulate reusable Liquid partials.

# Menus

Menus live in the `menus/` folder and are JSON files.

### Example (Arch)

For example, `themes/arch/menus/main-menu.json` includes:

- `id`
- `name`
- `items` with nested children (up to 3 levels)

### Structure

```json
{
  "id": "main-menu",
  "name": "Main menu",
  "items": [
    {
      "label": "Home",
      "link": "index.html",
      "items": []
    }
  ]
}
```

### Theme Menus in Projects

Theme menus are starter content. When a project is created they're copied into it (from the chosen preset's `menus/` when it has them), and every `link` naming a page by slug (`"index.html"`, `"contact.html"`) is connected to that page so it follows renames. From then on the menus belong to the owner:

- Each language of a site has its own copy of every menu. Theme menus land in the default language; when the owner adds a language, they're copied there to translate.
- A theme update adds menus that are new and never changes existing ones. `npm run theme:sync` never copies menus into a project either.

### Rendering Menus

Use the menu snippet and pass class names for styling:

```liquid
{% render 'menu',
  menu: widget.settings.headerNavigation,
  aria_label: widget.settings.navigation_label,
  class_nav: 'site-header__nav',
  class_list: 'site-header__nav-list',
  class_item: 'site-header__nav-item',
  class_link: 'site-header__nav-link',
  class_submenu: 'site-header__nav-submenu',
  class_has_submenu: 'site-header__nav-item--has-submenu'
%}
```

**Available parameters:**

- `menu`: Menu object with an `items` array (required)
- `aria_label`: Accessible label for the `<nav>` element. Pass a translated value, such as a header setting or a `t` word, not a literal like "Primary"
- `skip_nav`: Set to `true` if your widget already wraps the menu in its own `<nav>`
- `class_nav`: Classes for the `<nav>` element (when not skipped)
- `class_list`: Classes for `<ul>` elements
- `class_item`: Classes for `<li>` elements
- `class_link`: Classes for `<a>` elements
- `class_submenu`: Classes for nested `<ul>` elements
- `class_has_submenu`: Extra class for `<li>` items that contain a submenu

If you need the menu data directly (for custom rendering), access it in widget templates via a `menu` setting type. See [Setting Types](theme-dev-setting-types.html) and [Widgets & Blocks](theme-dev-widgets-blocks.html).

A `menu` setting holds either a menu the owner picked, which stays that exact menu on every page, or a slug from a schema default or starter content, which resolves to the current language's menu of that name (falling back to the default language's). Each language has its own header and footer, so a picked menu there is usually that language's own; a menu picked in a shared `theme.json` setting shows the same menu on every language. Item links arrive already resolved for the page's depth and the Clean URLs setting. A link to a page the owner picked keeps pointing at that exact page, even from another language. `menu` settings in `theme.json` work the same way as in widgets (see [Theme Manifest & Settings](theme-dev-manifest-settings.html#links-menus-and-rich-text-in-theme-settings)).

### Active Menu Items

The core `menu.liquid` snippet automatically adds an `is-active` class (and `aria-current="page"`) to the menu item matching the current page. It compares each item's `canonicalPath` against the global `currentCanonicalPath` (see [Theme Objects & Context](theme-dev-objects-context.html#render-globals-also-inside-snippets)), so active state is matched on the canonical path rather than the displayed `href` and keeps working on nested collection-item pages whose links are prefixed with `../`. Hook into this class in your theme CSS to style the current page in navigation:

```css
.site-header__nav-link.is-active { color: var(--accent); }
```

# Snippets

Snippets are reusable Liquid partials rendered with `{% render 'name' %}`. They come from two places:

- **Theme snippets:** files in your theme's `snippets/` folder (e.g. `snippets/icon.liquid`).
- **Built-in snippets:** a small set Widgetizer provides. The `menu` snippet used above is built in, so you can render menus without shipping your own.

When the same name exists in both, **your theme's version wins**, so you can override a built-in snippet by adding a file with that name to `snippets/`.

### Icon Snippet (Arch)

For example, `themes/arch/snippets/icon.liquid` renders an SVG icon from `assets/icons.json` and falls back to a default icon if the requested one doesn't exist.

### Usage

```liquid
{% render 'icon', icon: 'lightning', class: 'widget-card-icon' %}
```

A snippet does **not** see the calling template's variables. It gets only the parameters you pass, plus a few render globals, so pass `page`, `widget` or `project` values explicitly:

```liquid
{% render 'language-switcher', translations: page.translations, label: widget.settings.language_switcher_label %}
```

Image tags, `media_meta`, `page_url` / `item_url`, the `collection` filter, `format_date` and `t` work inside a snippet without extra parameters. For the full list and asset resolution rules, see [Liquid Tags & Filters](theme-dev-liquid-assets.html#render-snippet-name).

# Practical Guidance

### Keep Menus Data-Only

Menus should define structure and links, not styling. Styling belongs in your templates and CSS.

### Use Snippets for Reuse

If a Liquid fragment is used in multiple widgets or templates, extract it into `snippets/` and render it via `{% render %}`.

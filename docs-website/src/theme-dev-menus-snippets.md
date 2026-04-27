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

### Rendering Menus

Use the menu snippet and pass class names for styling:

```liquid
{% render 'menu',
  menu: widget.settings.headerNavigation,
  aria_label: 'Primary',
  class_nav: 'site-header__nav',
  class_list: 'site-header__nav-list',
  class_item: 'site-header__nav-item',
  class_link: 'site-header__nav-link',
  class_submenu: 'site-header__nav-submenu',
  class_has_submenu: 'site-header__nav-item--has-submenu'
%}
```

**Available parameters:**

- `menu` — Menu object with an `items` array (required)
- `aria_label` — Accessible label for the `<nav>` element (e.g., "Primary", "Footer")
- `skip_nav` — Set to `true` if your widget already wraps the menu in its own `<nav>`
- `class_nav` — Classes for the `<nav>` element (when not skipped)
- `class_list` — Classes for `<ul>` elements
- `class_item` — Classes for `<li>` elements
- `class_link` — Classes for `<a>` elements
- `class_submenu` — Classes for nested `<ul>` elements
- `class_has_submenu` — Extra class for `<li>` items that contain a submenu

If you need the menu data directly (for custom rendering), access it in widget templates via a `menu` setting type. See [Setting Types](theme-dev-setting-types.html) and [Widgets & Blocks](theme-dev-widgets-blocks.html).

### Active Menu Items

The core `menu.liquid` snippet automatically adds an `is-active` class to menu items whose link matches the current page slug (resolved via the global `pageSlug` variable — see [Theme Objects & Context](theme-dev-objects-context.html#global-variables-available-everywhere)). Hook into this class in your theme CSS to style the current page in navigation:

```css
.site-header__nav-link.is-active { color: var(--accent); }
```

# Snippets

Snippets are reusable Liquid partials in `snippets/`.

### Icon Snippet (Arch)

For example, `themes/arch/snippets/icon.liquid` renders an SVG icon from `assets/icons.json` and supports a fallback icon if the requested one doesn’t exist.

### Usage

```liquid
{% render 'icon', icon: 'lightning', class: 'widget-card-icon' %}
```

For asset resolution rules and snippet rendering details, see [Liquid Tags & Assets](theme-dev-liquid-assets.html).

# Practical Guidance

### Keep Menus Data-Only

Menus should define structure and links, not styling. Styling belongs in your templates and CSS.

### Use Snippets for Reuse

If a Liquid fragment is used in multiple widgets or templates, extract it into `snippets/` and render it via `{% render %}`.

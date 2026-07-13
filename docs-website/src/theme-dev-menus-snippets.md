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

- `menu`: Menu object with an `items` array (required)
- `aria_label`: Accessible label for the `<nav>` element (e.g., "Primary", "Footer")
- `skip_nav`: Set to `true` if your widget already wraps the menu in its own `<nav>`
- `class_nav`: Classes for the `<nav>` element (when not skipped)
- `class_list`: Classes for `<ul>` elements
- `class_item`: Classes for `<li>` elements
- `class_link`: Classes for `<a>` elements
- `class_submenu`: Classes for nested `<ul>` elements
- `class_has_submenu`: Extra class for `<li>` items that contain a submenu

If you need the menu data directly (for custom rendering), access it in widget templates via a `menu` setting type. See [Setting Types](theme-dev-setting-types.html) and [Widgets & Blocks](theme-dev-widgets-blocks.html).

### Active Menu Items

The core `menu.liquid` snippet automatically adds an `is-active` class (and `aria-current="page"`) to the menu item matching the current page. It compares each item's `canonicalPath` against the global `currentCanonicalPath` (see [Theme Objects & Context](theme-dev-objects-context.html#global-variables-available-everywhere)), so active state is matched on the canonical path rather than the displayed `href` and keeps working on nested collection-item pages whose links are prefixed with `../`. Hook into this class in your theme CSS to style the current page in navigation:

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

Snippets receive the full render context plus any parameters you pass. For asset resolution rules and rendering details, see [Liquid Tags & Filters](theme-dev-liquid-assets.html).

# Practical Guidance

### Keep Menus Data-Only

Menus should define structure and links, not styling. Styling belongs in your templates and CSS.

### Use Snippets for Reuse

If a Liquid fragment is used in multiple widgets or templates, extract it into `snippets/` and render it via `{% render %}`.

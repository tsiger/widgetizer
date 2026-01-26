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
  class_menu: 'site-header__nav',
  class_list: 'site-header__nav-list',
  class_item: 'site-header__nav-item',
  class_link: 'site-header__nav-link',
  class_submenu: 'site-header__nav-submenu',
  class_has_submenu: 'site-header__nav-item--has-submenu'
%}
```

If you need the menu data directly (for custom rendering), access it in widget templates via a `menu` setting type. See [Setting Types](theme-dev-setting-types.html) and [Widgets & Blocks](theme-dev-widgets-blocks.html).

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

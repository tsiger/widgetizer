---
description: Advanced Widgetizer theme development including JavaScript patterns, animations, export behavior, and accessibility best practices.
---

Advanced theme development covers JavaScript patterns, animations, export behavior, and accessibility rules. This page summarizes the essentials for production-ready themes.

# JavaScript Patterns

Widget scripts must be scoped per widget instance. Use the standard pattern:

```javascript
(function () {
  const widget = document.getElementById("{{ widget.id }}");
  if (!widget || widget.dataset.initialized) return;
  widget.dataset.initialized = "true";

  const triggers = widget.querySelectorAll(".trigger");
  const panels = widget.querySelectorAll(".panel");
})();
```

Key points:

- Always scope queries to `widget`
- Guard against double initialization
- Never use global `document.querySelector()` inside widgets
- Never hardcode words a visitor reads or hears (button text, `aria-label`s)

## Words for Scripts

A script that builds controls in the browser can't use the `t` filter, so render the words into the markup and read them from there:

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-gallery widget-{{ widget.id }}"
  data-widget-id="{{ widget.id }}"
  data-widget-type="gallery"
  data-t-next="{{ 'site.common.next' | t }}"
  data-t-previous="{{ 'site.common.previous' | t }}"
>
```

```javascript
const nextLabel = widget.dataset.tNext || "Next";
nextButton.setAttribute("aria-label", nextLabel);
```

Words several widgets share can go on `<body>` in `layout.liquid`, as Arch does for its lightbox. Insert them with `textContent` or `setAttribute`, never as HTML. See [Localization](theme-dev-localization.html#words-a-script-builds).

## External Scripts and Partial Updates

When using external JavaScript files (via `{% enqueue_script %}`), the script only runs once at page load. During partial DOM updates in the editor, the widget HTML is replaced but external scripts don't re-run, causing event listeners to be lost.

**The Solution:** Listen for the `widget:updated` event, which fires after the editor morphs a widget:

```javascript
(function () {
  "use strict";

  function initMyWidget(widget) {
    if (widget.dataset.initialized) return;
    widget.dataset.initialized = "true";

    // Setup event listeners
    widget.querySelectorAll(".my-button").forEach((btn) => {
      btn.addEventListener("click", () => {
        /* handle click */
      });
    });
  }

  // Initial page load
  document.querySelectorAll('[data-widget-type="my-widget"]').forEach(initMyWidget);

  // Re-initialize after partial updates
  document.addEventListener("widget:updated", (e) => {
    const widget = e.target.closest('[data-widget-type="my-widget"]');
    if (widget) {
      widget.removeAttribute("data-initialized");
      initMyWidget(widget);
    }
  });
})();
```

**When to use this pattern:**

- External `.js` files loaded via `{% enqueue_script %}`
- Widgets with interactive JavaScript (sliders, tabs, etc.)

**When NOT needed:**

- Inline scripts in `widget.liquid` (automatically re-executed)
- CSS-only widgets

# Scroll Reveal Animations

Arch includes a reveal system controlled by `theme.general.enable_reveal_animations`, but you can implement any animation system you want (or none at all).

### Required Pieces

- Add `.reveal` classes in templates
- Conditionally load `reveal.js` in `layout.liquid`
- Use a CSS override when animations are disabled

### Example (Arch)

```liquid
{% unless theme.general.enable_reveal_animations %}
  <style>.reveal { opacity: 1 !important; transform: none !important; }</style>
{% endunless %}
{% if theme.general.enable_reveal_animations %}
  {% asset src: "reveal.js", defer: true %}
{% endif %}
```

# Export Behavior

During export:

- Theme assets in `assets/` are copied
- Widget `.css` and `.js` files that a rendered page enqueued are flattened into `assets/`, next to the theme's own files. Files in subfolders of a widget aren't supported
- Duplicate filenames collide, across widgets and theme assets alike
- Stylesheet and script URLs get a fresh cache-busting `?v=` token on every export

Use unique, widget-prefixed filenames, keep widget files directly in the widget folder, and load them with the enqueue tags. The theme checker reports duplicate names. See [Asset Sources](theme-dev-liquid-assets.html#asset-sources).

# Accessibility

Themes must follow the heading hierarchy rules:

- First widget title on a page uses `<h1>`
- Subsequent widget titles use `<h2>`
- Child headings follow `<h3>` and beyond

Other requirements:

- Use `alt` text on images (`{% image %}` fills it from the media library, in the page's language)
- Use `aria-*` for interactive controls, with labels from the `site` dictionary or a setting, never literals
- Set `<html lang>` from `page.language` so screen readers pronounce each language correctly
- Ensure keyboard navigation (Tab, Enter/Space, Escape, Arrow keys)

# Reduced Motion

The reveal system respects `prefers-reduced-motion`. Avoid forcing animations in CSS if the user has reduced motion enabled.

See [Layout & Templates](theme-dev-layout-templates.html) for asset placement and [Widgets & Blocks](theme-dev-widgets-blocks.html) for widget-level JS patterns. Theme setting access is described in [Theme Objects & Context](theme-dev-objects-context.html).

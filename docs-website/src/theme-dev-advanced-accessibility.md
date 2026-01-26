---
description: Advanced Widgetizer theme development including JavaScript patterns, animations, export behavior, and accessibility best practices.
---

Advanced theme development covers JavaScript patterns, animations, export behavior, and accessibility rules. This page summarizes the essentials for production-ready themes.

# JavaScript Patterns

Widget scripts must be scoped per widget instance. Use the standard pattern:

```javascript
(function () {
  const widget = document.getElementById('{{ widget.id }}');
  if (!widget || widget.dataset.initialized) return;
  widget.dataset.initialized = 'true';

  const triggers = widget.querySelectorAll('.trigger');
  const panels = widget.querySelectorAll('.panel');
})();
```

Key points:

- Always scope queries to `widget`
- Guard against double initialization
- Never use global `document.querySelector()` inside widgets

# Scroll Reveal Animations

Arch includes a reveal system controlled by `theme.layout.enable_reveal_animations`, but you can implement any animation system you want (or none at all).

### Required Pieces

- Add `.reveal` classes in templates
- Conditionally enqueue `reveal.js` in `layout.liquid`
- Use a CSS override when animations are disabled

### Example (Arch)

```liquid
{% unless theme.layout.enable_reveal_animations %}
  <style>.reveal { opacity: 1 !important; transform: none !important; }</style>
{% endunless %}
{% if theme.layout.enable_reveal_animations %}
  {% enqueue_script "reveal.js", { "priority": 50 } %}
{% endif %}
```

# Export Behavior

During export:

- Theme assets in `/assets/` are copied
- Widget `.css` and `.js` files are flattened into `/assets/`
- Duplicate filenames will collide

Use unique, widget-prefixed filenames to avoid collisions.

# Accessibility

Themes must follow the heading hierarchy rules:

- First widget title on a page uses `<h1>`
- Subsequent widget titles use `<h2>`
- Child headings follow `<h3>` and beyond

Other requirements:

- Use `alt` text on images
- Use `aria-*` for interactive controls
- Ensure keyboard navigation (Tab, Enter/Space, Escape, Arrow keys)

# Reduced Motion

The reveal system respects `prefers-reduced-motion`. Avoid forcing animations in CSS if the user has reduced motion enabled.

See [Layout & Templates](theme-dev-layout-templates.html) for asset placement and [Widgets & Blocks](theme-dev-widgets-blocks.html) for widget-level JS patterns. Theme setting access is described in [Theme Objects & Context](theme-dev-objects-context.html).

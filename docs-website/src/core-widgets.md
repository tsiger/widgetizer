---
description: Core widgets are Widgetizer's built-in, theme-agnostic building blocks (Form, Divider, and Spacer), available in every project unless a theme opts out.
---

Most widgets come from your [theme](themes.html), so the set you see depends on the theme you chose. **Core widgets** are different: they are built into Widgetizer itself, so they are available in every project no matter which theme you use.

They cover the small, structural pieces that nearly every site needs, so themes don't have to reinvent them. You'll find them in the widget inserter alongside your theme's own widgets.

<figure class="doc-screenshot">
  <img src="assets/screenshots/widget-picker-form.png" alt="Widgetizer page editor showing the Add widget popover with the built-in Form widget available from search." loading="lazy">
  <figcaption>Core widgets appear in the same inserter as theme widgets, unless the active theme explicitly hides them.</figcaption>
</figure>

# The Core Widgets

### Form

A contact or inquiry form you build visually from field blocks. It has its own guide: see [Forms](forms.html).

### Divider

A horizontal line for separating sections. You can set its **color**, **thickness** (1-10px), **width** (10-100% of the container), and the **padding** above and below it.

### Spacer

A block of vertical space between widgets, handy for fine-tuning rhythm without inserting empty text. Set its **height** (10-200px), and optionally give it a different **height on mobile** or hide it on mobile entirely.

# Turning Core Widgets Off

Core widgets are included by default. A theme can hide them by setting `useCoreWidgets: false` in its manifest, in which case only the theme's own widgets appear in the editor. See [Theme Manifest & Settings](theme-dev-manifest-settings.html) for that flag.

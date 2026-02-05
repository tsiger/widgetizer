---
description: Custom Liquid tags and filters in Widgetizer for assets, media, SEO, and theme settings. Complete reference with examples.
---

Widgetizer extends LiquidJS with custom tags and filters for assets, media, SEO, and theme settings. This page documents all available tags with usage examples. For where these tags belong in the document structure, see [Layout & Templates](theme-dev-layout-templates.html).

# Asset Tags

## Where Assets Come From

Asset tags load files from different folders depending on where you use them:

| Context                        | Source Folder     |
| :----------------------------- | :---------------- |
| `layout.liquid`                | `assets/`         |
| `snippets/*.liquid`            | `assets/`         |
| `widgets/{name}/widget.liquid` | `widgets/{name}/` |

`{% asset %}`

Immediately outputs a CSS, JS, or image asset inline where it's placed.

```liquid
{# In layout.liquid — loads from assets/ #}
{% asset src: "base.css" %}        {# → assets/base.css #}
{% asset src: "scripts.js" %}      {# → assets/scripts.js #}
{% asset src: "logo.svg" %}        {# → assets/logo.svg #}

{# In widgets/slideshow/widget.liquid — loads from widgets/slideshow/ #}
{% asset src: "slideshow.css" %}   {# → widgets/slideshow/slideshow.css #}
{% asset src: "slideshow.js" %}    {# → widgets/slideshow/slideshow.js #}
```

Output depends on file type:

- `.css` → `<link rel="stylesheet" href="...">`
- `.js` → `<script src="..."></script>`
- Images → `<img src="...">`

**Options:**

```liquid
{% asset src: "scripts.js", defer: true %}
{% asset src: "vendor.js", async: true %}
{% asset src: "print.css", media: "print" %}
{% asset src: "theme.css", id: "theme-stylesheet" %}
```

| Option        | Type    | Description                      |
| :------------ | :------ | :------------------------------- |
| `defer`       | Boolean | Add `defer` attribute to scripts |
| `async`       | Boolean | Add `async` attribute to scripts |
| `media`       | String  | Media query for stylesheets      |
| `id`          | String  | ID attribute for the tag         |
| `crossorigin` | String  | For external resources           |
| `integrity`   | String  | Subresource integrity hash       |

`{% enqueue_style %}`

Registers a stylesheet for deferred output via `{% header_assets %}` or `{% footer_assets %}`. Enqueued assets are deduplicated — the same file won't load twice.

```liquid
{# In widgets/slideshow/widget.liquid — loads from widgets/slideshow/ #}
{% enqueue_style src: "slideshow.css" %}
{% enqueue_style src: "slideshow.css", priority: 10 %}
{% enqueue_style src: "print.css", media: "print", location: "footer" %}
```

| Option     | Default    | Description                                   |
| :--------- | :--------- | :-------------------------------------------- |
| `priority` | `50`       | Lower numbers load first (10 → 20 → 50 → 100) |
| `location` | `"header"` | Where to output: `"header"` or `"footer"`     |
| `media`    | `null`     | Media query attribute                         |
| `id`       | `null`     | ID attribute                                  |

`{% enqueue_script %}`

Registers a script for deferred output.

```liquid
{# In widgets/slideshow/widget.liquid — loads from widgets/slideshow/ #}
{% enqueue_script src: "slideshow.js" %}
{% enqueue_script src: "slideshow.js", priority: 10 %}
{% enqueue_script src: "analytics.js", location: "header", defer: true %}
```

| Option     | Default    | Description                               |
| :--------- | :--------- | :---------------------------------------- |
| `priority` | `50`       | Lower numbers load first                  |
| `location` | `"footer"` | Where to output: `"header"` or `"footer"` |
| `defer`    | `false`    | Add `defer` attribute                     |
| `async`    | `false`    | Add `async` attribute                     |

`{% enqueue_preload %}`

Registers a resource preload directive for the `<head>`.

```liquid
{% enqueue_preload src: "hero.jpg", as: "image", fetchpriority: "high" %}
{% enqueue_preload src: "font.woff2", as: "font", type: "font/woff2", crossorigin: true %}
```

**Options:** `src`, `as`, `type`, `fetchpriority`, `media`, `imagesrcset`, `imagesizes`, `crossorigin`.

`{% header_assets %}` and `{% footer_assets %}`

Output all enqueued assets for that location, sorted by priority. Styles render first, then scripts.

```liquid
<!DOCTYPE html>
<html>
<head>
  {% asset src: "base.css" %}       {# Immediate output from assets/base.css #}
  {% header_assets %}          {# Outputs all enqueued header styles/scripts #}
</head>
<body>
  {{ main_content }}
  {% asset src: "scripts.js" %}     {# Immediate output from assets/scripts.js #}
  {% footer_assets %}          {# Outputs all enqueued footer styles/scripts #}
</body>
</html>
```

`{% placeholder_image %}`

Outputs a placeholder image for development/preview. Placeholders come from:

1. **Core placeholders** — Built-in SVGs served by Widgetizer (default)
2. **Custom placeholders** — Your own image from the theme's `assets/` folder

```liquid
{# Core placeholders (built-in) #}
{% placeholder_image %}                    {# Landscape 16:9 as <img> #}
{% placeholder_image aspect: 'portrait' %}         {# Portrait 9:16 as <img> #}
{% placeholder_image aspect: 'square' %}           {# Square 1:1 as <img> #}

{# URL only (for CSS backgrounds) #}
{% placeholder_image output: 'url' %}              {# Landscape URL #}
{% placeholder_image aspect: 'square', output: 'url' %}    {# Square URL #}

{# Custom placeholder from assets/ folder #}
{% placeholder_image src: 'my-placeholder.svg' %}
{% placeholder_image src: 'my-placeholder.jpg', output: 'url' %}

{# With options #}
{% placeholder_image aspect: 'landscape', class: "hero-placeholder", loading: "lazy" %}
```

**Aspect ratios:**

- `landscape` — 16:9 (1600×900) — default
- `portrait` — 9:16 (900×1600)
- `square` — 1:1 (1200×1200)

# SEO and Font Tags

`{% seo %}`

Outputs SEO meta tags (title, description, Open Graph, Twitter Cards, canonical URL). Place in `<head>`.

```liquid
<head>
  {% seo %}
</head>
```

`{% fonts %}`

Outputs font preconnect links and stylesheet based on theme typography settings. Automatically handles Google Fonts and Bunny Fonts (privacy-friendly alternative).

```liquid
<head>
  {% fonts %}
</head>
```

# Theme Settings Tags

`{% theme_settings %}`

Outputs CSS variables for all global settings that have `outputAsCssVar: true`. Place in `<head>`.

```liquid
<head>
  {% theme_settings %}
</head>
```

This outputs a `<style>` block with variables like `--colors-accent`, `--typography-heading_font-family`, etc. See [Theme Manifest & Settings](theme-dev-manifest-settings.html) for how to define settings.

`{% custom_css %}`

Outputs custom CSS from the theme's `advanced.custom_css` setting, wrapped in a `<style>` tag.

```liquid
<head>
  {% custom_css %}
</head>
```

`{% custom_head_scripts %}`

Outputs raw HTML/JS from the theme's `advanced.custom_head_scripts` setting (e.g., Google Analytics).

```liquid
<head>
  {% custom_head_scripts %}
</head>
```

`{% custom_footer_scripts %}`

Outputs raw HTML/JS from the theme's `advanced.custom_footer_scripts` setting.

```liquid
<body>
  ...
  {% custom_footer_scripts %}
</body>
```

# Layout Placeholders

These are only available in `layout.liquid`. For data objects available in widgets, see [Theme Objects & Context](theme-dev-objects-context.html).

| Placeholder          | Description                         |
| :------------------- | :---------------------------------- |
| `{{ header }}`       | Rendered global header widget       |
| `{{ main_content }}` | Rendered page widgets               |
| `{{ footer }}`       | Rendered global footer widget       |
| `{{ body_class }}`   | Contextual CSS classes for `<body>` |

# Snippet and Menu Tags

`{% render 'snippet_name' %}`

Renders a snippet from the `snippets/` folder.

```liquid
{% render 'icon', icon: 'arrow-right', class: 'nav-icon' %}
{% render 'menu', menu: widget.settings.navigation, class_menu: 'nav' %}
```

For menu structure and snippet conventions, see [Menus & Snippets](theme-dev-menus-snippets.html).

# Media Filters

Media filters render uploaded media from the media library.

`image`

Renders an `<img>` tag or returns a path.

```liquid
{# Full <img> tag #}
{# Full <img> tag #}
{% image src: widget.settings.heroImage %}
{% image src: widget.settings.heroImage, size: 'large' %}
{% image src: widget.settings.heroImage, size: 'large', class: 'hero-image', lazy: false, alt: 'Alt text' %}

{# Path only (for CSS backgrounds) #}
{% image src: widget.settings.heroImage, output: 'path' %}
{% image src: widget.settings.heroImage, size: 'large', output: 'path' %}
```

**Parameters (for `<img>` output):**

| Position | Parameter | Default      | Description                                 |
| :------- | :-------- | :----------- | :------------------------------------------ |
| 1        | `size`    | `'medium'`   | `'thumb'`, `'small'`, `'medium'`, `'large'` |
| 2        | `class`   | `''`         | CSS class                                   |
| 3        | `lazy`    | `true`       | Add `loading="lazy"`                        |
| 4        | `alt`     | (from media) | Alt text override                           |
| 5        | `title`   | (from media) | Title override                              |

**Parameters (for path output):**

| Position | Parameter | Description                                 |
| :------- | :-------- | :------------------------------------------ |
| 1        | `mode`    | `'path'` or `'url'`                         |
| 2        | `size`    | `'thumb'`, `'small'`, `'medium'`, `'large'` |

`video`

Renders a `<video>` tag or returns a path.

```liquid
{# Full <video> tag #}
{# Full <video> tag #}
{% video src: widget.settings.bgVideo %}
{% video src: widget.settings.bgVideo, controls: true, autoplay: true, muted: true, loop: true, class: 'bg-video' %}

{# Path only #}
{% video src: widget.settings.bgVideo, output: 'path' %}
```

**Parameters (for `<video>` output):**

| Position | Parameter  | Default | Description   |
| :------- | :--------- | :------ | :------------ |
| 1        | `controls` | `true`  | Show controls |
| 2        | `autoplay` | `false` | Auto-play     |
| 3        | `muted`    | `false` | Mute audio    |
| 4        | `loop`     | `false` | Loop playback |
| 5        | `class`    | `''`    | CSS class     |

`audio`

Returns an audio file path (no HTML element).

```liquid
{% audio src: widget.settings.backgroundMusic %}

{# Use with HTML5 audio #}
<audio controls>
  <source src="{% audio src: widget.settings.music %}" type="audio/mpeg">
</audio>
```

`youtube`

Renders a responsive YouTube embed or returns the embed URL.

```liquid
{# Full embed #}
{# Full embed #}
{% youtube src: widget.settings.video %}
{% youtube src: widget.settings.video, class: 'hero-video' %}

{# Embed URL only #}
{% youtube src: widget.settings.video, output: 'path' %}
```

# Export Behavior

During export, widget `.css` and `.js` files are flattened into a single `assets/` folder. If two widgets have files with the same name, the last one wins.

> **Warning:** Always use unique, widget-prefixed filenames (e.g., `slideshow.css` instead of `styles.css`) to avoid collisions.

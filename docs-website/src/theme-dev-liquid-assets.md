---
description: Custom Liquid tags in Widgetizer for assets, media, SEO, and theme settings. Complete reference with examples.
---

Widgetizer extends LiquidJS with custom tags for assets, media, SEO, and theme settings. This page documents all available tags with usage examples. For where these tags belong in the document structure, see [Layout & Templates](theme-dev-layout-templates.html).

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
| `theme`    | `false`    | Load from theme `assets/` instead of widget folder |

### Theme-Level Script Resolution

By default, `{% enqueue_script %}` inside a widget loads from the widget's own folder. Set `theme: true` to load a shared script from the theme's `assets/` folder instead. This is useful for scripts shared across multiple widgets (e.g., a carousel library):

```liquid
{# In widgets/gallery/widget.liquid — loads from assets/carousel.js, not widgets/gallery/ #}
{% enqueue_script src: "carousel.js", theme: true, defer: true %}
```

Scripts are deduplicated by filename, so multiple widgets can enqueue the same theme script without it loading twice.

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

# Media Tags

Media tags render uploaded media from the media library.

`{% image %}`

Renders an `<img>` tag or returns a path.

```liquid
{# Full <img> tag #}
{% image src: widget.settings.heroImage %}
{% image src: widget.settings.heroImage, size: 'large' %}
{% image src: widget.settings.heroImage, size: 'large', class: 'hero-image', lazy: false, alt: 'Alt text' %}

{# Path only (for CSS backgrounds) #}
{% image src: widget.settings.heroImage, output: 'path' %}
{% image src: widget.settings.heroImage, size: 'large', output: 'path' %}
```

**Parameters:**

| Parameter       | Default    | Description                                                    |
| :-------------- | :--------- | :------------------------------------------------------------- |
| `src`           | (required) | Image filename from widget/block settings                      |
| `size`          | `'medium'` | Which image size variant to use (`thumb`, `small`, `medium`, `large`, or custom theme sizes) |
| `class`         | `null`     | CSS class for the `<img>` element                              |
| `lazy`          | `true`     | Enable lazy loading (`loading="lazy"`)                         |
| `alt`           | `null`     | Alt text (falls back to media library alt text)                |
| `title`         | `null`     | Title attribute                                                |
| `output`        | `null`     | Set to `'path'` or `'url'` to return the URL string only      |
| `srcset`        | `false`    | Enable responsive `srcset` generation                          |
| `sizes`         | `null`     | The `sizes` attribute for responsive images (e.g., `"(max-width: 640px) 100vw, 50vw"`) |
| `loading`       | `null`     | Explicit `loading` attribute (`lazy`, `eager`)                 |
| `fetchpriority` | `null`     | Fetch priority hint (`high`, `low`, `auto`)                    |
| `decoding`      | `null`     | Decoding hint (`async`, `sync`, `auto`)                        |

### Responsive Images (srcset)

When `srcset: true` is set, the tag generates a `srcset` attribute containing all available size variants for the image (excluding thumbnails). This lets browsers pick the best size for the viewport.

```liquid
{% image src: widget.settings.heroImage, srcset: true, sizes: "(max-width: 768px) 100vw, 50vw" %}
```

Output:

```html
<img src="hero-medium.jpg" srcset="hero-small.jpg 480w, hero-medium.jpg 1024w, hero-large.jpg 1920w" sizes="(max-width: 768px) 100vw, 50vw" loading="lazy" alt="">
```

SVG images are never given `srcset` since they scale at any size. For raster images, the tag:

- Skips the `thumb` variant
- Deduplicates widths automatically
- Includes the original image only when no public `large` variant exists
- Omits `srcset` entirely when there are fewer than 2 useful candidates

Always pair `srcset: true` with a realistic `sizes` string. `sizes` should describe the image's rendered slot width in the layout, not the image's intrinsic dimensions.

`{% youtube %}`

Renders a responsive YouTube embed or returns the embed URL.

```liquid
{# Full embed #}
{% youtube src: widget.settings.video %}
{% youtube src: widget.settings.video, class: 'hero-video' %}

{# Embed URL only #}
{% youtube src: widget.settings.video, output: 'path' %}
```

# Export Behavior

During export:

- Theme assets are copied into `assets/`
- Widget `.css` and `.js` files are flattened into a single `assets/` folder
- Only media files that are actually used are copied
- For images, public generated variants are copied into `assets/images/`
- `thumb` variants are skipped
- Raster originals are copied only when no public `large` variant exists

> **Warning:** Always use unique, widget-prefixed filenames (e.g., `slideshow.css` instead of `styles.css`) to avoid collisions.

---
description: Custom Liquid tags and filters in Widgetizer for assets, media, SEO, richtext, URLs, dates, and collections. Complete reference with examples.
---

Widgetizer extends LiquidJS with custom **tags** (for assets, media, SEO, and theme settings) and custom **filters** (for richtext, URLs, dates, collections, and media metadata). This page documents the full custom surface area with examples. For where the layout tags belong in the document, see [Layout & Templates](theme-dev-layout-templates.html).

Everything here sits on top of standard LiquidJS, so the usual objects, control-flow tags (`{% if %}`, `{% for %}`, `{% case %}`, `{% assign %}`, `{% capture %}`), and [standard filters](https://liquidjs.com/filters/overview.html) (`default`, `upcase`, `truncate`, `where`, `map`, `join`, `size`, …) are available too.

# Autoescaping & the `raw` filter

Widgetizer renders every template with **autoescaping enabled globally**. Each `{{ ... }}` expression is HTML-escaped by default, so author- and user-entered text is safe automatically. Plain `text` and `textarea` settings can be output directly:

```liquid
<h2>{{ widget.settings.title }}</h2>   {# escaped automatically, safe #}
```

When a value is **already trusted HTML**, append the `raw` filter so it isn't escaped. You need `| raw` for:

- **Richtext** settings (these are sanitized server-side with DOMPurify)
- **Layout placeholders:** `{{ header | raw }}`, `{{ main_content | raw }}`, `{{ footer | raw }}`
- **SVG icon markup**, embed codes, and anything you intentionally emit as raw HTML

```liquid
{# Without raw, the HTML tags would render as visible text #}
<div class="rte">{{ widget.settings.body | raw }}</div>
```

> **Warning:** Only use `raw` on values you trust. Richtext is sanitized for you, but the `code` setting type and the `custom_css` / `custom_head_scripts` / `custom_footer_scripts` tags are **not** sanitized; they output exactly what the user enters.

# Liquid Filters

Alongside the standard LiquidJS filters, Widgetizer registers these custom filters:

### `rte_text` and `rte_blank` (richtext helpers)

Richtext fields are never truly empty (the editor leaves markup like `<p></p>` behind), so an ordinary `{% if x == blank %}` check always thinks the field has content. Use these helpers to test emptiness, and always render the original value with `| raw`:

- `rte_text`: collapses a richtext value to plain text (strips tags, `&nbsp;`, whitespace). Use it for emptiness tests.
- `rte_blank`: boolean; `true` when the richtext is visually empty (`<p></p>`, `<p><br></p>`, `&nbsp;`, …).

```liquid
{% unless block.settings.body | rte_blank %}
  <div class="rte">{{ block.settings.body | raw }}</div>
{% endunless %}
```

### `safe_url`

Strips dangerous URL schemes (`javascript:`, `data:`, `vbscript:` and obfuscated variants), returning an empty string for unsafe values. Apply it to author-entered URLs before placing them in an `href`:

```liquid
<a href="{{ block.settings.url | safe_url }}">Visit</a>
```

> **Note:** Structured `link` settings and internal page/collection links are already sanitized by the platform. Reach for `safe_url` when you emit a raw URL string a user typed into a plain `text` field.

### `format_date`

Formats a `YYYY-MM-DD` date value using the project's configured date format (App Settings → Date Format). Pass an optional format string to override it per call:

```liquid
<time datetime="{{ item.settings.date }}">{{ item.settings.date | format_date }}</time>
{{ item.settings.date | format_date: 'MMMM D, YYYY' }}
```

### `handleize`

Converts a string into a URL- and identifier-safe "handle" (lowercase, hyphenated). Handy for generating ids or anchors from titles:

```liquid
<section id="section-{{ block.settings.title | handleize }}">
```

### `media_meta`

Looks up metadata for a media file by its path. Returns the full metadata object, or a single property when you pass a key:

```liquid
{% assign caption = block.settings.image | media_meta: 'title' %}
{% if caption != blank %}<figcaption>{{ caption }}</figcaption>{% endif %}
```

Available properties depend on what's stored on the media record (typically `alt` and `title`).

### `collection`

Pulls items from a theme-defined collection. It takes `limit`, `offset`, and `sort` options and returns an array of items. See [Collections](theme-dev-collections.html) for the full workflow:

```liquid
{% assign posts = 'news' | collection: limit: 6, sort: 'date_desc' %}
{% for post in posts %}
  <a href="{{ post.url }}">{{ post.settings.title }}</a>
{% endfor %}
```

# Asset Tags

## Where Assets Come From

Asset tags load files from different folders depending on where you use them:

| Context                        | Source Folder     |
| :----------------------------- | :---------------- |
| `layout.liquid`                | `assets/`         |
| `snippets/*.liquid`            | `assets/`         |
| `widgets/{name}/widget.liquid` | `widgets/{name}/` |

### `{% asset %}`

Immediately outputs a CSS, JS, or image asset inline where it's placed.

```liquid
{# In layout.liquid, loads from assets/ #}
{% asset src: "base.css" %}        {# → assets/base.css #}
{% asset src: "scripts.js" %}      {# → assets/scripts.js #}
{% asset src: "logo.svg" %}        {# → assets/logo.svg #}

{# In widgets/slideshow/widget.liquid, loads from widgets/slideshow/ #}
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

### `{% enqueue_style %}`

Registers a stylesheet for deferred output via `{% header_assets %}` or `{% footer_assets %}`. Enqueued assets are deduplicated; the same file won't load twice.

```liquid
{# In widgets/slideshow/widget.liquid, loads from widgets/slideshow/ #}
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

### `{% enqueue_script %}`

Registers a script for deferred output.

```liquid
{# In widgets/slideshow/widget.liquid, loads from widgets/slideshow/ #}
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

#### Theme-Level Script Resolution

By default, `{% enqueue_script %}` inside a widget loads from the widget's own folder. Set `theme: true` to load a shared script from the theme's `assets/` folder instead. This is useful for scripts shared across multiple widgets (e.g., a carousel library):

```liquid
{# In widgets/gallery/widget.liquid, loads from assets/carousel.js, not widgets/gallery/ #}
{% enqueue_script src: "carousel.js", theme: true, defer: true %}
```

Scripts are deduplicated by filename, so multiple widgets can enqueue the same theme script without it loading twice.

### `{% enqueue_preload %}`

Registers a resource preload directive for the `<head>`.

```liquid
{% enqueue_preload src: "hero.jpg", as: "image", fetchpriority: "high" %}
{% enqueue_preload src: "font.woff2", as: "font", type: "font/woff2", crossorigin: true %}
```

**Options:** `src`, `as`, `type`, `fetchpriority`, `media`, `imagesrcset`, `imagesizes`, `crossorigin`.

### `{% header_assets %}` and `{% footer_assets %}`

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

### `{% placeholder_image %}`

Outputs a placeholder image for development/preview. Placeholders come from:

1. **Core placeholders:** Built-in SVGs served by Widgetizer (default)
2. **Custom placeholders:** Your own image from the theme's `assets/` folder

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

- `landscape`: 16:9 (1600×900, default)
- `portrait`: 9:16 (900×1600)
- `square`: 1:1 (1200×1200)

# SEO and Font Tags

### `{% seo %}`

Outputs SEO meta tags (title, description, Open Graph, Twitter Cards, canonical URL). Place in `<head>`.

```liquid
<head>
  {% seo %}
</head>
```

### `{% fonts %}`

Outputs font preconnect links and stylesheet based on theme typography settings. Automatically handles Google Fonts and Bunny Fonts (privacy-friendly alternative).

```liquid
<head>
  {% fonts %}
</head>
```

# Theme Settings Tags

### `{% theme_settings %}`

Outputs CSS variables for all global settings that have `outputAsCssVar: true`. Place in `<head>`.

```liquid
<head>
  {% theme_settings %}
</head>
```

This outputs a `<style>` block with variables like `--colors-accent`, `--typography-heading_font-family`, etc. See [Theme Manifest & Settings](theme-dev-manifest-settings.html) for how to define settings.

### `{% custom_css %}`

Outputs custom CSS from the theme's `advanced.custom_css` setting, wrapped in a `<style>` tag.

```liquid
<head>
  {% custom_css %}
</head>
```

### `{% custom_head_scripts %}`

Outputs raw HTML/JS from the theme's `advanced.custom_head_scripts` setting (e.g., Google Analytics).

```liquid
<head>
  {% custom_head_scripts %}
</head>
```

### `{% custom_footer_scripts %}`

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

### `{% render 'snippet_name' %}`

Renders a snippet from the `snippets/` folder.

```liquid
{% render 'icon', icon: 'arrow-right', class: 'nav-icon' %}
{% render 'menu', menu: widget.settings.navigation, class_menu: 'nav' %}
```

For menu structure and snippet conventions, see [Menus & Snippets](theme-dev-menus-snippets.html).

# Media Tags

Media tags render uploaded media from the media library.

### `{% image %}`

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

#### Responsive Images (srcset)

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

### `{% youtube %}`

Renders a responsive YouTube embed, or returns just the embed/thumbnail URL.

```liquid
{# Full responsive iframe embed #}
{% youtube src: widget.settings.video %}
{% youtube src: widget.settings.video, class: 'hero-video' %}

{# Playback options #}
{% youtube src: widget.settings.video, autoplay: true, mute: true, loop: true, controls: false %}

{# Embed URL only (e.g. for a custom trigger) #}
{% youtube src: widget.settings.video, output: 'url' %}

{# Thumbnail image URL (e.g. as a video-popup poster) #}
{% youtube src: widget.settings.video, output: 'thumbnail', quality: 'sddefault' %}
```

`src` accepts a `youtube` setting value, a full URL, or a bare video ID.

| Parameter         | Default           | Description                                                       |
| :---------------- | :---------------- | :--------------------------------------------------------------- |
| `src`             | (required)        | YouTube video ID, URL, or `youtube` setting value                |
| `class`           | `'youtube-embed'` | CSS class on the wrapper                                          |
| `width` / `height`| `560` / `315`     | Used to compute the embed aspect ratio                           |
| `title`           | `null`            | `title` attribute on the iframe                                  |
| `loading`         | `'lazy'`          | iframe loading strategy                                           |
| `autoplay`        | `false`           | Autoplay on load (pair with `mute: true`)                        |
| `mute`            | `false`           | Start muted                                                      |
| `controls`        | `true`            | Show player controls                                             |
| `loop`            | `false`           | Loop playback                                                    |
| `modestbranding`  | `false`           | Reduce YouTube branding                                          |
| `rel`             | `true`            | Show related videos at the end                                  |
| `start` / `end`   | `null`            | Start/end time in seconds                                        |
| `output`          | (iframe)          | `'url'` for the embed URL, `'thumbnail'` for the thumbnail image URL |
| `quality`         | `'hqdefault'`     | Thumbnail quality (with `output: 'thumbnail'`): `hqdefault`, `mqdefault`, `sddefault` |

# Export Behavior

During export:

- Theme assets are copied into `assets/`
- Widget `.css` and `.js` files are flattened into a single `assets/` folder
- Only media files that are actually used are copied
- For images, public generated variants are copied into `assets/images/`
- `thumb` variants are skipped
- Raster originals are copied only when no public `large` variant exists

> **Warning:** Always use unique, widget-prefixed filenames (e.g., `slideshow.css` instead of `styles.css`) to avoid collisions.

---
description: Complete reference for Widgetizer theme Liquid tags and filters: assets, media, SEO, fonts, theme settings, custom code, richtext, URLs, dates, and collections.
---

Widgetizer extends LiquidJS with theme-author tools for assets, media, SEO, fonts, theme settings, menus, snippets, and collections. Use this page as the contract for what each custom tag or filter expects, what it outputs, and where it belongs.

Everything here sits on top of standard LiquidJS. Normal Liquid control-flow tags (`if`, `for`, `case`, `assign`, `capture`) and [standard filters](https://liquidjs.com/filters/overview.html) (`default`, `upcase`, `truncate`, `where`, `map`, `join`, `size`, etc.) are available too.

# Placement Map

Most tags can technically render anywhere, but a theme is much easier to maintain when the page shell has a predictable order.

```liquid
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    {% seo %}
    {% fonts %}
    {% render 'site-icons', site_icons: site_icons %}

    {% theme_settings %}
    {% asset src: "base.css" %}
    {% custom_css %}
    {% custom_head_scripts %}
    {% header_assets %}
  </head>
  <body class="{{ body_class }}">
    {{ header | raw }}
    <main id="main-content">
      {{ main_content | raw }}
    </main>
    {{ footer | raw }}

    {% asset src: "scripts.js", defer: true %}
    {% footer_assets %}
    {% custom_footer_scripts %}
  </body>
</html>
```

| Tag or value | Recommended location | Why |
| :-- | :-- | :-- |
| `{% seo %}` | `<head>` before other metadata-heavy tags | Emits title, description, robots, canonical, Open Graph, and Twitter metadata |
| `{% fonts %}` | `<head>` before CSS | Emits font preconnect links and the font stylesheet before CSS uses those font families |
| `{% render 'site-icons', site_icons: site_icons %}` | `<head>` near SEO/fonts | Emits favicon, Apple touch icon, and manifest links when the project has a favicon |
| `{% theme_settings %}` | `<head>` before `base.css` | Emits CSS custom properties used by theme CSS |
| `{% asset src: "base.css" %}` | `<head>` after `theme_settings` | Loads the theme's global stylesheet immediately |
| `{% custom_css %}` | `<head>` after theme CSS | Lets the user override theme CSS |
| `{% custom_head_scripts %}` | End of `<head>` | Emits user-provided head scripts or verification tags |
| `{% header_assets %}` | End of `<head>` | Flushes enqueued preloads, header styles, and header scripts |
| `{{ header | raw }}` | Top of `<body>` | Inserts rendered global header HTML |
| `{{ main_content | raw }}` | Inside `<main>` | Inserts rendered page widgets |
| `{{ footer | raw }}` | Bottom of content | Inserts rendered global footer HTML |
| `{% asset src: "scripts.js", defer: true %}` | Before footer assets | Loads the theme's global script immediately |
| `{% footer_assets %}` | Before `</body>` | Flushes enqueued footer styles and scripts |
| `{% custom_footer_scripts %}` | Last thing before `</body>` | Emits user-provided footer scripts |

# Escaping Model

Widgetizer renders templates with HTML autoescaping enabled globally. Every `{{ ... }}` expression is escaped by default, so normal `text`, `textarea`, `number`, `select`, `checkbox`, `image`, `youtube`, `link`, and `menu` values can usually be printed directly.

```liquid
<h2>{{ widget.settings.title }}</h2>
<p>{{ block.settings.kicker }}</p>
```

Use the `raw` filter only when the value is already trusted HTML:

- Layout placeholders: `{{ header | raw }}`, `{{ main_content | raw }}`, `{{ footer | raw }}`
- `richtext` settings, which are sanitized before rendering
- SVG markup intentionally returned by snippets or icon helpers
- Embed code or trusted `code` values that you deliberately expose as HTML

```liquid
{% unless widget.settings.body | rte_blank %}
  <div class="rte">{{ widget.settings.body | raw }}</div>
{% endunless %}
```

> **Warning:** `richtext` is sanitized for you. `code` settings, `{% custom_css %}`, `{% custom_head_scripts %}`, and `{% custom_footer_scripts %}` are intentional raw-code sinks and are not sanitized.

# Liquid Filters

## `rte_text` and `rte_blank`

Richtext fields often contain structural markup even when they look empty (`<p></p>`, `<p><br></p>`, `&nbsp;`). Do not test richtext with a plain `blank` check.

Use:

- `rte_blank` when you need a boolean emptiness check.
- `rte_text` when you need the plain-text version for comparisons, summaries, or labels.

```liquid
{% unless block.settings.body | rte_blank %}
  <div class="rte">{{ block.settings.body | raw }}</div>
{% endunless %}

{% assign body_text = block.settings.body | rte_text %}
{% if body_text != blank %}
  <p class="excerpt">{{ body_text | truncate: 120 }}</p>
{% endif %}
```

Render the original richtext value with `| raw`; render the `rte_text` result as plain escaped text.

## `safe_url`

`safe_url` removes dangerous URL schemes such as `javascript:`, `data:`, and `vbscript:`, including common obfuscated variants. It returns an empty string when the URL is unsafe.

```liquid
{% assign href = block.settings.url | safe_url %}
{% if href != blank %}
  <a href="{{ href }}">{{ block.settings.label }}</a>
{% endif %}
```

Structured `link` settings and internal page/collection links are already sanitized by the platform. Use `safe_url` when you place a raw user-entered text value into `href`, `src`, `action`, or a similar URL-bearing attribute.

## `format_date`

`format_date` formats a `YYYY-MM-DD` date value with the project's configured date format. You can pass a format string to override the project setting for one output.

```liquid
<time datetime="{{ item.settings.date }}">
  {{ item.settings.date | format_date }}
</time>

{{ item.settings.date | format_date: 'MMMM D, YYYY' }}
```

Use the original ISO value in the `datetime` attribute and the formatted value as visible text.

## `handleize`

`handleize` converts text into a lowercase, hyphenated handle that is useful for anchors, class suffixes, and simple data keys.

```liquid
<section id="section-{{ widget.settings.heading | handleize }}">
```

Handles are not guaranteed to be unique. If several blocks can share the same title, combine the handle with `widget.id` or the block id.

```liquid
<section id="{{ widget.id }}-{{ block.settings.title | handleize }}">
```

## `media_meta`

`media_meta` looks up uploaded media metadata by filename or media path. Without a property name it returns the whole media record; with a property name it returns that field.

```liquid
{% assign image_title = block.settings.image | media_meta: 'title' %}
{% assign image_alt = block.settings.image | media_meta: 'alt' %}

{% if image_title != blank %}
  <figcaption>{{ image_title }}</figcaption>
{% endif %}
```

Typical properties are `alt` and `title`, but the available keys depend on the media record stored by the project.

## `collection`

`collection` loads items from a theme-defined collection type and returns an array of item objects. Each item exposes `settings`, `slug`, and usually `url` when the collection type has item pages enabled.

```liquid
{% assign posts = 'news' | collection: limit: 6, sort: 'date_desc' %}

{% for post in posts %}
  <article>
    <h3>{{ post.settings.title }}</h3>
    {% if post.url != blank %}
      <a href="{{ post.url }}">Read more</a>
    {% endif %}
  </article>
{% endfor %}
```

Supported options:

| Option | Description |
| :-- | :-- |
| `limit` | Maximum number of items to return |
| `offset` | Number of items to skip before returning results |
| `sort` | Sort mode, such as date-based modes used by collection templates |

See [Collections](theme-dev-collections.html) for collection type schemas, item templates, and item-page behavior.

# Asset Sources

Widgetizer has two asset families:

- **Theme assets** live in `assets/` and are shared by the whole theme.
- **Widget assets** live beside a widget in `widgets/{type}/` and are loaded only when a widget template requests them.

Source resolution depends on where the tag is used:

| Where the tag appears | Default source folder |
| :-- | :-- |
| `layout.liquid` | `assets/` |
| `snippets/*.liquid` | `assets/` |
| `widgets/{type}/widget.liquid` | `widgets/{type}/` |

During preview, URLs point at preview API routes. During export, URLs are rewritten to static files, nested pages receive the correct `../` prefix, and CSS/JS assets can receive an export-version cache-busting query string.

Use unique filenames across widgets. On export, widget CSS/JS files are flattened into the exported `assets/` folder, so `widgets/gallery/styles.css` and `widgets/hero/styles.css` would collide. Prefer names like `gallery.css`, `gallery.js`, `hero.css`, and `hero.js`.

# Asset Tags

## `{% asset %}`

`asset` immediately outputs a tag or URL at the exact location where it appears.

```liquid
{% asset src: "base.css" %}
{% asset src: "scripts.js", defer: true %}
{% asset src: "logo.svg", alt: "Site logo" %}
```

Output depends on the file extension:

| Extension | Output |
| :-- | :-- |
| `.css` | `<link rel="stylesheet" href="...">` |
| `.js` | `<script src="..."></script>` |
| Image extensions | `<img src="...">` |
| Other files | The resolved URL string |

Options:

| Option | Applies to | Description |
| :-- | :-- | :-- |
| `src` | All | Required path relative to the resolved asset folder |
| `defer` | JS | Adds `defer` |
| `async` | JS | Adds `async` |
| `media` | CSS | Adds a `media` attribute |
| `id` | CSS/JS/images | Adds an `id` attribute |
| `crossorigin` | CSS/JS/images | Adds `crossorigin` |
| `integrity` | CSS/JS/images | Adds an SRI `integrity` attribute |

Use `asset` for global theme files that should always load, such as `base.css`, `scripts.js`, or a static logo referenced directly by the layout. Use enqueued assets when widgets conditionally need their own CSS or JS.

## Enqueued Asset Model

`enqueue_style`, `enqueue_script`, and `enqueue_preload` do not output HTML immediately. They register assets while templates render. Later, `{% header_assets %}` and `{% footer_assets %}` flush the registered assets in a predictable order.

This is the preferred pattern for widget-specific CSS/JS:

```liquid
{# widgets/testimonials/widget.liquid #}
{% enqueue_style src: "testimonials.css" %}
{% enqueue_script src: "testimonials.js", defer: true %}

<section class="widget widget-testimonials" data-widget-id="{{ widget.id }}" data-widget-type="testimonials">
  ...
</section>
```

Assets are deduplicated by `src`. If the same source is enqueued more than once, the latest registration for that source wins. Use stable, unique filenames and avoid using the same filename for unrelated assets.

## `{% enqueue_style %}`

Registers a stylesheet for `{% header_assets %}` or `{% footer_assets %}`.

```liquid
{% enqueue_style src: "gallery.css" %}
{% enqueue_style src: "gallery-critical.css", priority: 10 %}
{% enqueue_style src: "print.css", media: "print", location: "header" %}
{% enqueue_style src: "shared-lightbox.css", theme: true %}
```

Options:

| Option | Default | Description |
| :-- | :-- | :-- |
| `src` | Required | Stylesheet path |
| `location` | `header` | `header` or `footer` |
| `priority` | `50` | Lower numbers output first |
| `media` | Blank | Adds `media` |
| `id` | Blank | Adds `id` |
| `theme` | `false` | When used inside a widget, load from theme `assets/` instead of the widget folder |

Use `theme: true` for shared libraries or shared CSS that lives in `assets/`.

## `{% enqueue_script %}`

Registers a script for `{% header_assets %}` or `{% footer_assets %}`.

```liquid
{% enqueue_script src: "gallery.js", defer: true %}
{% enqueue_script src: "analytics-consent.js", location: "header", defer: true, priority: 20 %}
{% enqueue_script src: "shared-carousel.js", theme: true, defer: true %}
```

Options:

| Option | Default | Description |
| :-- | :-- | :-- |
| `src` | Required | Script path |
| `location` | `footer` | `header` or `footer` |
| `priority` | `50` | Lower numbers output first |
| `defer` | `false` | Adds `defer` |
| `async` | `false` | Adds `async` |
| `theme` | `false` | When used inside a widget, load from theme `assets/` instead of the widget folder |

Prefer `defer: true` for normal theme scripts. Use `async` only for scripts that do not depend on execution order.

## `{% enqueue_preload %}`

Registers a `<link rel="preload">` for output by `{% header_assets %}`. Preloads are only emitted with header assets.

```liquid
{% enqueue_preload src: "hero.jpg", as: "image", fetchpriority: "high" %}
{% enqueue_preload src: "fonts/brand.woff2", as: "font", type: "font/woff2", crossorigin: true %}
{% enqueue_preload
  src: "hero-1024.jpg",
  as: "image",
  imagesrcset: "hero-640.jpg 640w, hero-1024.jpg 1024w",
  imagesizes: "(max-width: 768px) 100vw, 50vw"
%}
```

Options:

| Option | Description |
| :-- | :-- |
| `src` | Required preload URL or asset path |
| `as` | Required preload type, such as `image`, `font`, `style`, `script`, or `fetch` |
| `type` | MIME type hint |
| `fetchpriority` | Browser priority hint, usually `high`, `low`, or `auto` |
| `media` | Media query for conditional preloads |
| `imagesrcset` | Responsive image candidates |
| `imagesizes` | Responsive image slot sizes |
| `crossorigin` | Boolean; adds `crossorigin` when true |

For exported nested pages, internal relative URLs are automatically prefixed. Absolute URLs are left unchanged.

## `{% header_assets %}` and `{% footer_assets %}`

These tags output the assets registered with the enqueue tags.

`header_assets` outputs:

1. Preloads
2. Header styles, sorted by priority
3. Header scripts, sorted by priority

`footer_assets` outputs:

1. Footer styles, sorted by priority
2. Footer scripts, sorted by priority

```liquid
<head>
  {% theme_settings %}
  {% asset src: "base.css" %}
  {% header_assets %}
</head>
<body>
  ...
  {% asset src: "scripts.js", defer: true %}
  {% footer_assets %}
</body>
```

Keep both tags in `layout.liquid` even if the first version of your theme does not enqueue anything. Future widgets, snippets, or presets can then add assets without changing the layout contract.

## `{% placeholder_image %}`

Outputs a development-safe placeholder image from Widgetizer core or from your theme's `assets/` folder.

```liquid
{% placeholder_image %}
{% placeholder_image aspect: "portrait" %}
{% placeholder_image aspect: "square" %}

{% placeholder_image output: "url" %}
{% placeholder_image src: "placeholder-product.svg" %}
{% placeholder_image aspect: "landscape", class: "hero-placeholder", loading: "lazy" %}
```

Built-in aspects:

| Aspect | Ratio | Notes |
| :-- | :-- | :-- |
| `landscape` | 16:9 | Default |
| `portrait` | 9:16 | Useful for profile/cards |
| `square` | 1:1 | Useful for product/avatar placeholders |

Options:

| Option | Default | Description |
| :-- | :-- | :-- |
| `aspect` | `landscape` | Built-in placeholder aspect |
| `src` | Blank | Custom placeholder in theme `assets/` |
| `output` | `img` | Use `url` to return only the URL |
| `class` | Blank | Adds class to `<img>` output |
| `style` | Blank | Adds inline style to `<img>` output |
| `alt` | `Placeholder` | Alt text |
| `width` / `height` | Blank | Adds dimensions |
| `loading` | Blank | Adds loading strategy |

# SEO, Fonts, and Theme Settings

## `{% seo %}`

`seo` emits the page metadata a published site needs in `<head>`.

```liquid
<head>
  {% seo %}
</head>
```

It expects these context objects, which Widgetizer provides during preview and export:

| Context value | Used for |
| :-- | :-- |
| `page` | Page name, slug, and `page.seo` settings |
| `project` | Site title and public site URL |
| `mediaFiles` | Resolving uploaded social images to their exported public filenames |

`page.seo` can contain:

| Field | Output behavior |
| :-- | :-- |
| `title` | Used as the page title. Falls back to `page.name` |
| `description` | Emits meta description, `og:description`, and `twitter:description` |
| `robots` | Emits robots meta. Defaults to `index,follow` |
| `canonical_url` | Explicit canonical URL. If blank, Widgetizer builds one from `project.siteUrl` and `page.slug` |
| `og_title` | Open Graph and Twitter title. Falls back to the page title |
| `og_type` | Open Graph type. Defaults to `website` |
| `og_image` | Absolute URL or uploaded media path for social image |
| `twitter_card` | Twitter card type when an image exists. Defaults to `summary_large_image`; without an image the tag emits `summary` |

Title behavior:

- `seo.title` is used when present.
- Otherwise `page.name` is used.
- When `project.siteTitle` exists, the final `<title>` becomes `Page title - Site title`.

Canonical behavior:

- `seo.canonical_url` wins when present.
- Otherwise the tag uses `project.siteUrl` plus the page slug.
- `index` and `home` slugs canonicalize to the site root.
- If `project.siteUrl` is missing or invalid, no canonical tag is emitted.

Open Graph image behavior:

- Fully qualified `http` or `https` `og_image` values pass through unchanged.
- Uploaded media paths are converted to `{siteUrl}/assets/images/{publicFilename}`.
- Raster images prefer the generated `large` variant when one exists.
- SVG images use the original SVG filename.
- If no absolute URL can be built, `og:image` and `twitter:image` are omitted.

All SEO text is escaped before output. Collection item pages use the same `page.seo` contract after Widgetizer shapes the collection item into a page-like render context.

## `{% fonts %}`

`fonts` outputs font preconnect links and a stylesheet link for selected web fonts.

```liquid
<head>
  {% fonts %}
</head>
```

It reads theme settings from `settings.global.typography` and looks for settings with `type: "font_picker"`.

```json
{
  "settings": {
    "global": {
      "typography": [
        {
          "type": "font_picker",
          "id": "heading_font",
          "default": {
            "stack": "\"Playfair Display\", serif",
            "weight": 700
          }
        },
        {
          "type": "font_picker",
          "id": "body_font",
          "default": {
            "stack": "\"Inter\", sans-serif",
            "weight": 400
          }
        }
      ]
    }
  }
}
```

For each `font_picker`, the tag uses the saved `value` first and the schema `default` second. The value must be an object with:

| Property | Description |
| :-- | :-- |
| `stack` | Font stack string from Widgetizer's font list, such as `"Inter", sans-serif` |
| `weight` | Numeric weight to load |

Only web fonts known to Widgetizer's font list are loaded. System font stacks produce no external stylesheet, which is expected.

Special `body_font` behavior:

- If a `font_picker` has id `body_font` and selected weight `400`, Widgetizer also loads the best available bold weight.
- It prefers `700`, then `600`, then `500`.
- This helps theme CSS use real bold text instead of browser-generated faux bold.

Provider behavior:

- Default output uses Google Fonts preconnects and a `fonts.googleapis.com/css2` stylesheet.
- Bunny Fonts output uses `fonts.bunny.net`.
- Current runtime compatibility for Bunny Fonts reads a global `privacy` group setting with id `use_bunny_fonts`. Arch exposes the user-facing toggle in its `advanced` group, so theme authors should keep the setting id stable and verify provider output when reorganizing settings.

When no selected font needs an external stylesheet, `{% fonts %}` outputs nothing.

## `{% theme_settings %}`

`theme_settings` outputs CSS custom properties for global theme settings.

```liquid
<head>
  {% theme_settings %}
  {% asset src: "base.css" %}
</head>
```

Place it before any CSS that uses the variables. It outputs a style block like:

```html
<style id="theme-settings-styles">
:root {
  --colors-standard_bg_primary: #ffffff;
  --typography-heading_font-family: "Inter", sans-serif;
  --typography-heading_font-weight: 600;
}
</style>
```

For normal settings, a variable is emitted only when the setting has `outputAsCssVar: true`.

```json
{
  "type": "color",
  "id": "standard_bg_primary",
  "default": "#ffffff",
  "outputAsCssVar": true
}
```

Variable naming:

```text
--{group}-{settingId}
```

Examples:

```css
--colors-standard_bg_primary
--style-section_spacing
--typography-heading_scale
```

`range` settings append their configured `unit` when the value is numeric:

```json
{
  "type": "range",
  "id": "section_gap",
  "default": 48,
  "unit": "px",
  "outputAsCssVar": true
}
```

```css
--layout-section_gap: 48px;
```

`font_picker` settings always output variables, even without `outputAsCssVar`:

```css
--typography-heading_font-family: "Playfair Display", serif;
--typography-heading_font-weight: 700;
--typography-body_font-family: "Inter", sans-serif;
--typography-body_font-weight: 400;
--typography-body_font_bold-weight: 700;
```

Values use the saved `value` when present and fall back to `default`. CSS values are lightly cleaned before output so obvious HTML/control characters do not enter the generated CSS variable block.

## `{% custom_css %}`

`custom_css` outputs the global `advanced.custom_css` setting inside a style tag.

```liquid
<head>
  {% custom_css %}
</head>
```

Expected setting:

```json
{
  "type": "code",
  "id": "custom_css",
  "language": "css",
  "default": ""
}
```

Output:

```html
<style id="custom-theme-css">
  /* user CSS */
</style>
```

Place it after your theme stylesheet so user CSS can override theme defaults.

## `{% custom_head_scripts %}`

`custom_head_scripts` outputs the global `advanced.custom_head_scripts` setting as raw HTML.

```liquid
<head>
  {% custom_head_scripts %}
</head>
```

Expected setting:

```json
{
  "type": "code",
  "id": "custom_head_scripts",
  "language": "html",
  "default": ""
}
```

Use it for analytics snippets, verification tags, consent-manager bootstraps, or other user-provided head code. It outputs nothing when the setting is blank.

## `{% custom_footer_scripts %}`

`custom_footer_scripts` outputs the global `advanced.custom_footer_scripts` setting as raw HTML.

```liquid
<body>
  ...
  {% custom_footer_scripts %}
</body>
```

Expected setting:

```json
{
  "type": "code",
  "id": "custom_footer_scripts",
  "language": "html",
  "default": ""
}
```

Place it as the last script-related output before `</body>`.

# Layout Values

These values are available in `layout.liquid`.

| Value | Description |
| :-- | :-- |
| `{{ header | raw }}` | Rendered global header widget HTML |
| `{{ main_content | raw }}` | Rendered page widget HTML |
| `{{ footer | raw }}` | Rendered global footer widget HTML |
| `{{ body_class }}` | Contextual CSS classes for the `<body>` |
| `{{ site_icons }}` | Precomputed favicon, Apple touch icon, and manifest hrefs |

`header`, `main_content`, and `footer` are already-rendered HTML strings, so they must use `| raw`.

The `site_icons` object is usually rendered through a snippet:

```liquid
{% render 'site-icons', site_icons: site_icons %}
```

The Arch snippet checks:

- `site_icons.primaryIconHref`
- `site_icons.primaryIconType`
- `site_icons.primaryIconSizes`
- `site_icons.legacyIconHref`
- `site_icons.appleTouchIconHref`
- `site_icons.manifestHref`

On export, Widgetizer generates the needed favicon files and rewrites nested-page paths automatically.

# Snippets and Menus

## `{% render 'snippet_name' %}`

Use Liquid's `render` tag to include snippets from `snippets/`.

```liquid
{% render 'icon', icon: 'arrow-right', class: 'nav-icon' %}
{% render 'menu', menu: widget.settings.navigation, class_menu: 'nav' %}
```

Pass every value the snippet needs explicitly. This keeps snippets reusable and easier to test.

For menu structures and snippet conventions, see [Menus & Snippets](theme-dev-menus-snippets.html).

# Media Tags

## `{% image %}`

`image` renders an uploaded media image as an `<img>` tag or returns the resolved image URL/path.

```liquid
{% image src: widget.settings.heroImage %}
{% image src: widget.settings.heroImage, size: "large" %}
{% image src: widget.settings.heroImage, size: "large", class: "hero-image", lazy: false %}

{% image src: widget.settings.heroImage, output: "path" %}
{% image src: widget.settings.heroImage, size: "large", output: "url" %}
```

Options:

| Option | Default | Description |
| :-- | :-- | :-- |
| `src` | Required | Media filename or uploaded media path from an `image` setting |
| `size` | `medium` | Image variant to use, such as `thumb`, `small`, `medium`, `large`, or a theme-defined size |
| `class` | Blank | Class for the `<img>` |
| `lazy` | `true` | Adds lazy loading unless `loading` is explicitly set |
| `loading` | Blank | Explicit `loading`, such as `lazy` or `eager` |
| `alt` | Media alt or blank | Override alt text |
| `title` | Media title or blank | Override title text |
| `output` | Full `<img>` | Use `path` or `url` to return only the resolved URL |
| `srcset` | `false` | Generate a responsive `srcset` when enough variants exist |
| `sizes` | Blank | Adds the `sizes` attribute |
| `fetchpriority` | Blank | Adds `fetchpriority`, such as `high`, `low`, or `auto` |
| `decoding` | Blank | Adds `decoding`, such as `async`, `sync`, or `auto` |

Fallback behavior:

- If `src` is blank, the tag outputs nothing.
- If media metadata is not found, the tag still returns a path based on the filename.
- If media metadata is found, alt/title default to the media library metadata.
- Raster images use the requested generated size when available.
- SVG images use the original file and do not receive width/height or `srcset`.

Responsive images:

```liquid
{% image
  src: widget.settings.heroImage,
  size: "large",
  srcset: true,
  sizes: "(max-width: 768px) 100vw, 50vw",
  fetchpriority: "high",
  loading: "eager"
%}
```

When `srcset: true` is set, Widgetizer:

- Uses available generated sizes except `thumb`.
- Deduplicates candidates with the same width.
- Sorts candidates by width.
- Adds the original image only when no public `large` variant exists and the original is useful.
- Omits `srcset` when fewer than two useful candidates exist.

Always pair `srcset: true` with a realistic `sizes` value that describes the image's rendered slot width in your layout.

## `{% youtube %}`

`youtube` renders a YouTube iframe, returns an embed URL, or returns a thumbnail URL.

```liquid
{% youtube src: widget.settings.video %}
{% youtube src: widget.settings.video, class: "hero-video" %}
{% youtube src: widget.settings.video, autoplay: true, mute: true, loop: true, controls: false %}

{% youtube src: widget.settings.video, output: "url" %}
{% youtube src: widget.settings.video, output: "thumbnail", quality: "sddefault" %}
```

`src` accepts:

- A `youtube` setting value
- A full YouTube URL
- A bare 11-character YouTube video ID

Supported URL shapes include normal watch URLs, `youtu.be` short URLs, embed URLs, mobile URLs, and gaming URLs.

Options:

| Option | Default | Description |
| :-- | :-- | :-- |
| `src` | Required | YouTube setting value, URL, or video ID |
| `class` | `youtube-embed` | CSS class on the wrapper |
| `width` / `height` | `560` / `315` | Used to compute the aspect ratio |
| `title` | `YouTube video player` | iframe title |
| `loading` | `lazy` | iframe loading strategy |
| `autoplay` | `false` | Adds autoplay |
| `mute` | `false` | Starts muted; recommended when autoplay is true |
| `controls` | `true` | Show player controls |
| `loop` | `false` | Loop playback |
| `modestbranding` | `false` | Reduce YouTube branding |
| `rel` | `true` | Show related videos at the end |
| `start` / `end` | Blank | Start/end time in seconds |
| `output` | iframe | Use `url` or `thumbnail` |
| `quality` | `hqdefault` | Thumbnail quality for `output: "thumbnail"` |

Common thumbnail qualities are `default`, `mqdefault`, `hqdefault`, `sddefault`, and `maxresdefault`.

When the URL or ID is invalid, the tag outputs an HTML comment instead of a broken iframe.

# Export Behavior

During export:

- Theme assets are copied into `assets/`.
- Widget `.css` and `.js` files are flattened into the exported `assets/` folder.
- Only media files that are actually used are copied.
- Public generated image variants are copied into `assets/images/`.
- `thumb` variants are skipped.
- Raster originals are copied only when no public `large` variant exists.
- Nested pages receive correct relative prefixes for assets, preloads, images, site icons, and links.

> **Warning:** Always use unique, widget-prefixed filenames (for example `slideshow.css` instead of `styles.css`) to avoid export collisions.

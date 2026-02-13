# Theming Guide

This document provides a comprehensive guide to creating and customizing themes in Widgetizer. A theme is a complete package that defines the visual appearance, layout structure, and functionality of a website.

## 1. Introduction & Core Concepts

### What is a Theme?

A theme in Widgetizer is a self-contained package that defines:

- **Visual Design**: Colors, typography, spacing, and layout
- **Structure**: HTML templates and page organization
- **Functionality**: Interactive components and dynamic content
- **Content Management**: Configurable settings and flexible blocks

### Key Components

- **Layout Template**: The main HTML structure that wraps all content
- **Widgets**: Reusable content components (text, images, forms, etc.)
- **Blocks**: Sub-components within widgets for flexible content management
- **Global Settings**: Theme-wide customization options
- **Templates**: Pre-defined page structures and widget arrangements
- **Assets**: CSS, JavaScript, and media files

## 2. Theme Structure & File Organization

A theme is organized as a directory with the following structure:

```
/themes/my-theme/
├── theme.json              # Theme manifest and global settings schema
├── layout.liquid           # Main HTML layout template
├── screenshot.png          # 1280x720 preview image for the theme
├── widgets/                # Widget templates
│   ├── basic-text/         # Each widget in its own folder
│   │   ├── schema.json     # Widget configuration schema
│   │   └── widget.liquid   # Widget template (HTML, CSS, JS)
│   ├── hero-banner/
│   │   ├── schema.json
│   │   └── widget.liquid
│   └── global/             # Global widgets
│       ├── header/
│       │   ├── schema.json
│       │   └── widget.liquid
│       └── footer/
│           ├── schema.json
│           └── widget.liquid
├── snippets/               # Reusable Liquid partials
│   └── icon.liquid         # Icon rendering snippet
├── templates/              # Page and global templates
│   ├── index.json          # Homepage template
│   ├── about.json          # About page template
│   └── global/             # Global template instances
│       ├── header.json     # Global header configuration
│       └── footer.json     # Global footer configuration
├── menus/                  # Navigation menu definitions
│   └── main-nav.json       # Menu structure and items
├── presets/                # Optional preset variants
│   ├── presets.json        # Preset registry (names, descriptions, default)
│   ├── warm/
│   │   ├── preset.json     # Settings overrides (colors, fonts, etc.)
│   │   └── screenshot.png  # Preset preview image
│   └── hotel/
│       ├── preset.json     # Settings overrides
│       ├── screenshot.png
│       ├── templates/      # Optional custom page templates
│       │   ├── index.json
│       │   └── global/
│       │       ├── header.json
│       │       └── footer.json
│       └── menus/          # Optional custom navigation
│           ├── main-menu.json
│           └── footer-menu.json
└── assets/                 # Static assets
    ├── base.css            # Theme base styles (design tokens, utilities)
    ├── scripts.js          # Theme scripts
    └── icons.json          # Icon definitions (optional)
```

> [!IMPORTANT] **Absolute Minimum Requirements:** For a theme to be recognized and functional, it MUST contain:
>
> - `theme.json`: Manifest with `name`, `version`, and `author`.
> - `layout.liquid`: The main layout wrapper.
> - `screenshot.png`: A 1280x720 preview image.
> - `widgets/`: Directory containing at least one widget.
> - `templates/`: Directory containing page templates.
> - `assets/`: Directory for theme assets.

> **Note:** Each widget lives in its own subdirectory containing a `schema.json` (widget configuration) and `widget.liquid` (template). For comprehensive widget authoring guidance, see the [Widget Authoring Guide](theming-widgets.md).

## 3. Theme Manifest (theme.json)

The `theme.json` file serves as the theme's manifest and defines global settings that can be customized by users.

### Basic Metadata

```json
{
  "name": "My Theme",
  "version": "1.0.0",
  "description": "A beautiful, responsive theme",
  "author": "Your Name",
  "useCoreWidgets": true
}
```

> [!NOTE] The `widgets` count is calculated programmatically by the system based on the contents of the `/widgets/` directory. You do not need to specify it in `theme.json`.

### Image Size Configuration (Optional)

Themes can define custom image sizes that override the app-level settings. This is useful when your theme requires specific image dimensions for hero sections, galleries, or other components.

```json
{
  "settings": {
    "imageSizes": {
      "thumb": { "width": 150, "enabled": true },
      "small": { "width": 480, "enabled": true },
      "medium": { "width": 1024, "enabled": true },
      "hero": { "width": 1600, "enabled": true, "quality": 90 },
      "large": { "enabled": false }
    }
  }
}
```

**Properties for each size:**

- `width` (number): Maximum width in pixels
- `enabled` (boolean): Whether to generate this size (default: `true`)
- `quality` (number, optional): JPEG/WebP quality 1-100 (falls back to app setting)

**Key behaviors:**

- When defined, theme sizes **replace** app settings entirely (not merged)
- The `thumb` size is **always generated** for the media library, even if not defined
- Users can reference these sizes in templates via the `image` tag: `{% image src: image, size: 'hero' %}`
- The App Settings UI hides the Image Sizes controls when a theme defines them

### Global Settings Schema

The `settings.global` object defines customizable options organized into logical groups. **You can create any groups you want** — each key in the `global` object becomes a group in the theme settings UI. Common groups include `colors`, `typography`, `layout`, and `privacy`, but you can add custom groups like `social`, `advanced`, or anything relevant to your theme:

```json
{
  "settings": {
    "global": {
      "colors": [
        {
          "id": "bg_primary",
          "label": "Primary Background",
          "default": "#ffffff",
          "type": "color",
          "outputAsCssVar": true
        },
        {
          "id": "bg_secondary",
          "label": "Secondary Background",
          "default": "#f9f9f9",
          "type": "color",
          "outputAsCssVar": true
        },
        {
          "id": "text_content",
          "label": "Content Text",
          "default": "#333333",
          "type": "color",
          "outputAsCssVar": true
        },
        {
          "id": "text_heading",
          "label": "Heading Text",
          "default": "#000000",
          "type": "color",
          "outputAsCssVar": true
        },
        {
          "id": "accent",
          "label": "Accent Color",
          "default": "#0d47b7",
          "type": "color",
          "outputAsCssVar": true
        }
      ],
      "typography": [
        {
          "id": "typography_header",
          "type": "header",
          "label": "Typography"
        },
        {
          "id": "heading_font",
          "label": "Heading Font",
          "type": "font_picker",
          "default": {
            "stack": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif",
            "weight": 700
          }
        },
        {
          "id": "body_font",
          "label": "Body Font",
          "type": "font_picker",
          "default": {
            "stack": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif",
            "weight": 400
          }
        }
      ],
      "privacy": [
        {
          "id": "privacy_header",
          "type": "header",
          "label": "Privacy"
        },
        {
          "id": "use_bunny_fonts",
          "type": "checkbox",
          "label": "Use Privacy-Friendly Font CDN",
          "default": false,
          "description": "Enable to serve Google Fonts from Bunny CDN (GDPR-compliant, no tracking)"
        }
      ]
    }
  }
}
```

### Available Setting Types

- `header`: Visual divider to group related settings into sections
- `text`: Single-line text input. _(Can be used with `outputAsCssVar` if its value is a valid CSS value, like a color or size.)_
- `textarea`: Multi-line text input field. _(Can be used with `outputAsCssVar` if its value is a valid CSS value.)_
- `color`: Color picker with hex input and color swatch. _(Ideal for `outputAsCssVar`.)_
- `checkbox`: Boolean toggle switch. _(Not typically used for direct CSS output, as its value is a boolean.)_
- `range`: Numeric slider with min/max/step options. _(Ideal for `outputAsCssVar`. The output value is a unitless number, so you may need `calc()` in CSS, e.g., `width: calc(1px _ var(--my-range-var));`)\*
- `select`: Dropdown menu with predefined options. _(Can be used with `outputAsCssVar` if the `value` of the selected option is a valid CSS value.)_
- `radio`: Radio buttons for single selection from options. _(Can be used with `outputAsCssVar` if the `value` of the selected option is a valid CSS value.)_
- `font_picker`: Font family and weight selector with CSS variable output. _(Specially designed for `outputAsCssVar`; it generates multiple variables for font properties, e.g., `--group-id-family` and `--group-id-weight`.)_
- `image`: Image uploader with preview, browse, and metadata editing. _(Can be used with `outputAsCssVar` to output the image URL, suitable for `background-image: url(var(--my-image-var));`)_
- `video`: Video uploader with preview and media library integration. _(Value is a path; not typically used for CSS variables.)_
- `menu`: Dropdown populated with available navigation menus. _(Value is a menu ID; not used for CSS.)_
- `link`: Link builder for internal pages or custom URLs with text and target options. _(Value is a complex object; not used for CSS.)_

### CSS Variables & Theme Object Access

**CSS Variable Output:** When `outputAsCssVar: true` is set, the setting automatically generates CSS custom properties accessible in your styles. For this to be effective, the setting's value must be a valid CSS value (e.g., a color, a size like `16px`, or a font stack). The variable is generated by the `{% theme_settings %}` tag and its name is constructed as `--groupName-settingId` (e.g., `var(--colors-background)`).

**Special Cases:**

- **Font Picker**: Always generates CSS variables (no `outputAsCssVar` needed). Creates `--groupName-settingId-family` and `--groupName-settingId-weight` variables. For `body_font` with weight 400, also generates `--groupName-body_font_bold-weight` for smart bold loading.
- **Range Inputs**: When a `unit` is specified (e.g., `"px"`), the unit is automatically appended to the CSS variable value.

**Direct Access via Theme Object:** All theme settings are also available as a `theme` object in Liquid templates:

```liquid
<!-- Access theme settings directly in templates -->
{% if theme.layout.show_header %}
  <header>Site header content here</header>
{% endif %}

<!-- Use theme settings for conditional logic -->
<div class="container-{{ theme.layout.site_width }}">
  {{ theme.content.footer_text }}
</div>

<!-- Access nested settings -->
{{ theme.colors.background }}
{{ theme.typography.base_font_size }}px
```

The `theme` object structure follows your `theme.json` groups and setting IDs: `theme.{group}.{setting_id}`.

For complete details on all available setting types and their properties, see the [Setting Types Reference](theming-setting-types.md).

## 4. Layout Template (layout.liquid)

The `layout.liquid` file defines the main HTML structure that wraps all page content. It's the foundation of every page.

### Essential Structure

```liquid
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    {% seo %}                    <!-- SEO meta tags -->
    {% fonts %}                  <!-- Font preconnect links and stylesheet (recommended) -->
    {% asset src: "base.css" %}      <!-- Load theme CSS -->
    {% header_assets %}         <!-- Render enqueued header styles and scripts (sorted by priority) -->
    {% theme_settings %}        <!-- Output CSS variables from global settings -->
    {% custom_css %}            <!-- Custom CSS from theme settings (optional) -->
    {% custom_head_scripts %}   <!-- Custom scripts for head (e.g., Google Analytics) (optional) -->
</head>
<body class="{{ body_class }}">
    {{ header }}                <!-- Global header widget -->

    <main id="main-content">
        {{ main_content }}      <!-- Page content insertion point -->
    </main>

    {{ footer }}                <!-- Global footer widget -->

    {% asset src: "scripts.js" %}
    {% footer_assets %}         <!-- Render enqueued footer styles and scripts (sorted by priority) -->
    {% custom_footer_scripts %} <!-- Custom scripts before closing body tag (optional) -->
</body>
</html>
```

### Key Liquid Tags

- `{% seo %}`: Automatically generates SEO meta tags (title, description, Open Graph, etc.)
- `{% fonts %}`: Outputs both font preconnect links and stylesheet in one tag. Automatically handles Google Fonts and Bunny Fonts based on theme settings.
- `{% asset src: "filename" %}`: Loads and includes assets from the `/assets/` directory
- `{% header_assets %}`: Renders all enqueued CSS and JS files marked for header, sorted by priority
- `{% footer_assets %}`: Renders all enqueued CSS and JS files marked for footer, sorted by priority
- `{% theme_settings %}`: Outputs CSS custom properties from global settings as `<style>` tags in the document head
- `{% custom_css %}`: Outputs custom CSS from theme settings wrapped in a `<style>` tag. Should be placed in the `<head>` section.
- `{% custom_head_scripts %}`: Outputs custom scripts from theme settings as raw HTML. Should be placed in the `<head>` section (e.g., for Google Analytics).
- `{% custom_footer_scripts %}`: Outputs custom scripts from theme settings as raw HTML. Should be placed before the closing `</body>` tag.
- `{{ header }}`: Renders the global header widget
- `{{ main_content }}`: The insertion point for page content (widgets)
- `{{ footer }}`: Renders the global footer widget
- `{{ body_class }}`: Dynamic CSS classes for the body element

### Available Template Variables (Layout Only)

The `layout.liquid` template has access to additional objects that individual widgets cannot access:

- `{{ header }}`: Rendered header content
- `{{ main_content }}`: Rendered main page content
- `{{ footer }}`: Rendered footer content
- `{{ body_class }}`: Dynamic CSS classes for the body element
- `{{ page.* }}`: Current page data
- `{{ project.* }}`: Project information
- `{{ theme.* }}`: Global theme settings

#### Page Object (`{{ page.* }}`)

Contains data from the current page's JSON file:

```liquid
{{ page.id }}          <!-- Page slug/filename -->
{{ page.name }}        <!-- Display name (e.g., "About Us") -->
{{ page.slug }}        <!-- URL slug (e.g., "about-us") -->
{{ page.created }}     <!-- Creation timestamp -->
{{ page.updated }}     <!-- Last updated timestamp -->

<!-- SEO data -->
{{ page.seo.description }}    <!-- Meta description -->
{{ page.seo.og_title }}      <!-- Open Graph title -->
{{ page.seo.og_image }}      <!-- Social media image path -->
{{ page.seo.robots }}        <!-- Robots directive -->
{{ page.seo.canonical_url }} <!-- Canonical URL -->
```

#### Project Object (`{{ project.* }}`)

Contains data from the main `projects.json` file:

```liquid
{{ project.id }}          <!-- Project ID -->
{{ project.name }}        <!-- Project name -->
{{ project.description }} <!-- Project description -->
{{ project.theme }}       <!-- Active theme ID -->
{{ project.siteUrl }}     <!-- Full site URL -->
{{ project.created }}     <!-- Project creation timestamp -->
{{ project.updated }}     <!-- Project last updated timestamp -->
```

**Example usage in `layout.liquid`:**

```liquid
<!-- Dynamic page title -->
<title>{{ page.name }} - {{ project.name }}</title>

<!-- SEO meta tags -->
{% if page.seo.description %}
  <meta name="description" content="{{ page.seo.description }}">
{% endif %}

<!-- Canonical URL -->
<link rel="canonical" href="{{ project.siteUrl }}{{ page.slug }}">
```

## 5. Liquid Tags

Widgetizer provides powerful Liquid tags to simplify common tasks in your templates.

### Image tag

The `{% image %}` tag is the recommended way to render images in your theme. It automatically handles generating the correct `src` for different image sizes, adds important attributes like `width`, `height`, and `alt`, and enables lazy loading by default.

**SVG behavior:** SVGs always render from the original file (no size variants). The `size` parameter is ignored for SVGs, and `width`/`height` attributes are omitted. In path-only mode, SVGs always return the original file path.

#### Basic Usage

```liquid
{% image src: widget.settings.myImage %}
```

#### Advanced Usage with Parameters

```liquid
{% image src: widget.settings.myImage, size: 'large', class: 'hero-image', lazy: false, alt: 'Custom alt text' %}
```

#### Path-only output

For cases where you need just the image URL (e.g., CSS background images), use the `output` parameter with `'path'` or `'url'`:

```liquid
<!-- Get image path for CSS backgrounds -->
{% image src: widget.settings.backgroundImage, size: 'medium', output: 'path' %}
{% image src: widget.settings.heroImage, size: 'large', output: 'path' %}

<!-- Use in inline CSS -->
<div style="background-image: url('{% image src: widget.settings.bgImage, size: 'large', output: 'path' %}');">
  Content here
</div>

<!-- Use in CSS blocks -->
<style>
  #{{ widget.id }} {
    background-image: url('{% image src: widget.settings.backgroundImage, output: 'path' %}');
    background-size: cover;
    background-position: center;
  }
</style>
```

#### Parameters (named; order does not matter)

**For HTML `<img>` output:**

| Parameter | Type    | Default      | Description                                             |
| :-------- | :------ | :----------- | :------------------------------------------------------ |
| `size`    | String  | `'medium'`   | Image size: `'thumb'`, `'small'`, `'medium'`, `'large'` |
| `class`   | String  | `''`         | CSS class to add to the `<img>` tag                     |
| `lazy`    | Boolean | `true`       | Whether to add `loading="lazy"` attribute               |
| `alt`     | String  | (from media) | Override alt text from media library                    |
| `title`   | String  | (from media) | Override title text from media library                  |

**For path-only output:** use `output: 'path'` or `output: 'url'`. Optional: `size` (default `'medium'`).

#### Usage Examples

```liquid
<!-- Different sizes -->
{% image src: widget.settings.heroImage, size: 'large' %}
{% image src: widget.settings.thumbnail, size: 'thumb' %}

<!-- With CSS class -->
{% image src: widget.settings.productImage, size: 'medium', class: 'product-photo' %}

<!-- Disable lazy loading -->
{% image src: widget.settings.heroImage, size: 'large', class: 'hero-image', lazy: false %}

<!-- Custom alt text -->
{% image src: widget.settings.photo, size: 'medium', lazy: true, alt: 'Custom description' %}

<!-- Path-only for CSS backgrounds -->
{% image src: widget.settings.backgroundImage, output: 'path' %}
{% image src: widget.settings.backgroundImage, size: 'large', output: 'path' %}
{% image src: widget.settings.backgroundImage, size: 'medium', output: 'url' %}
```

### Video tag

The `{% video %}` tag renders HTML5 video elements with proper attributes and fallbacks.

#### Basic Usage

```liquid
{% video src: widget.settings.heroVideo %}
```

#### Advanced Usage with Parameters

```liquid
{% video src: widget.settings.heroVideo, controls: false, autoplay: true, muted: true, loop: true, class: 'hero-video' %}
```

#### Path-only output

For cases where you need just the video URL (e.g., custom video players or JavaScript), use the `output` parameter with `'path'` or `'url'`:

```liquid
<!-- Get video path for custom player -->
{% video src: widget.settings.backgroundVideo, output: 'path' %}

<!-- Use in JavaScript -->
<script>
  const videoSrc = '{% video src: widget.settings.heroVideo, output: "path" %}';
  // Use with custom video player
</script>
```

#### Parameters (named; order does not matter)

**For HTML `<video>` output:** `controls`, `autoplay`, `muted`, `loop` (booleans), `class` (string).

**For path-only output:** use `output: 'path'` or `output: 'url'`.

#### Usage Examples

```liquid
<!-- Full video tag with controls -->
{% video src: widget.settings.heroVideo %}

<!-- Autoplay muted video -->
{% video src: widget.settings.backgroundVideo, controls: true, autoplay: true, muted: true %}

<!-- Custom CSS class -->
{% video src: widget.settings.introVideo, controls: true, autoplay: false, muted: false, loop: false, class: 'intro-video' %}

<!-- Path-only for custom player -->
{% video src: widget.settings.customVideo, output: 'path' %}
{% video src: widget.settings.customVideo, output: 'url' %}
```

### Audio tag

The `{% audio %}` tag returns the path to an audio file from the media library. Unlike the `{% video %}` tag, it does not render a full HTML element by default, giving you flexibility to use custom audio players or HTML5 `<audio>` tags.

#### Basic Usage

```liquid
<!-- Get audio path -->
{% audio src: widget.settings.backgroundMusic %}

<!-- Use with HTML5 audio tag -->
<audio controls>
  <source src="{% audio src: widget.settings.backgroundMusic %}" type="audio/mpeg">
</audio>
```

#### Path-only output

The `{% audio %}` tag always returns just the path. You can explicitly use `output: 'path'` or `output: 'url'` for consistency with other media tags:

```liquid
{% audio src: widget.settings.soundEffect %}
{% audio src: widget.settings.soundEffect, output: 'path' %}
{% audio src: widget.settings.soundEffect, output: 'url' %}
```

All three forms return the same audio file path.

### YouTube tag

The `{% youtube %}` tag parses the data from a `youtube` setting type and renders a responsive YouTube embed.

#### Basic Usage

```liquid
{% youtube src: widget.settings.myYoutubeVideo %}
```

#### Custom Class

You can provide a custom CSS class for the wrapper element:

```liquid
{% youtube src: widget.settings.heroVideo, class: 'hero-youtube-wrapper' %}
```

#### Path-only output

If you need only the embed URL (e.g., for use in a custom `<iframe>` or JavaScript), use the `output` parameter with `'path'` or `'url'`:

```liquid
{% youtube src: widget.settings.introVideo, output: 'path' %}
```

#### Output Structure

By default, the tag outputs a container with a responsive aspect ratio:

```html
<div
  class="youtube-embed-wrapper [custom-class]"
  style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden;"
>
  <iframe
    src="https://www.youtube.com/embed/[videoId]?[options]"
    style="position:absolute; top:0; left:0; width:100%; height:100%;"
    frameborder="0"
    allow="autoplay; encrypted-media"
    allowfullscreen
  ></iframe>
</div>
```

### Asset Management Tags

These tags allow for efficient, deduplicated loading of assets (CSS and JS) in your theme with fine-grained control over placement and loading order. They are particularly useful when multiple widgets might require the same library (e.g., a slider plugin), ensuring it is only loaded once.

**Asset Resolution:**

- **Inside widget templates**: `enqueue_*` loads assets from the widget's folder (`widgets/{widget-name}/`)
- **Inside `layout.liquid` or snippets**: `enqueue_*` loads assets from the theme `assets/` folder

> [!IMPORTANT] **Asset Filename Collisions During Export**
>
> During export, all widget CSS and JS files are flattened into a single `assets/` folder. If two different widgets have files with the same name (e.g., both have `styles.css`), **the last one copied will overwrite the first**. Use unique, widget-prefixed filenames (e.g., `slideshow.css`, `accordion.js`) to avoid collisions.

#### Enqueue Script

Registers a JavaScript file for loading. By default, scripts are output in the footer, but you can specify header placement.

**Usage:**

```liquid
{% enqueue_script src: "filename.js" %}
{% enqueue_script src: "vendor.js", defer: true, async: false, location: "footer", priority: 30 %}
{% enqueue_script src: "analytics.js", location: "header", priority: 10 %}
```

**Options:**

- `location`: (String, default: `"footer"`) Where to render the script: `"header"` or `"footer"`
- `priority`: (Number, default: `50`) Loading order priority. Lower numbers load first (10 → 20 → 30 → 50 → 100)
- `defer`: (Boolean, default: `false`) Whether to add the `defer` attribute (opt-in)
- `async`: (Boolean, default: `false`) Whether to add the `async` attribute (opt-in)

**Priority Examples:**

```liquid
{# High priority - loads early #}
{% enqueue_script src: "analytics.js", location: "header", priority: 10 %}

{# Medium priority - default #}
{% enqueue_script src: "widgets.js", priority: 50 %}

{# Low priority - loads late #}
{% enqueue_script src: "non-critical.js", priority: 100 %}
```

#### Enqueue Preload

Registers a resource preload directive for the `<head>`. This is critical for optimizing LCP (Largest Contentful Paint) by preloading high-priority images, fonts, or scripts before they are discovered by the browser.

**Usage:**

```liquid
{% enqueue_preload src: "hero.jpg", as: "image", fetchpriority: "high" %}
{% enqueue_preload src: "font.woff2", as: "font", type: "font/woff2", crossorigin: true %}
```

**Options:**

- `src`: (String, required) The URL of the resource to preload.
- `as`: (String, required) The type of content (e.g., `"image"`, `"script"`, `"font"`, `"style"`).
- `type`: (String, optional) The MIME type (e.g., `"image/jpeg"`, `"font/woff2"`).
- `fetchpriority`: (String, optional) Priority hint: `"high"`, `"low"`, or `"auto"`.
- `media`: (String, optional) Media query for responsive preloading.
- `imagesrcset`: (String, optional) Srcset for responsive images.
- `imagesizes`: (String, optional) Sizes attribute for responsive images.
- `crossorigin`: (Boolean, optional) Whether to use CORS (required for fonts).

#### Enqueue Style

Registers a CSS file for loading. By default, styles are output in the header, but you can specify footer placement.

**Usage:**

```liquid
{% enqueue_style src: "filename.css" %}
{% enqueue_style src: "print.css", media: "print", location: "footer", priority: 90 %}
{% enqueue_style src: "critical.css", location: "header", priority: 10 %}
```

**Options:**

- `location`: (String, default: `"header"`) Where to render the stylesheet: `"header"` or `"footer"`
- `priority`: (Number, default: `50`) Loading order priority. Lower numbers load first (10 → 20 → 30 → 50 → 100)
- `media`: (String, default: `null`) The value for the `media` attribute (e.g., `"screen"`, `"print"`)
- `id`: (String, default: `null`) The value for the `id` attribute

**Priority Examples:**

```liquid
{# Critical CSS - loads first #}
{% enqueue_style src: "critical.css", priority: 10 %}

{# Base styles #}
{% enqueue_style src: "base.css", priority: 20 %}

{# Widget styles - default priority #}
{% enqueue_style src: "slideshow.css", priority: 50 %}

{# Print styles - loads last #}
{% enqueue_style src: "print.css", location: "footer", priority: 90, media: "print" %}
```

#### Header Assets

Outputs all CSS and JS files marked for header, sorted by priority. Styles render first, then scripts, both sorted by priority.

**Usage:** Place this tag in your `layout.liquid` file, inside the `<head>` section.

```liquid
<head>
  {% seo %}
  {% fonts %}
  {% theme_settings %}
  {% asset src: "base.css" %}
  {% header_assets %}
</head>
```

**Rendering Order:**

1. Header styles sorted by priority (ascending)
2. Header scripts sorted by priority (ascending)

#### Footer Assets

Outputs all CSS and JS files marked for footer, sorted by priority. Styles render first, then scripts, both sorted by priority.

**Usage:** Place this tag in your `layout.liquid` file, traditionally just before the closing `</body>` tag.

```liquid
<body>
  <!-- content -->
  {% asset src: "scripts.js" %}
  {% footer_assets %}
</body>
```

**Rendering Order:**

1. Footer styles sorted by priority (ascending)
2. Footer scripts sorted by priority (ascending)

#### Priority System

The priority system allows you to control the exact loading order of assets:

- **Lower numbers = earlier loading** (10 loads before 20, which loads before 50)
- **Default priority: 50** (middle priority)
- **Common pattern:** Use increments of 10 (10, 20, 30, 40, 50, 60, 70, 80, 90, 100) to leave room for future insertions
- **Within same priority:** Assets maintain insertion order (stable sort)

**Example Priority Strategy:**

```liquid
{# Foundation/Critical - Priority 10 #}
{% enqueue_style src: "reset.css", priority: 10 %}
{% enqueue_script src: "analytics.js", location: "header", priority: 10 %}

{# Base Styles - Priority 20 #}
{% enqueue_style src: "base.css", priority: 20 %}

{# Components - Priority 30 #}
{% enqueue_style src: "components.css", priority: 30 %}
{% enqueue_script src: "components.js", priority: 30 %}

{# Widgets - Priority 40-50 #}
{% enqueue_style src: "slideshow.css", priority: 40 %}
{% enqueue_script src: "slideshow.js", priority: 40 %}

{# Theme Overrides - Priority 50 (default) #}
{% enqueue_style "theme.css" %}

{# Non-critical/Print - Priority 90+ #}
{% enqueue_style src: "print.css", location: "footer", priority: 90, media: "print" %}
```

#### Asset Tag

Directly includes CSS, JavaScript, or image assets in your templates. Unlike `enqueue_*` tags, this tag outputs the asset immediately where it's placed.

**Usage:**

```liquid
{# Basic usage - CSS files #}
{% asset src: "base.css" %}
{% asset src: "theme.css" %}

{# Basic usage - JavaScript files #}
{% asset src: "scripts.js" %}

{# Basic usage - Images #}
{% asset src: "logo.svg" %}
```

**Advanced Usage with Options:**

```liquid
{# JavaScript with defer attribute (opt-in) #}
{% asset src: "scripts.js", defer: true %}

{# JavaScript with async attribute (opt-in) #}
{% asset src: "vendor.js", async: true %}

{# JavaScript with both defer and async #}
{% asset src: "module.js", defer: true, async: true %}

{# CSS with media query #}
{% asset src: "print.css", media: "print" %}

{# CSS with ID attribute #}
{% asset src: "theme.css", id: "theme-stylesheet" %}

{# External resource with crossorigin #}
{% asset src: "font.css", crossorigin: "anonymous" %}

{# Resource with integrity hash #}
{% asset src: "vendor.js", integrity: "sha384-..." %}
```

**Options:**

| Option        | Type    | Default | Description                                                              |
| :------------ | :------ | :------ | :----------------------------------------------------------------------- |
| `defer`       | Boolean | `false` | For JS files, adds the `defer` attribute (opt-in - only added if `true`) |
| `async`       | Boolean | `false` | For JS files, adds the `async` attribute (opt-in - only added if `true`) |
| `crossorigin` | String  | `null`  | For external resources, sets the `crossorigin` attribute                 |
| `integrity`   | String  | `null`  | Subresource Integrity hash for security (e.g., `"sha384-..."`)           |
| `media`       | String  | `null`  | For CSS files, specifies media query (e.g., `"print"`, `"screen"`)       |
| `id`          | String  | `null`  | Adds an `id` attribute to the generated tag                              |

**File Location:**

Assets are loaded from different directories based on where the tag is used:

- **Inside a widget template** (e.g., `widgets/slideshow/widget.liquid`): Loads from that widget's folder (`widgets/{widgetType}/`)
- **Inside layout or snippets**: Loads from the theme `assets/` folder

This means `{% asset "styles.css" %}` in the slideshow widget loads from `widgets/slideshow/styles.css`, while the same tag in `layout.liquid` loads from `assets/styles.css`.

**Output:**

- **CSS files** (`.css`): Outputs `<link rel="stylesheet">` tag
- **JavaScript files** (`.js`): Outputs `<script>` tag
- **Image files** (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`): Outputs `<img>` tag with metadata (alt, title) when available
- **Other file types**: Returns the asset URL as a string

**Examples:**

```liquid
{# In layout.liquid - loads from assets/ folder #}
<head>
  {% asset "base.css" %}
  {% asset "theme.css", { "id": "theme-styles", "media": "screen" } %}
</head>
<body>
  <!-- Content -->
  {% asset "scripts.js" %}
  {% asset "analytics.js", { "async": true } %}
</body>

{# In widgets/slideshow/widget.liquid - loads from widgets/slideshow/ folder #}
{% asset "slideshow.css" %}
{% asset "slideshow.js", { "defer": true } %}
```

**Asset Tag vs Enqueue Tags:**

| Feature          | `{% asset %}`               | `{% enqueue_* %}`                                 |
| :--------------- | :-------------------------- | :------------------------------------------------ |
| Output location  | Inline where placed         | Via `{% header_assets %}` / `{% footer_assets %}` |
| Deduplication    | No (outputs every time)     | Yes (same filename only loaded once)              |
| Priority control | No                          | Yes (`priority` option)                           |
| Best for         | Core theme assets in layout | Widget assets, shared libraries                   |

Use `{% asset %}` for essential theme assets that must load in a specific order (like `base.css`). Use `{% enqueue_* %}` for widget assets and shared libraries where deduplication matters.

#### Placeholder Image

Outputs a placeholder image for development and preview purposes. Theme authors can use the default core placeholder or provide a custom image from their theme's `assets/` folder.

**Basic Usage:**

```liquid
{# Default landscape placeholder as <img> tag #}
{% placeholder_image %}

{# Specific aspect ratio as <img> tag #}
{% placeholder_image aspect: 'landscape' %}
{% placeholder_image aspect: 'portrait' %}
{% placeholder_image aspect: 'square' %}

{# URL only for inline styles #}
{% placeholder_image output: 'url' %}
{% placeholder_image aspect: 'landscape', output: 'url' %}
{% placeholder_image aspect: 'square', output: 'url' %}

{# With options #}
{% placeholder_image aspect: 'landscape', class: 'hero-image', alt: 'Hero placeholder' %}
{% placeholder_image aspect: 'square', class: 'avatar', alt: 'Profile photo' %}

{# Custom theme placeholder from assets/ folder #}
{% placeholder_image src: 'my-placeholder.png' %}
{% placeholder_image src: 'my-placeholder.jpg', output: 'url' %}
```

**Aspect Ratios:**

- `landscape` (16:9, 1600x900) - default
- `portrait` (9:16, 900x1600)
- `square` (1:1, 1200x1200)

**Options (for `<img>` output):**

```liquid
{% placeholder_image src: 'custom.svg', alt: 'Add image here', class: 'placeholder', loading: 'lazy' %}
```

| Option    | Description                             |
| :-------- | :-------------------------------------- |
| `alt`     | Alt text (default: "Placeholder image") |
| `class`   | CSS class for the `<img>` tag           |
| `loading` | Loading attribute (`"lazy"`, etc.)      |
| `width`   | Width attribute                         |
| `height`  | Height attribute                        |

**Supported formats:** SVG, JPG, JPEG, PNG, GIF, WebP

## 6. Widgets

Widgets are reusable components that can be added to pages. Each widget lives in its own subdirectory containing a **schema file** (`schema.json`) and a **template file** (`widget.liquid`).

> For comprehensive guidance on building widgets, including design tokens, layout utilities, typography systems, component patterns, and best practices, see the [Widget Authoring Guide](theming-widgets.md).

### Widget File Structure

Each widget consists of two files in its own directory:

```
widgets/
└── basic-text/
    ├── schema.json     # Widget configuration schema
    └── widget.liquid   # Widget template (HTML, CSS, JS)
```

**Schema file (`schema.json`):**

```json
{
  "type": "basic-text",
  "displayName": "Basic Text",
  "settings": [
    {
      "type": "text",
      "id": "title",
      "label": "Heading",
      "default": "Default Title"
    },
    {
      "type": "textarea",
      "id": "content",
      "label": "Content",
      "default": "Default content..."
    },
    {
      "type": "color",
      "id": "textColor",
      "label": "Text Color",
      "default": "#333333"
    }
  ]
}
```

**Template file (`widget.liquid`):**

```liquid
<section
  id="{{ widget.id }}"
  class="widget widget-basic-text widget-{{ widget.id }}"
  data-widget-id="{{ widget.id }}"
  data-widget-type="basic-text"
>
  <style>
    .widget-{{ widget.id }} {
      & .widget-content {
        color: {{ widget.settings.textColor }};
      }
    }
  </style>

  <div class="widget-container">
    <div class="widget-content">
      <h2 data-setting="title">{{ widget.settings.title }}</h2>
      <p data-setting="content">{{ widget.settings.content }}</p>
    </div>
  </div>
</section>
```

### Widget Features

- **Scoped Styling**: Use `.widget-{{ widget.id }}` for widget-specific CSS to avoid conflicts
- **Settings Access**: Access widget settings via `{{ widget.settings.settingId }}`
- **Theme Settings Access**: Access global theme settings via `{{ theme.group.settingId }}`
- **External Schema**: Configuration is defined in a separate `schema.json` file
- **Live Preview**: Add `data-setting` attributes to elements for instant text updates in the editor

### Available Template Variables (Widget Templates)

Within individual widget templates (`widgets/{name}/widget.liquid`), you have access to:

- `{{ widget.id }}`: Unique widget instance ID
- `{{ widget.type }}`: Widget type identifier
- `{{ widget.settings.* }}`: Widget-specific settings
- `{{ widget.blocks }}`: Widget's blocks (if applicable)
- `{{ widget.index }}`: 1-based index of the widget in the page (first widget = 1, second = 2, etc.). This is `null` for global widgets (header/footer) or when the index is not available.
- `{{ theme.* }}`: Global theme settings organized by group

**Note:** `page.*` and `project.*` objects are only available in `layout.liquid`, not in individual widget templates.

#### Widget Index Example

The widget index can be useful for styling alternate widgets, creating numbered sections, or applying different styles based on position:

```liquid
<div class="widget widget--{{ widget.index | modulo: 2 }}" data-widget-index="{{ widget.index }}">
  {% if widget.index == 1 %}
    <h2>First Widget</h2>
  {% endif %}

  <div class="widget-number">{{ widget.index }}</div>
  <!-- Widget content -->
</div>
```

### Global Widgets

Global widgets are special widgets that appear on every page of the website. Currently, the system supports two types: **header** and **footer**.

#### Header Widget (`widgets/global/header/`)

- Located in `widgets/global/header/` with `schema.json` and `widget.liquid`
- Typically includes site branding, navigation, and search
- Can reference menu systems via `{% render 'menu', menu: widget.settings.headerNavigation %}`
- Supports responsive navigation patterns
- Paired with `templates/global/header.json` for default configuration

#### Footer Widget (`widgets/global/footer/`)

- Located in `widgets/global/footer/` with `schema.json` and `widget.liquid`
- Usually contains copyright, credits, and additional navigation
- Often includes social links and contact information
- Paired with `templates/global/footer.json` for default configuration

**Important:** Currently, header and footer are the only supported global widget types. Each global widget requires both a schema + template in `widgets/global/{name}/` and a corresponding JSON configuration in `templates/global/`.

## 7. Widget Blocks System

Blocks are sub-components that can be dynamically added to widgets, providing flexible content management within individual widgets. They allow users to build complex layouts by combining different block types within a single widget container.

### How Blocks Work

- **Dynamic Addition**: Users can add multiple blocks of different types to a widget
- **Reorderable**: Blocks can be reordered through drag-and-drop
- **Individual Settings**: Each block has its own configuration settings
- **Schema-Driven**: Block types are defined in the widget's schema

### Block Structure in Widget Templates

```liquid
<!-- Render all blocks in a widget -->
{% if widget.blocks != blank %}
  <div class="widget__blocks">
    {% for block in widget.blocks %}
      <div class="widget__block widget__block--{{ block.type }}" data-block-id="{{ block.id }}">
        {% if block.type == 'heading' %}
          <h3>{{ block.settings.headingText }}</h3>
        {% elsif block.type == 'text' %}
          <p>{{ block.settings.text }}</p>
        {% elsif block.type == 'button' %}
          <a href="{{ block.settings.link | default: '#' }}" class="button">
            {{ block.settings.label | default: 'Click Me' }}
          </a>
        {% endif %}
      </div>
    {% endfor %}
  </div>
{% endif %}
```

### Defining Blocks in Widget Schema

Blocks are defined in the widget's JSON schema using the `"blocks"` array:

```json
{
  "type": "content-widget",
  "displayName": "Content Widget",
  "settings": [
    // Widget settings here
  ],
  "blocks": [
    {
      "type": "heading",
      "displayName": "Heading Block",
      "settings": [
        {
          "type": "text",
          "id": "headingText",
          "label": "Heading Text",
          "default": "Your Heading"
        },
        {
          "type": "select",
          "id": "headingLevel",
          "label": "Heading Level",
          "default": "h2",
          "options": [
            { "value": "h1", "label": "H1" },
            { "value": "h2", "label": "H2" },
            { "value": "h3", "label": "H3" }
          ]
        }
      ]
    },
    {
      "type": "text",
      "displayName": "Text Block",
      "settings": [
        {
          "type": "textarea",
          "id": "text",
          "label": "Text Content",
          "default": "Add your text here..."
        }
      ]
    },
    {
      "type": "button",
      "displayName": "Button Block",
      "settings": [
        {
          "type": "text",
          "id": "label",
          "label": "Button Text",
          "default": "Click Me"
        },
        {
          "type": "link",
          "id": "link",
          "label": "Button Link",
          "default": "#"
        }
      ]
    }
  ]
}
```

### Block Data Structure

Blocks are stored in the widget data as:

```javascript
{
  "blocks": {
    "block_1234567890": {
      "type": "heading",
      "settings": {
        "headingText": "Welcome",
        "headingLevel": "h2"
      }
    },
    "block_9876543210": {
      "type": "text",
      "settings": {
        "text": "This is some example text content."
      }
    }
  },
  "blocksOrder": ["block_1234567890", "block_9876543210"]
}
```

### Advanced Block Rendering

For more complex block rendering, you can use conditional logic and include additional styling:

```liquid
{% if widget.blocks != blank %}
  <div class="widget__blocks">
    {% for block in widget.blocks %}
      <div
        class="widget__block widget__block--{{ block.type }}"
        data-block-id="{{ block.id }}"
        data-block-type="{{ block.type }}"
      >
        {% case block.type %}
          {% when 'heading' %}
            {% assign heading_tag = block.settings.headingLevel | default: 'h2' %}
            <{{ heading_tag }} class="block-heading">
              {{ block.settings.headingText | default: 'Default Heading' }}
            </{{ heading_tag }}>

          {% when 'text' %}
            <div class="block-text">
              {{ block.settings.text | default: 'Add your text content...' }}
            </div>

          {% when 'image' %}
            {% if block.settings.image != blank %}
              {% image src: block.settings.image, size: 'medium', class: 'block-image' %}
            {% endif %}

          {% when 'button' %}
            <a
              href="{{ block.settings.link | default: '#' }}"
              class="button button--{{ block.settings.style | default: 'primary' }}"
              {% if block.settings.openInNewTab %}target="_blank"{% endif %}
            >
              {{ block.settings.label | default: 'Button' }}
            </a>

          {% else %}
            <div class="block-unknown">
              <em>Unknown block type: {{ block.type }}</em>
            </div>
        {% endcase %}
      </div>
    {% endfor %}
  </div>
{% else %}
  <div class="widget__blocks-empty">
    <p><em>No blocks added yet. Add some content blocks to get started.</em></p>
  </div>
{% endif %}
```

### Block Styling Best Practices

Use scoped CSS with widget IDs to style blocks without conflicts:

```css
/* Widget-specific block styling */
#{{ widget.id }} .widget__blocks {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

#{{ widget.id }} .widget__block--heading h1,
#{{ widget.id }} .widget__block--heading h2,
#{{ widget.id }} .widget__block--heading h3 {
  margin: 0;
  color: {{ widget.settings.headingColor | default: '#333' }};
}

#{{ widget.id }} .widget__block--text {
  line-height: 1.6;
  color: {{ widget.settings.textColor | default: '#666' }};
}

#{{ widget.id }} .widget__block--button .button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: {{ widget.settings.buttonColor | default: '#007bff' }};
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.2s;
}

#{{ widget.id }} .widget__block--button .button:hover {
  background: {{ widget.settings.buttonHoverColor | default: '#0056b3' }};
}
```

### Common Block Types

**Heading Block**

- Single-line text input for heading text
- Dropdown for heading level (H1-H6)
- Optional styling options

**Text Block**

- Textarea for paragraph content
- Optional formatting options
- Rich text support (if implemented)

**Image Block**

- Image picker
- Alt text input
- Size and alignment options

**Button Block**

- Button text input
- Link picker (internal pages or external URLs)
- Style options (primary, secondary, etc.)
- Target options (same window, new tab)

**Video Block**

- Video picker from media library
- Autoplay, muted, loop options
- Poster image override

## 8. Templates

Templates define the structure and default content for different page types, organizing widgets into pre-defined layouts.

### Page Templates (`templates/*.json`)

Page templates define widget arrangements and default content for different types of pages:

```json
{
  "name": "Basic Page",
  "description": "A simple page layout",
  "widgets": [
    {
      "type": "header",
      "settings": {
        "headerTitle": "My Site"
      }
    },
    {
      "type": "basic-text",
      "settings": {
        "title": "Welcome",
        "content": "Welcome to my website!"
      }
    },
    {
      "type": "footer",
      "settings": {}
    }
  ]
}
```

### Global Templates (`templates/global/*.json`)

Global templates define default instances of global widgets that appear on every page:

```json
{
  "type": "header",
  "settings": {
    "headerTitle": "Default Site Title",
    "headerNavigation": "main-nav"
  }
}
```

## 9. Navigation Menus

Menus are defined as JSON files in the `/menus/` directory and support nested navigation up to 3 levels deep.

### Menu Structure (`menus/main-nav.json`)

```json
{
  "name": "Main Navigation",
  "description": "Primary navigation menu",
  "items": [
    {
      "label": "Home",
      "link": "/",
      "items": []
    },
    {
      "label": "About",
      "link": "/about",
      "items": [
        {
          "label": "Our Story",
          "link": "/about/story",
          "items": []
        },
        {
          "label": "Team",
          "link": "/about/team",
          "items": []
        }
      ]
    }
  ]
}
```

### Rendering Menus

Use the `{% render 'menu' %}` tag with custom CSS classes to render navigation menus:

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

### Menu Snippet Parameters

- `menu`: The menu object containing the items array
- `class_menu`: CSS classes for the `<nav>` element
- `class_list`: CSS classes for `<ul>` elements
- `class_item`: CSS classes for `<li>` elements
- `class_link`: CSS classes for `<a>` elements
- `class_submenu`: CSS classes for submenu `<ul>` elements
- `class_has_submenu`: CSS classes for items that have child items, allowing you to style dropdown indicators and submenu behaviors.

The menu snippet automatically adds the `class_has_submenu` class to items that have child items, allowing you to style dropdown indicators and submenu behaviors.

## 10. Assets Management

### CSS Files

- `base.css`: Core theme styles (design tokens, utility classes, component styles)
- Shared CSS files for complex widgets (e.g., `slideshow.css`)
- Loaded via `{% asset "filename.css" %}` or `{% enqueue_style "filename.css" %}`
- Use `{% header_assets %}` or `{% footer_assets %}` to render enqueued styles

### JavaScript Files

- `scripts.js`: Main theme scripts
- Shared JS files for complex widgets (e.g., `slideshow.js`)
- Loaded via `{% asset "filename.js" %}` or `{% enqueue_script "filename.js" %}`
- Use `{% header_assets %}` or `{% footer_assets %}` to render enqueued scripts

### Widget Styles & Scripts

Widget-specific CSS and JavaScript are typically **inline** within the `widget.liquid` file:

```liquid
<section id="{{ widget.id }}" class="widget widget-{{ widget.id }}">
  <style>
    .widget-{{ widget.id }} {
      /* Scoped styles using CSS nesting */
    }
  </style>

  <!-- Widget HTML -->

  <script>
    (function() {
      const widget = document.getElementById('{{ widget.id }}');
      // Scoped JavaScript
    })();
  </script>
</section>
```

For complex widgets that need shared scripts (like sliders or carousels), place reusable assets in `widgets/{widget-name}/` and enqueue them:

```liquid
{% enqueue_style "slideshow.css", { "priority": 30 } %}
{% enqueue_script "slideshow.js", { "priority": 30 } %}
```

These will be automatically rendered by `{% header_assets %}` (for styles) and `{% footer_assets %}` (for scripts) in your layout template, sorted by priority. When `enqueue_*` is called from a widget template, assets are loaded from that widget’s folder. When `enqueue_*` is called from `layout.liquid` or snippets, assets are loaded from the theme `assets/` folder.

### Assets During Export

When exporting a project to static HTML:

- **Theme Assets**: All files from `/assets/` are copied to the output directory
- **Widget Assets**: All `.css` and `.js` files found in the `/widgets/` directory are **flattened** into the output `/assets/` directory
- **Uploaded Images**: All images from `/uploads/images/` are copied to maintain relative paths
- **Path Optimization**: Asset paths are converted to relative URLs for optimal static hosting

> [!WARNING] Because widget assets are flattened during export, files with the same name from different widgets will collide. Always use unique, widget-prefixed filenames (e.g., `slideshow.css` instead of `styles.css`).

## 11. Advanced Features

### Scroll Reveal Animations

The Arch theme includes a scroll reveal animation system that animates elements as they enter the viewport. This system respects user preferences for reduced motion and can be toggled on/off via theme settings.

#### How It Works

1. **CSS Classes**: Elements with the `.reveal` class start hidden (`opacity: 0`) and become visible when the `.revealed` class is added
2. **JavaScript Observer**: The `reveal.js` script uses Intersection Observer to detect when elements enter the viewport
3. **Theme Setting**: Users can enable/disable animations via the "Enable scroll reveal animations" setting in Theme Settings > Animations

#### Available Animation Classes

Add these classes to elements you want to animate:

| Class           | Effect                                    |
| :-------------- | :---------------------------------------- |
| `.reveal`       | Base class (required) - fades in          |
| `.reveal-up`    | Slides up while fading in                 |
| `.reveal-down`  | Slides down while fading in               |
| `.reveal-left`  | Slides from right to left while fading in |
| `.reveal-right` | Slides from left to right while fading in |
| `.reveal-scale` | Scales up from 95% while fading in        |
| `.reveal-fade`  | Simple fade in (no transform)             |

#### Stagger Delays

Use the `--reveal-delay` CSS variable to create staggered animations:

```liquid
{% for blockId in widget.blocksOrder %}
  {% assign block = widget.blocks[blockId] %}
  <div class="item reveal reveal-up" style="--reveal-delay: {{ forloop.index0 }}">
    {{ block.settings.text }}
  </div>
{% endfor %}
```

Each increment of `--reveal-delay` adds 0.1s to the animation delay.

#### Implementation in layout.liquid

The animation system requires two parts in `layout.liquid`:

**1. CSS Override (in `<head>`)** - When animations are disabled, ensure elements remain visible:

```liquid
{% unless theme.layout.enable_reveal_animations %}
  <style>.reveal { opacity: 1 !important; transform: none !important; }</style>
{% endunless %}
```

**2. Script Loading (in footer)** - Only load the animation script when enabled:

```liquid
{% if theme.layout.enable_reveal_animations %}
  {% enqueue_script "reveal.js", { "priority": 50 } %}
{% endif %}
```

#### Theme Setting Definition

Add this to your `theme.json` under `settings.global`:

```json
"layout": [
  {
    "type": "header",
    "id": "layout_header",
    "label": "Animations"
  },
  {
    "type": "checkbox",
    "id": "enable_reveal_animations",
    "label": "Enable scroll reveal animations",
    "default": true,
    "description": "Animate elements as they scroll into view"
  }
]
```

#### Accessibility

The animation system automatically respects the user's `prefers-reduced-motion` preference:

- **CSS**: Media query sets `.reveal` elements to visible with no transitions
- **JavaScript**: Immediately adds `.revealed` class to all elements without animation

### Responsive Design

Use CSS custom properties from global settings for consistent theming:

```css
.my-component {
  color: var(--colors-text);
  font-family: var(--typography-body_font-family);
  background: var(--colors-background);
}
```

Alternatively, access theme settings directly in your Liquid templates:

```liquid
<div style="
  background-color: var(--bg-primary);
  font-size: {{ theme.typography.body_font_size }}px;
  {% if theme.layout.site_width == 'wide' %}max-width: 1400px;{% endif %}
">
  Content here
</div>
```

### Dynamic Body Classes

The `{{ body_class }}` variable provides contextual CSS classes:

- Page type classes
- Template-specific classes
- Custom classes based on settings

### SEO Integration

The `{% seo %}` tag automatically handles:

- Page titles and descriptions
- Open Graph tags
- Twitter Card meta tags
- Canonical URLs
- JSON-LD structured data

### Font Management

Automatic font loading and optimization:

- `{% fonts %}`: Single tag that outputs both font preconnect links and stylesheet. Handles all font loading automatically.
- Support for Google Fonts and Bunny Fonts (GDPR-compliant alternative)
- Privacy-friendly font delivery can be enabled via theme settings (`use_bunny_fonts` checkbox in the `privacy` settings group)
- Automatically generates optimized font URLs with only the weights being used
- **Smart Bold Loading**: When body font weight is 400 (normal), automatically loads an appropriate bold weight (700/600/500) to prevent browser faux-bold rendering for `<strong>`, `<b>`, and bold UI elements. This also generates a CSS variable `--typography-body_font_bold-weight` that you can use in your CSS.

**Example:**

```liquid
<!-- In layout.liquid -->
{% fonts %}

<!-- In your CSS -->
strong, b {
  font-weight: var(--typography-body_font_bold-weight, 700);
}
```

### Advanced Settings

For advanced users who need to inject custom CSS or JavaScript, the theme system provides three special settings in the `advanced` group:

- **Custom CSS** (`custom_css`): Add custom CSS that will be wrapped in a `<style>` tag
- **Custom Head Scripts** (`custom_head_scripts`): Add raw HTML/JavaScript for the `<head>` section (e.g., Google Analytics)
- **Custom Footer Scripts** (`custom_footer_scripts`): Add raw HTML/JavaScript before the closing `</body>` tag

#### Usage in layout.liquid

Theme authors can add these tags anywhere in their `layout.liquid` template:

```liquid
<head>
  <!-- ... other head content ... -->
  {% theme_settings %}
  {% custom_css %}              <!-- Outputs custom CSS in <style> tag -->
  {% custom_head_scripts %}     <!-- Outputs raw HTML (e.g., Google Analytics) -->
</head>
<body>
  <!-- ... page content ... -->
  {% custom_footer_scripts %}   <!-- Outputs raw HTML before </body> -->
</body>
```

#### Example: Google Analytics

Users can paste their Google Analytics code into the "Custom Head Scripts" setting:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", "GA_MEASUREMENT_ID");
</script>
```

The `{% custom_head_scripts %}` tag will output this code exactly as entered.

#### Example: Custom CSS

Users can add custom CSS that overrides or extends theme styles:

```css
/* Custom button styling */
.btn-custom {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50px;
  padding: 12px 30px;
}

/* Hide specific elements */
.hide-on-mobile {
  display: none;
}

@media (min-width: 768px) {
  .hide-on-mobile {
    display: block;
  }
}
```

The `{% custom_css %}` tag will wrap this in a `<style id="custom-theme-css">` tag.

#### Security Considerations

**Important:** These settings accept raw HTML, CSS, and JavaScript without sanitization. This provides maximum flexibility but requires careful use:

- Only paste code from trusted sources
- Verify the integrity of third-party scripts before adding them
- Regularly audit custom code to ensure it hasn't been modified
- Be aware that malicious code can steal user data, perform unauthorized actions, or compromise site security

For detailed security information, see the [Platform Security](core-security.md) documentation.

#### Theme Author Implementation

To enable these features in your theme, add the `advanced` settings group to your `theme.json`:

```json
{
  "settings": {
    "global": {
      "advanced": [
        {
          "type": "header",
          "id": "advanced_header",
          "label": "Advanced"
        },
        {
          "type": "textarea",
          "id": "custom_css",
          "label": "Custom CSS",
          "description": "Add custom CSS that will be injected in the <head> section. Use the {% custom_css %} tag in your layout.liquid to render it.",
          "default": ""
        },
        {
          "type": "textarea",
          "id": "custom_head_scripts",
          "label": "Custom Head Scripts",
          "description": "Add custom scripts (e.g., Google Analytics) that will be injected in the <head> section. Use the {% custom_head_scripts %} tag in your layout.liquid to render them.",
          "default": ""
        },
        {
          "type": "textarea",
          "id": "custom_footer_scripts",
          "label": "Custom Footer Scripts",
          "description": "Add custom scripts that will be injected before the closing </body> tag. Use the {% custom_footer_scripts %} tag in your layout.liquid to render them.",
          "default": ""
        }
      ]
    }
  }
}
```

Then add the corresponding tags in your `layout.liquid` where you want the content to appear.

## 12. Theme Presets

Presets are named variants of a theme that can override **settings** (colors, fonts, etc.) and/or **demo content** (templates, menus, global widgets) while sharing the same theme codebase (layout, widgets, assets, snippets). Users pick a preset when creating a project. Once a project is created, it is independent from the preset.

### Preset Directory Structure

The `presets/` directory is optional. When present, it lives at the root of the theme alongside `widgets/`, `templates/`, etc.

```
presets/
  presets.json              # Registry of all presets
  default/                  # Optional — if absent, root templates/menus are used
    preset.json             # Settings overrides only
  warm/
    preset.json             # Settings overrides (colors, fonts)
    screenshot.png          # Preview shown in preset selector UI
  hotel/
    preset.json             # Settings overrides
    screenshot.png
    templates/              # Full custom page templates
      index.json
      rooms.json
      global/
        header.json
        footer.json
    menus/                  # Custom navigation
      main-menu.json
      footer-menu.json
```

### presets.json (Preset Registry)

```json
{
  "default": "default",
  "presets": [
    { "id": "default", "name": "Consulting Firm", "description": "Clean professional style with cool tones" },
    { "id": "warm", "name": "Warm Studio", "description": "Warm earthy palette with elegant serif typography" },
    { "id": "hotel", "name": "Boutique Hotel", "description": "Luxury hotel with rooms, dining, spa, and gallery pages" }
  ]
}
```

- `"default"` field specifies which preset is pre-selected in the UI
- The `"default"` preset falls through to root `templates/`, `menus/`, and `theme.json` defaults when no `presets/default/` directory exists
- Themes without a `presets/` directory work exactly as before (zero breaking changes)

### preset.json (Per-Preset Settings Overrides)

Each preset can include a `preset.json` with a flat map of `setting_id → value`:

```json
{
  "settings": {
    "standard_bg_primary": "#fdfbf7",
    "standard_accent": "#8b6f4e",
    "heading_font": { "stack": "\"Cormorant Garamond\", serif", "weight": 500 },
    "body_font": { "stack": "\"Nunito Sans\", sans-serif", "weight": 400 },
    "enable_reveal_animations": true
  }
}
```

At project creation, these values replace the `default` field of matching settings in the project's `theme.json`. Only settings that differ from the base need to be specified — the full schema stays in the base `theme.json`.

### Fallback Chain

For any preset, the system resolves content with this fallback order:

- **Templates**: `presets/{id}/templates/` → root `templates/`
- **Menus**: `presets/{id}/menus/` → root `menus/`
- **Settings**: `presets/{id}/preset.json` overrides → `theme.json` defaults
- **Screenshot**: `presets/{id}/screenshot.png` → root `screenshot.png`

### Preset Types

Presets can be as simple or comprehensive as needed:

- **Settings-only preset**: Just `preset.json` + optional `screenshot.png`. Uses root templates and menus with overridden colors/fonts.
- **Full preset**: Includes `templates/`, `menus/`, `preset.json`, and `screenshot.png`. Provides completely different page content, navigation, and visual style.

### Frontend Integration

When a user selects a theme with presets during project creation, a visual card grid appears below the theme dropdown. Each card shows the preset's screenshot, name, and description. The default preset is pre-selected. The selected preset ID is submitted with the form data.

For detailed implementation information, see [Theme Presets](theme-presets.md).

## 13. Theme Development Workflow

1. **Planning**: Define the theme's purpose, target audience, and key features
2. **Setup**: Create the basic theme structure and `theme.json` with global settings
3. **Layout Foundation**: Build the main `layout.liquid` template with proper HTML structure
4. **Global Components**: Create header and footer widgets that will appear on every page
5. **Core Widgets**: Develop the main content widgets users will need
6. **Block System**: Design flexible block types for dynamic content within widgets
7. **Page Templates**: Define pre-built page structures using your widgets
8. **Navigation**: Create menu systems and navigation patterns
9. **Presets (Optional)**: Create preset variants with different settings, templates, and/or menus
10. **Styling**: Add comprehensive CSS for responsive design and visual polish
11. **Assets**: Optimize and organize static files (CSS, JS, images)
12. **Testing**: Test across devices, browsers, and different content scenarios
13. **Documentation**: Document custom features, settings, and usage guidelines

This theming system provides a powerful and flexible foundation for creating beautiful, functional websites while maintaining consistency and ease of use. The combination of widgets and blocks allows for maximum flexibility while keeping the user interface intuitive and manageable.

---

## 14. Theme Lifecycle in Projects

When a new project is created, the selected theme is copied into the project's data directory so it can be customized independently of the source theme:

- **Destination**: `/data/projects/<folderName>/`
- **Copied items**: `layout.liquid`, `templates/`, `widgets/`, `assets/`, and `menus/`

If a preset was selected during creation, the system also applies preset overrides (custom templates, menus, and/or settings) after the theme copy. The `presets/` directory itself is never copied into projects. See [Project Management](core-projects.md) for the full creation workflow and [Theme Presets](theme-presets.md) for preset details.

After this copy, edits in the project affect only that project's files and do not modify the original theme in `/themes/`.

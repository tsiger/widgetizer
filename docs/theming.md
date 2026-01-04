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
├── layout.liquid          # Main HTML layout template
├── screenshot.png         # Preview image for the theme
├── widgets/               # Widget templates
│   ├── basic-text.liquid  # Individual widget templates
│   ├── basic-text.css     # Widget-specific styles (optional)
│   ├── basic-text.js      # Widget-specific scripts (optional)
│   └── global/            # Global widgets
│       ├── header.liquid  # Site header
│       └── footer.liquid  # Site footer
├── templates/             # Page and global templates
│   ├── basic.json         # Page template definitions
│   └── global/            # Global template instances
│       ├── header.json    # Global header configuration
│       └── footer.json    # Global footer configuration
├── menus/                 # Navigation menu definitions
│   └── main-nav.json      # Menu structure and items
└── assets/                # Static assets
    ├── base.css           # Theme base styles
    ├── header_scripts.js  # Scripts loaded in <head>
    └── footer_scripts.js  # Scripts loaded before </body>
```

## 3. Theme Manifest (theme.json)

The `theme.json` file serves as the theme's manifest and defines global settings that can be customized by users.

### Basic Metadata

```json
{
  "name": "My Theme",
  "version": "1.0.0",
  "description": "A beautiful, responsive theme",
  "author": "Your Name",
  "widgets": 15,
  "useCoreWidgets": true
}
```

### Global Settings Schema

The `settings.global` object defines customizable options organized into logical groups:

```json
{
  "settings": {
    "global": {
      "colors": [
        {
          "id": "colors_header",
          "type": "header",
          "label": "Color Settings"
        },
        {
          "id": "background",
          "label": "Background Color",
          "default": "#FFFFFF",
          "type": "color",
          "outputAsCssVar": true
        },
        {
          "id": "accent",
          "label": "Accent Color",
          "default": "#0066cc",
          "type": "color",
          "outputAsCssVar": true
        }
      ],
      "typography": [
        {
          "id": "typography_header",
          "type": "header",
          "label": "Typography Settings"
        },
        {
          "id": "heading_font",
          "label": "Heading Font",
          "type": "font_picker",
          "default": {
            "stack": "system-ui, sans-serif",
            "weight": 700
          },
          "outputAsCssVar": true
        },
        {
          "id": "base_font_size",
          "type": "range",
          "label": "Base Font Size",
          "default": 16,
          "min": 12,
          "max": 24,
          "step": 1,
          "unit": "px",
          "outputAsCssVar": true
        }
      ],
      "layout": [
        {
          "id": "layout_header",
          "type": "header",
          "label": "Layout Settings"
        },
        {
          "id": "show_header",
          "label": "Show Header",
          "default": true,
          "type": "checkbox"
        },
        {
          "id": "site_width",
          "type": "select",
          "label": "Site Width",
          "default": "normal",
          "options": [
            { "value": "narrow", "label": "Narrow" },
            { "value": "normal", "label": "Normal" },
            { "value": "wide", "label": "Wide" }
          ]
        }
      ],
      "content": [
        {
          "id": "logo_image",
          "type": "image",
          "label": "Site Logo",
          "description": "Upload your site logo"
        },
        {
          "id": "footer_text",
          "type": "textarea",
          "label": "Footer Text",
          "default": "© 2024 My Website",
          "description": "Text displayed in the footer"
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

For complete details on all available setting types and their properties, see the [Theme & Widget Setting Types documentation](theme-settings.md).

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
    {% fonts_preconnect %}      <!-- Font preconnection links -->
    {% fonts_stylesheet %}      <!-- Font stylesheets -->
    {% asset "base.css" %}      <!-- Load theme CSS -->
    {% render_styles %}         <!-- Render enqueued styles -->
    {% theme_settings %}        <!-- Output CSS variables from global settings -->
</head>
<body class="{{ body_class }}">
    {{ header }}                <!-- Global header widget -->

    <main id="main-content">
        {{ main_content }}      <!-- Page content insertion point -->
    </main>

    {{ footer }}                <!-- Global footer widget -->

    {% render_scripts %}        <!-- Render enqueued scripts -->
</body>
</html>
```

### Key Liquid Tags

- `{% seo %}`: Automatically generates SEO meta tags (title, description, Open Graph, etc.)
- `{% fonts_preconnect %}`: Creates preconnect links for faster font loading
- `{% fonts_stylesheet %}`: Includes CSS for selected fonts
- `{% asset "filename" %}`: Loads and includes assets from the `/assets/` directory
- `{% theme_settings %}`: Outputs CSS custom properties from global settings as `<style>` tags in the document head
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

## 5. Liquid Tags & Filters

Widgetizer provides powerful Liquid filters to simplify common tasks in your templates.

### Image Filter

The `image` filter is the recommended way to render images in your theme. It automatically handles generating the correct `src` for different image sizes, adds important attributes like `width`, `height`, and `alt`, and enables lazy loading by default.

#### Basic Usage

```liquid
{{ widget.settings.myImage | image }}
```

#### Advanced Usage with Parameters

```liquid
{{ widget.settings.myImage | image: 'large', 'hero-image', false, 'Custom alt text' }}
```

#### Path-Only Mode (New)

For cases where you need just the image URL (e.g., CSS background images), use `'path'` or `'url'` as the first parameter:

```liquid
<!-- Get image path for CSS backgrounds -->
{{ widget.settings.backgroundImage | image: 'path' }}
{{ widget.settings.heroImage | image: 'path', 'large' }}

<!-- Use in inline CSS -->
<div style="background-image: url('{{ widget.settings.bgImage | image: 'path', 'large' }}');">
  Content here
</div>

<!-- Use in CSS blocks -->
<style>
  #{{ widget.id }} {
    background-image: url('{{ widget.settings.backgroundImage | image: 'path' }}');
    background-size: cover;
    background-position: center;
  }
</style>
```

#### Parameter Order

**For HTML `<img>` tag output:**

| Position | Parameter | Type    | Default      | Description                                             |
| :------- | :-------- | :------ | :----------- | :------------------------------------------------------ |
| 1        | `size`    | String  | `'medium'`   | Image size: `'thumb'`, `'small'`, `'medium'`, `'large'` |
| 2        | `class`   | String  | `''`         | CSS class to add to the `<img>` tag                     |
| 3        | `lazy`    | Boolean | `true`       | Whether to add `loading="lazy"` attribute               |
| 4        | `alt`     | String  | (from media) | Override alt text from media library                    |
| 5        | `title`   | String  | (from media) | Override title text from media library                  |

**For path-only output:**

| Position | Parameter | Type   | Default    | Description                                             |
| :------- | :-------- | :----- | :--------- | :------------------------------------------------------ |
| 1        | `mode`    | String | (required) | Must be `'path'` or `'url'` to enable path-only mode    |
| 2        | `size`    | String | `'medium'` | Image size: `'thumb'`, `'small'`, `'medium'`, `'large'` |

#### Usage Examples

```liquid
<!-- Different sizes -->
{{ widget.settings.heroImage | image: 'large' }}
{{ widget.settings.thumbnail | image: 'thumb' }}

<!-- With CSS class -->
{{ widget.settings.productImage | image: 'medium', 'product-photo' }}

<!-- Disable lazy loading -->
{{ widget.settings.heroImage | image: 'large', 'hero-image', false }}

<!-- Custom alt text -->
{{ widget.settings.photo | image: 'medium', '', true, 'Custom description' }}

<!-- Path-only for CSS backgrounds -->
{{ widget.settings.backgroundImage | image: 'path' }}
{{ widget.settings.backgroundImage | image: 'path', 'large' }}
{{ widget.settings.backgroundImage | image: 'url', 'medium' }}
```

### Video Filter

The `video` filter renders HTML5 video elements with proper attributes and fallbacks.

#### Basic Usage

```liquid
{{ widget.settings.heroVideo | video }}
```

#### Advanced Usage with Parameters

```liquid
{{ widget.settings.heroVideo | video: false, true, true, true, 'hero-video' }}
```

#### Parameter Order

| Position | Parameter  | Type    | Default | Description                                     |
| :------- | :--------- | :------ | :------ | :---------------------------------------------- |
| 1        | `controls` | Boolean | `true`  | Show video controls. Pass `false` to hide.      |
| 2        | `autoplay` | Boolean | `false` | Auto-play video on load. Pass `true` to enable. |
| 3        | `muted`    | Boolean | `false` | Mute video by default. Pass `true` to enable.   |
| 4        | `loop`     | Boolean | `false` | Loop video playback. Pass `true` to enable.     |
| 5        | `class`    | String  | `''`    | CSS class for the `<video>` tag.                |

### Asset Management Tags

These tags allow for efficient, deduplicated loading of assets (CSS and JS) in your theme. They are particularly useful when multiple widgets might require the same library (e.g., a slider plugin), ensuring it is only loaded once.

#### Enqueue Script

Registers a JavaScript file for loading. The script will be output where `{% render_scripts %}` is placed (usually in the footer).

**Usage:**

```liquid
{% enqueue_script "filename.js" %}
{% enqueue_script "vendor.js", { "defer": false, "async": true } %}
```

**Options:**

- `defer`: (Boolean, default: `true`) Whether to add the `defer` attribute.
- `async`: (Boolean, default: `false`) Whether to add the `async` attribute.

#### Enqueue Style

Registers a CSS file for loading. The stylesheet will be output where `{% render_styles %}` is placed (usually in the head).

**Usage:**

```liquid
{% enqueue_style "filename.css" %}
{% enqueue_style "print.css", { "media": "print" } %}
```

**Options:**

- `media`: (String, default: `null`) The value for the `media` attribute (e.g., `"screen"`, `"print"`).
- `id`: (String, default: `null`) The value for the `id` attribute.

#### Render Scripts

Outputs all scripts that have been registered using `{% enqueue_script %}`.

**Usage:** Place this tag in your `layout.liquid` file, traditionally just before the closing `</body>` tag.

```liquid
{% render_scripts %}
```

#### Render Styles

Outputs all stylesheets that have been registered using `{% enqueue_style %}`.

**Usage:** Place this tag in your `layout.liquid` file, traditionally inside the `<head>` section.

```liquid
{% render_styles %}
```

#### Placeholder Image

Outputs a placeholder image for development and preview purposes. Theme authors can use the default core placeholder or provide a custom image from their theme's `assets/` folder.

**Basic Usage:**

```liquid
{# Core placeholder as <img> tag #}
{% placeholder_image %}

{# Core placeholder URL for inline styles #}
{% placeholder_image 'url' %}

{# Custom theme placeholder from assets/ folder #}
{% placeholder_image 'my-placeholder.png' %}
{% placeholder_image 'my-placeholder.jpg', 'url' %}
```

**Options (for `<img>` output):**

```liquid
{% placeholder_image 'custom.svg', { "alt": "Add image here", "class": "placeholder", "loading": "lazy" } %}
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

Widgets are reusable components that can be added to pages. Each widget is a self-contained Liquid template with embedded configuration schema.

### Widget Structure

```liquid
<div class="my-widget" data-widget-id="{{ widget.id }}" data-widget-type="basic-text">
    <style>
        #{{ widget.id }} .widget-content {
            color: {{ widget.settings.textColor }};
            font-size: {{ widget.settings.fontSize }}px;
        }
    </style>

    <div id="{{ widget.id }}" class="widget-content">
        <h2>{{ widget.settings.title }}</h2>
        <p>{{ widget.settings.content }}</p>
    </div>

    <script type="application/json" data-widget-schema>
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
    </script>
</div>
```

### Widget Features

- **Scoped Styling**: Use `#{{ widget.id }}` for widget-specific CSS to avoid conflicts
- **Settings Access**: Access widget settings via `{{ widget.settings.settingId }}`
- **Theme Settings Access**: Access global theme settings via `{{ theme.group.settingId }}`
- **Embedded Schema**: JSON schema defines the widget's configuration interface

### Available Template Variables (Widget Templates)

Within individual widget templates (`widgets/*.liquid`), you have access to:

- `{{ widget.id }}`: Unique widget instance ID
- `{{ widget.type }}`: Widget type identifier
- `{{ widget.settings.* }}`: Widget-specific settings
- `{{ widget.blocks }}`: Widget's blocks (if applicable)
- `{{ theme.* }}`: Global theme settings organized by group

**Note:** `page.*` and `project.*` objects are only available in `layout.liquid`, not in individual widget templates.

### Global Widgets

Global widgets are special widgets that appear on every page of the website. Currently, the system supports two types: **header** and **footer**.

#### Header Widget (`widgets/global/header.liquid`)

- Typically includes site branding, navigation, and search
- Can reference menu systems via `{% render 'menu', menu: widget.settings.headerNavigation %}`
- Supports responsive navigation patterns
- Paired with `templates/global/header.json` for default configuration

#### Footer Widget (`widgets/global/footer.liquid`)

- Usually contains copyright, credits, and additional navigation
- Often includes social links and contact information
- Paired with `templates/global/footer.json` for default configuration

**Important:** Currently, header and footer are the only supported global widget types. Each global widget requires both a Liquid template in `widgets/global/` and a corresponding JSON configuration in `templates/global/`.

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
              {{ block.settings.image | image: 'medium', 'block-image' }}
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

- `base.css`: Core theme styles
- Widget-specific CSS files (e.g., `basic-text.css`)
- Loaded via `{% asset "filename.css" %}`

### JavaScript Files

- `header_scripts.js`: Scripts loaded in `<head>`
- `footer_scripts.js`: Scripts loaded before `</body>`
- Widget-specific JS files
- Loaded via `{% asset "filename.js" %}`

### Widget Assets

Widgets can include their own CSS and JavaScript files placed alongside the widget's Liquid template:

- `widget-name.css`: Widget-specific styles
- `widget-name.js`: Widget-specific JavaScript

These files are automatically discovered and included during the build process.

### Assets During Export

When exporting a project to static HTML:

- **Theme Assets**: All files from `/assets/` are copied to the output directory
- **Widget Assets**: All `.css` and `.js` files found in the `/widgets/` directory are copied to the output `/assets/` directory
- **Uploaded Images**: All images from `/uploads/images/` are copied to maintain relative paths
- **Path Optimization**: Asset paths are converted to relative URLs for optimal static hosting

## 11. Advanced Features

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
  background-color: {{ theme.colors.background }};
  font-size: {{ theme.typography.base_font_size }}px;
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

- `{% fonts %}`: Consolidated tag for font preconnect and stylesheet inclusion
- Support for Google Fonts and Bunny Fonts (GDPR-compliant alternative)
- Privacy-friendly font delivery can be enabled via theme settings (`use_bunny_fonts` checkbox)
- Automatically generates optimized font URLs with only the weights being used

## 13. Theme Development Workflow

1. **Planning**: Define the theme's purpose, target audience, and key features
2. **Setup**: Create the basic theme structure and `theme.json` with global settings
3. **Layout Foundation**: Build the main `layout.liquid` template with proper HTML structure
4. **Global Components**: Create header and footer widgets that will appear on every page
5. **Core Widgets**: Develop the main content widgets users will need
6. **Block System**: Design flexible block types for dynamic content within widgets
7. **Page Templates**: Define pre-built page structures using your widgets
8. **Navigation**: Create menu systems and navigation patterns
9. **Styling**: Add comprehensive CSS for responsive design and visual polish
10. **Assets**: Optimize and organize static files (CSS, JS, images)
11. **Testing**: Test across devices, browsers, and different content scenarios
12. **Documentation**: Document custom features, settings, and usage guidelines

This theming system provides a powerful and flexible foundation for creating beautiful, functional websites while maintaining consistency and ease of use. The combination of widgets and blocks allows for maximum flexibility while keeping the user interface intuitive and manageable.

---

## 14. Theme Lifecycle in Projects

When a new project is created, the selected theme is copied into the project's data directory so it can be customized independently of the source theme:

- **Destination**: `/data/projects/<projectId>/`
- **Copied items**: `layout.liquid`, `templates/`, `widgets/`, `assets/`, and `menus/`

After this copy, edits in the project affect only that project's files and do not modify the original theme in `/themes/`.

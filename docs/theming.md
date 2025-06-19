# Theming Guide

This document provides a comprehensive guide to creating and customizing themes in Widgetizer. A theme is a complete package that defines the visual appearance, layout structure, and functionality of a website.

## 1. Theme Structure Overview

A theme is organized as a self-contained directory with the following structure:

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

## 2. Theme Manifest (theme.json)

The `theme.json` file serves as the theme's manifest and defines global settings that can be customized by users.

### Basic Metadata

```json
{
  "name": "My Theme",
  "version": "1.0.0",
  "description": "A beautiful, responsive theme",
  "author": "Your Name",
  "widgets": 15
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
          "id": "background",
          "label": "Background Color",
          "default": "#FFFFFF",
          "type": "color",
          "outputAsCssVar": true
        }
      ],
      "typography": [
        {
          "id": "heading_font",
          "label": "Heading Font",
          "default": "Inter",
          "type": "font_picker",
          "value": {
            "stack": "system-ui, sans-serif",
            "weight": 700
          },
          "outputAsCssVar": true
        }
      ],
      "layout": [
        {
          "id": "show_header",
          "label": "Show Header",
          "default": true,
          "type": "checkbox"
        }
      ]
    }
  }
}
```

**Setting Types:**

- `color`: Color picker
- `text`: Text input
- `checkbox`: Boolean toggle
- `font_picker`: Font selection with stack and weight
- `range`: Numeric slider
- `select`: Dropdown with predefined options

**CSS Variable Output:** When `outputAsCssVar: true` is set, the setting automatically generates CSS custom properties accessible in your styles as `var(--group-id)`. These variables are output by the `{% theme_settings %}` tag in the layout template.

For complete details on all available setting types and their properties, see the [Theme & Widget Setting Types documentation](theme-settings.md).

## 3. Layout Template (layout.liquid)

The `layout.liquid` file defines the main HTML structure that wraps all page content. It's the foundation of every page.

### Essential Liquid Tags

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
    {% asset "header_scripts.js" %} <!-- Load header scripts -->
    {% theme_settings %}        <!-- Output CSS variables from global settings -->
</head>
<body class="{{ body_class }}">
    <div class="container">
        {{ content }}           <!-- Page content insertion point -->
    </div>

    {% asset "footer_scripts.js" %} <!-- Load footer scripts -->
</body>
</html>
```

### Key Liquid Tags Explained

- `{% seo %}`: Automatically generates SEO meta tags (title, description, Open Graph, etc.)
- `{% fonts_preconnect %}`: Creates preconnect links for faster font loading
- `{% fonts_stylesheet %}`: Includes CSS for selected fonts
- `{% asset "filename" %}`: Loads and includes assets from the `/assets/` directory
- `{% theme_settings %}`: Outputs CSS custom properties from global settings as `<style>` tags in the document head. This tag processes all settings with `outputAsCssVar: true` and generates CSS variables in the format `--group-settingId`
- `{{ content }}`: The insertion point for page content
- `{{ body_class }}`: Dynamic CSS classes for the body element

## 4. Liquid Filters

Widgetizer provides powerful Liquid filters to simplify common tasks.

### `image`

The `image` filter is the recommended way to render images in your theme. It automatically handles generating the correct `src` for different image sizes, adds important attributes like `width`, `height`, and `alt`, and enables lazy loading by default.

It takes the image filename (or path) as input and an optional object of parameters.

#### Basic Usage

```liquid
{{ widget.settings.myImage | image }}
```

This will render a medium-sized, lazy-loaded `<img>` tag with the alt text from the media library.

#### Advanced Usage with Options

```liquid
{{ widget.settings.myImage | image: size: 'large', class: 'hero-image', lazy: false, alt: 'Custom alt text' }}
```

#### Available Options

| Option | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `size` | String | `'medium'` | Specifies which image size to render. Available sizes are `thumb`, `small`, `medium`, `large`. If the size doesn't exist for an image, it gracefully falls back to the original uploaded file. |
| `class` | String | `''` | Adds a CSS class to the `<img>` tag. |
| `lazy` | Boolean | `true` | If true, adds the `loading="lazy"` attribute to the `<img>` tag for better performance. |
| `alt` | String | (from media) | Overrides the alt text defined in the media library. If not provided, the value from the media library is used. |
| `title` | String | (from media) | Overrides the title text defined in the media library. If not provided, the value from the media library is used. The attribute is omitted if no title is set in the options or in the media library. |

### `video`

The `video` filter renders HTML5 video elements with proper attributes and fallbacks. Since videos don't have auto-generated thumbnails or extracted metadata, the filter provides a simple way to embed videos with customizable options.

It takes the video filename (or path) as input and an optional object of parameters.

#### Basic Usage

```liquid
{{ widget.settings.heroVideo | video }}
```

This will render a video element with controls enabled and metadata preloading.

#### Advanced Usage with Options

```liquid
{{ widget.settings.heroVideo | video: controls: false, autoplay: true, muted: true, loop: true, class: 'hero-video' }}
```

#### Available Options

| Option | Type | Default | Description |
| :-- | :-- | :-- | :-- |
| `controls` | Boolean | `true` | Show video controls (play, pause, volume, etc.). |
| `autoplay` | Boolean | `false` | Auto-play video on load. Note: most browsers require `muted: true` for autoplay to work. |
| `muted` | Boolean | `false` | Mute video by default. Required for autoplay in most browsers. |
| `loop` | Boolean | `false` | Loop video playback continuously. |
| `preload` | String | `'metadata'` | Preload behavior. Options: `'none'`, `'metadata'`, `'auto'`. |
| `class` | String | `''` | Adds a CSS class to the `<video>` tag. |
| `width` | Number | `null` | Override the video width. No default width is set. |
| `height` | Number | `null` | Override the video height. No default height is set. |
| `poster` | String | `''` | Override the poster image. No poster is provided by default since videos don't generate thumbnails. |

## 5. Widgets

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
        <h2 data-setting="title">{{ widget.settings.title }}</h2>
        <p data-setting="content">{{ widget.settings.content }}</p>
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
- **Data Attributes**: `data-setting="settingId"` enables visual editing
- **Embedded Schema**: JSON schema defines the widget's configuration interface

### Global Widgets

Global widgets are special widgets that appear on every page of the website. Currently, the system supports two types of global widgets: **header** and **footer**.

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

## 6. Templates

Templates define the structure and default content for different page types.

### Page Templates (`templates/*.json`)

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

Global templates define default instances of global widgets:

```json
{
  "type": "header",
  "settings": {
    "headerTitle": "Default Site Title",
    "headerNavigation": "main-nav"
  }
}
```

## 7. Navigation Menus

Menus are defined as JSON files in the `/menus/` directory and support nested navigation.

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

Use the `{% render 'menu' %}` tag with custom CSS classes to render navigation menus. The menu snippet supports up to 3 levels of nested navigation and provides full control over CSS classes for styling.

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

**Menu Snippet Parameters:**

- `menu`: The menu object containing the items array
- `class_menu`: CSS classes for the `<nav>` element
- `class_list`: CSS classes for `<ul>` elements
- `class_item`: CSS classes for `<li>` elements
- `class_link`: CSS classes for `<a>` elements
- `class_submenu`: CSS classes for submenu `<ul>` elements
- `class_has_submenu`: CSS classes for items that contain submenus

The menu snippet automatically adds the `class_has_submenu` class to items that have child items, allowing you to style dropdown indicators and submenu behaviors.

## 8. Assets Management

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

### Asset Loading

Assets are automatically processed and can include:

- CSS preprocessing
- JavaScript minification
- Cache busting
- CDN integration

### Assets During Export

When exporting a project to static HTML:

- **Theme Assets**: All files from `/assets/` are copied to the output directory
- **Widget Assets**: All `.css` and `.js` files found in the `/widgets/` directory are copied to the output `/assets/` directory
- **Uploaded Images**: All images from `/uploads/images/` are copied to maintain relative paths
- **Path Optimization**: Asset paths are converted to relative URLs for optimal static hosting

## 9. Advanced Features

### Responsive Design

Use CSS custom properties from global settings for consistent theming:

```css
.my-component {
  color: var(--colors-text);
  font-family: var(--typography-body_font-family);
  background: var(--colors-background);
}
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

- `{% fonts_preconnect %}`: DNS prefetching for faster loading
- `{% fonts_stylesheet %}`: Optimized font CSS inclusion
- Support for Google Fonts, Adobe Fonts, and custom fonts

## 10. Best Practices

### Performance

- Use scoped CSS with widget IDs to avoid style conflicts
- Minimize the number of external font requests
- Optimize images and use appropriate formats
- Lazy load non-critical assets

### Accessibility

- Use semantic HTML structure
- Provide proper heading hierarchy
- Include alt text for images
- Ensure sufficient color contrast
- Support keyboard navigation

### Maintainability

- Use consistent naming conventions
- Document complex Liquid logic
- Separate concerns (structure, style, behavior)
- Test across different screen sizes and devices

### Widget Development

- Make widgets configurable through settings
- Provide sensible defaults
- Use descriptive labels and help text
- Consider mobile-first responsive design

## 11. Theme Development Workflow

1. **Setup**: Create the basic theme structure and `theme.json`
2. **Layout**: Build the main `layout.liquid` template
3. **Global Components**: Create header and footer widgets
4. **Page Templates**: Define basic page structures
5. **Widgets**: Develop custom widgets for content
6. **Styling**: Add CSS for responsive design
7. **Assets**: Optimize and organize static files
8. **Testing**: Test across devices and browsers
9. **Documentation**: Document custom features and settings

This theming system provides a powerful and flexible foundation for creating beautiful, functional websites while maintaining consistency and ease of use.

---
description: Understand themes in Widgetizer. Themes provide the visual design, widgets, and layout structure for your website projects.
---

A **Theme** in Widgetizer is a starter kit that provides the foundation for your website. It defines the visual design, layout structure, available widgets, and overall functionality of your site. When you create a new project, you choose a theme that becomes the base for everything you build.

# What is a Theme?

A theme is a complete package that includes:

- **Visual Design**: Colors, typography, spacing, and layout styles
- **Widgets**: Pre-built content components specific to that theme (like hero banners, text sections, contact forms, galleries, etc.)
- **Layout Templates**: The HTML structure that wraps your content
- **Global Settings**: Theme-wide customization options (colors, fonts, etc.)

Think of a theme as a design system and component library rolled into one. It provides you with a set of building blocks (widgets) that are designed to work together cohesively.

# Why Themes Cannot Be Changed

Once you create a project with a theme, **you cannot change the theme** for that project. This is a fundamental design decision in Widgetizer, and here's why:

### Theme-Specific Widgets

Each theme comes with its own set of widgets. These widgets are built specifically for that theme's design system and structure. For example:

- A "Hero Banner" widget in one theme might have different settings, layout options, and styling than a "Hero Banner" widget in another theme
- Widgets are tightly integrated with the theme's CSS, JavaScript, and HTML structure
- Changing themes would mean losing access to the current theme's widgets and potentially breaking your page layouts

### Content Compatibility

Your pages are built using widgets from your chosen theme. If you could switch themes:

- Widgets from the old theme wouldn't exist in the new theme
- Your page content would be incompatible with the new theme's structure
- You'd risk losing content or having broken layouts

### Design System Integrity

Themes are complete design systems. Each theme's widgets, styles, and settings are designed to work together as a cohesive whole. Switching themes mid-project would break this integrity and could result in inconsistent designs.

### Built for Small Websites

In our experience, small websites almost always start from scratch. When you're building a new site, you choose a theme that fits your vision and build from there. There's rarely a need to switch themes mid-project because:

- Small websites are typically built with a clear purpose and design direction from the start
- The customization options within each theme are extensive enough to achieve your unique vision
- Starting fresh with a new theme is often faster and cleaner than trying to migrate content between incompatible themes

### Simplicity and Focus

By locking the theme at project creation, Widgetizer keeps things simple and focused. You can concentrate on building your content and customizing your design without worrying about theme compatibility issues or migration problems. This design decision ensures a smoother, more predictable building experience.

# Theme Updates

Theme update functionality is currently under development. This feature will allow theme authors to release updates to their themes, and you'll be able to update your projects to use the latest version of your chosen theme.

**Planned features:**
- Automatic notifications when theme updates are available
- Safe update process that preserves your content
- Version history and rollback capabilities

> **Note:** Theme updates will only apply improvements and bug fixes. They will not change your theme to a different design system, maintaining compatibility with your existing content.

# Choosing a Theme

When creating a new project, consider:

- **Design Style**: Does the theme match the aesthetic you want for your site?
- **Widgets**: Does the theme include the types of widgets you need (forms, galleries, testimonials, etc.)?
- **Flexibility**: Does the theme offer enough customization options for your needs?
- **Purpose**: Is the theme designed for your type of site (portfolio, blog, business, etc.)?

Once you've chosen a theme and created your project, you can customize it using the theme's global settings (colors, typography, etc.) and build your pages using the theme's widgets.

# Customization Within a Theme

While you can't change themes, you have significant customization options within your chosen theme:

- **Global Settings**: Customize colors, fonts, and other theme-wide settings
- **Widget Settings**: Each widget has its own settings for content, layout, and styling
- **Content**: Add, remove, and rearrange widgets and blocks to create your desired layout
- **Media**: Upload and use your own images, videos, and audio files

These customization options allow you to create a unique website while staying within your theme's design system.

# Creating Your Own Theme

If you're a developer and want to create custom themes, see the [Theme Development](theme-dev-structure.html) documentation.

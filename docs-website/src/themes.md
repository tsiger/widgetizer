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

Widgetizer includes a theme update system that allows theme authors to release improvements, and you can apply those updates to your projects while keeping your content safe.

### How Theme Updates Work

When a theme author releases an update:

1. **Notification**: The sidebar shows a badge indicating themes have updates available
2. **Theme Page**: Visit the Themes page to see which themes have updates
3. **Build Update**: Click "Update" on a theme to build the latest version
4. **Apply to Projects**: Projects using that theme will show an update indicator

### Applying Updates to Your Projects

After a theme is updated:

1. Go to the **Projects** page
2. Look for the **update indicator** (arrow icon) next to projects using the updated theme
3. Edit the project and click **"Apply Theme Update"**
4. The system updates your project's theme files while preserving your content

### What Gets Updated

Theme updates can include:

- **Layout template** (`layout.liquid`) - Replaced with new version
- **Widgets** - Entire widget folder replaced with new versions
- **Assets** (CSS, JS) - Replaced with new versions
- **Snippets** - Replaced with new versions
- **Theme settings schema** - New settings are added, your existing values are preserved

### What's Protected (Never Changed)

Your content is always safe:

- **Pages** - Your page content is never modified
- **Media** - Your uploaded images and videos are preserved
- **Menus** - Existing menus are kept (new menus may be added)
- **Templates** - Existing page templates are kept (new templates may be added)

### Settings Merge

When a theme update includes new settings:

- **New settings** are added with their default values
- **Your customized values** (colors, fonts, etc.) are preserved
- **Removed settings** (deleted by theme author) are cleaned up

This means your design choices stay intact while you get access to new features.

> **Note:** Theme updates improve your existing theme—they don't change it to a different design system. Your content always remains compatible.

# Deleting a Theme

You can remove a theme you no longer need from the Themes page:

1. Open the **three-dot menu** (⋮) on the theme card.
2. Choose **Delete**.
3. Confirm in the dialog. Deletion cannot be undone.

**Restriction:** You cannot delete a theme that is currently used by any project. If you try, Widgetizer shows an error explaining that the theme is in use. Remove or change the theme from those projects first (e.g. by deleting the projects or switching them to another theme), then delete the theme.

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

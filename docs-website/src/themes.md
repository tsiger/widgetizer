---
description: Understand themes in Widgetizer. Themes provide the visual design, widgets, and layout structure for your website projects.
---

A **Theme** in Widgetizer is the design system behind a website. It defines the visual style, page structure, available widgets, theme settings, menus, and any theme-owned content types such as News or Projects. When you create a new project, the selected theme becomes the foundation for everything you build.

# What is a Theme?

A theme is a complete package that includes:

- **Visual Design**: Colors, typography, spacing, and layout styles
- **Widgets**: Pre-built content components specific to that theme (like hero banners, text sections, galleries, video popups, etc.)
- **Layout Templates**: The HTML structure that wraps your content
- **Global Settings**: Theme-wide customization options (colors, fonts, etc.)
- **Collections** _(some themes)_: Content types like News or Projects that you fill with items (see [Collections](collections.html))

Think of a theme as a design system and component library rolled into one. It provides you with a set of building blocks (widgets) that are designed to work together cohesively.

# What is Arch?

**Arch** is Widgetizer's default theme. It is the main built-in design system that ships with Widgetizer, and it is designed to support many kinds of small business websites from one underlying theme.

Arch is not just one homepage design. It includes a large widget library, a shared design system, global settings, templates, menus, icons, translations, and collection types. The preset cards you see when creating a project, such as Brewline, Brightside, Pixelcraft, Saffron, Shearline, and many others, are starting points built on top of Arch.

In the current source, Arch includes 57 widget folders and 31 preset folders. It also includes collection type definitions for News, Projects, Services, and a testing type used by development/demo content. The exact list can grow over time, but the important idea is this: **Arch is the theme; presets are different starter sites powered by that theme.**

# Theme, Preset, Project, Content

The easiest mental model is:

1. **Theme**: defines what is possible: widgets, layouts, settings, collections, and styling rules.
2. **Preset**: fills the theme with a starting style and optional demo content.
3. **Project**: your editable copy of the chosen theme and preset.
4. **Pages and content**: the actual site you build: text, images, menus, collection items, and page layouts.

For example, choosing the Arch theme with the Shearline preset gives you a hair-salon starter site. You can replace the content, change colors, edit widgets, add pages, and rearrange menus, but the project is still built on the Arch theme.

# Theme Presets

Some themes offer **presets**: named starting points that provide different color schemes, typography, and optionally different demo content such as pages, menus, media, collection items, and global widgets. Presets let a single theme serve multiple use cases without duplicating the entire theme.

When you select a theme with presets during [project creation](projects.html), a visual card grid appears below the theme dropdown. Pick the preset that best matches your needs, or keep the default.

The preset names can feel like separate themes because a full preset may create a complete starter site. In Widgetizer's built-in library, though, those starter sites are usually Arch presets. Brewline is an Arch preset for a coffee shop, Brightside is an Arch preset for a dental practice, Shearline is an Arch preset for a hair salon, and so on.

**Key points:**

- Presets are applied only at project creation time
- Once created, your project is independent; you can freely customize all settings and content
- A "settings-only" preset changes colors and fonts but keeps the same demo pages
- A "full" preset can provide different demo pages, menus, collection items, starter media, and navigation
- Themes without presets work exactly the same as before
- Choosing a different preset later does not automatically rewrite an existing project

# Choosing a Theme and Preset

When creating a new project, consider:

- **Theme**: Does the theme provide the widgets, layout style, collections, and customization options you need?
- **Preset**: Does one starter site match your industry or the structure you want?
- **Design Style**: Does the visual direction feel close enough that you can customize from there?
- **Content Shape**: Do the starter pages, menus, and collections match what your site needs?
- **Flexibility**: Does the theme expose enough global settings and widget settings for your project?

For most users, the practical choice is: pick Arch, then pick the preset closest to your business or content type. After creation, you can customize the project as much as you need without changing the underlying theme.

# Customization Within a Theme

While you can't change themes, you have several layers of customization within your chosen theme:

### Global Theme Settings

Theme settings apply across the whole site. In Arch, this includes things like colors, typography, spacing style, social links, animation behavior, favicon, date format, custom CSS, and optional scripts.

<figure class="doc-screenshot">
  <img src="assets/screenshots/theme-settings.png" alt="Widgetizer site settings screen showing the Colors tab with theme color swatches and hex value fields." loading="lazy">
  <figcaption>Theme settings expose the global controls the theme author has made customizable, such as colors and typography.</figcaption>
</figure>

### Widget Settings

Each widget has its own controls. A gallery widget might control columns and image behavior; a banner widget might control heading text, layout, button links, color scheme, and spacing.

### Content and Media

You can replace demo copy, upload your own images, edit menus, add pages, and manage collection items such as news articles, projects, services, or team members when the theme provides those collections.

### Advanced Customization

Some themes expose advanced fields for custom CSS or scripts. Use these when you want targeted overrides without editing theme source files.

These layers let you create a unique site while staying inside the theme's design system.

# Why Themes Cannot Be Changed

Once you create a project with a theme, **you cannot change the theme** for that project. Your pages are built from that theme's widgets, and every widget is wired to the theme's own settings, CSS, and HTML. Swapping the theme underneath would leave those widgets with nowhere to render, breaking your layouts and content.

Widgetizer is built for small sites, which almost always start from a clear design direction, so there's rarely a need to switch mid-project. And because each theme's customization options are extensive (colors, typography, widget settings, and layout), you can take a site a long way without ever changing themes. Locking the theme at creation keeps the experience simple and predictable.

If a different design is what you're after, starting a fresh project is faster and cleaner than migrating content between incompatible themes.

# Theme Updates

Widgetizer includes a theme update system that allows theme authors to release improvements, and you can apply those updates to your projects while keeping your content safe.

### How Theme Updates Work

When a theme author releases an update:

1. **Notification**: The sidebar shows a badge indicating themes have updates available
2. **Theme Page**: Visit the Themes page to see which themes have updates
3. **Update**: Click **"Update"** on a theme card to install the latest version
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
- **Locales** (translation JSON files) - Replaced with new versions
- **Theme screenshot** - Replaced with new version
- **Theme settings schema** - New settings are added, your existing values are preserved

### What's Protected (Never Changed)

Your content is always safe:

- **Pages** - Your page content is never modified
- **Media** - Your uploaded images and PDFs are preserved
- **Menus** - Existing menus are kept (new menus may be added)
- **Templates** - Existing page templates are kept (new templates may be added)

### Settings Merge

When a theme update includes new settings:

- **New settings** are added with their default values
- **Your customized values** (colors, fonts, etc.) are preserved
- **Removed settings** (deleted by theme author) are cleaned up

This means your design choices stay intact while you get access to new features.

> **Note:** Theme updates improve your existing theme; they don't change it to a different design system. Your content always remains compatible.

# Deleting a Theme

You can remove a theme you no longer need from the Themes page:

1. Open the **three-dot menu** (⋮) on the theme card.
2. Choose **Delete**.
3. Confirm in the dialog. Deletion cannot be undone.

**Restriction:** You cannot delete a theme that is currently used by any project. If you try, Widgetizer shows an error explaining that the theme is in use. Remove or change the theme from those projects first (e.g. by deleting the projects or switching them to another theme), then delete the theme.

# Creating Your Own Theme

Most people building a site do not need to create a theme. Use the editor, theme settings, widget settings, pages, menus, collections, and media library.

If you're a developer and want to create a custom design system, widget library, or distributable starter kit, start with [Theme Development](theme-dev-quickstart.html). The developer docs explain the files behind a theme, including `theme.json`, `layout.liquid`, widgets, templates, presets, assets, snippets, locales, and collections.

Exporting generates a complete, static HTML version of your website that can be deployed to any web hosting service. This page explains how exporting works and what gets included.

# How Exporting Works

When you export a project, Widgetizer:

1. Renders all pages to static HTML files
2. Copies all required assets (CSS, JS, images, videos, audio)
3. Generates SEO files (sitemap.xml, robots.txt)
4. Packages everything into a deployable folder

The exported site is completely self-contained and requires no server-side processing.

# What Gets Exported

### HTML Pages

Every page in your project becomes an HTML file:

- The homepage (`index` slug) becomes `index.html`
- Other pages use their slug as the filename (e.g., `about.html`, `contact.html`)
- All HTML is formatted with Prettier for clean, readable output

### Assets

The export includes all assets your site needs:

| Source         | Destination                                          | Contents                                  |
| :------------- | :--------------------------------------------------- | :---------------------------------------- |
| `assets/`      | `assets/`                                            | Theme CSS, JS, icons                      |
| `widgets/*/`   | `assets/`                                            | Widget CSS and JS files (flattened)       |
| Media library  | `assets/images/`, `assets/videos/`, `assets/audios/` | Only media files actually used on pages   |
| Core assets    | `assets/`                                            | Placeholder images                        |

### Optimized Media

Widgetizer tracks which media files are actually used on your pages (see [Media Library](media.html)). During export:

- Only images, videos, and audio files referenced in your content are copied
- For images, all size variants (thumb, small, medium, large) are included
- Unused media is skipped, reducing export size

### SEO Files

If your project has a Site URL configured, Widgetizer generates:

- `sitemap.xml` — Lists all indexed pages for search engines
- `robots.txt` — Search engine instructions, including pages marked as `noindex`

# Export Versioning

Widgetizer keeps a history of your exports:

- Each export gets an incrementing version number (v1, v2, v3, etc.)
- You can view, download, or delete any previous export
- The maximum number of versions to keep is configurable in [App Settings](settings.html)
- When the limit is exceeded, the oldest exports are automatically deleted

# Viewing and Downloading Exports

From the Export page, you can:

- **View** — Opens the exported site in a new tab for preview
- **Download** — Downloads the complete export as a ZIP file
- **Delete** — Removes an export version (with confirmation)

# Requirements

For a successful export:

- Your project must have at least one page with the slug `index` (the homepage) — see [Pages](pages.html)
- All widgets and assets must be properly configured

# Deploying Your Export

The exported folder contains static HTML, CSS, JS, and media files that can be deployed to any web server or static hosting service. Simply upload the contents to your hosting provider's public directory.

> **Coming soon:** We're building a hosting service specifically designed for Widgetizer sites, with one-click deployment directly from the app.

# Export vs. Project Export

There are two types of exports in Widgetizer:

| Type               | Purpose              | Output                                    |
| :----------------- | :------------------- | :---------------------------------------- |
| **Site Export**    | Deploy your website  | Static HTML, CSS, JS, and media           |
| **Project Export** | Backup or transfer   | ZIP archive of all project source files   |

Site export (this page) creates a deployable website. Project export creates a backup that can be imported into another Widgetizer installation. See [Projects](projects.html) for project import/export.

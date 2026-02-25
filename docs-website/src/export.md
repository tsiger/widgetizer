---
description: Export your Widgetizer project as static HTML files ready for deployment to any web host. Download or manage export versions.
---

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

| Source        | Destination                                          | Contents                                |
| :------------ | :--------------------------------------------------- | :-------------------------------------- |
| `assets/`     | `assets/`                                            | Theme CSS, JS, icons                    |
| `widgets/*/`  | `assets/`                                            | Widget CSS and JS files (flattened)     |
| Media library | `assets/images/`, `assets/videos/`, `assets/audios/` | Only media files actually used on pages |
| Core assets   | `assets/`                                            | Placeholder images                      |

### Optimized Media

Widgetizer tracks which media files are actually used on your pages (see [Media Library](media.html)). During export:

- Only images, videos, and audio files referenced in your content are copied
- For images, all size variants (thumb, small, medium, large) are included
- Unused media is skipped, reducing export size

### Optional Markdown Files

If you enable **"Also export pages as Markdown (.md)"** when creating an export, Widgetizer also writes a `.md` file for each page (e.g. `index.md`, `about.md`). Each file has YAML frontmatter (title, description, source references) and the page content in Markdown. Layout, styles, and scripts are not included.

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

# Export Options

When creating an export, you can enable:

**Also export pages as Markdown (.md)** — In addition to HTML, each page is written as a Markdown (`.md`) file. The Markdown contains the page content only (no layout), converted from the rendered HTML. Each file includes YAML frontmatter with the page title, description, and source file references. Useful for documentation, static site generators that accept Markdown, or content reuse. The checkbox is on the Export page next to the export button.

# Viewing and Downloading Exports

From the Export page, you can:

- **View** — Opens the exported site in a new tab for preview
- **Download** — Downloads the complete export as a ZIP file
- **Delete** — Removes an export version (with confirmation)

# HTML Validation (Developer Mode)

When [Developer Mode](settings.html#developer-settings) is enabled in App Settings, Widgetizer validates all exported HTML and generates a detailed issues report.

### What Gets Validated

The validator checks for common HTML issues including:

- Missing required attributes (e.g., `alt` on images)
- Invalid nesting of elements
- Accessibility concerns
- Deprecated or invalid HTML patterns

### Issues Report

If validation finds any issues, an `__export__issues.html` file is created in the export directory. This report includes:

- A summary of total issues across all pages
- Issues grouped by page
- For each issue: line number, severity (error/warning), description, and the relevant source code
- Links to documentation for each validation rule

> **Note:** The issues report is only generated when Developer Mode is enabled. When disabled, validation is skipped entirely for faster exports.

# Requirements

For a successful export:

- Your project must have at least one page with the slug `index` (the homepage) — see [Pages](pages.html)
- All widgets and assets must be properly configured

# Deploying Your Export

The exported folder contains static HTML, CSS, JS, and media files that can be deployed to any web server or static hosting service. Simply upload the contents to your hosting provider's public directory.

### Widgetizer Publisher (Free Hosting)

[Widgetizer Publisher](https://publisher.widgetizer.org) is a free hosting service built specifically for Widgetizer sites. Upload your exported ZIP and get a live site at `your-site.mywidgetizer.org` in seconds.

**What you get:**

- **Instant hosting** --- upload your ZIP and your site is live immediately
- **Built-in analytics** --- privacy-first pageview tracking is auto-injected into your HTML on upload (no cookies, no tracking identifiers, respects Do Not Track)
- **Form submissions** --- if your site uses the contact form widget, submissions are collected and emailed to you automatically
- **Version history** --- roll back to previous uploads at any time
- **Custom subdomains** --- choose your `*.mywidgetizer.org` subdomain

If you use the hosted editor at `editor.widgetizer.org`, publishing is even simpler --- one-click deploy directly from the app, with analytics and forms set up automatically.

# Export vs. Project Export

There are two types of exports in Widgetizer:

| Type               | Purpose             | Output                                  |
| :----------------- | :------------------ | :-------------------------------------- |
| **Site Export**    | Deploy your website | Static HTML, CSS, JS, and media         |
| **Project Export** | Backup or transfer  | ZIP archive of all project source files |

Site export (this page) creates a deployable website. Project export creates a backup that can be imported into another Widgetizer installation. See [Projects](projects.html) for project import/export.

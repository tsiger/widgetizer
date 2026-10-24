<p align="center">
  <img src="assets/widgetizer_logo_light.png#gh-light-mode-only" alt="Widgetizer logo" width="400">
  <img src="assets/widgetizer_logo_dark.png#gh-dark-mode-only" alt="Widgetizer logo" width="400">
</p>

<p align="center">A powerful, yet simple, visual website builder for creating high-performance static websites.</p>

<p align="center"><a href="LICENSE"><img src="https://img.shields.io/github/license/tsiger/widgetizer" alt="GitHub License"></a> <a href="https://github.com/tsiger/widgetizer/releases"><img src="https://img.shields.io/github/v/release/tsiger/widgetizer" alt="GitHub Release"></a></p>

<p align="center">
  <a href="https://www.youtube.com/watch?v=pNMlz3Q1nVA">
    <img src="https://img.youtube.com/vi/pNMlz3Q1nVA/maxresdefault.jpg" alt="Widgetizer Demo Video" width="800">
  </a>
</p>

## ✨ Features

- **Visual Website Builder** - [Build websites](https://widgetizer.org) fast with drag-and-drop widgets, blocks, and live preview
- **Ready-Made Designs** - Start from 30+ polished presets for real businesses, or a blank slate, then fine-tune colors, typography, and layouts
- **Multilingual Sites** - Write your site in several languages, each with its own pages, menus, header, and footer, exported with hreflang links
- **Found by Search Engines** - Structured data, a sitemap, social sharing tags, and optional clean URLs are generated for every page
- **Business Details** - Add your organization, contact details, social profiles, address, and opening hours once; the site and search engines both use them
- **Collections** - News, Projects, and Services with their own item pages, breadcrumbs, and paging for long lists
- **Media Pipeline** - Upload images, files, audio, and MP4 video once, with optimized image variants, per-language captions, and usage tracking
- **Contact Form** - A built-in form widget for your contact pages
- **Static Export** - Ship secure, high-performance static sites you can host anywhere, with no runtime dependency
- **Desktop App** - Run Widgetizer Desktop on Windows and macOS, with automatic updates

## Download

Get the latest desktop builds from the latest GitHub release:

- [Download for Windows](https://github.com/tsiger/widgetizer/releases/latest)
- [Download for macOS](https://github.com/tsiger/widgetizer/releases/latest)

On the release page, grab the `.exe` installer for Windows or the `.dmg` file for macOS.

## 📚 Documentation

Visit **[docs.widgetizer.org](https://docs.widgetizer.org)** for guides on themes, presets, project workflows, export, and customization.

Building your own theme? Start with the [theme development guide](https://docs.widgetizer.org/theme-dev-quickstart). The [`skills/`](skills/) folder has Agent Skills that teach AI coding agents to design and build Widgetizer themes.

## 🐳 Run It with Docker

Self-host the web app on your own server:

```bash
git clone https://github.com/tsiger/widgetizer.git
cd widgetizer
docker compose up --build
```

Then open `http://localhost:3001`. See [Run It with Docker](https://docs.widgetizer.org/getting-started) for data storage and server settings.

## Develop Locally

The code is split into npm workspace packages under `packages/` (core, render engine, backend, editor, local adapters), with the web and desktop shells in `app/` and `electron/`. Project metadata lives in SQLite, while pages, menus, themes, and uploads stay as portable files on disk.

### Requirements

- **Node.js:** `>= 20.19.5`
- **npm:** `>= 8`

### Web App

```bash
npm install
copy .env.example .env  # Windows
# cp .env.example .env  # macOS/Linux
npm run dev:all
```

This starts the API on `http://localhost:3001` and the frontend on `http://localhost:3000`.

### Electron App

```bash
npm run electron:dev
```

For local desktop testing, this runs the API server, the frontend dev server, and Electron together.

### Useful Commands

```bash
npm run server              # Backend only
npm run dev                 # Frontend only
npm run test                # Backend tests
npm run test:frontend       # Frontend tests
npm run lint                # Lint the packages and app
npm run electron:build:mac  # Build macOS app
npm run electron:build:win  # Build Windows app
```

For the normal browser-based development flow, open `http://localhost:3000` after `npm run dev:all`.

## License

This project is licensed under the [GNU General Public License v3.0](./LICENSE).

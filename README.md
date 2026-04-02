<p align="center">
  <img src="assets/widgetizer_logo_light.png#gh-light-mode-only" alt="Widgetizer logo" width="400">
  <img src="assets/widgetizer_logo_dark.png#gh-dark-mode-only" alt="Widgetizer logo" width="400">
</p>

<p align="center">A powerful, yet simple, visual website builder for creating high-performance static websites.</p>

<p align="center"><a href="LICENSE"><img src="https://img.shields.io/github/license/tsiger/widgetizer" alt="GitHub License"></a> <a href="https://github.com/tsiger/widgetizer/releases"><img src="https://img.shields.io/github/v/release/tsiger/widgetizer" alt="GitHub Release"></a></p>

## ✨ Features

- **Visual Page Builder** - Build pages fast with drag-and-drop widgets, blocks, and live preview
- **Theme Presets** - Start from a blank slate or polished presets, then fine-tune colors, typography, layouts, and global styles
- **Hybrid Storage** - SQLite keeps project metadata reliable while pages, menus, themes, and uploads stay portable on disk
- **Media Pipeline** - Upload once, get optimized image variants, metadata editing, and usage tracking built in
- **Static Export** - Ship secure, high-performance static sites with clean output and no runtime dependency
- **Desktop App** - Run Widgetizer as a native Electron app on Windows and macOS

## Download

Get the latest desktop builds from the latest GitHub release:

- [Download for Windows](https://github.com/tsiger/widgetizer/releases/latest)
- [Download for macOS](https://github.com/tsiger/widgetizer/releases/latest)

On the release page, grab the `.exe` installer for Windows or the `.dmg` file for macOS.

## 📚 Documentation

Visit **[docs.widgetizer.org](https://docs.widgetizer.org)** for guides on themes, presets, project workflows, export, and customization.

## Develop Locally

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
npm run lint                # Lint src/ and server/
npm run electron:build:mac  # Build macOS app
npm run electron:build:win  # Build Windows app
```

For the normal browser-based development flow, open `http://localhost:3000` after `npm run dev:all`.

## License

This project is licensed under the [GNU General Public License v3.0](./LICENSE).

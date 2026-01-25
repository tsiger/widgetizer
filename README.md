# Widgetizer

A powerful, yet simple, visual website builder for creating high-performance static websites. Build pages with drag-and-drop widgets, customize themes, and export blazing-fast static HTML—no database required.

## ✨ Features

- **Visual Page Builder** – Compose pages using drag-and-drop widgets and blocks
- **Theme System** – Choose from pre-built themes and customize colors, typography, and global styles
- **Media Library** – Automatic image optimization with usage tracking
- **File-Based Architecture** – No database; all content stored in portable, human-readable files
- **Static Export** – Publish secure, lightning-fast static HTML sites
- **Desktop App** – Available as an Electron app for offline use

## Requirements

- **Node.js:** >= 20.19.5 (LTS recommended)
- **npm:** >= 8.0.0

## Getting Started

### Installation

```bash
git clone https://github.com/tsiger/widgetizer.git
cd widgetizer
npm install
```

Create your environment file:

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

### Development

Run the full development environment (backend + frontend with hot reload):

```bash
npm run dev:all
```

This starts:

- **Backend server** at `http://localhost:3001`
- **Frontend dev server** at `http://localhost:3000`

Other development commands:

| Command          | Description                                     |
| ---------------- | ----------------------------------------------- |
| `npm run dev`    | Start Vite frontend only                        |
| `npm run server` | Start backend server with nodemon (auto-reload) |
| `npm start`      | Start backend server (no auto-reload)           |

### Production

Build the frontend for production:

```bash
npm run build
```

Run in production mode:

```bash
npm run start:prod
```

Preview the production build locally:

```bash
npm run preview
```

### Electron (Desktop App)

Run the desktop app in development mode:

```bash
npm run electron:dev
```

Build the desktop app:

```bash
npm run electron:build          # Current platform
npm run electron:build:mac      # macOS
npm run electron:build:win      # Windows
```

### Linting

```bash
npm run lint           # Lint src and server
npm run lint:electron  # Lint electron folder
npm run lint:all       # Lint entire project
```

## Documentation

See the [docs](./docs) folder for detailed documentation on themes, widgets, media handling, and more.

## License

This project is licensed under the [GNU General Public License v3.0](./LICENSE).

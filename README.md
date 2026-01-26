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

## Quick Start

For first-time users, here's the fastest way to get up and running:

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env  # macOS/Linux
# or
copy .env.example .env  # Windows

# 3. Start development environment
npm run dev:all

# 4. Open your browser to http://localhost:3000
```

That's it! The app should now be running. See the [Getting Started](#getting-started) section below for more details.

## Getting Started

### Installation

1. Clone the repository:

```bash
git clone https://github.com/tsiger/widgetizer.git
cd widgetizer
```

2. Install dependencies:

```bash
npm install
```

3. Create your environment file:

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

The `.env` file contains default settings that work out of the box for local development. You can modify it later if needed.

### Development

**Recommended:** Run the full development environment (backend + frontend with hot reload):

```bash
npm run dev:all
```

This starts:

- **Backend server** at `http://localhost:3001`
- **Frontend dev server** at `http://localhost:3000`

**👉 Visit `http://localhost:3000` in your browser** to use the application.

The frontend dev server provides hot module replacement (HMR) for instant updates as you code.

Other development commands:

| Command          | Description                                     |
| ---------------- | ----------------------------------------------- |
| `npm run dev`    | Start Vite frontend only (requires backend running separately) |
| `npm run server` | Start backend server with nodemon (auto-reload) |
| `npm start`      | Start backend server (no auto-reload)          |

### Production

To run the application in production mode:

1. **Build the frontend:**

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

2. **Start the production server:**

```bash
npm run start:prod
```

This starts the server in production mode with the built frontend.

**👉 Visit `http://localhost:3001` in your browser** to use the application.

> **Note:** In production mode, the backend serves the built frontend files. Unlike development where the frontend runs on port 3000, production serves everything from port 3001.

Preview the production build locally (alternative to `start:prod`):

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

> **⚠️ Platform Note:** It is strongly recommended to build the Windows Electron app on a Windows machine and the macOS Electron app on a Mac machine. Cross-platform builds may encounter compatibility issues or fail entirely.

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

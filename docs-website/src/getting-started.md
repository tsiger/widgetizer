You can use Widgetizer either as a standalone desktop application or by running it via Node.js.

# Standalone Desktop Apps

The easiest way to get started is to download the standalone app for your operating system.

- **[Download for Windows](https://github.com/widgetizer/widgetizer/releases)**

  > **Note:** Windows users may experience a small delay when loading the app for the first time. We are aware of this and are working to improve startup performance in future updates.

- **[Download for macOS](https://github.com/widgetizer/widgetizer/releases)**

# Using Node.js

If you prefer to use your own development environment or want to contribute to Widgetizer, you can run it using Node.js.

### Prerequisites

- [Node.js](https://nodejs.org/) (minimum version 20.19.5 recommended)

### Installation

First, install the required dependencies:

```bash
npm install
```

### Running Widgetizer

There are two ways to run Widgetizer, depending on what you need:

#### Option 1: Development Mode (for developers)

If you're working on Widgetizer itself and want to see your code changes instantly:

```bash
npm run dev:all
```

This starts both the backend server and the frontend with hot reloading. Once you see both servers running, open your browser and go to **http://localhost:3000**

#### Option 2: Production Mode (for building websites)

If you just want to use Widgetizer to create websites, follow these steps:

**Step 1:** Build the frontend (only need to do this once, or when updating Widgetizer):

```bash
npm run build
```

**Step 2:** Start the server:

```bash
npm run start:prod
```

Once you see "Server is running on http://127.0.0.1:3001", open your browser and go to **http://127.0.0.1:3001**

> **Note:** The standalone desktop apps already include the built frontend, so you don't need to run these build steps when using those.

# Next Steps

Once Widgetizer is running, you can [create your first project](projects.html) and start building your website.

---
description: Download Widgetizer for Windows or macOS, or run it with Node.js. Step-by-step installation instructions for all platforms.
---

You can use Widgetizer either as a standalone desktop application or by running it via Node.js.

# Standalone Desktop Apps

The easiest way to get started is to download the standalone app for your operating system from the [Releases page](https://github.com/tsiger/widgetizer/releases).

### Windows

- **[Download for Windows 10/11 (x64)](https://github.com/tsiger/widgetizer/releases)** — For most Windows computers

> **Note:** Windows users may experience a small delay when loading the app for the first time. We are aware of this and are working to improve startup performance in future updates.

### macOS

- **[Download for Mac (Apple Silicon)](https://github.com/tsiger/widgetizer/releases)** — For M1, M2, M3, and M4 Macs (2020 and newer)
- **[Download for Mac (Intel)](https://github.com/tsiger/widgetizer/releases)** — For Intel-based Macs (2019 and older)

> **Tip:** Not sure which Mac you have? Click the Apple menu () → **About This Mac**. If it says "Chip: Apple M1/M2/M3/M4", download Apple Silicon. If it says "Processor: Intel", download Intel.

# Using Node.js

If you prefer to use your own development environment or want to contribute to Widgetizer, you can run it using Node.js.

### Step 1: Install Node.js

Widgetizer requires **Node.js version 20.19.5 or higher**.

#### macOS

1. Go to [nodejs.org](https://nodejs.org/)
2. Download the **LTS** (Long Term Support) version for macOS
3. Open the downloaded `.pkg` file
4. Follow the installer prompts (click Continue, Agree, Install)
5. Enter your password when prompted
6. Click Close when finished

#### Windows

1. Go to [nodejs.org](https://nodejs.org/)
2. Download the **LTS** (Long Term Support) version for Windows
3. Open the downloaded `.msi` file
4. Follow the installer prompts (click Next, accept the license, Next)
5. Keep the default installation options
6. Click Install (allow admin access if prompted)
7. Click Finish when complete

#### Verify Installation

Open a terminal (macOS: Terminal app, Windows: Command Prompt or PowerShell) and run:

```bash
node --version
```

You should see a version number like `v20.19.5` or higher. If you see an error or a lower version, restart your terminal and try again.

### Step 2: Download Widgetizer

Download the Widgetizer source code from GitHub Releases:

1. Go to [github.com/tsiger/widgetizer/releases](https://github.com/tsiger/widgetizer/releases)
2. Find the latest release
3. Under **Assets**, download the **Source code (zip)** file
4. Extract the ZIP file to a folder of your choice (e.g., `Documents/widgetizer`)

### Step 3: Install Dependencies

Open a terminal, navigate to the Widgetizer folder, and run:

```bash
npm install
```

This downloads all the required packages. It may take a few minutes the first time.

### Step 4: Run Widgetizer

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

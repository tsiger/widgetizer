---
description: Download Widgetizer for macOS or Windows, run it on a server with Docker, or start it from source with Node.js.
---

Widgetizer runs as a native desktop app for macOS and Windows: download it, install it, and start building. Want it on a server instead? Run it with Docker. And if you prefer your own development environment, you can start it from source with Node.js.

# Download the Desktop App

The desktop app is the easiest way to use Widgetizer. It is a normal installer with no setup, and it updates itself automatically, so you are always on the latest version.

<div class="download-grid">
  <a id="dl-mac-arm" class="download-card" href="https://github.com/tsiger/widgetizer/releases/latest">
    <svg viewBox="0 0 384 512" aria-hidden="true"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
    <span class="download-card-text"><span class="download-card-os">Download for macOS</span><span class="download-card-variant">Apple Silicon (M1 or newer)</span></span>
  </a>
  <a id="dl-win" class="download-card" href="https://github.com/tsiger/widgetizer/releases/latest">
    <svg viewBox="0 0 448 512" aria-hidden="true"><path d="M0 93.7l183.6-25.3v177.4H0V93.7zm0 324.6l183.6 25.3V268.4H0v149.9zm203.8 28L448 480V268.4H203.8v177.9zm0-380.6v180.1H448V32L203.8 65.7z"/></svg>
    <span class="download-card-text"><span class="download-card-os">Download for Windows</span><span class="download-card-variant">Windows 10 or later</span></span>
  </a>
</div>

<p class="download-alt">On an older Intel Mac? <a id="dl-mac-intel" href="https://github.com/tsiger/widgetizer/releases/latest">Download the Intel build</a> instead.</p>

<p class="download-note">Free and open source. The app checks for updates on launch and installs them for you.<span id="dl-version"></span></p>

<script>
  (function () {
    var REPO = "tsiger/widgetizer";
    function setHref(id, url) {
      var el = document.getElementById(id);
      if (el && url) el.setAttribute("href", url);
    }
    function pick(assets, test) {
      var found = assets.find(function (a) { return test(a.name); });
      return found ? found.browser_download_url : null;
    }
    fetch("https://api.github.com/repos/" + REPO + "/releases/latest", {
      headers: { Accept: "application/vnd.github+json" }
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var assets = data.assets || [];
        setHref("dl-mac-arm", pick(assets, function (n) { return /arm64\.dmg$/i.test(n); }));
        setHref("dl-mac-intel", pick(assets, function (n) { return /\.dmg$/i.test(n) && !/arm64/i.test(n); }));
        setHref("dl-win", pick(assets, function (n) { return /\.exe$/i.test(n); }));
        var v = document.getElementById("dl-version");
        if (v && data.tag_name) v.textContent = " Currently " + data.tag_name + ".";
      })
      .catch(function () {});
  })();
</script>

> **Note for Windows users:** The first time you run the installer, Windows may show a blue **"Windows protected your PC"** screen. Widgetizer is code-signed with a genuine, purchased open-source certificate, but Microsoft SmartScreen can still flag brand-new releases until enough people have downloaded them. It is safe to continue: click **More info**, then **Run anyway**.

Need an older version or the file checksums? See the full [GitHub Releases](https://github.com/tsiger/widgetizer/releases) page.

# Run It with Docker

Want Widgetizer on a home server or a VPS, or just prefer containers? The repository ships a `Dockerfile` and `docker-compose.yml` that package the web app (the editor and the API together, served on one port).

All you need is **Docker Desktop** (Windows/Mac) or Docker Engine (Linux). Node.js is not required.

```bash
git clone https://github.com/tsiger/widgetizer.git
cd widgetizer
docker compose up --build
```

Then open **http://localhost:3001**. The first build takes a few minutes; later starts are fast.

Everything you create (projects, database, uploads, installed themes) lives in a Docker volume named `widgetizer-data`, so it survives restarts and rebuilds. Run it in the background with `docker compose up -d`, stop it with `docker compose down`.

Hosting it on a real server? Two things to set:

1. **`SERVER_URL`** in `docker-compose.yml`: the address people type in the browser (for example `https://builder.example.com` or `http://<server-ip>:3001`). The live preview needs it to load images correctly.
2. **HTTPS:** put the container behind a reverse proxy (nginx, Caddy, or Traefik) that forwards to port 3001.

For the full guide, including useful commands and how the image is built, see [DOCKER.md](https://github.com/tsiger/widgetizer/blob/master/DOCKER.md) in the repository.

# Run It with Node.js

Prefer to use your own development environment, or want to contribute to Widgetizer? You can run it from source with Node.js.

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

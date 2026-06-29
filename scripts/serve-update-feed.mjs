#!/usr/bin/env node
/**
 * Static HTTP server for a local electron-updater feed.
 *
 * electron-updater (generic provider) fetches `latest.yml` plus the installer
 * and its `.blockmap` from a base URL. Pointing the running app's feed at this
 * server (via ELECTRON_UPDATER_URL) makes it download an update from localhost
 * exactly as it would from a GitHub release — same parser, same downloader.
 *
 * Express's static middleware is used because it honours Range requests, ETag
 * and Last-Modified, which electron-updater's downloader and blockmap delta
 * logic rely on. A bare fs read would not behave identically.
 *
 * Usage (standalone):
 *   node scripts/serve-update-feed.mjs --dir <path> [--port 8384]
 *
 * Or import { startFeedServer } from this module (see simulate-update.mjs).
 */

import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function startFeedServer({ dir, port = 8384 }) {
  const root = resolve(dir);
  if (!existsSync(root)) {
    throw new Error(`Update feed directory not found: ${root}`);
  }

  const app = express();

  // Log every fetch so you can watch latest.yml / the installer being pulled.
  app.use((req, _res, next) => {
    console.log(`[feed] ${req.method} ${req.url}`);
    next();
  });

  // acceptRanges + etag + lastModified are Express defaults; set explicitly so
  // the Range/conditional behaviour electron-updater depends on is obvious.
  app.use(express.static(root, { acceptRanges: true, etag: true, lastModified: true }));

  return new Promise((resolveServer, rejectServer) => {
    const server = app.listen(port, "127.0.0.1", () => {
      console.log(`[feed] serving ${root}`);
      console.log(`[feed] feed URL: http://127.0.0.1:${port}`);
      resolveServer(server);
    });
    server.on("error", rejectServer);
  });
}

// CLI entry — only when run directly, not when imported.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const flag = (name, def = null) => {
    const i = args.indexOf(name);
    return i !== -1 ? args[i + 1] : def;
  };

  const dir = flag("--dir");
  const port = Number(flag("--port", "8384"));

  if (!dir) {
    console.error("Usage: node scripts/serve-update-feed.mjs --dir <path> [--port 8384]");
    process.exit(1);
  }

  startFeedServer({ dir, port }).catch((err) => {
    console.error(`[feed] failed to start: ${err.message}`);
    process.exit(1);
  });
}

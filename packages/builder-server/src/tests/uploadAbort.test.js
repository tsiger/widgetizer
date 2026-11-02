/**
 * ZIP uploads that the client abandons partway, over real HTTP.
 *
 * Project and theme ZIPs are written to `data/temp` as they arrive. A client
 * that disconnects mid-file must leave neither a partial file there nor an
 * open write stream behind it: the descriptor would stay open for the life of
 * the process, and enough of them stop the server from opening any file.
 *
 * Run with: node --test packages/builder-server/src/tests/uploadAbort.test.js
 */

import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import net from "net";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-upload-abort-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _origError = console.error;
console.error = () => {};

const { createEditorApp } = await import("../createApp.js");
const { getDb, closeDb } = await import("../db/index.js");
const { DATA_DIR } = await import("../config.js");
const {
  LocalScopeResolver,
  LocalPreviewScopeResolver,
  LocalStorageAdapter,
  LocalAssetStorageAdapter,
  LocalPublishAdapter,
  LocalLimitsAdapter,
} = await import("@widgetizer/adapters-local");

const TEMP_DIR = path.join(DATA_DIR, "temp");
let server;
let port;

before(async () => {
  const db = getDb();
  const app = await createEditorApp({
    adapters: {
      scopeResolver: new LocalScopeResolver(db),
      previewScopeResolver: new LocalPreviewScopeResolver(db),
      storage: new LocalStorageAdapter({ dataRoot: DATA_DIR }),
      assetStorage: new LocalAssetStorageAdapter({ dataRoot: DATA_DIR }),
      publish: new LocalPublishAdapter({ dataRoot: DATA_DIR, db }),
      limits: new LocalLimitsAdapter(db),
    },
  });
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      port = server.address().port;
      resolve();
    });
  });
});

after(async () => {
  console.error = _origError;
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  closeDb();
  await fs.remove(TEST_ROOT);
});

/** Start a multipart ZIP upload, send part of the file, then drop the connection. */
function abandonUpload(urlPath, field) {
  return new Promise((resolve, reject) => {
    const boundary = "abandoned-upload";
    const socket = net.connect(port, "127.0.0.1", () => {
      socket.write(
        `POST ${urlPath} HTTP/1.1\r\nHost: 127.0.0.1\r\n` +
          `Content-Type: multipart/form-data; boundary=${boundary}\r\nContent-Length: 10000000\r\n\r\n`,
      );
      socket.write(
        `--${boundary}\r\nContent-Disposition: form-data; name="${field}"; filename="site.zip"\r\n` +
          `Content-Type: application/zip\r\n\r\n`,
      );
      socket.write(Buffer.alloc(64 * 1024, 1));
      setTimeout(() => {
        socket.destroy();
        resolve();
      }, 100);
    });
    socket.on("error", reject);
  });
}

async function tempFiles() {
  return (await fs.pathExists(TEMP_DIR)) ? fs.readdir(TEMP_DIR) : [];
}

describe("a ZIP upload the client abandons", () => {
  for (const [label, urlPath, field] of [
    ["project import", "/api/projects/import", "projectZip"],
    ["theme upload", "/api/themes/upload", "themeZip"],
  ]) {
    it(`leaves no partial file behind (${label})`, async () => {
      for (let i = 0; i < 3; i++) await abandonUpload(urlPath, field);
      let left = await tempFiles();
      for (let i = 0; i < 250 && left.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        left = await tempFiles();
      }
      assert.deepEqual(left, [], "an abandoned upload must not leave its partial file (and open stream) behind");
    });
  }
});

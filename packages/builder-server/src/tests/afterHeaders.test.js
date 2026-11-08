/**
 * Errors after a response has started, and clients that leave mid-file.
 *
 * Once the headers are out, no error status can follow: the only honest
 * outcome is a closed connection, and the real error belongs in the log. A
 * client that disconnects partway through a file is routine, not an error.
 *
 * Run with: node --test packages/builder-server/src/tests/afterHeaders.test.js
 */

import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import net from "node:net";
import path from "node:path";
import os from "node:os";
import express from "express";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-after-headers-test-${Date.now()}`);
process.env.DATA_ROOT = path.join(TEST_ROOT, "data");
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { default: errorHandler } = await import("../middleware/errorHandler.js");
const { sendFileDone } = await import("../utils/sendFileOutcome.js");
const { createEditorApp } = await import("../createApp.js");
const { getDb, closeDb } = await import("../db/index.js");
const { DATA_DIR, getProjectDir, getPublishDir } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const {
  LocalScopeResolver,
  LocalPreviewScopeResolver,
  LocalStorageAdapter,
  LocalAssetStorageAdapter,
  LocalPublishAdapter,
  LocalLimitsAdapter,
} = await import("@widgetizer/adapters-local");

const PROJECT_ID = "after-headers-project";
const PROJECT_FOLDER = "after-headers-folder";
const servers = [];

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      servers.push(server);
      resolve(server.address().port);
    });
  });
}

/** console.error calls made while `fn` runs, for at most `ms` afterwards. */
async function errorsLogged(fn, until, ms = 1500) {
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args.map(String).join(" "));
  try {
    await fn();
    for (let waited = 0; waited < ms && !until(logged); waited += 20) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  } finally {
    console.error = original;
  }
  return logged;
}

/** Request `urlPath` over a raw socket, read the first bytes, then leave. */
function leaveAfterFirstBytes(port, urlPath) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1", () => {
      socket.write(`GET ${urlPath} HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n`);
    });
    socket.once("data", () => {
      socket.destroy();
      resolve();
    });
    socket.on("error", reject);
  });
}

after(async () => {
  for (const server of servers) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  closeDb();
  await fs.remove(TEST_ROOT);
});

describe("the error handler, after the response has started", () => {
  it("hands the real error on instead of failing to write a second response", async () => {
    const reached = [];
    const app = express();
    app.get("/late", (_req, res, next) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.write("partial");
      next(new Error("the real failure"));
    });
    app.use(errorHandler);
    app.use((err, _req, res, _next) => {
      reached.push(err.message);
      res.destroy();
    });
    const port = await listen(app);

    await fetch(`http://127.0.0.1:${port}/late`)
      .then((response) => response.text())
      .catch(() => {});
    assert.deepEqual(reached, ["the real failure"]);
  });

  it("still answers an error before the response started with its status and JSON", async () => {
    const app = express();
    app.get("/early", (_req, _res, next) => next(Object.assign(new Error("Nope"), { statusCode: 404, code: "NOPE" })));
    app.use(errorHandler);
    const port = await listen(app);

    const response = await fetch(`http://127.0.0.1:${port}/early`);
    assert.equal(response.status, 404);
    const body = await response.json();
    assert.equal(body.message, "Nope");
    assert.equal(body.code, "NOPE");
  });
});

describe("sendFileDone", () => {
  function fakeRes(headersSent) {
    return {
      headersSent,
      destroyed: false,
      destroy() {
        this.destroyed = true;
      },
    };
  }

  for (const [label, err] of [
    ["an aborted request", Object.assign(new Error("Request aborted"), { code: "ECONNABORTED" })],
    ["a write to a closed connection", Object.assign(new Error("write EPIPE"), { code: "EPIPE", syscall: "write" })],
  ]) {
    for (const headersSent of [true, false]) {
      it(`treats ${label} as the client leaving: nothing sent, nothing logged (headers ${headersSent ? "sent" : "not sent"})`, async () => {
        const res = fakeRes(headersSent);
        let called = false;
        const logged = await errorsLogged(
          () => sendFileDone(res, () => (called = true))(err),
          () => false,
          0,
        );
        assert.equal(called, false);
        assert.equal(res.destroyed, false);
        assert.deepEqual(logged, []);
      });
    }
  }

  it("closes the connection on a real failure after the headers", async () => {
    const res = fakeRes(true);
    let called = false;
    const logged = await errorsLogged(
      () => sendFileDone(res, () => (called = true))(Object.assign(new Error("read EIO"), { code: "EIO", syscall: "read" })),
      () => false,
      0,
    );
    assert.equal(called, false);
    assert.equal(res.destroyed, true);
    assert.equal(logged.length, 1);
  });

  it("leaves a failure before the headers to the route", () => {
    for (const code of ["ENOENT", "EISDIR"]) {
      const res = fakeRes(false);
      const seen = [];
      sendFileDone(res, (err) => seen.push(err.code))(Object.assign(new Error(code), { code }));
      assert.deepEqual(seen, [code]);
      assert.equal(res.destroyed, false);
    }
  });

  it("does nothing when the file was sent", () => {
    const res = fakeRes(true);
    let called = false;
    sendFileDone(res, () => (called = true))(undefined);
    assert.equal(called, false);
    assert.equal(res.destroyed, false);
  });
});

describe("files sent to the browser (OSS app)", () => {
  let port;
  const EXPORT_DIR = `${PROJECT_FOLDER}-v1`;

  before(async () => {
    await projectRepo.writeProjectsData({
      projects: [{ id: PROJECT_ID, folderName: PROJECT_FOLDER, name: "After headers", theme: "arch", created: new Date().toISOString() }],
      activeProjectId: PROJECT_ID,
    });
    await fs.ensureDir(getProjectDir(PROJECT_FOLDER));
    // Large enough to still be sending when the client leaves; the export viewer
    // sends it uncompressed.
    await fs.outputFile(path.join(getPublishDir(), EXPORT_DIR, "big.bin"), Buffer.alloc(8 * 1024 * 1024, 7));
    await fs.outputFile(path.join(getPublishDir(), EXPORT_DIR, "index.html"), "<p>ok</p>");

    const db = getDb();
    port = await listen(
      await createEditorApp({
        adapters: {
          scopeResolver: new LocalScopeResolver(db),
          previewScopeResolver: new LocalPreviewScopeResolver(db),
          storage: new LocalStorageAdapter({ dataRoot: DATA_DIR }),
          assetStorage: new LocalAssetStorageAdapter({ dataRoot: DATA_DIR }),
          publish: new LocalPublishAdapter({ dataRoot: DATA_DIR, db }),
          limits: new LocalLimitsAdapter(db),
        },
      }),
    );
  });

  // A smoke test: the client leaves after its first bytes, and nothing makes
  // the server's send still be running then. It caught the old callback
  // logging the client's EPIPE; the rules themselves are pinned above.
  it("doesn't log a client leaving an exported file as an error", async () => {
    const logged = await errorsLogged(
      () => leaveAfterFirstBytes(port, `/api/export/view/${EXPORT_DIR}/big.bin`),
      (lines) => lines.some((line) => line.includes("Error sending file")),
      1000,
    );
    assert.deepEqual(
      logged.filter((line) => line.includes("Error sending file")),
      [],
    );
    const health = await fetch(`http://127.0.0.1:${port}/api/export/view/${EXPORT_DIR}/index.html`);
    assert.equal(health.status, 200);
  });

  it("still answers 404 for a missing placeholder asset", async () => {
    let res;
    await errorsLogged(async () => {
      res = await fetch(`http://127.0.0.1:${port}/api/core/assets/missing.svg`);
    }, () => true, 0);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "Asset not found" });
  });
});

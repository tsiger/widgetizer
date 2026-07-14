import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";
import express from "express";
import { body } from "express-validator";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-infra-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

const { createEditorApp } = await import("../createApp.js");
const { getThemeDir } = await import("../config.js");
const errorHandler = (await import("../middleware/errorHandler.js")).default;
const { standardJsonParser, editorJsonParser } = await import("../middleware/jsonParser.js");
const { validateRequest } = await import("../middleware/validateRequest.js");
const { closeDb } = await import("../db/index.js");

async function startServer(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

async function stopServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

describe("validateRequest", () => {
  it("returns 400 with validator errors when validation fails", async () => {
    const app = express();
    app.use(express.json());
    app.post("/validate", body("name").notEmpty(), validateRequest, (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const { server, baseUrl } = await startServer(app);
    try {
      const response = await fetch(`${baseUrl}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await response.json();

      assert.equal(response.status, 400);
      assert.ok(Array.isArray(json.errors));
      assert.ok(json.errors.length > 0);
      assert.equal(json.errors[0].path, "name");
    } finally {
      await stopServer(server);
    }
  });

  it("passes through when validation succeeds", async () => {
    const app = express();
    app.use(express.json());
    app.post("/validate", body("name").notEmpty(), validateRequest, (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const { server, baseUrl } = await startServer(app);
    try {
      const response = await fetch(`${baseUrl}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Widgetizer" }),
      });
      const json = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(json, { ok: true });
    } finally {
      await stopServer(server);
    }
  });
});

describe("errorHandler", () => {
  it("includes the stack trace outside production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    const app = express();
    app.get("/boom", () => {
      throw new Error("boom");
    });
    app.use(errorHandler);

    const { server, baseUrl } = await startServer(app);
    try {
      const response = await fetch(`${baseUrl}/boom`);
      const json = await response.json();

      assert.equal(response.status, 500);
      assert.equal(json.message, "boom");
      assert.match(json.stack, /boom/);
    } finally {
      process.env.NODE_ENV = originalEnv;
      await stopServer(server);
    }
  });

  it("hides the stack trace in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const app = express();
    app.get("/boom", () => {
      throw new Error("boom");
    });
    app.use(errorHandler);

    const { server, baseUrl } = await startServer(app);
    try {
      const response = await fetch(`${baseUrl}/boom`);
      const json = await response.json();

      assert.equal(response.status, 500);
      assert.equal(json.message, "boom");
      assert.equal(json.stack, null);
    } finally {
      process.env.NODE_ENV = originalEnv;
      await stopServer(server);
    }
  });
});

describe("jsonParser", () => {
  it("enforces the standard 2mb limit", async () => {
    const app = express();
    app.post("/standard", standardJsonParser, (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const { server, baseUrl } = await startServer(app);
    try {
      const largeBody = JSON.stringify({ content: "x".repeat(2.5 * 1024 * 1024) });
      const response = await fetch(`${baseUrl}/standard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: largeBody,
      });

      assert.equal(response.status, 413);
    } finally {
      await stopServer(server);
    }
  });

  it("allows larger editor payloads up to the 10mb parser limit", async () => {
    const app = express();
    app.post("/editor", editorJsonParser, (req, res) => {
      res.status(200).json({ length: req.body.content.length });
    });

    const { server, baseUrl } = await startServer(app);
    try {
      const bodyPayload = "x".repeat(3 * 1024 * 1024);
      const response = await fetch(`${baseUrl}/editor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: bodyPayload }),
      });
      const json = await response.json();

      assert.equal(response.status, 200);
      assert.equal(json.length, bodyPayload.length);
    } finally {
      await stopServer(server);
    }
  });
});

// A minimal adapter set that satisfies setupBuilderServer's required-keys check.
// These stubs are never invoked by the /health or trust-proxy assertions below;
// they exist only so app assembly passes validation.
function fakeAdapters() {
  return {
    scopeResolver: { resolveScope: async () => ({}) },
    previewScopeResolver: { resolveScope: async () => ({}) },
    storage: {},
    assetStorage: {},
    publish: {},
    limits: {},
  };
}

describe("createEditorApp", () => {
  it("throws when no adapters are provided", async () => {
    await assert.rejects(() => createEditorApp(), /requires an adapters set/);
  });

  it("throws when the adapter set is incomplete", async () => {
    await assert.rejects(() => createEditorApp({ adapters: { storage: {} } }), /missing required adapter/);
  });

  it("serves the health endpoint", async () => {
    const app = await createEditorApp({ adapters: fakeAdapters() });
    const { server, baseUrl } = await startServer(app);

    try {
      const response = await fetch(`${baseUrl}/health`);
      const json = await response.json();

      assert.equal(response.status, 200);
      assert.equal(json.status, "ok");
      assert.ok(typeof json.timestamp === "string");
    } finally {
      await stopServer(server);
    }
  });

  it("enables trust proxy in production mode", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const app = await createEditorApp({ adapters: fakeAdapters() });
      assert.equal(app.get("trust proxy"), 1);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

describe("theme assets served from the theme source dir", () => {
  it("serves root assets when the theme has no latest/", async () => {
    const themeDir = getThemeDir("assets-root-theme");
    await fs.outputFile(path.join(themeDir, "presets", "p1", "screenshot.png"), "ROOT-PNG");

    const app = await createEditorApp({ adapters: fakeAdapters() });
    const { server, baseUrl } = await startServer(app);
    try {
      const res = await fetch(`${baseUrl}/themes/assets-root-theme/presets/p1/screenshot.png`);
      assert.equal(res.status, 200);
      assert.equal(await res.text(), "ROOT-PNG");
    } finally {
      await stopServer(server);
    }
  });

  it("serves latest/ assets once built — including presets that exist ONLY in latest/", async () => {
    // Reproduces the 0.9.8→0.9.9 Bedrock case: the root copy predates the
    // preset, so its screenshot exists only in latest/. The stale root
    // screenshot must also lose to the latest/ one.
    const themeDir = getThemeDir("assets-latest-theme");
    await fs.outputFile(path.join(themeDir, "screenshot.png"), "OLD-ROOT");
    await fs.outputFile(path.join(themeDir, "latest", "theme.json"), JSON.stringify({ version: "9.9.9" }));
    await fs.outputFile(path.join(themeDir, "latest", "screenshot.png"), "NEW-LATEST");
    await fs.outputFile(
      path.join(themeDir, "latest", "presets", "newpreset", "screenshot.png"),
      "NEW-PRESET",
    );

    const app = await createEditorApp({ adapters: fakeAdapters() });
    const { server, baseUrl } = await startServer(app);
    try {
      const presetRes = await fetch(`${baseUrl}/themes/assets-latest-theme/presets/newpreset/screenshot.png`);
      assert.equal(presetRes.status, 200);
      assert.equal(await presetRes.text(), "NEW-PRESET");

      const themeRes = await fetch(`${baseUrl}/themes/assets-latest-theme/screenshot.png`);
      assert.equal(themeRes.status, 200);
      assert.equal(await themeRes.text(), "NEW-LATEST");
    } finally {
      await stopServer(server);
    }
  });

  it("never serves files outside the themes dir for hostile ids", async () => {
    // A ".."-shaped id must fail the allowlist and never resolve as a theme.
    // (The SPA catch-all may still 200 with HTML — the assertion is that the
    // secret's CONTENT is unreachable, not the status code.)
    await fs.outputFile(path.join(TEST_ROOT, "secret.txt"), "TOP-SECRET");
    await fs.outputFile(path.join(TEST_DATA_DIR, "secret.txt"), "TOP-SECRET");

    const app = await createEditorApp({ adapters: fakeAdapters() });
    const { server, baseUrl } = await startServer(app);
    try {
      for (const probe of ["%2e%2e", "..%2f..", ".."]) {
        const res = await fetch(`${baseUrl}/themes/${probe}/secret.txt`);
        const body = await res.text();
        assert.ok(!body.includes("TOP-SECRET"), `traversal probe "${probe}" must not read outside themes/`);
      }
    } finally {
      await stopServer(server);
    }
  });
});

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

describe("createEditorApp", () => {
  it("serves the health endpoint", async () => {
    const app = await createEditorApp();
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
      const app = await createEditorApp();
      assert.equal(app.get("trust proxy"), 1);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});

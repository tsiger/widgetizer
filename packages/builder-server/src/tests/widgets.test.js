/**
 * getProjectWidgets Test Suite
 *
 * Covers the project widget-catalog endpoint after its migration to the storage
 * adapter (req.adapters.storage over req.scope). The previous implementation
 * read theme/global widgets from a global DATA_DIR path (getProjectDir), which
 * broke under any backend whose project dir isn't the OSS global one (e.g.
 * hosted's per-user dir): only core widgets came back. These tests drive the
 * controller through the real LocalStorageAdapter against an isolated data root.
 *
 * Run with: node --test server/tests/widgets.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-widgets-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
const TEST_THEMES_DIR = path.join(TEST_ROOT, "themes");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = TEST_THEMES_DIR;
process.env.NODE_ENV = "test";

const { getProjectWidgets } = await import("../controllers/projectController.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });

const PROJECT_ID = "widgets-test-project-uuid";
const PROJECT_FOLDER = "widgets-test-project";
const projectDir = path.join(TEST_DATA_DIR, "projects", PROJECT_FOLDER);

function mockReq() {
  return {
    scope: { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: PROJECT_FOLDER },
    adapters: { storage },
  };
}

function mockRes() {
  const res = {
    _status: 200,
    _json: null,
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
  };
  return res;
}

before(async () => {
  // theme.json (defaults to including core widgets)
  await fs.ensureDir(projectDir);
  await fs.writeJson(path.join(projectDir, "theme.json"), { name: "Widgets Test Theme", version: "1.0.0" });

  // Two theme widgets + one global widget, each with a schema.json.
  await fs.ensureDir(path.join(projectDir, "widgets", "features-split"));
  await fs.writeJson(path.join(projectDir, "widgets", "features-split", "schema.json"), {
    type: "features-split",
    displayName: "tTheme:features_split.name",
    settings: [],
  });
  // A sibling preview.png should set hasPreview on its schema.
  await fs.writeFile(path.join(projectDir, "widgets", "features-split", "preview.png"), "PNG");

  await fs.ensureDir(path.join(projectDir, "widgets", "hero"));
  await fs.writeJson(path.join(projectDir, "widgets", "hero", "schema.json"), {
    type: "hero",
    displayName: "tTheme:hero.name",
    settings: [],
  });

  await fs.ensureDir(path.join(projectDir, "widgets", "global", "header"));
  await fs.writeJson(path.join(projectDir, "widgets", "global", "header", "schema.json"), {
    type: "header",
    displayName: "tTheme:header.name",
    settings: [],
  });

  // A stray non-directory entry under widgets/ must be skipped, not crash.
  await fs.writeFile(path.join(projectDir, "widgets", "README.md"), "not a widget");
  // Stray dotfiles (e.g. a macOS .DS_Store) in both enumeration spots must be
  // skipped silently — never logged as a "Failed to parse schema" warning.
  await fs.writeFile(path.join(projectDir, "widgets", ".DS_Store"), "");
  await fs.writeFile(path.join(projectDir, "widgets", "global", ".DS_Store"), "");

  // A widget folder with a genuinely malformed schema.json — this SHOULD still
  // warn, proving the honest-signal path survives the stray-entry guard.
  await fs.ensureDir(path.join(projectDir, "widgets", "broken-widget"));
  await fs.writeFile(path.join(projectDir, "widgets", "broken-widget", "schema.json"), "{ not valid json");
});

/** Run getProjectWidgets while capturing console.warn calls. */
async function widgetsWithWarnings() {
  const warnings = [];
  const original = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  const res = mockRes();
  try {
    await getProjectWidgets(mockReq(), res);
  } finally {
    console.warn = original;
  }
  return { res, warnings };
}

after(async () => {
  await fs.remove(TEST_ROOT);
});

describe("getProjectWidgets", () => {
  it("returns theme + global widget schemas from the project dir (not just core)", async () => {
    const res = mockRes();
    await getProjectWidgets(mockReq(), res);

    assert.equal(res._status, 200);
    assert.ok(Array.isArray(res._json), "responds with an array of schemas");

    const types = res._json.map((s) => s.type);
    assert.ok(types.includes("features-split"), "includes the theme widget");
    assert.ok(types.includes("hero"), "includes the second theme widget");
    assert.ok(types.includes("header"), "includes the global widget");
  });

  it("flags hasPreview when a sibling preview.png exists", async () => {
    const res = mockRes();
    await getProjectWidgets(mockReq(), res);

    const featuresSplit = res._json.find((s) => s.type === "features-split");
    assert.equal(featuresSplit.hasPreview, true);

    const hero = res._json.find((s) => s.type === "hero");
    assert.equal(hero.hasPreview, undefined, "no preview.png → no hasPreview flag");
  });

  it("skips stray non-widget entries without throwing", async () => {
    const res = mockRes();
    await getProjectWidgets(mockReq(), res);
    assert.equal(res._status, 200);
    // README.md has no schema.json so it never becomes a schema entry.
    assert.ok(!res._json.some((s) => s.type === "README.md" || s.type == null));
  });

  it("does not warn 'Failed to parse schema' for stray non-widget entries", async () => {
    const { res, warnings } = await widgetsWithWarnings();
    assert.equal(res._status, 200);

    // No stray entry (README.md / .DS_Store, in widgets/ or widgets/global/)
    // should ever produce a schema-parse warning.
    const strayWarnings = warnings.filter(
      (w) => w.includes("Failed to parse schema") && (w.includes(".DS_Store") || w.includes("README.md")),
    );
    assert.deepEqual(strayWarnings, [], `unexpected stray-entry warnings: ${strayWarnings.join(" | ")}`);
  });

  it("still warns on a genuinely malformed schema.json (honest signal survives)", async () => {
    const { warnings } = await widgetsWithWarnings();
    const brokenWarning = warnings.find(
      (w) => w.includes("Failed to parse schema") && w.includes("broken-widget"),
    );
    assert.ok(brokenWarning, "a real broken schema.json must still warn");
  });
});

/**
 * The preview reports which site settings each widget and the layout read, so the
 * editor re-renders only what a setting change can affect.
 *
 * Run with: node --test packages/builder-server/src/tests/previewThemeReads.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-theme-reads-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const _log = console.log;
const _warn = console.warn;
const _error = console.error;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

const { getProjectDir, getProjectPagesDir, getProjectThemeJsonPath } = await import("../config.js");
const projectRepo = await import("../db/repositories/projectRepository.js");
const { createPreviewToken, renderSingleWidget } = await import("../controllers/previewController.js");
const { getToken } = await import("../services/previewTokenStore.js");
const { closeDb } = await import("../db/index.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "theme-reads-uuid";
const PROJECT_FOLDER = "theme-reads-project";

const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: PROJECT_FOLDER };

const THEME = {
  settings: {
    global: {
      colors: [
        { id: "accent", type: "color", default: "#f00", outputAsCssVar: true },
        { id: "unused", type: "color", default: "#0f0", outputAsCssVar: true },
      ],
      general: [
        { id: "show_breadcrumbs", type: "checkbox", default: true },
        { id: "date_format", type: "select", default: "YYYY-MM-DD" },
      ],
    },
  },
};

const PAGE = {
  id: "index",
  uuid: "u-home",
  slug: "index",
  name: "Home",
  widgets: {
    dated: { type: "dated", settings: { date: "2026-03-04" } },
    plain: { type: "plain", settings: {} },
  },
  widgetsOrder: ["dated", "plain"],
};

async function seed() {
  await projectRepo.writeProjectsData({
    projects: [
      {
        id: PROJECT_ID,
        folderName: PROJECT_FOLDER,
        name: "Theme Reads",
        siteTitle: "Theme Reads",
        theme: "__theme_reads__",
        themeVersion: "1.0.0",
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    ],
    activeProjectId: PROJECT_ID,
  });

  const projectDir = getProjectDir(PROJECT_FOLDER);
  await fs.ensureDir(path.join(getProjectPagesDir(PROJECT_FOLDER), "global"));
  await fs.ensureDir(path.join(projectDir, "snippets"));
  await fs.outputFile(getProjectThemeJsonPath(PROJECT_FOLDER), JSON.stringify(THEME));
  await fs.writeFile(
    path.join(projectDir, "layout.liquid"),
    `<!DOCTYPE html><html><head>{% theme_settings %}</head><body class="{% if theme.general.show_breadcrumbs %}crumbs{% endif %}">` +
      `<main>{{ main_content | raw }}</main></body></html>`,
  );
  const widget = async (type, template) => {
    await fs.outputFile(path.join(projectDir, "widgets", type, "widget.liquid"), template);
    await fs.outputFile(
      path.join(projectDir, "widgets", type, "schema.json"),
      JSON.stringify({ type, settings: [{ type: "text", id: "date", label: "Date" }] }),
    );
  };
  await widget("dated", `<p style="color: {{ theme.colors.accent }}">{{ widget.settings.date | format_date }}</p>`);
  await widget("plain", `<p>plain</p>`);
  await storage.write(scope, "pages/index.json", JSON.stringify(PAGE));
}

function mockReq(body) {
  return {
    body,
    query: {},
    params: {},
    scope,
    activeProject: projectRepo.getProjectById(PROJECT_ID),
    adapters: { storage },
  };
}

function mockRes() {
  const res = { _status: 200, _json: null, _sent: null };
  res.status = (code) => {
    res._status = code;
    return res;
  };
  res.json = (payload) => {
    res._json = payload;
    return res;
  };
  res.send = (body) => {
    res._sent = body;
    return res;
  };
  return res;
}

before(seed);

after(async () => {
  console.log = _log;
  console.warn = _warn;
  console.error = _error;
  closeDb();
  await fs.remove(TEST_ROOT);
});

describe("preview theme reads", () => {
  it("a full preview lists what each widget and the layout read", async () => {
    const res = mockRes();
    await createPreviewToken(mockReq({ pageData: PAGE, themeSettings: THEME, previewMode: "editor" }), res);
    assert.equal(res._status, 200, JSON.stringify(res._json));
    const html = getToken(res._json.token);
    const json = html.match(/<script type="application\/json" id="widgetizer-theme-reads">(.*?)<\/script>/)?.[1];
    assert.ok(json, "the page carries the reads");
    const reads = JSON.parse(json);
    assert.deepEqual(reads.widgets.dated.sort(), ["colors.accent", "general.date_format"]);
    assert.deepEqual(reads.widgets.plain, []);
    assert.deepEqual(reads.layout, ["general.show_breadcrumbs"]);
  });

  it("a widget re-render returns its reads when asked", async () => {
    const res = mockRes();
    await renderSingleWidget(
      mockReq({ widgetId: "dated", widget: PAGE.widgets.dated, themeSettings: THEME, page: PAGE, withThemeReads: true }),
      res,
    );
    assert.match(res._json.html, /2026-03-04/);
    assert.deepEqual(res._json.themeReads.sort(), ["colors.accent", "general.date_format"]);
  });

  it("a widget re-render without the flag still answers with plain HTML", async () => {
    const res = mockRes();
    await renderSingleWidget(mockReq({ widgetId: "plain", widget: PAGE.widgets.plain, themeSettings: THEME, page: PAGE }), res);
    assert.match(res._sent, /<p>plain<\/p>/);
    assert.equal(res._json, null);
  });

  it("records the date format under the group the theme files it in", async () => {
    const theme = { settings: { global: { dates: [{ id: "date_format", type: "select", default: "YYYY-MM-DD" }] } } };
    const res = mockRes();
    await renderSingleWidget(
      mockReq({ widgetId: "dated", widget: PAGE.widgets.dated, themeSettings: theme, page: PAGE, withThemeReads: true }),
      res,
    );
    assert.ok(res._json.themeReads.includes("dates.date_format"), JSON.stringify(res._json.themeReads));
  });

  it("a date formatted with an explicit format does not depend on the site's format", async () => {
    await fs.outputFile(
      path.join(getProjectDir(PROJECT_FOLDER), "widgets", "fixed", "widget.liquid"),
      `<p>{{ widget.settings.date | format_date: 'D MMM YYYY' }}</p>`,
    );
    await fs.outputFile(
      path.join(getProjectDir(PROJECT_FOLDER), "widgets", "fixed", "schema.json"),
      JSON.stringify({ type: "fixed", settings: [{ type: "text", id: "date", label: "Date" }] }),
    );
    const res = mockRes();
    await renderSingleWidget(
      mockReq({ widgetId: "fixed", widget: { type: "fixed", settings: { date: "2026-03-04" } }, themeSettings: THEME, withThemeReads: true }),
      res,
    );
    assert.deepEqual(res._json.themeReads, []);
  });
});

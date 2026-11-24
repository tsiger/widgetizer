/**
 * Theme settings that become CSS variables hold one value each, and a preview
 * takes its settings' structure from the project's stored theme, never from the
 * request: the setting types that pick each value's check, the names that
 * become variable names, and which settings exist at all.
 *
 * Run with: node --test packages/builder-server/src/tests/themeCssVariables.test.js
 */

import { describe, it, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-theme-css-vars-${Date.now()}`);
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
const { generatePreview, createPreviewToken, renderSingleWidget } = await import("../controllers/previewController.js");
const { saveProjectThemeSettingChanges } = await import("../controllers/themeController.js");
const { previewThemeSettings } = await import("../services/themeSettingChanges.js");
const { getToken } = await import("../services/previewTokenStore.js");
const { closeDb } = await import("../db/index.js");
const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

const PROJECT_ID = "theme-css-vars-uuid";
const PROJECT_FOLDER = "theme-css-vars-project";
const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
const scope = { actor: { id: "default", kind: "local" }, projectId: PROJECT_ID, folderName: PROJECT_FOLDER };

const INTER = '"Inter", sans-serif';
const FRAUNCES = '"Fraunces", serif';
const EXTRA_CSS = "background:url(https://example.com/seen.png)";

const makeTheme = () => ({
  name: "Vars",
  version: "1.0.0",
  settings: {
    global: {
      colors: [
        { id: "accent", type: "color", label: "Accent", default: "#ff0000", outputAsCssVar: true },
        { id: "note", type: "text", label: "Note", default: "plain" },
      ],
      typography: [{ id: "heading_font", type: "font_picker", label: "Heading font", default: { stack: INTER, weight: 600 } }],
      layout: [{ id: "gap", type: "text", label: "Gap", default: "12px", outputAsCssVar: true }],
    },
  },
});
const THEME = makeTheme();
const PAGE = { id: "index", uuid: "u-home", slug: "index", name: "Home", widgets: { w1: { type: "plain", settings: {} } }, widgetsOrder: ["w1"] };

const themeFile = () => getProjectThemeJsonPath(PROJECT_FOLDER);
const writeStored = (theme) => fs.outputFile(themeFile(), JSON.stringify(theme));
const setting = (theme, group, id) => theme.settings.global[group].find((item) => item.id === id);
/** The stored theme with some values set, as the editor's draft or as the stored file. */
function themeWith(values) {
  const theme = makeTheme();
  for (const [key, value] of Object.entries(values)) {
    const [group, id] = key.split(".");
    setting(theme, group, id).value = value;
  }
  return theme;
}

function mockReq(body) {
  return { body, query: {}, params: { projectId: PROJECT_ID }, scope, activeProject: projectRepo.getProjectById(PROJECT_ID), adapters: { storage, assetStorage: null } };
}
function mockRes() {
  const res = { _status: 200, _json: null, _sent: null };
  res.status = (code) => ((res._status = code), res);
  res.json = (payload) => ((res._json = payload), res);
  res.send = (body) => ((res._sent = body), res);
  return res;
}

/** The `:root` rule a full preview of the draft renders. */
async function previewRootRule(draft) {
  const res = mockRes();
  await createPreviewToken(mockReq({ pageData: PAGE, themeSettings: draft, previewMode: "editor" }), res);
  assert.equal(res._status, 200, JSON.stringify(res._json));
  const html = getToken(res._json.token);
  return html.match(/<style id="theme-settings-styles">([\s\S]*?)<\/style>/)?.[1] ?? "";
}
/** The declarations of that rule, one per line, as `name: value`. */
const declarations = (rule) => rule.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("--"));

before(async () => {
  await projectRepo.writeProjectsData({
    projects: [
      { id: PROJECT_ID, folderName: PROJECT_FOLDER, name: "Vars", siteTitle: "Vars", theme: "__vars__", themeVersion: "1.0.0", created: new Date().toISOString(), updated: new Date().toISOString() },
    ],
    activeProjectId: PROJECT_ID,
  });
  const projectDir = getProjectDir(PROJECT_FOLDER);
  await fs.ensureDir(path.join(getProjectPagesDir(PROJECT_FOLDER), "global"));
  await fs.ensureDir(path.join(projectDir, "snippets"));
  await fs.writeFile(
    path.join(projectDir, "layout.liquid"),
    `<!DOCTYPE html><html><head>{% theme_settings %}{% fonts %}</head><body><main>{{ main_content | raw }}</main></body></html>`,
  );
  await fs.outputFile(path.join(projectDir, "widgets", "plain", "widget.liquid"), `<p class="plain">{{ theme.colors.note }}</p>`);
  await fs.outputFile(path.join(projectDir, "widgets", "plain", "schema.json"), JSON.stringify({ type: "plain", settings: [] }));
  await storage.write(scope, "pages/index.json", JSON.stringify(PAGE));
  await writeStored(THEME);
});

afterEach(() => writeStored(THEME));

after(async () => {
  console.log = _log;
  console.warn = _warn;
  console.error = _error;
  closeDb();
  await fs.remove(TEST_ROOT);
});

describe("saving a font or a CSS variable's text (PATCH)", () => {
  async function save(changes) {
    const res = mockRes();
    await saveProjectThemeSettingChanges(mockReq({ changes }), res);
    return res;
  }

  it("resets a font stack that carries extra CSS, and says so", async () => {
    const res = await save([{ group: "typography", id: "heading_font", value: { stack: `Inter; ${EXTRA_CSS}`, weight: 600 } }]);
    assert.equal(res._status, 200, JSON.stringify(res._json));
    assert.deepEqual(setting(res._json.theme, "typography", "heading_font").value, { stack: INTER, weight: 600 });
    assert.deepEqual(res._json.warnings.map((warning) => warning.code), ["VALUE_CORRECTED"]);
    assert.ok(!(await fs.readFile(themeFile(), "utf8")).includes("example.com"), "nothing of it is stored");
  });

  it("keeps a font from the list at a weight it offers", async () => {
    const res = await save([{ group: "typography", id: "heading_font", value: { stack: FRAUNCES, weight: 700 } }]);
    assert.deepEqual(setting(res._json.theme, "typography", "heading_font").value, { stack: FRAUNCES, weight: 700 });
    assert.deepEqual(res._json.warnings, []);
  });

  it("resets a CSS variable's text holding a semicolon, and keeps plain text", async () => {
    const bad = await save([{ group: "layout", id: "gap", value: `16px; ${EXTRA_CSS}` }]);
    assert.equal(setting(bad._json.theme, "layout", "gap").value, "12px");
    assert.deepEqual(bad._json.warnings.map((warning) => warning.code), ["VALUE_CORRECTED"]);

    const good = await save([{ group: "layout", id: "gap", baseValue: "12px", value: "24px" }]);
    assert.equal(setting(good._json.theme, "layout", "gap").value, "24px");
  });
});

describe("a value already stored badly is neutralised when the page is rendered", () => {
  it("loses the characters that would start another declaration, and keeps the rest", async () => {
    const stored = themeWith({ "typography.heading_font": { stack: `Inter; ${EXTRA_CSS}`, weight: 600 }, "layout.gap": "16px; color: red } body { margin: 0" });
    await writeStored(stored);

    const rule = await previewRootRule(stored);

    assert.deepEqual(declarations(rule), [
      "--colors-accent: #ff0000;",
      `--typography-heading_font-family: Inter ${EXTRA_CSS};`,
      "--typography-heading_font-weight: 600;",
      "--layout-gap: 16px color: red  body  margin: 0;",
    ]);
    assert.equal(rule.split("}").length, 2, "the rule is closed once, by its own brace");
  });

  it("leaves out a setting whose group or id can't be a variable's name, and a code setting", async () => {
    const stored = makeTheme();
    stored.settings.global["x: red; --y"] = [{ id: "z", type: "color", default: "#00ff00", outputAsCssVar: true }];
    stored.settings.global.colors.push({ id: "a} body{b", type: "color", default: "#0000ff", outputAsCssVar: true });
    stored.settings.global.layout.push({ id: "raw", type: "code", default: "red; background: blue", outputAsCssVar: true });
    await writeStored(stored);

    const rule = await previewRootRule(stored);

    assert.deepEqual(declarations(rule).map((line) => line.split(":")[0]), [
      "--colors-accent",
      "--typography-heading_font-family",
      "--typography-heading_font-weight",
      "--layout-gap",
    ]);
  });

  it("loads no font for a stored weight that isn't a weight", async () => {
    const stored = themeWith({ "typography.heading_font": { stack: INTER, weight: '600" onload="alert(1)' } });
    await writeStored(stored);
    const res = mockRes();
    await createPreviewToken(mockReq({ pageData: PAGE, themeSettings: stored, previewMode: "editor" }), res);
    const html = getToken(res._json.token);
    const links = html.match(/<link\b[^>]*>/g) || [];
    assert.ok(links.every((link) => !link.includes("onload")), `the weight never reaches a <link>: ${links.join(" ")}`);
    assert.ok(links.every((link) => !/fonts\.(googleapis\.com|bunny\.net)\/css[^"]*Inter/.test(link)), links.join(" "));
  });
});

describe("a preview takes its settings' structure from the stored theme", () => {
  it("checks a posted value by the stored type, whatever type the request claims", async () => {
    const draft = themeWith({ "colors.accent": `red; ${EXTRA_CSS}; font-size: 40px` });
    setting(draft, "colors", "accent").type = "text";
    delete setting(draft, "colors", "accent").outputAsCssVar;

    const rule = await previewRootRule(draft);

    assert.ok(declarations(rule).includes("--colors-accent: #ff0000;"), rule);
    assert.ok(!rule.includes("example.com") && !rule.includes("font-size"), rule);
  });

  it("previews an unsaved valid value, and the default for one reset in the draft", async () => {
    await writeStored(themeWith({ "colors.accent": "#00ff00" }));

    const changed = await previewRootRule(themeWith({ "colors.accent": "#0000ff" }));
    assert.ok(declarations(changed).includes("--colors-accent: #0000ff;"), changed);

    const reset = await previewRootRule(makeTheme());
    assert.ok(declarations(reset).includes("--colors-accent: #ff0000;"), reset);
  });

  it("ignores settings and groups the stored theme doesn't have, and names it never gave", async () => {
    const draft = makeTheme();
    draft.settings.global.colors.push({ id: "invented", type: "text", outputAsCssVar: true, value: "red" });
    draft.settings.global["evil}body{x"] = [{ id: "y", type: "text", outputAsCssVar: true, value: "red" }];

    const rule = await previewRootRule(draft);

    assert.ok(!rule.includes("invented") && !rule.includes("evil"), rule);
  });

  it("renders the stored theme when the request sends no settings, or something that isn't settings", async () => {
    await writeStored(themeWith({ "colors.accent": "#00ff00" }));
    for (const draft of [undefined, null, "settings", [], { settings: "x" }]) {
      const rule = await previewRootRule(draft);
      assert.ok(declarations(rule).includes("--colors-accent: #00ff00;"), JSON.stringify(draft));
    }
  });

  it("applies to the widget re-render too", async () => {
    const draft = themeWith({ "colors.note": "<b>x</b>" });
    setting(draft, "colors", "note").type = "richtext";
    const res = mockRes();
    await renderSingleWidget(mockReq({ widgetId: "w1", widget: PAGE.widgets.w1, themeSettings: draft, page: PAGE }), res);
    assert.equal(res._status, 200, JSON.stringify(res._json));
    assert.match(res._sent, /&lt;b&gt;x&lt;\/b&gt;/, "a text setting stays text: escaped, not markup");
  });
});

describe("previewThemeSettings", () => {
  it("finds a setting a theme update moved to another group", () => {
    const stored = makeTheme();
    stored.settings.global.brand = [stored.settings.global.colors.shift()];
    const draft = themeWith({ "colors.accent": "#0000ff" });

    const theme = previewThemeSettings(stored, draft);

    assert.equal(setting(theme, "brand", "accent").value, "#0000ff");
    assert.equal(theme.settings.global.colors.some((item) => item.id === "accent"), false);
  });

  it("keeps a value equal to the stored one as stored, even one today's checks would reset", () => {
    const oldFont = { stack: '"Retired Font", serif', weight: 400 };
    const stored = themeWith({ "typography.heading_font": oldFont });

    const theme = previewThemeSettings(stored, themeWith({ "typography.heading_font": oldFont }));

    assert.deepEqual(setting(theme, "typography", "heading_font").value, oldFont);
  });

  it("keeps a value equal to the theme's own default, which is never checked", () => {
    const stored = makeTheme();
    setting(stored, "typography", "heading_font").default = { stack: '"Theme Own Font", serif', weight: 400 };

    const theme = previewThemeSettings(stored, themeWith({ "typography.heading_font": { stack: '"Theme Own Font", serif', weight: 400 } }));

    assert.deepEqual(setting(theme, "typography", "heading_font").value, { stack: '"Theme Own Font", serif', weight: 400 });
  });

  it("does not change the stored theme it was given", () => {
    const stored = makeTheme();
    const before = JSON.stringify(stored);
    previewThemeSettings(stored, themeWith({ "colors.accent": "#0000ff" }));
    assert.equal(JSON.stringify(stored), before);
  });
});

describe("a project whose theme settings file is missing or unreadable has no preview", () => {
  const draft = themeWith({ "colors.accent": "#0000ff" });

  it("answers 404 with a code when the file is missing, for all three preview routes", async () => {
    await fs.remove(themeFile());

    const token = mockRes();
    await createPreviewToken(mockReq({ pageData: PAGE, themeSettings: draft, previewMode: "editor" }), token);
    assert.equal(token._status, 404);
    assert.equal(token._json.code, "THEME_SETTINGS_MISSING");

    const page = mockRes();
    await generatePreview(mockReq({ pageData: PAGE, themeSettings: draft, previewMode: "editor" }), page);
    assert.equal(page._status, 404);

    const widget = mockRes();
    await renderSingleWidget(mockReq({ widgetId: "w1", widget: PAGE.widgets.w1, themeSettings: draft, page: PAGE }), widget);
    assert.equal(widget._status, 404);
    assert.equal(widget._json.code, "THEME_SETTINGS_MISSING");
  });

  it("answers 500 with a code when the file can't be parsed, and never falls back to the request's", async () => {
    await fs.outputFile(themeFile(), "{ not json");

    const token = mockRes();
    await createPreviewToken(mockReq({ pageData: PAGE, themeSettings: draft, previewMode: "editor" }), token);
    assert.equal(token._status, 500);
    assert.equal(token._json.code, "THEME_SETTINGS_UNREADABLE");

    const widget = mockRes();
    await renderSingleWidget(mockReq({ widgetId: "w1", widget: PAGE.widgets.w1, themeSettings: draft, page: PAGE }), widget);
    assert.equal(widget._status, 500);
    assert.equal(widget._json.code, "THEME_SETTINGS_UNREADABLE");
  });
});

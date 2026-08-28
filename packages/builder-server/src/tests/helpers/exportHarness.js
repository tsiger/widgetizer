/**
 * Shared export-controller test harness.
 *
 * Builds the isolated environment the export tests need before any server
 * module is loaded: a temp DATA_ROOT/THEMES_ROOT, a silenced console, a real
 * `LocalStorageAdapter` + `scope`, and a `mockReq` that carries
 * `adapters: { storage }` — which is what enables the collection loop in
 * `exportController.js`. Callers get back the pieces they drive the real
 * `exportProject` controller with.
 *
 * Because the environment variables must be set before `config.js` and the DB
 * are imported, everything here happens inside `createExportHarness()` and the
 * server modules are pulled in with dynamic `import()`. Call it once, at the
 * top level of a test file, and await it before declaring any test.
 */

import fs from "fs-extra";
import path from "path";
import os from "os";

/**
 * @param {object} options
 * @param {string} options.rootPrefix     Prefix for the temp root directory name.
 * @param {string} options.projectId      Project UUID used for the DB row and the scope.
 * @param {string} options.projectFolder  Project folder name on disk.
 * @param {string} options.siteUrl        Project site URL (drives sitemap/canonical output).
 * @param {string} options.projectName    Project display name.
 * @param {string} options.siteTitle      Site title (appended to page titles by {% seo %}).
 * @param {string} options.theme          Theme name recorded on the project row.
 */
export async function createExportHarness({
  rootPrefix,
  projectId,
  projectFolder,
  siteUrl,
  projectName,
  siteTitle,
  theme,
}) {
  const TEST_ROOT = path.join(os.tmpdir(), `${rootPrefix}-${Date.now()}`);
  const TEST_DATA_DIR = path.join(TEST_ROOT, "data");

  process.env.DATA_ROOT = TEST_DATA_DIR;
  process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
  process.env.NODE_ENV = "test";

  // Silence production console noise; failures still surface via assertions.
  const _log = console.log;
  const _warn = console.warn;
  const _error = console.error;
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};

  const { getProjectDir, getProjectPagesDir, getProjectMenusDir, getProjectThemeJsonPath, getPublishDir } =
    await import("../../config.js");
  const projectRepo = await import("../../db/repositories/projectRepository.js");
  const { exportProject } = await import("../../controllers/exportController.js");
  const { closeDb, getDb } = await import("../../db/index.js");
  const exportRepo = await import("../../db/repositories/exportRepository.js");
  const { LocalStorageAdapter } = await import("@widgetizer/adapters-local");

  const PUBLISH_DIR = getPublishDir();
  const storage = new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR });
  const scope = { actor: { id: "default", kind: "local" }, projectId, folderName: projectFolder };

  function mockReq({ params = {}, body = {}, storage: storageOverride = storage } = {}) {
    return {
      params,
      body,
      scope: { projectId: params.projectId, folderName: projectFolder, actor: scope.actor },
      adapters: { storage: storageOverride },
      app: { locals: {} },
      [Symbol.for("express-validator#contexts")]: [],
    };
  }

  function mockRes() {
    const res = {
      _status: 200,
      _json: null,
      headersSent: false,
      status(code) { res._status = code; return res; },
      json(data) { res._json = data; res.headersSent = true; return res; },
      setHeader() { return res; },
    };
    return res;
  }

  // `storage` lets a test hand the controller a wrapped adapter (e.g. one that
  // mutates the project row mid-export); default is the harness's own.
  async function runExport(body = {}, { storage: storageOverride } = {}) {
    const res = mockRes();
    await exportProject(mockReq({ params: { projectId }, body, storage: storageOverride }), res);
    return res;
  }

  function latestExportDir() {
    const exports = exportRepo.getExports(projectId);
    if (!exports.length) return null;
    const dir = exports[0].outputDir;
    return path.isAbsolute(dir) ? dir : path.join(PUBLISH_DIR, dir);
  }

  async function resetExports() {
    getDb().prepare("DELETE FROM exports").run();
    const entries = await fs.readdir(PUBLISH_DIR).catch(() => []);
    for (const e of entries) {
      if (e.startsWith(projectFolder)) await fs.remove(path.join(PUBLISH_DIR, e));
    }
  }

  // Write the project's renderable scaffold (DB row, layout, theme, index page).
  async function seedProjectScaffold() {
    await projectRepo.writeProjectsData({
      projects: [
        {
          id: projectId,
          folderName: projectFolder,
          name: projectName,
          siteTitle,
          theme,
          themeVersion: "1.0.0",
          siteUrl,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        },
      ],
      activeProjectId: projectId,
    });

    const projectDir = getProjectDir(projectFolder);
    const pagesDir = getProjectPagesDir(projectFolder);
    await fs.ensureDir(path.join(pagesDir, "global"));
    await fs.ensureDir(path.join(projectDir, "snippets"));
    await fs.ensureDir(path.join(projectDir, "widgets"));

    await fs.outputFile(
      getProjectThemeJsonPath(projectFolder),
      JSON.stringify({ settings: { global: { general: [], colors: [] } } }, null, 2),
    );

    // Layout renders the page SEO title + main content; body class lets us assert
    // the collection/item body class flows through for item pages.
    await fs.writeFile(
      path.join(projectDir, "layout.liquid"),
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{{ page.seo.title }}</title>{% seo %}</head>` +
        `<body class="{{ body_class }}">{{ header | raw }}<main>{{ main_content | raw }}</main>{{ footer | raw }}</body></html>`,
    );

    await fs.writeFile(
      path.join(pagesDir, "index.json"),
      JSON.stringify({ name: "Home", slug: "index", uuid: "p-index", seo: { title: "Home" }, widgets: {}, widgetsOrder: [] }),
    );
  }

  // Restore the console, close the DB and drop the temp root. Call from after().
  async function cleanup() {
    console.log = _log;
    console.warn = _warn;
    console.error = _error;
    closeDb();
    await fs.remove(TEST_ROOT);
  }

  return {
    storage,
    scope,
    projectRepo,
    getProjectDir,
    getProjectPagesDir,
    getProjectMenusDir,
    PUBLISH_DIR,
    runExport,
    latestExportDir,
    resetExports,
    seedProjectScaffold,
    cleanup,
  };
}

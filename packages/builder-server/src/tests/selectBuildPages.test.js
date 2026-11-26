/**
 * selectBuildPages: which pages and languages a site build includes, and the
 * homepage checks that refuse a build. generateSite builds from exactly this
 * selection; multilangExport.test.js covers the same rules end to end.
 */

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";

import { selectBuildPages } from "../services/selectBuildPages.js";
import { selectBuildPages as exported } from "../index.js";
import { generateSite } from "../services/generateSite.js";

const refuse = (code, details) => Object.assign(new Error(code), { code, details });
const page = (language, id) => ({ id, language, uuid: `${language}-${id}` });
const project = { defaultLanguage: "en", languages: ["el", "de"] };

describe("selectBuildPages", () => {
  it("is exported from the package entry", () => {
    assert.equal(exported, selectBuildPages);
  });

  it("keeps the default language and every language with a homepage", () => {
    const pages = [page("en", "index"), page("en", "about"), page("el", "home"), page("el", "contact")];
    const selection = selectBuildPages(pages, { defaultLanguage: "en", languages: ["el"] }, { refuse });
    assert.deepEqual(selection.pages, pages);
    assert.deepEqual(selection.languages, ["el"]);
    assert.deepEqual(selection.languagesSkipped, []);
  });

  it("drops every page of a language with no homepage and names the language", () => {
    const pages = [page("en", "index"), page("el", "index"), page("de", "kontakt")];
    const selection = selectBuildPages(pages, project, { refuse });
    assert.deepEqual(
      selection.pages.map((p) => `${p.language}/${p.id}`),
      ["en/index", "el/index"],
    );
    assert.deepEqual(selection.languages, ["el"]);
    assert.deepEqual(selection.languagesSkipped, ["de"]);
  });

  it("names an enabled language that has no pages at all as skipped", () => {
    const selection = selectBuildPages([page("en", "home")], project, { refuse });
    assert.deepEqual(selection.languages, []);
    assert.deepEqual(selection.languagesSkipped, ["el", "de"]);
  });

  it("drops pages in a folder for a language the project has not enabled", () => {
    const pages = [page("en", "index"), page("fr", "index")];
    const selection = selectBuildPages(pages, { defaultLanguage: "en", languages: [] }, { refuse });
    assert.deepEqual(selection.pages, [pages[0]]);
  });

  it("refuses NO_HOMEPAGE when the default language has no homepage", () => {
    assert.throws(
      () => selectBuildPages([page("en", "about"), page("el", "index")], project, { refuse }),
      (error) => error.code === "NO_HOMEPAGE" && Object.keys(error.details).length === 0,
    );
  });

  it("refuses TWO_HOMEPAGES naming the folder of the language holding both", () => {
    const pages = [page("en", "index"), page("el", "index"), page("el", "home")];
    assert.throws(
      () => selectBuildPages(pages, project, { refuse }),
      (error) => error.code === "TWO_HOMEPAGES" && error.details.folder === "el",
    );
  });

  it("refuses TWO_HOMEPAGES with an empty folder for the default language", () => {
    const pages = [page("en", "index"), page("en", "home")];
    assert.throws(
      () => selectBuildPages(pages, project, { refuse }),
      (error) => error.code === "TWO_HOMEPAGES" && error.details.folder === "",
    );
  });

  it("checks for two homepages even in a language it would skip", () => {
    const pages = [page("en", "index"), page("fr", "index"), page("fr", "home")];
    assert.throws(
      () => selectBuildPages(pages, project, { refuse }),
      (error) => error.code === "TWO_HOMEPAGES" && error.details.folder === "fr",
    );
  });
});

// generateSite's own contract through the selection: what it reports, and what it
// hands the caller's refuse. A build stops at beforeFirstFile, which runs once
// every check has passed, so nothing past the checks needs a real project.
describe("generateSite — languages and homepage refusals", () => {
  const roots = [];
  after(() => Promise.all(roots.map((root) => fs.remove(root))));

  async function projectWith(files) {
    const projectDir = await fs.mkdtemp(path.join(os.tmpdir(), "widgetizer-select-build-pages-"));
    roots.push(projectDir);
    for (const file of files) await fs.outputJson(path.join(projectDir, "pages", `${file}.json`), { name: file });
    // A site with no layout is refused before beforeFirstFile runs.
    await fs.outputFile(path.join(projectDir, "layout.liquid"), "{{ main_content | raw }}");
    return projectDir;
  }

  const STOP = new Error("stopped before the first file");

  async function build(files, projectData) {
    const projectDir = await projectWith(files);
    const refusals = [];
    const report = {};
    let error = null;
    try {
      for await (const entry of generateSite(
        { projectId: "select-build-pages", projectDir, getProjectData: () => projectData },
        {
          appVersion: "test",
          assetVersion: "test",
          refuse: (code, details) => {
            refusals.push({ code, details });
            return Object.assign(new Error(code), { code });
          },
          readTheme: async () => ({}),
          formatPages: false,
          generateIcons: false,
          beforeFirstFile: async () => {
            throw STOP;
          },
          report,
        },
      )) {
        assert.fail(`wrote ${entry.path} past beforeFirstFile`);
      }
    } catch (caught) {
      error = caught;
    }
    return { error, refusals, report };
  }

  it("reports the languages built and skipped in the project's order", async () => {
    const { error, refusals, report } = await build(["index", "el/index", "de/kontakt", "fr/home", "it/index"], {
      defaultLanguage: "en",
      languages: ["it", "de", "el", "pt", "fr"],
    });
    assert.equal(error, STOP);
    assert.deepEqual(refusals, []);
    assert.deepEqual(report.languages, ["it", "el", "fr"]);
    assert.deepEqual(report.languagesSkipped, ["de", "pt"]);
  });

  it("hands refuse NO_HOMEPAGE with empty details", async () => {
    const { error, refusals } = await build(["about", "el/index"], { defaultLanguage: "en", languages: ["el"] });
    assert.equal(error.code, "NO_HOMEPAGE");
    assert.deepEqual(refusals, [{ code: "NO_HOMEPAGE", details: {} }]);
  });

  it("hands refuse TWO_HOMEPAGES with the folder of the language holding both", async () => {
    const { error, refusals } = await build(["index", "el/index", "el/home"], {
      defaultLanguage: "en",
      languages: ["el"],
    });
    assert.equal(error.code, "TWO_HOMEPAGES");
    assert.deepEqual(refusals, [{ code: "TWO_HOMEPAGES", details: { folder: "el" } }]);
  });

  it("refuses NO_HOMEPAGE first when another language holds two homepages", async () => {
    const { error, refusals } = await build(["about", "el/index", "el/home"], {
      defaultLanguage: "en",
      languages: ["el"],
    });
    assert.equal(error.code, "NO_HOMEPAGE");
    assert.deepEqual(refusals, [{ code: "NO_HOMEPAGE", details: {} }]);
  });
});

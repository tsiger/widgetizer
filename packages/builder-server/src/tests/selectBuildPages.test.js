/**
 * selectBuildPages: which pages and languages a site build includes, and the
 * homepage checks that refuse a build. generateSite builds from exactly this
 * selection; multilangExport.test.js covers the same rules end to end.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { selectBuildPages } from "../services/selectBuildPages.js";
import { selectBuildPages as exported } from "../index.js";

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

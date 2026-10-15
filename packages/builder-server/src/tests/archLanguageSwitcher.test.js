/**
 * Arch's language switcher, rendered through a real export (§7c).
 *
 * `page.translations` is a THEME CONTRACT: once a theme ships a switcher
 * against it, its shape cannot change. This drives the real
 * `themes/arch` header template rather than a fixture, so the contract is
 * pinned against the theme that actually consumes it.
 *
 * Run with: node --test packages/builder-server/src/tests/archLanguageSwitcher.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "arch-switcher-uuid";
const PROJECT_FOLDER = "arch-switcher-project";
const SITE = "https://arch.example.com";

const ARCH = fileURLToPath(new URL("../../../../themes/arch/", import.meta.url));

const { projectRepo, getProjectDir, getProjectPagesDir, runExport, latestExportDir, resetExports, seedProjectScaffold, cleanup } =
  await createExportHarness({
    rootPrefix: "widgetizer-arch-switcher",
    projectId: PROJECT_ID,
    projectFolder: PROJECT_FOLDER,
    siteUrl: SITE,
    projectName: "Arch Switcher",
    siteTitle: "Arch Switcher",
    theme: "arch",
  });

const writePage = async (language, slug, name, extra = {}) => {
  const dir = language ? path.join(getProjectPagesDir(PROJECT_FOLDER), language) : getProjectPagesDir(PROJECT_FOLDER);
  await fs.outputFile(
    path.join(dir, `${slug}.json`),
    JSON.stringify({ id: slug, slug, name, seo: { title: name }, widgets: {}, widgetsOrder: [], ...extra }),
  );
};

// Globals are per language, so each one needs its own header or it renders none.
const headerSettings = async (settings, language = "") =>
  fs.outputFile(
    path.join(getProjectPagesDir(PROJECT_FOLDER), ...(language ? [language] : []), "global", "header.json"),
    JSON.stringify({ type: "header", settings: { logoText: "Arch", ...settings } }),
  );

const headersEverywhere = async (settings = {}) => {
  await headerSettings(settings);
  await headerSettings(settings, "el");
};

before(async () => {
  await seedProjectScaffold();
  projectRepo.updateProject(PROJECT_ID, { siteUrl: SITE });
  projectRepo.updateProject(PROJECT_ID, { languages: ["el"] }, { seeded: true });

  const projectDir = getProjectDir(PROJECT_FOLDER);
  await fs.copy(path.join(ARCH, "widgets", "global", "header"), path.join(projectDir, "widgets", "global", "header"));
  await fs.copy(path.join(ARCH, "snippets"), path.join(projectDir, "snippets"));
  // The harness's own layout renders `{{ header | raw }}`, which is all this needs.

  await writePage("", "index", "Home", { uuid: "p-en-home" });
  await writePage("", "about", "About", { uuid: "p-en-about" });
  await writePage("el", "index", "Arxiki", { uuid: "p-el-home" });
  await writePage("el", "sxetika", "Sxetika", { uuid: "p-el-about", translationGroupId: "p-en-about" });
  await headersEverywhere();
});

after(async () => {
  await cleanup();
});

async function exportSite() {
  await resetExports();
  const res = await runExport();
  assert.equal(res._status, 200, JSON.stringify(res._json));
  return latestExportDir();
}

// The export's HTML formatter breaks long tags across lines, closing ones
// included (`</a >`), so everything here reads a single-spaced copy.
const read = async (dir, ...parts) => (await fs.readFile(path.join(dir, ...parts), "utf8")).replace(/\s+/g, " ");
const switcherLinks = (html) => {
  const nav = html.match(/<nav class="header-languages"[\s\S]*?<\/nav\s*>/);
  if (!nav) return null;
  return [...nav[0].matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a\s*>/g)].map(([, href, label]) => [href, label.trim()]);
};

describe("the Arch header's language switcher", () => {
  it("lists every published language by its own name, at that page's address", async () => {
    const dir = await exportSite();

    assert.deepEqual(switcherLinks(await read(dir, "about.html")), [
      ["about.html", "English"],
      ["el/sxetika.html", "Ελληνικά"],
    ]);
    // One level deep, so the same links carry the depth prefix.
    assert.deepEqual(switcherLinks(await read(dir, "el", "sxetika.html")), [
      ["../about.html", "English"],
      ["../el/sxetika.html", "Ελληνικά"],
    ]);
  });

  // The most clicked thing on the page. It linked to the DEFAULT language's
  // homepage from every translated page until `page_url` learned the language.
  it("sends the logo home within the language being read", async () => {
    const dir = await exportSite();
    const logo = (html) => (html.match(/<a href="([^"]*)" class="header-logo"/) || [])[1];

    assert.equal(logo(await read(dir, "about.html")), "index.html");
    assert.equal(logo(await read(dir, "el", "sxetika.html")), "../el/index.html");
  });

  it("marks the language being read, and tags each link with its own", async () => {
    const dir = await exportSite();
    const greek = await read(dir, "el", "sxetika.html");

    assert.match(greek, /<a href="\.\.\/el\/sxetika\.html" class="header-languages-link is-active" lang="el" aria-current="true" ?>/);
    assert.match(greek, /<a href="\.\.\/about\.html" class="header-languages-link" lang="en">/);
  });

  // §7c: the switcher may follow a fallback, because landing someone on the
  // homepage beats a dead end.
  it("falls back to a language's homepage for a page with no sibling there", async () => {
    await writePage("", "careers", "Careers", { uuid: "p-en-careers" });
    try {
      const dir = await exportSite();
      assert.deepEqual(switcherLinks(await read(dir, "careers.html")), [
        ["careers.html", "English"],
        ["el/index.html", "Ελληνικά"],
      ]);
    } finally {
      await fs.remove(path.join(getProjectPagesDir(PROJECT_FOLDER), "careers.json"));
    }
  });

  it("stays out of the way when the site has one language", async () => {
    projectRepo.updateProject(PROJECT_ID, { languages: [] }, { seeded: true });
    try {
      const dir = await exportSite();
      const html = await read(dir, "about.html");
      assert.equal(switcherLinks(html), null);
      assert.ok(!html.includes("header-languages"), html);
    } finally {
      projectRepo.updateProject(PROJECT_ID, { languages: ["el"] }, { seeded: true });
    }
  });

  it("can be turned off", async () => {
    await headersEverywhere({ show_language_switcher: false });
    try {
      const dir = await exportSite();
      assert.ok(!(await read(dir, "el", "sxetika.html")).includes("header-languages"));
    } finally {
      await headersEverywhere();
    }
  });
});

// A theme must not hardcode what a visitor reads, or a translated site shows
// English chrome around translated content.
describe("the Arch header's visitor-facing labels", () => {
  it("come from settings, defaults included", async () => {
    const dir = await exportSite();
    const html = await read(dir, "el", "sxetika.html");

    assert.match(html, /class="visually-hidden skip-link">Skip to main content<\/a>/);
    assert.match(html, /<nav class="header-nav" id="main-navigation" aria-label="Primary">/);
    assert.match(html, /<span class="nav-close-title">Menu<\/span>/);
  });

  it("say what the site says once they are set", async () => {
    await headersEverywhere({
      skip_link_text: "Μετάβαση στο περιεχόμενο",
      nav_label: "Κύριο μενού",
      menu_title: "Μενού",
      menu_close_label: "Κλείσιμο",
      language_switcher_label: "Γλώσσες",
    });
    try {
      const dir = await exportSite();
      const html = await read(dir, "el", "sxetika.html");

      assert.match(html, /class="visually-hidden skip-link">Μετάβαση στο περιεχόμενο<\/a>/);
      assert.match(html, /<nav class="header-nav" id="main-navigation" aria-label="Κύριο μενού">/);
      assert.match(html, /<span class="nav-close-title">Μενού<\/span>/);
      assert.match(html, /aria-label="Κλείσιμο"/);
      assert.match(html, /<nav class="header-languages" aria-label="Γλώσσες">/);
      assert.ok(!html.includes("Skip to main content"), "no English left behind");
    } finally {
      await headersEverywhere();
    }
  });
});

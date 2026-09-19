/**
 * The words the BUILT-IN widgets put on the published page.
 *
 * Core widgets belong to no theme, so their words cannot come from one: a theme
 * that ships no `locales/` at all must still export a form a Greek visitor can
 * read. This file therefore drives a real two-language export of a project whose
 * theme has had its locales removed, and only then adds a theme word back to
 * prove a theme still wins where it says something.
 *
 * It also pins the part that is easy to break from the language side: a field's
 * label is its submitted name, so the rendered HTML and `widgetizer.forms.json`
 * have to agree on every key, in every language.
 *
 * Run with: node --test packages/builder-server/src/tests/coreWidgetStrings.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "core-strings-uuid";
const PROJECT_FOLDER = "core-strings-project";
const SITE = "https://core-strings.example.com";

const ARCH = fileURLToPath(new URL("../../../../themes/arch/", import.meta.url));

const { projectRepo, getProjectDir, getProjectPagesDir, runExport, latestExportDir, resetExports, seedProjectScaffold, cleanup } =
  await createExportHarness({
    rootPrefix: "widgetizer-core-strings",
    projectId: PROJECT_ID,
    projectFolder: PROJECT_FOLDER,
    siteUrl: SITE,
    projectName: "Core Strings",
    siteTitle: "Core Strings",
    theme: "arch",
  });

/** The three fields a new form starts with, plus a choice and a consent. */
const formWidget = (settings = {}, blockSettings = {}) => ({
  type: "core-form",
  settings,
  blocks: {
    b1: { type: "field", settings: { label: "Your name", type: "text", required: true } },
    b2: { type: "field", settings: { label: "Email address", type: "email", required: true } },
    b3: {
      type: "choice",
      settings: { label: "How can we help?", type: "select", options: "General inquiry\nSupport", ...blockSettings },
    },
  },
  blocksOrder: ["b1", "b2", "b3"],
});

const writePage = async (language, slug, name, widget) => {
  const dir = language ? path.join(getProjectPagesDir(PROJECT_FOLDER), language) : getProjectPagesDir(PROJECT_FOLDER);
  await fs.outputFile(
    path.join(dir, `${slug}.json`),
    JSON.stringify({
      id: slug,
      uuid: `p-${language || "en"}-${slug}`,
      slug,
      name,
      seo: { title: name },
      widgets: { form: widget || formWidget() },
      widgetsOrder: ["form"],
    }),
  );
};

before(async () => {
  await seedProjectScaffold();
  projectRepo.updateProject(PROJECT_ID, { siteUrl: SITE });
  projectRepo.updateProject(PROJECT_ID, { languages: ["el"] }, { seeded: true });

  // Everything the theme needs to render EXCEPT its words: this project's theme
  // ships no `locales/` at all, which is the case core has to carry alone.
  const projectDir = getProjectDir(PROJECT_FOLDER);
  for (const dir of ["widgets", "snippets", "assets"]) {
    await fs.copy(path.join(ARCH, dir), path.join(projectDir, dir));
  }
  await fs.copy(path.join(ARCH, "layout.liquid"), path.join(projectDir, "layout.liquid"));

  await writePage("", "index", "Home");
  await writePage("el", "index", "Arxiki");
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

const read = async (dir, ...parts) => (await fs.readFile(path.join(dir, ...parts), "utf8")).replace(/\s+/g, " ");
const manifest = async (dir) => JSON.parse(await fs.readFile(path.join(dir, "widgetizer.forms.json"), "utf8"));

describe("a built-in widget in a theme that ships no words of its own", () => {
  it("reads in the language of the page anyway", async () => {
    const dir = await exportSite();
    const english = await read(dir, "index.html");
    const greek = await read(dir, "el", "index.html");

    assert.ok(english.includes("Required fields"), english.slice(0, 1500));
    assert.ok(english.includes("Send message"));
    assert.ok(english.includes("Select an option"));

    assert.ok(greek.includes("Υποχρεωτικά πεδία"), greek.slice(0, 1500));
    assert.ok(greek.includes("Αποστολή μηνύματος"));
    assert.ok(greek.includes("Επιλέξτε"));
  });

  it("leaves no English behind on the Greek page", async () => {
    const greek = await read(await exportSite(), "el", "index.html");

    assert.ok(!greek.includes("Required fields"));
    assert.ok(!greek.includes("Send message"));
    assert.ok(!greek.includes(">Select an option<"));
  });
});

describe("a theme that does say something", () => {
  after(async () => {
    await fs.remove(path.join(getProjectDir(PROJECT_FOLDER), "locales"));
  });

  it("wins over the built-in wording, key by key and language by language", async () => {
    const locales = path.join(getProjectDir(PROJECT_FOLDER), "locales");
    await fs.outputJson(path.join(locales, "en.json"), { site: { core_form: { submit: "Send it" } } });
    await fs.outputJson(path.join(locales, "el.json"), { site: { core_form: { submit: "Στείλε τώρα" } } });

    const dir = await exportSite();
    const english = await read(dir, "index.html");
    const greek = await read(dir, "el", "index.html");

    assert.ok(english.includes("Send it"));
    assert.ok(greek.includes("Στείλε τώρα"));
    // A key the theme said nothing about still comes from core, in both.
    assert.ok(english.includes("Required fields"));
    assert.ok(greek.includes("Υποχρεωτικά πεδία"));
  });
});

describe("what the owner typed", () => {
  after(async () => {
    await writePage("el", "index", "Arxiki");
  });

  it("wins over both, in that language only", async () => {
    await writePage("el", "index", "Arxiki", formWidget({ submit_label: "Πάμε", required_note: "Απαιτούμενα" }));

    const dir = await exportSite();
    const greek = await read(dir, "el", "index.html");
    const english = await read(dir, "index.html");

    assert.ok(greek.includes("Πάμε"));
    assert.ok(greek.includes("Απαιτούμενα"));
    assert.ok(!greek.includes("Αποστολή μηνύματος"));
    assert.ok(english.includes("Send message"), "the English page is untouched");
  });

  // Clearing a word is a choice, not an absence: the wording that arrives by
  // itself must not come back over an empty one the owner left on purpose.
  it("keeps a note the owner cleared out of the page", async () => {
    await writePage("el", "index", "Arxiki", formWidget({ required_note: "" }, { placeholder: "" }));

    const dir = await exportSite();
    const greek = await read(dir, "el", "index.html");
    const english = await read(dir, "index.html");

    assert.ok(!greek.includes("Υποχρεωτικά πεδία"));
    assert.ok(!greek.includes('class="form-required-note"'), "the whole line goes, not just its words");
    assert.ok(!greek.includes("Επιλέξτε"), "an empty first option is a choice too");
    assert.ok(greek.includes('<option value=""></option>'), greek.slice(0, 1200));

    assert.ok(english.includes("Required fields"), "the English page still has its own");
  });

  // A form built before any of this has English labels stored against it. They
  // are the owner's words now, and nothing here retranslates them.
  it("is not retranslated on a page in another language", async () => {
    const greek = await read(await exportSite(), "el", "index.html");

    assert.ok(greek.includes("Your name"));
    assert.ok(greek.includes("Email address"));
    assert.ok(greek.includes('name="your-name"'));
  });
});

// A label is a field's submitted name. Whatever language it is written in, the
// page and the manifest have to have derived the same key from it.
describe("the page and the manifest", () => {
  it("agree on every field name, in both languages", async () => {
    const dir = await exportSite();
    const forms = await manifest(dir);

    for (const [file, formKey] of [
      [["index.html"], "contact"],
      [["el", "index.html"], "el:contact"],
    ]) {
      const html = await read(dir, ...file);
      const form = forms.forms.find((f) => f.key === formKey);
      assert.ok(form, `no manifest entry for ${formKey} in ${JSON.stringify(forms.forms.map((f) => f.key))}`);
      assert.ok(html.includes(`data-widgetizer-form="${formKey}"`), `${formKey} is not the key on the page`);

      for (const field of form.fields) {
        assert.ok(html.includes(`name="${field.key}"`), `${formKey}: the page has no field named ${field.key}`);
      }
      for (const option of form.fields.find((f) => f.type === "select").options) {
        assert.ok(html.includes(`value="${option.value}"`), `${formKey}: the page has no option valued ${option.value}`);
      }
    }
  });

  it("keeps the two languages' forms separate", async () => {
    const forms = await manifest(await exportSite());
    const keys = forms.forms.map((f) => f.key).sort();

    assert.deepEqual(keys, ["contact", "el:contact"]);
  });
});

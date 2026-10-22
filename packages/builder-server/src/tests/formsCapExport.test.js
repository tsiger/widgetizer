/**
 * The distinct-forms ceiling as the export resolves it.
 *
 * `buildFormsManifest` is unit-tested with explicit caps; these tests drive the
 * real `exportProject` controller so the wiring is covered too: the handler
 * hands the limits adapter to the export, the export asks it for
 * `MAX_FORMS_PER_SITE`, and the answer — or the default, when there is no
 * usable answer — is the ceiling the manifest is built against. Without this,
 * a broken hand-off would quietly put the default cap back on the standalone
 * app, which answers `Infinity`.
 *
 * Run with: node --test packages/builder-server/src/tests/formsCapExport.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";

import { createExportHarness } from "./helpers/exportHarness.js";

const PROJECT_ID = "forms-cap-export-uuid";
const PROJECT_FOLDER = "forms-cap-export-project";

const {
  projectRepo,
  getProjectPagesDir,
  runExport,
  latestExportDir,
  resetExports,
  seedProjectScaffold,
  cleanup,
} = await createExportHarness({
  rootPrefix: "widgetizer-forms-cap-export",
  projectId: PROJECT_ID,
  projectFolder: PROJECT_FOLDER,
  siteUrl: "https://forms.example.com",
  projectName: "Forms Cap Export",
  siteTitle: "Forms Cap Export",
  theme: "__forms_cap_export_theme__",
});

const { LIMIT_KEYS, MAX_FORMS_PER_SITE } = await import("@widgetizer/core/adapters");
const { LocalLimitsAdapter } = await import("@widgetizer/adapters-local");
const { getDb } = await import("../db/index.js");
const exportRepo = await import("../db/repositories/exportRepository.js");

// One more distinct form than the default ceiling, so the default refuses it.
const FORM_NAMES = Array.from({ length: MAX_FORMS_PER_SITE + 1 }, (_, i) => `Form ${i + 1}`);

const formWidgets = (names) =>
  Object.fromEntries(
    names.map((name, i) => [
      `f${i}`,
      {
        type: "core-form",
        settings: { form_name: name },
        blocks: { b1: { type: "field", settings: { label: "Email", type: "email", required: true } } },
        blocksOrder: ["b1"],
      },
    ]),
  );

async function writePage(language, slug, name, widgets, extra = {}) {
  const dir = language ? path.join(getProjectPagesDir(PROJECT_FOLDER), language) : getProjectPagesDir(PROJECT_FOLDER);
  await fs.outputFile(
    path.join(dir, `${slug}.json`),
    JSON.stringify({
      id: slug,
      slug,
      name,
      uuid: `p-${language || "en"}-${slug}`,
      seo: { title: name },
      widgets,
      widgetsOrder: Object.keys(widgets),
      ...(language ? { language } : {}),
      ...extra,
    }),
  );
}

// A limits adapter that answers MAX_FORMS_PER_SITE with `answer` and records
// every call, so a test can see what the export asked for.
function limitsAnswering(answer) {
  const calls = [];
  return {
    calls,
    async getLimit(scope, key) {
      calls.push({ scope, key });
      if (key === LIMIT_KEYS.MAX_FORMS_PER_SITE) return answer;
      throw new Error(`unexpected limit key ${key}`);
    },
  };
}

async function exportWith(limits) {
  await resetExports();
  return runExport({}, limits ? { limits } : {});
}

async function manifestForms() {
  const dir = latestExportDir();
  const manifest = JSON.parse(await fs.readFile(path.join(dir, "widgetizer.forms.json"), "utf8"));
  return manifest.forms.map((form) => form.key);
}

const latestStatus = () => exportRepo.getExports(PROJECT_ID)[0]?.status;

before(async () => {
  await seedProjectScaffold();
  await writePage("", "index", "Home", formWidgets(FORM_NAMES));
});

after(async () => {
  await cleanup();
});

describe("the ceiling the limits adapter answers", () => {
  it("is asked for by key, with the project's scope", async () => {
    const limits = limitsAnswering(Infinity);
    const res = await exportWith(limits);

    assert.equal(res._status, 200, JSON.stringify(res._json));
    const formCalls = limits.calls.filter((call) => call.key === LIMIT_KEYS.MAX_FORMS_PER_SITE);
    assert.equal(formCalls.length, 1);
    assert.equal(formCalls[0].scope.projectId, PROJECT_ID);
    assert.equal(formCalls[0].scope.folderName, PROJECT_FOLDER);
  });

  it("lets every form through when the answer is Infinity", async () => {
    const res = await exportWith(limitsAnswering(Infinity));

    assert.equal(res._status, 200, JSON.stringify(res._json));
    assert.equal((await manifestForms()).length, FORM_NAMES.length);
  });

  // The standalone app's own adapter, end to end: OSS has no forms limit.
  it("lets every form through with the local adapter the standalone app uses", async () => {
    const res = await exportWith(new LocalLimitsAdapter(getDb()));

    assert.equal(res._status, 200, JSON.stringify(res._json));
    assert.equal((await manifestForms()).length, FORM_NAMES.length);
  });

  it("refuses the export when the site has more forms than a finite answer", async () => {
    const res = await exportWith(limitsAnswering(2));

    assert.equal(res._status, 400, JSON.stringify(res._json));
    assert.match(res._json.message, new RegExp(`${FORM_NAMES.length} distinct forms, more than the 2 limit`));
    assert.equal(latestStatus(), "failed");
  });
});

// No usable answer means the default ceiling, never "unlimited": a malformed
// answer from a host must not lift its own cap.
describe("the default ceiling when there is no usable answer", () => {
  const cases = [
    ["no limits adapter", null],
    ["an answer of 0", limitsAnswering(0)],
    ["a negative answer", limitsAnswering(-1)],
    ["NaN", limitsAnswering(Number.NaN)],
    ["a numeric string", limitsAnswering("100")],
    ["undefined", limitsAnswering(undefined)],
    ["null", limitsAnswering(null)],
  ];

  for (const [label, limits] of cases) {
    it(`applies ${MAX_FORMS_PER_SITE} for ${label}`, async () => {
      const res = await exportWith(limits);

      assert.equal(res._status, 400, JSON.stringify(res._json));
      assert.match(res._json.message, new RegExp(`more than the ${MAX_FORMS_PER_SITE} limit`));
    });
  }
});

// An adapter that cannot answer is an outage, not a policy: the export fails
// and is recorded as failed rather than falling back to the default ceiling.
describe("a limits adapter that throws", () => {
  it("fails the export and records the failure", async () => {
    const limits = {
      async getLimit() {
        throw new Error("limits service unavailable");
      },
    };
    const res = await exportWith(limits);

    assert.equal(res._status, 500, JSON.stringify(res._json));
    assert.match(res._json.message, /limits service unavailable/);
    assert.equal(latestStatus(), "failed");
  });
});

// Each language's copy of a form is its own submission stream, so each one
// takes its own place under a finite ceiling.
describe("translated forms under a finite ceiling", () => {
  before(async () => {
    projectRepo.updateProject(PROJECT_ID, { languages: ["el"] }, { seeded: true });
    await writePage("", "index", "Home", formWidgets(["Contact"]));
    await writePage("el", "index", "Arxiki", formWidgets(["Contact"]), { translationGroupId: "p-en-index" });
  });

  after(async () => {
    projectRepo.updateProject(PROJECT_ID, { languages: [] }, { seeded: true });
    await fs.remove(path.join(getProjectPagesDir(PROJECT_FOLDER), "el"));
    await writePage("", "index", "Home", formWidgets(FORM_NAMES));
  });

  it("counts the default form and its Greek copy as two", async () => {
    const res = await exportWith(limitsAnswering(1));

    assert.equal(res._status, 400, JSON.stringify(res._json));
    assert.match(res._json.message, /2 distinct forms, more than the 1 limit/);
  });

  it("fits both copies when the ceiling allows two", async () => {
    const res = await exportWith(limitsAnswering(2));

    assert.equal(res._status, 200, JSON.stringify(res._json));
    assert.deepEqual((await manifestForms()).sort(), ["contact", "el:contact"]);
  });
});

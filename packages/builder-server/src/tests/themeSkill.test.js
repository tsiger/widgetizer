/**
 * Theme-authoring skill (skills/widgetizer-theme).
 *
 * The skill ships to people who do not have this repository, so three things
 * must hold or it quietly teaches a Widgetizer that does not exist:
 *   - contract.json (the skill's authoring catalog) matches the app source,
 *   - the starter theme installs, becomes a project and exports through the
 *     real controllers,
 *   - the validator passes the starter and rejects invented tags, filters,
 *     setting types and settings.
 *
 * Run with: node --test packages/builder-server/src/tests/themeSkill.test.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const SKILL_DIR = path.join(REPO_ROOT, "skills", "widgetizer-theme");
const STARTER_DIR = path.join(SKILL_DIR, "assets", "starter-theme");
const VALIDATOR = path.join(REPO_ROOT, "scripts", "validate-theme.js");

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-theme-skill-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.THEMES_ROOT = path.join(TEST_ROOT, "themes");
process.env.NODE_ENV = "test";

const { getPublishDir } = await import("../config.js");
const { uploadTheme } = await import("../controllers/themeController.js");
const { createProject } = await import("../controllers/projectController.js");
const { exportProject } = await import("../controllers/exportController.js");
const exportRepo = await import("../db/repositories/exportRepository.js");
const { closeDb } = await import("../db/index.js");
const { LocalAssetStorageAdapter, LocalStorageAdapter } = await import("@widgetizer/adapters-local");
const AdmZip = (await import("adm-zip")).default;
const { buildContract, serializeContract, CONTRACT_PATH } =
  await import("../../../../scripts/build-theme-skill-contract.js");
const { validateTheme } = await import("../../../../scripts/validate-theme.js");

const THEME_ID = "skill-starter";

function mockReq({ params = {}, body = {}, file = null, scope } = {}) {
  return {
    params,
    body,
    file,
    headers: {},
    scope,
    app: { locals: {} },
    adapters: {
      assetStorage: new LocalAssetStorageAdapter({ dataRoot: TEST_DATA_DIR }),
      storage: new LocalStorageAdapter({ dataRoot: TEST_DATA_DIR }),
    },
    [Symbol.for("express-validator#contexts")]: [],
  };
}

function mockRes() {
  const res = {
    _status: 200,
    _json: null,
    headersSent: false,
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      res.headersSent = true;
      return res;
    },
    setHeader() {
      return res;
    },
  };
  return res;
}

/** Run the app's validator on a theme folder and return its JSON report. */
function validate(themeDir, { cli = false } = {}) {
  if (!cli) {
    const report = validateTheme(themeDir);
    return { ...report, exitCode: report.errors ? 1 : 0 };
  }
  const run = spawnSync(process.execPath, [VALIDATOR, themeDir, "--json"], { encoding: "utf8" });
  assert.ok(run.stdout.trim().startsWith("{"), `validator did not report JSON:\n${run.stdout}\n${run.stderr}`);
  return { ...JSON.parse(run.stdout), exitCode: run.status };
}

/** Copy the starter, apply one mistake, and return the validator's findings. */
async function findingsAfter(name, mutate) {
  const dir = path.join(TEST_ROOT, "mutations", name);
  await fs.copy(STARTER_DIR, dir);
  await mutate(dir);
  return validate(dir).findings;
}

async function edit(file, change) {
  await fs.writeFile(file, change(await fs.readFile(file, "utf8")));
}

async function editJson(file, change) {
  const json = await fs.readJson(file);
  change(json);
  await fs.writeJson(file, json, { spaces: 2 });
}

const hasError = (findings, rule) => findings.some((finding) => finding.level === "error" && finding.rule === rule);

before(async () => {
  await fs.ensureDir(TEST_DATA_DIR);
});

after(async () => {
  closeDb();
  await fs.remove(TEST_ROOT);
});

describe("theme skill contract", () => {
  it("contract.json matches the app source", async () => {
    const committed = (await fs.readFile(CONTRACT_PATH, "utf8")).replace(/\r\n/g, "\n").split("\n");
    const current = serializeContract(buildContract()).split("\n");
    // Name the first line that differs: the file is too long for a whole-string diff to be readable.
    const line = current.findIndex((text, index) => text !== committed[index]);
    assert.ok(
      line === -1 && current.length === committed.length,
      `skills/widgetizer-theme/references/contract.json is stale (line ${line + 1}: source has ${JSON.stringify(current[line])}, ` +
        `file has ${JSON.stringify(committed[line])}). Run: node scripts/build-theme-skill-contract.js`,
    );
  });
});

describe("theme skill starter theme", () => {
  it("passes the app's validator with nothing to report", () => {
    const report = validate(STARTER_DIR, { cli: true });
    assert.deepEqual(report.findings, []);
    assert.equal(report.exitCode, 0);
  });

  it("installs from a ZIP, becomes a project and exports a working site", async () => {
    const zip = new AdmZip();
    zip.addLocalFolder(STARTER_DIR, THEME_ID);
    const zipPath = path.join(TEST_DATA_DIR, "temp", "starter.zip");
    await fs.outputFile(zipPath, zip.toBuffer());

    const uploaded = mockRes();
    await uploadTheme(mockReq({ file: { path: zipPath, size: (await fs.stat(zipPath)).size } }), uploaded);
    assert.ok(uploaded._status < 300, `upload failed: ${JSON.stringify(uploaded._json)}`);

    const created = mockRes();
    await createProject(mockReq({ body: { name: "Starter Site", theme: THEME_ID } }), created);
    assert.equal(created._status, 201, JSON.stringify(created._json));
    const project = created._json;

    const exported = mockRes();
    const scope = { actor: { id: "default", kind: "local" }, projectId: project.id, folderName: project.folderName };
    await exportProject(mockReq({ params: { projectId: project.id }, scope }), exported);
    assert.equal(exported._status, 200, `export failed: ${JSON.stringify(exported._json)}`);

    const outputDir = exportRepo.getExports(project.id)[0].outputDir;
    const siteDir = path.isAbsolute(outputDir) ? outputDir : path.join(getPublishDir(), outputDir);
    const html = await fs.readFile(path.join(siteDir, "index.html"), "utf8");

    // Layout, global widgets, page widgets and blocks all rendered.
    assert.match(html, /data-widget-type="header"/);
    assert.match(html, /data-widget-type="hero"/);
    assert.match(html, /data-widget-type="accordion"/);
    assert.match(html, /data-widget-type="footer"/);
    assert.equal(html.match(/data-block-id="/g)?.length, 2);
    assert.match(html, /<h1[^>]*>\s*A clear headline for this page\s*<\/h1>/);
    // The starter menu resolved and rendered through the core snippet.
    assert.match(html, /site-nav__link[^>]*>\s*Home\s*</);
    // Visitor strings resolved rather than falling back to the key's last word.
    assert.match(html, /Skip to main content/);
    // Theme settings reached CSS, and the icon snippet inlined its SVG.
    assert.match(html, /--colors-accent:\s*#1f5fe0/);
    assert.match(html, /<svg\s+class="icon accordion__icon"/);

    // Shared and widget-local assets were all copied into the export.
    for (const asset of ["base.css", "theme.js", "hero.css", "accordion.css", "accordion.js"]) {
      assert.ok(await fs.pathExists(path.join(siteDir, "assets", asset)), `missing assets/${asset}`);
      assert.ok(html.includes(asset), `index.html does not load ${asset}`);
    }
  });
});

describe("bundled themes follow the rules the skill teaches", () => {
  it("Arch has no validator errors, in the theme or in any preset", () => {
    const errors = validate(path.join(REPO_ROOT, "themes", "arch")).findings.filter(
      (finding) => finding.level === "error",
    );
    assert.deepEqual(
      errors.map((finding) => `${finding.file}: [${finding.rule}] ${finding.message}`),
      [],
      "Run: npm run validate:theme -- themes/arch",
    );
  });
});

describe("theme skill validator catches invented theme features", () => {
  const widget = (dir, ...parts) => path.join(dir, "widgets", ...parts);

  it("a Shopify schema tag", async () => {
    const findings = await findingsAfter("schema-tag", (dir) =>
      edit(
        widget(dir, "hero", "widget.liquid"),
        (source) => `${source}\n{% schema %}{ "name": "Hero" }{% endschema %}\n`,
      ),
    );
    assert.ok(hasError(findings, "unknown-tag"), JSON.stringify(findings));
  });

  it("a filter the engine does not have", async () => {
    const findings = await findingsAfter("asset-url", (dir) =>
      edit(path.join(dir, "layout.liquid"), (source) =>
        source.replace("{% asset src: 'base.css' %}", `<link rel="stylesheet" href="{{ 'base.css' | asset_url }}">`),
      ),
    );
    assert.ok(hasError(findings, "unknown-filter"), JSON.stringify(findings));
  });

  it("a setting type the editor does not have", async () => {
    const findings = await findingsAfter("toggle", (dir) =>
      editJson(widget(dir, "hero", "schema.json"), (schema) => {
        schema.settings.push({ type: "toggle", id: "full_width", label: "Full width", default: false });
      }),
    );
    assert.ok(hasError(findings, "unknown-setting-type"), JSON.stringify(findings));
  });

  it("a video setting whose default is not an uploaded MP4", async () => {
    const accepted = await findingsAfter("video-ok", (dir) =>
      editJson(widget(dir, "hero", "schema.json"), (schema) => {
        schema.settings.push({ type: "video", id: "clip", label: "Clip", default: "" });
      }),
    );
    assert.ok(!hasError(accepted, "unknown-setting-type"), JSON.stringify(accepted));
    assert.ok(!hasError(accepted, "setting-default"), JSON.stringify(accepted));

    for (const [name, value] of [
      ["video-url", "https://www.youtube.com/watch?v=x"],
      ["video-mp3", "/uploads/files/song.mp3"],
      ["video-object", { src: "/uploads/files/clip.mp4" }],
    ]) {
      const findings = await findingsAfter(name, (dir) =>
        editJson(widget(dir, "hero", "schema.json"), (schema) => {
          schema.settings.push({ type: "video", id: "clip", label: "Clip", default: value });
        }),
      );
      assert.ok(hasError(findings, "setting-default"), `${name}: ${JSON.stringify(findings)}`);
    }
  });

  it("a tag argument the tag does not read", async () => {
    const findings = await findingsAfter("image-width", (dir) =>
      edit(widget(dir, "hero", "widget.liquid"), (source) =>
        source.replaceAll("size: 'large',", "size: 'large', width: 800,"),
      ),
    );
    assert.ok(hasError(findings, "unknown-tag-argument"), JSON.stringify(findings));
  });

  it("a setting read in the template but missing from the schema", async () => {
    const findings = await findingsAfter("undeclared-setting", (dir) =>
      edit(widget(dir, "hero", "widget.liquid"), (source) => `${source}\n<p>{{ widget.settings.subtitle }}</p>\n`),
    );
    assert.ok(hasError(findings, "unknown-setting"), JSON.stringify(findings));
  });

  it("raw output of a plain text setting", async () => {
    const findings = await findingsAfter("raw-text", (dir) =>
      edit(widget(dir, "hero", "widget.liquid"), (source) =>
        source.replaceAll("{{ widget.settings.heading }}", "{{ widget.settings.heading | raw }}"),
      ),
    );
    assert.ok(hasError(findings, "raw-on-plain-text"), JSON.stringify(findings));
  });

  it("a widget without the attribute the editor selects it by", async () => {
    const findings = await findingsAfter("no-widget-id", (dir) =>
      edit(widget(dir, "hero", "widget.liquid"), (source) => source.replace('data-widget-id="{{ widget.id }}"', "")),
    );
    assert.ok(hasError(findings, "editor-attributes"), JSON.stringify(findings));
  });

  it("objects from another platform", async () => {
    const findings = await findingsAfter("section-object", (dir) =>
      edit(widget(dir, "hero", "widget.liquid"), (source) => `${source}\n<p>{{ section.settings.heading }}</p>\n`),
    );
    assert.ok(hasError(findings, "foreign-object"), JSON.stringify(findings));
  });

  it("a snippet, a visitor string and a theme setting that do not exist", async () => {
    const findings = await findingsAfter("missing-references", (dir) =>
      edit(
        widget(dir, "hero", "widget.liquid"),
        (source) => `${source}\n{% render 'button' %}{{ 'site.hero.scroll' | t }}{{ theme.colors.primary }}\n`,
      ),
    );
    assert.ok(hasError(findings, "missing-snippet"), JSON.stringify(findings));
    assert.ok(hasError(findings, "unknown-translation-key"), JSON.stringify(findings));
    assert.ok(hasError(findings, "unknown-theme-setting"), JSON.stringify(findings));
  });

  it("a font that is not in the catalog", async () => {
    const findings = await findingsAfter("font", (dir) =>
      editJson(path.join(dir, "theme.json"), (manifest) => {
        manifest.settings.global.typography[0].default = { stack: '"Comic Sans", cursive', weight: 400 };
      }),
    );
    assert.ok(hasError(findings, "setting-default"), JSON.stringify(findings));
  });

  it("a starter page built from sections, unknown widgets and unknown settings", async () => {
    const sections = await findingsAfter("page-sections", (dir) =>
      editJson(path.join(dir, "templates", "index.json"), (page) => {
        page.sections = page.widgets;
        page.order = page.widgetsOrder;
      }),
    );
    assert.ok(hasError(sections, "template-shape"), JSON.stringify(sections));

    const unknown = await findingsAfter("page-unknowns", (dir) =>
      editJson(path.join(dir, "templates", "index.json"), (page) => {
        page.widgets.quotes = { type: "testimonials", settings: {} };
        page.widgetsOrder.push("quotes");
        page.widgets.hero.settings.subheading = "Not a hero setting";
        page.widgets.faq.blocks["faq-1"].type = "question";
      }),
    );
    assert.ok(hasError(unknown, "unknown-widget-type"), JSON.stringify(unknown));
    assert.ok(hasError(unknown, "unknown-setting"), JSON.stringify(unknown));
    assert.ok(hasError(unknown, "unknown-block-type"), JSON.stringify(unknown));
  });

  it("two files that would overwrite each other on export", async () => {
    const findings = await findingsAfter("asset-collision", (dir) =>
      fs.copy(widget(dir, "hero", "hero.css"), path.join(dir, "assets", "hero.css")),
    );
    assert.ok(hasError(findings, "asset-name-collision"), JSON.stringify(findings));
  });
});

describe("app-owned theme validation", () => {
  it("rejects malformed Liquid, including inside nested tags and liquid blocks", async () => {
    for (const [name, source] of [
      ["unclosed-if", "{% if true %}"],
      ["nested-filter", "{% if true %}{{ 'hello' | invented_filter }}{% endif %}"],
      ["liquid-filter", "{% liquid\nassign title = 'hello' | invented_filter\necho title\n%}"],
    ]) {
      const findings = await findingsAfter(name, (dir) =>
        edit(path.join(dir, "widgets/hero/widget.liquid"), (text) => `${text}\n${source}`),
      );
      assert.ok(
        hasError(findings, name === "unclosed-if" ? "liquid-syntax" : "unknown-filter"),
        JSON.stringify(findings),
      );
    }
  });

  it("respects Liquid locals, loop scope, raw blocks and comments", async () => {
    const findings = await findingsAfter("valid-liquid", (dir) =>
      edit(
        path.join(dir, "widgets/hero/widget.liquid"),
        (text) => `${text}
{% assign settings = widget.settings %}{{ settings.heading }}
{% for section in widget.blocksOrder %}{{ section }}{% endfor %}
{% raw %}{% invented_tag %}{{ shop.name | invented_filter }}{% endraw %}
{% comment %}{{ section.settings.heading }}{% endcomment %}
{% liquid
assign local_title = widget.settings.heading
echo local_title
%}`,
      ),
    );
    assert.deepEqual(findings, []);
  });

  it("checks literal bracket references and echo output against this widget's schema", async () => {
    const findings = await findingsAfter("bracket-setting", (dir) =>
      edit(
        path.join(dir, "widgets/hero/widget.liquid"),
        (text) => `${text}
{{ widget.settings['subtitle'] }}
{% echo widget.settings['heading'] | raw %}
{% image src: widget.settings['missing_image'] %}`,
      ),
    );
    assert.ok(hasError(findings, "unknown-setting"), JSON.stringify(findings));
    assert.ok(
      findings.some((finding) => finding.message.includes("missing_image")),
      JSON.stringify(findings),
    );
    assert.ok(hasError(findings, "raw-on-plain-text"), JSON.stringify(findings));
  });

  it("accepts an asset's query and fragment and comma-free Liquid arguments", async () => {
    const findings = await findingsAfter("valid-asset", async (dir) => {
      await edit(path.join(dir, "layout.liquid"), (text) =>
        text.replace("src: 'base.css'", "src: 'base.css?mode=compact#sheet'"),
      );
      await edit(path.join(dir, "widgets/hero/widget.liquid"), (text) =>
        text.replaceAll("size: 'large', srcset: true,", "size: 'large' srcset: true"),
      );
    });
    assert.deepEqual(findings, []);
  });

  it("rejects JSON documents with non-object roots", async () => {
    for (const [name, file, value] of [
      ["manifest-array", "theme.json", "[]"],
      ["page-null", "templates/index.json", "null"],
      ["menu-string", "menus/main-menu.json", '"menu"'],
    ]) {
      const findings = await findingsAfter(name, (dir) => fs.writeFile(path.join(dir, file), value));
      assert.ok(hasError(findings, "json-shape"), JSON.stringify(findings));
    }
  });

  it("reports malformed table columns as JSON instead of crashing", async () => {
    const dir = path.join(TEST_ROOT, "mutations/table-columns");
    await fs.copy(STARTER_DIR, dir);
    await editJson(path.join(dir, "widgets/hero/schema.json"), (schema) => {
      schema.settings.push({ type: "table", id: "rows", label: "Rows", columns: {}, default: [] });
    });
    const report = validate(dir, { cli: true });
    assert.equal(report.exitCode, 1);
    assert.ok(hasError(report.findings, "table-columns"));
    assert.ok(!hasError(report.findings, "validation-failed"));
  });

  it("supports a new widget and author-chosen setting names", async () => {
    const findings = await findingsAfter("new-widget", async (dir) => {
      await fs.move(path.join(dir, "widgets/hero"), path.join(dir, "widgets/introduction"));
      await editJson(path.join(dir, "widgets/introduction/schema.json"), (schema) => {
        schema.type = "introduction";
        schema.settings.find((setting) => setting.id === "heading").id = "slogan";
      });
      await edit(path.join(dir, "widgets/introduction/widget.liquid"), (text) =>
        text
          .replaceAll("widget.settings.heading", "widget.settings.slogan")
          .replaceAll('data-setting="heading"', 'data-setting="slogan"'),
      );
      await editJson(path.join(dir, "templates/index.json"), (page) => {
        page.widgets.hero.type = "introduction";
        page.widgets.hero.settings.slogan = page.widgets.hero.settings.heading;
        delete page.widgets.hero.settings.heading;
      });
    });
    assert.deepEqual(findings, []);
  });

  it("uses the complete core widget schema to reject unsupported option values", async () => {
    const findings = await findingsAfter("core-option", (dir) =>
      editJson(path.join(dir, "templates/index.json"), (page) => {
        page.widgets.contact = { type: "core-form", settings: { style: "invented" } };
        page.widgetsOrder.push("contact");
      }),
    );
    assert.ok(hasError(findings, "setting-value"), JSON.stringify(findings));
  });

  it("uses the app's collection-schema rules", async () => {
    const findings = await findingsAfter("collection-schema", (dir) =>
      fs.outputJson(path.join(dir, "collection-types/posts/schema.json"), {
        type: "posts",
        settings: [{ id: "title", type: "text", label: "Title" }],
      }),
    );
    assert.ok(
      findings.some((finding) => finding.rule === "collection-schema" && finding.message.includes("usedAsTitle")),
      JSON.stringify(findings),
    );
  });

  it("rejects duplicate order entries", async () => {
    const findings = await findingsAfter("duplicate-order", (dir) =>
      editJson(path.join(dir, "templates/index.json"), (page) => page.widgetsOrder.push("hero")),
    );
    assert.ok(hasError(findings, "template-shape"), JSON.stringify(findings));
  });

  it("checks each preset's settings and starter pages", async () => {
    const findings = await findingsAfter("presets", async (dir) => {
      await fs.outputJson(path.join(dir, "presets/presets.json"), {
        default: "light",
        presets: [
          { id: "light", name: "Light" },
          { id: "dark", name: "Dark" },
        ],
      });
      await fs.outputJson(path.join(dir, "presets/light/preset.json"), { settings: { background: "#ffffff" } });
      await fs.outputJson(path.join(dir, "presets/dark/preset.json"), { settings: { background: false } });
      await fs.copy(path.join(dir, "templates"), path.join(dir, "presets/dark/templates"));
      await editJson(path.join(dir, "presets/dark/templates/index.json"), (page) => {
        page.widgets.hero.settings.unknown = "Unsupported";
      });
    });
    assert.ok(
      findings.some((finding) => finding.file === "presets/dark/preset.json" && finding.rule === "setting-value"),
    );
    assert.ok(
      findings.some(
        (finding) => finding.file === "presets/dark/templates/index.json" && finding.rule === "unknown-setting",
      ),
    );
    assert.ok(!findings.some((finding) => finding.file.startsWith("presets/light/")));
  });

  it("keeps separate validation calls independent", () => {
    const first = validateTheme(STARTER_DIR);
    first.findings.push({ level: "error", message: "caller-owned result" });
    assert.deepEqual(validateTheme(STARTER_DIR).findings, []);
  });
});

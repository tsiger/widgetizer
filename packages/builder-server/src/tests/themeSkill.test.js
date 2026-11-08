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
import path from "node:path";
import os from "node:os";
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

  it("settings the app reads by id, moved to groups of the author's choosing", async () => {
    const moved = await findingsAfter("moved-reserved", (dir) =>
      editJson(path.join(dir, "theme.json"), (manifest) => {
        const { typography, advanced, ...rest } = manifest.settings.global;
        manifest.settings.global = { ...rest, brand: typography, code: advanced };
      }),
    );
    assert.deepEqual(
      moved.filter((f) => f.rule !== "group-name"),
      [],
    );

    const untagged = await findingsAfter("moved-reserved-untagged", async (dir) => {
      await editJson(path.join(dir, "theme.json"), (manifest) => {
        const { advanced, ...rest } = manifest.settings.global;
        manifest.settings.global = { ...rest, code: advanced };
      });
      await edit(path.join(dir, "layout.liquid"), (source) => source.replace("{% custom_css %}", ""));
    });
    assert.ok(
      untagged.some((f) => f.level === "warning" && f.rule === "layout" && f.message.includes("custom_css")),
      JSON.stringify(untagged),
    );
  });

  it("a setting id repeated across groups is a warning, not an error", async () => {
    const findings = await findingsAfter("duplicate-id", (dir) =>
      editJson(path.join(dir, "theme.json"), (manifest) => {
        manifest.settings.global.extra = [manifest.settings.global.advanced[0]];
      }),
    );
    assert.ok(
      findings.some((f) => f.level === "warning" && f.rule === "duplicate-setting-id"),
      JSON.stringify(findings),
    );
    assert.ok(!findings.some((f) => f.level === "error"), JSON.stringify(findings));
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

  it("warns about an item-page prefix shaped like a language code", async () => {
    const schema = (type, extra) => ({
      type,
      hasItemPages: true,
      settings: [{ id: "title", type: "text", label: "Title", usedAsTitle: true }],
      ...extra,
    });
    const collection = async (dir, folder, json) => {
      await fs.outputJson(path.join(dir, `collection-types/${folder}/schema.json`), json);
      await fs.outputFile(path.join(dir, `collection-types/${folder}/template.liquid`), "{{ item.title }}");
    };
    const findings = await findingsAfter("language-prefix", async (dir) => {
      await collection(dir, "services", schema("services", { slugPrefix: "it" }));
      // The prefix defaults to the type, so a two-letter type is shaped like a code too.
      await collection(dir, "me", schema("me"));
      await collection(dir, "pt-br-work", schema("pt-br-work", { slugPrefix: "pt-br" }));
      await collection(dir, "work", schema("work"));
      await collection(dir, "zh-hant-work", schema("zh-hant-work", { slugPrefix: "zh-hant" }));
      // Codes no site can add: a numeric region, and a right-to-left language.
      await collection(dir, "es-419-work", schema("es-419-work", { slugPrefix: "es-419" }));
      await collection(dir, "ar-work", schema("ar-work", { slugPrefix: "ar" }));
      // Shaped like a code, but no real region or script follows the hyphen.
      await collection(dir, "my-work", schema("my-work"));
      await collection(dir, "ai-tools", schema("ai-tools"));
      // A list-only collection writes no pages, so its prefix is never a folder.
      await collection(dir, "de", { ...schema("de"), hasItemPages: false });
    });
    const flagged = findings
      .filter((f) => f.level === "warning" && f.rule === "collection-prefix" && f.message.includes("language code"))
      .map((f) => f.file)
      .sort();
    assert.deepEqual(
      flagged,
      ["me", "pt-br-work", "services", "zh-hant-work"].map((folder) => `collection-types/${folder}/schema.json`),
      JSON.stringify(findings),
    );
  });

  it("warns about an item-page prefix where a split homepage publishes its copies", async () => {
    const findings = await findingsAfter("page-prefix", async (dir) => {
      await fs.outputJson(path.join(dir, "collection-types/info/schema.json"), {
        type: "info",
        hasItemPages: true,
        slugPrefix: "page",
        settings: [{ id: "title", type: "text", label: "Title", usedAsTitle: true }],
      });
      await fs.outputFile(path.join(dir, "collection-types/info/template.liquid"), "{{ item.title }}");
    });
    assert.ok(
      findings.some(
        (f) =>
          f.level === "warning" &&
          f.file === "collection-types/info/schema.json" &&
          f.rule === "collection-prefix" &&
          f.message.includes("page/2.html"),
      ),
      JSON.stringify(findings),
    );
  });

  it("still reports a collection's labels when the theme has no English strings", async () => {
    const findings = await findingsAfter("no-english", async (dir) => {
      await fs.remove(path.join(dir, "locales/en.json"));
      await fs.outputJson(path.join(dir, "collection-types/work/schema.json"), {
        type: "work",
        displayName: "tTheme:collections.work",
        settings: [{ id: "title", type: "text", label: "Title", usedAsTitle: true }],
      });
    });
    assert.ok(
      findings.some((f) => f.rule === "unknown-label-key" && f.file === "collection-types/work/schema.json"),
      JSON.stringify(findings),
    );
  });

  describe("collections an update brings in", () => {
    const schema = (type, extra) => ({
      type,
      hasItemPages: true,
      settings: [{ id: "title", type: "text", label: "Title", usedAsTitle: true }],
      ...extra,
    });
    const collection = async (dir, folder, json, { template = true } = {}) => {
      if (json) await fs.outputJson(path.join(dir, `collection-types/${folder}/schema.json`), json);
      if (template)
        await fs.outputFile(path.join(dir, `collection-types/${folder}/template.liquid`), "{{ item.title }}");
    };
    // An update folder over the starter's 1.0.0 base.
    const update = async (dir, version, build) => {
      const versionDir = path.join(dir, "updates", version);
      const manifest = await fs.readJson(path.join(dir, "theme.json"));
      await fs.outputJson(path.join(versionDir, "theme.json"), { ...manifest, version });
      await build(versionDir);
    };
    const prefixFindings = (findings) =>
      findings.filter(
        (f) => f.rule === "collection-prefix" || f.rule === "required-file" || f.rule === "unknown-label-key",
      );

    it("checks an update's collection like the theme's own", async () => {
      const findings = await findingsAfter("update-collection", async (dir) => {
        await collection(dir, "work", schema("work"));
        await update(dir, "1.1.0", async (versionDir) => {
          await collection(versionDir, "services", schema("services", { slugPrefix: "it" }));
          await collection(versionDir, "team", schema("team", { slugPrefix: "work" }));
          await collection(versionDir, "blog", schema("blog"), { template: false });
        });
      });
      const file = (folder, name = "schema.json") => `updates/1.1.0/collection-types/${folder}/${name}`;
      const found = prefixFindings(findings).map((f) => [f.level, f.file, f.rule]);
      assert.deepEqual(
        found.sort(),
        [
          ["error", file("blog", "template.liquid"), "required-file"],
          ["error", file("team"), "collection-prefix"],
          ["warning", file("services"), "collection-prefix"],
        ].sort(),
        JSON.stringify(findings),
      );
    });

    it("checks what the updates leave once layered: later versions win and deleted/ removes", async () => {
      const findings = await findingsAfter("update-layering", async (dir) => {
        await collection(dir, "work", schema("work"));
        await update(dir, "1.1.0", async (versionDir) => {
          await collection(versionDir, "services", schema("services", { slugPrefix: "it" }));
          await collection(versionDir, "events", schema("events", { slugPrefix: "me" }));
        });
        await update(dir, "1.2.0", async (versionDir) => {
          // Fixes 1.1.0's services prefix and drops its events collection.
          await collection(versionDir, "services", schema("services", { slugPrefix: "services" }), { template: false });
          await fs.ensureDir(path.join(versionDir, "deleted/collection-types/events"));
          // Removes the theme's own work template while work keeps item pages.
          await fs.outputFile(path.join(versionDir, "deleted/collection-types/work/template.liquid"), "");
        });
      });
      assert.deepEqual(
        prefixFindings(findings).map((f) => [f.level, f.file, f.rule]),
        [["error", "updates/1.2.0/deleted/collection-types/work/template.liquid", "required-file"]],
        JSON.stringify(findings),
      );
    });

    it("needs a schema in every collection folder that survives the updates", async () => {
      const findings = await findingsAfter("update-empty-folders", async (dir) => {
        await collection(dir, "work", schema("work"));
        await update(dir, "1.1.0", async (versionDir) => {
          await fs.ensureDir(path.join(versionDir, "collection-types/empty"));
          // Each file removed on its own: the folder itself stays.
          await fs.outputFile(path.join(versionDir, "deleted/collection-types/work/schema.json"), "");
          await fs.outputFile(path.join(versionDir, "deleted/collection-types/work/template.liquid"), "");
        });
      });
      assert.deepEqual(
        prefixFindings(findings)
          .map((f) => [f.file, f.rule])
          .sort(),
        [
          ["updates/1.1.0/collection-types/empty", "required-file"],
          ["updates/1.1.0/deleted/collection-types/work/schema.json", "required-file"],
        ],
        JSON.stringify(findings),
      );
    });

    it("refuses an update file where the theme has a folder, which the app cannot apply", async () => {
      const findings = await findingsAfter("update-file-over-folder", async (dir) => {
        await collection(dir, "work", schema("work"));
        await update(dir, "1.1.0", (versionDir) => fs.outputFile(path.join(versionDir, "collection-types/work"), ""));
        await update(dir, "1.2.0", (versionDir) => fs.outputFile(path.join(versionDir, "collection-types"), ""));
      });
      assert.deepEqual(
        findings
          .filter((f) => f.rule === "updates")
          .map((f) => f.file)
          .sort(),
        ["updates/1.1.0/collection-types/work", "updates/1.2.0/collection-types"],
        JSON.stringify(findings),
      );
    });

    it("reads deeper deletion markers as removing only that deeper path", async () => {
      const findings = await findingsAfter("update-deep-marker", async (dir) => {
        await collection(dir, "work", schema("work"));
        await update(dir, "1.1.0", (versionDir) =>
          fs.outputFile(path.join(versionDir, "deleted/collection-types/work/template.liquid/child"), ""),
        );
      });
      assert.deepEqual(prefixFindings(findings), [], JSON.stringify(findings));
    });

    it("rechecks the theme's own labels against English strings an update replaces", async () => {
      const findings = await findingsAfter("update-locale-only", async (dir) => {
        const english = await fs.readJson(path.join(dir, "locales/en.json"));
        await fs.outputJson(path.join(dir, "locales/en.json"), { ...english, collections: { work: "Work" } });
        await collection(dir, "work", schema("work", { displayName: "tTheme:collections.work" }));
        await update(dir, "1.1.0", (versionDir) =>
          // Not valid JSON, but 1.2.0 replaces it, so it is never what a project gets.
          fs.outputFile(path.join(versionDir, "locales/en.json"), "{ broken"),
        );
        await update(dir, "1.2.0", (versionDir) => fs.outputJson(path.join(versionDir, "locales/en.json"), english));
      });
      assert.deepEqual(
        findings.filter((f) => f.level === "error").map((f) => [f.file, f.rule]),
        [["updates/1.2.0/locales/en.json", "unknown-label-key"]],
        JSON.stringify(findings),
      );
    });

    // Permission bits only lock a folder for an ordinary user on a POSIX system:
    // Windows ignores them and root reads through them, so the test would prove nothing there.
    const cannotLockFolders = process.platform === "win32" || process.getuid?.() === 0;
    it("reports a deletion folder it cannot read and checks the rest", { skip: cannotLockFolders }, async () => {
      const locked = path.join(TEST_ROOT, "mutations", "update-unreadable", "updates/1.1.0/deleted/assets/locked");
      try {
        const findings = await findingsAfter("update-unreadable", async (dir) => {
          await update(dir, "1.1.0", async (versionDir) => {
            await fs.outputFile(path.join(versionDir, "deleted/assets/locked/old.css"), "");
            await fs.chmod(path.join(versionDir, "deleted/assets/locked"), 0o000);
            await collection(versionDir, "services", schema("services", { slugPrefix: "it" }));
          });
        });
        assert.deepEqual(
          findings.filter((f) => f.rule === "unreadable-file").map((f) => f.file),
          ["updates/1.1.0/deleted/assets/locked"],
          JSON.stringify(findings),
        );
        assert.ok(
          findings.some((f) => f.rule === "collection-prefix" && f.file.endsWith("services/schema.json")),
          JSON.stringify(findings),
        );
      } finally {
        // Unlocked, or the suite's cleanup cannot remove it.
        await fs.chmod(locked, 0o755).catch(() => {});
      }
    });

    it("checks the Liquid of a template an update brings in", async () => {
      const findings = await findingsAfter("update-template-liquid", async (dir) => {
        await collection(dir, "work", schema("work"));
        await update(dir, "1.1.0", (versionDir) =>
          // Only the template changes; the schema stays the theme's own.
          fs.outputFile(path.join(versionDir, "collection-types/work/template.liquid"), "{% if item.title %}unclosed"),
        );
      });
      assert.ok(
        findings.some((f) => f.level === "error" && f.file === "updates/1.1.0/collection-types/work/template.liquid"),
        JSON.stringify(findings),
      );
    });

    it("refuses an update folder where a collection's schema or template is a file", async () => {
      const findings = await findingsAfter("update-folder-over-file", async (dir) => {
        await collection(dir, "work", schema("work"));
        await update(dir, "1.1.0", (versionDir) =>
          fs.outputFile(path.join(versionDir, "collection-types/work/schema.json/child"), ""),
        );
      });
      assert.deepEqual(
        findings.filter((f) => f.rule === "updates").map((f) => f.file),
        ["updates/1.1.0/collection-types/work/schema.json"],
        JSON.stringify(findings),
      );
    });

    it("skips update folders at or below the base, which the app never applies", async () => {
      const findings = await findingsAfter("update-at-base", async (dir) => {
        await update(dir, "1.0.0", (versionDir) =>
          collection(versionDir, "services", schema("services", { slugPrefix: "it" })),
        );
        await update(dir, "0.9.0", (versionDir) =>
          collection(versionDir, "events", schema("events", { slugPrefix: "me" })),
        );
      });
      assert.deepEqual(prefixFindings(findings), [], JSON.stringify(findings));
    });

    it("resolves an updated collection's labels against the updated English strings", async () => {
      const findings = await findingsAfter("update-labels", async (dir) => {
        await update(dir, "1.1.0", async (versionDir) => {
          await collection(versionDir, "services", schema("services", { displayName: "tTheme:collections.services" }));
          const english = await fs.readJson(path.join(dir, "locales/en.json"));
          await fs.outputJson(path.join(versionDir, "locales/en.json"), {
            ...english,
            collections: { services: "Services" },
          });
          await collection(versionDir, "events", schema("events", { displayName: "tTheme:collections.events" }));
        });
      });
      assert.deepEqual(
        prefixFindings(findings).map((f) => [f.file, f.rule]),
        [["updates/1.1.0/collection-types/events/schema.json", "unknown-label-key"]],
        JSON.stringify(findings),
      );
    });
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

describe("shared areas in a theme", () => {
  const declare = (dir, areas = [{ id: "before_footer", label: "Before footer" }]) =>
    editJson(path.join(dir, "theme.json"), (json) => {
      json.sharedAreas = areas;
    });
  const place = (dir, output = "{{ shared_areas.before_footer | raw }}") =>
    edit(path.join(dir, "layout.liquid"), (text) => text.replace("{{ footer | raw }}", `${output}\n    {{ footer | raw }}`));
  const startWith = (dir, area) => fs.outputJson(path.join(dir, "templates/global/areas/before_footer.json"), area);
  const rulesOf = (findings) => findings.map((finding) => `${finding.level}:${finding.rule}`);

  it("accepts a declared, placed area with valid starting content", async () => {
    const findings = await findingsAfter("area-valid", async (dir) => {
      await declare(dir);
      await place(dir);
      await startWith(dir, { widgets: { w1: { type: "hero", settings: {} } }, widgetsOrder: ["w1"] });
    });
    assert.deepEqual(findings, []);
  });

  it("refuses an area order that names a widget twice, as a page's", async () => {
    const findings = await findingsAfter("area-repeat", async (dir) => {
      await declare(dir);
      await place(dir);
      await startWith(dir, { widgets: { w1: { type: "hero", settings: {} } }, widgetsOrder: ["w1", "w1"] });
    });
    assert.ok(hasError(findings, "template-shape"), JSON.stringify(findings));
  });

  it("refuses a bad declaration", async () => {
    const findings = await findingsAfter("area-bad-id", (dir) => declare(dir, [{ id: "Before-Footer", label: "x" }]));
    assert.ok(hasError(findings, "shared-areas"), JSON.stringify(findings));
  });

  it("warns when a declared area is never placed, or the layout places an undeclared one", async () => {
    const unplaced = await findingsAfter("area-unplaced", (dir) => declare(dir));
    assert.deepEqual(rulesOf(unplaced), ["warning:shared-areas"]);
    const undeclared = await findingsAfter("area-undeclared", (dir) => place(dir));
    assert.deepEqual(rulesOf(undeclared), ["warning:shared-areas"]);
  });

  it("requires | raw when the layout prints an area", async () => {
    const findings = await findingsAfter("area-not-raw", async (dir) => {
      await declare(dir);
      await place(dir, "{{ shared_areas.before_footer }}");
    });
    assert.ok(hasError(findings, "layout-raw"), JSON.stringify(findings));
  });

  it("refuses a form or a page-only listing role in starting content, and checks widgets like a page's", async () => {
    for (const [name, widget, rule] of [
      ["area-form", { type: "core-form", settings: {} }, "shared-areas"],
      ["area-role", { type: "hero", settings: { paginate: true } }, "shared-areas"],
      ["area-unknown", { type: "invented", settings: {} }, "unknown-widget-type"],
    ]) {
      const findings = await findingsAfter(name, async (dir) => {
        await declare(dir);
        await place(dir);
        await startWith(dir, { widgets: { w1: widget }, widgetsOrder: ["w1"] });
      });
      assert.ok(hasError(findings, rule), `${name}: ${JSON.stringify(findings)}`);
    }
  });
});

// Widget and block ids become HTML ids, the preview's data-widget-id lookups and
// text in themes' own CSS and scripts: a letter or digit, then letters, digits,
// `_` and `-`, at most 128 characters, never a built-in property name, and never
// `header`/`footer` for a page or area widget. Templates are where readable ids
// reach sites, so the checker holds them to it.
describe("widget and block ids in templates", () => {
  const index = (dir) => path.join(dir, "templates/index.json");
  const rename = (widgets, from, to) => {
    const out = {};
    for (const [id, widget] of Object.entries(widgets)) out[id === from ? to : id] = widget;
    return out;
  };
  const renameWidget = (dir, from, to) =>
    editJson(index(dir), (page) => {
      page.widgets = rename(page.widgets, from, to);
      page.widgetsOrder = page.widgetsOrder.map((id) => (id === from ? to : id));
    });
  const errorsOf = (findings, rule) => findings.filter((finding) => finding.level === "error" && finding.rule === rule);

  for (const [name, id] of [
    ["header", "header"],
    ["footer", "footer"],
    ["built-in", "constructor"],
    ["spaced", "hero banner"],
    ["dotted", "hero.banner"],
    ["leading-underscore", "_hero"],
    ["long", "h".repeat(129)],
  ]) {
    it(`refuses a page widget id that breaks the rule (${name})`, async () => {
      const findings = await findingsAfter(`widget-id-${name}`, (dir) => renameWidget(dir, "hero", id));
      assert.ok(errorsOf(findings, "widget-id").length > 0, JSON.stringify(findings));
    });
  }

  it("refuses an order entry that breaks the rule, even with no widget behind it", async () => {
    const findings = await findingsAfter("widget-id-order", (dir) =>
      editJson(index(dir), (page) => {
        page.widgetsOrder.push("bad id");
      }),
    );
    assert.ok(errorsOf(findings, "widget-id").some((finding) => finding.message.includes('"bad id"')), JSON.stringify(findings));
  });

  it("refuses a block id that breaks the rule, in the map or the order", async () => {
    const findings = await findingsAfter("block-id", (dir) =>
      editJson(index(dir), (page) => {
        page.widgets.faq.blocks = rename(page.widgets.faq.blocks, "faq-1", "faq 1");
        page.widgets.faq.blocksOrder = page.widgets.faq.blocksOrder.map((id) => (id === "faq-1" ? "faq 1" : id));
        page.widgets.faq.blocksOrder.push("toString");
      }),
    );
    const messages = errorsOf(findings, "widget-id").map((finding) => finding.message);
    assert.ok(messages.some((message) => message.includes('"faq 1"')), JSON.stringify(findings));
    assert.ok(messages.some((message) => message.includes('"toString"')), JSON.stringify(findings));
  });

  it("reports an order entry that isn't a string instead of failing", async () => {
    const findings = await findingsAfter("widget-id-object", (dir) =>
      editJson(index(dir), (page) => {
        page.widgetsOrder.push({ toString: null });
        page.widgets.faq.blocksOrder.push({ toString: null });
      }),
    );
    assert.equal(errorsOf(findings, "widget-id").length, 2, JSON.stringify(findings));
  });

  it("accepts the editor's own ids and the starter's", async () => {
    const findings = await findingsAfter("widget-id-editor", (dir) =>
      renameWidget(dir, "hero", "widget_3f2a9c1e-8d4b-4e6f-9a0b-1c2d3e4f5a6b"),
    );
    assert.deepEqual(findings, []);
  });

  it("warns once, not per widget, about a page with no widgetsOrder: its widgets render in the order written", async () => {
    const findings = await findingsAfter("no-order", (dir) =>
      editJson(index(dir), (page) => {
        delete page.widgetsOrder;
      }),
    );
    const warnings = findings.filter((finding) => finding.level === "warning");
    assert.equal(warnings.length, 1, JSON.stringify(findings));
    assert.match(warnings[0].message, /widgetsOrder/);
    assert.doesNotMatch(warnings[0].message, /will not render/);
  });

  it("counts only the widgets a page renders toward its one paginating widget", async () => {
    const findings = await findingsAfter("pagination-unrendered", (dir) =>
      editJson(index(dir), (page) => {
        page.widgets.hero.settings.paginate = true;
        page.widgets.spare = { type: "hero", settings: { paginate: true } };
      }),
    );
    assert.equal(errorsOf(findings, "pagination").length, 0, JSON.stringify(findings));
  });

  it("warns about a widget template without data-widget-type", async () => {
    const findings = await findingsAfter("no-widget-type", (dir) =>
      edit(path.join(dir, "widgets/hero/widget.liquid"), (text) => text.replace(/\s*data-widget-type="[^"]*"/g, "")),
    );
    assert.ok(
      findings.some((finding) => finding.level === "warning" && finding.rule === "editor-attributes"),
      JSON.stringify(findings),
    );
  });

  describe("shared-area templates", () => {
    const declare = (dir) =>
      editJson(path.join(dir, "theme.json"), (json) => {
        json.sharedAreas = [
          { id: "before_footer", label: "Before footer" },
          { id: "after_header", label: "After header" },
        ];
      });
    const place = (dir) =>
      edit(path.join(dir, "layout.liquid"), (text) =>
        text.replace(
          "{{ footer | raw }}",
          "{{ shared_areas.after_header | raw }}\n    {{ shared_areas.before_footer | raw }}\n    {{ footer | raw }}",
        ),
      );
    const area = (dir, areaId, ids, root = "templates") =>
      fs.outputJson(path.join(dir, root, "global/areas", `${areaId}.json`), {
        widgets: Object.fromEntries(ids.map((id) => [id, { type: "hero", settings: {} }])),
        widgetsOrder: ids,
      });
    const withAreas = async (dir) => {
      await declare(dir);
      await place(dir);
    };

    it("refuses an area widget id that a page template also uses", async () => {
      const findings = await findingsAfter("area-page-clash", async (dir) => {
        await withAreas(dir);
        await area(dir, "before_footer", ["hero"]);
      });
      assert.ok(errorsOf(findings, "widget-id").some((finding) => finding.message.includes('"hero"')), JSON.stringify(findings));
    });

    it("names every page template that uses an area's widget id", async () => {
      const findings = await findingsAfter("area-page-clash-two", async (dir) => {
        await withAreas(dir);
        await area(dir, "before_footer", ["hero"]);
        await fs.copy(path.join(dir, "templates/index.json"), path.join(dir, "templates/about.json"));
        await editJson(path.join(dir, "templates/about.json"), (page) => {
          page.slug = "about";
        });
      });
      const files = errorsOf(findings, "widget-id").map((finding) => finding.file).sort();
      assert.deepEqual(files, ["templates/about.json", "templates/index.json"], JSON.stringify(findings));
    });

    it("refuses an id two area templates both use", async () => {
      const findings = await findingsAfter("area-area-clash", async (dir) => {
        await withAreas(dir);
        await area(dir, "before_footer", ["promo"]);
        await area(dir, "after_header", ["promo"]);
      });
      assert.ok(errorsOf(findings, "widget-id").some((finding) => finding.message.includes('"promo"')), JSON.stringify(findings));
    });

    it("refuses header/footer as an area widget id", async () => {
      const findings = await findingsAfter("area-reserved", async (dir) => {
        await withAreas(dir);
        await area(dir, "before_footer", ["footer"]);
      });
      assert.ok(errorsOf(findings, "widget-id").length > 0, JSON.stringify(findings));
    });

    it("accepts distinct ids", async () => {
      const findings = await findingsAfter("area-distinct", async (dir) => {
        await withAreas(dir);
        await area(dir, "before_footer", ["promo"]);
        await area(dir, "after_header", ["notice"]);
      });
      assert.deepEqual(findings, []);
    });

    // A preset with its own templates replaces the theme's pages, and inherits each
    // area it doesn't supply; its own copy of an area replaces the theme's.
    const withPreset = async (dir) => {
      await fs.outputJson(path.join(dir, "presets/presets.json"), { default: "dark", presets: [{ id: "dark", name: "Dark" }] });
      await fs.outputJson(path.join(dir, "presets/dark/preset.json"), { settings: {} });
      await fs.copy(path.join(dir, "templates"), path.join(dir, "presets/dark/templates"));
      await fs.remove(path.join(dir, "presets/dark/templates/global/areas"));
    };

    it("checks a preset's pages against the areas it inherits", async () => {
      const findings = await findingsAfter("preset-inherited-clash", async (dir) => {
        await withAreas(dir);
        await area(dir, "before_footer", ["promo"]);
        await withPreset(dir);
        await renameWidget(dir.replace(/$/, "/presets/dark"), "hero", "promo");
      });
      assert.ok(
        errorsOf(findings, "widget-id").some((finding) => finding.file.startsWith("presets/dark/")),
        JSON.stringify(findings),
      );
    });

    it("compares a preset's own area, not the theme's copy it replaces", async () => {
      const findings = await findingsAfter("preset-own-area", async (dir) => {
        await withAreas(dir);
        await area(dir, "before_footer", ["promo"]);
        await withPreset(dir);
        await area(dir, "before_footer", ["notice"], "presets/dark/templates");
        await renameWidget(dir.replace(/$/, "/presets/dark"), "hero", "promo");
      });
      assert.equal(errorsOf(findings, "widget-id").length, 0, JSON.stringify(findings));
    });
  });
});

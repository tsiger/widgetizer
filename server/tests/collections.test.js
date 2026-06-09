/**
 * Collections — Phase 1 Test Suite
 *
 * Tests collection-type schema validation/normalization (Section 1 of the
 * Collections spec) and schema listing/skip-invalid behavior.
 *
 * Pure-function tests for validateCollectionSchema; filesystem tests for
 * listCollectionSchemas use an isolated temp DATA_ROOT.
 *
 * Run with: node --test server/tests/collections.test.js
 */

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";

// ----------------------------------------------------------------------------
// Isolated test environment (must be set before importing config-bound modules)
// ----------------------------------------------------------------------------

const TEST_ROOT = path.join(os.tmpdir(), `widgetizer-collections-test-${Date.now()}`);
const TEST_DATA_DIR = path.join(TEST_ROOT, "data");
process.env.DATA_ROOT = TEST_DATA_DIR;
process.env.NODE_ENV = "test";

// Silence the expected console.warn from skip-invalid behavior to keep output pristine.
const _origWarn = console.warn;
const _origError = console.error;
console.warn = () => {};
console.error = () => {};

const { validateCollectionSchema, listCollectionSchemas, validateThemeCollectionSchemas } =
  await import("../services/collectionService.js");
const { getProjectCollectionSchemaPath, THEMES_SEED_DIR } = await import("../config.js");

/** Write a schema.json into <project>/collection-types/<type>/schema.json. */
async function writeSchema(projectFolderName, type, schema) {
  await fs.outputJSON(getProjectCollectionSchemaPath(projectFolderName, type), schema);
}

// ----------------------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------------------

/** A minimal, fully-valid collection schema. Tests mutate clones of this. */
function validSchema(overrides = {}) {
  return {
    type: "portfolio",
    schemaVersion: 1,
    displayName: "Portfolio",
    displayNamePlural: "Portfolio Items",
    icon: "Briefcase",
    hasItemPages: true,
    slugPrefix: "portfolio",
    settings: [
      { type: "header", id: "content_header", label: "Content" },
      { type: "text", id: "title", label: "Title", required: true, usedAsTitle: true },
      { type: "image", id: "featured_image", label: "Featured" },
    ],
    ...overrides,
  };
}

// ============================================================================
// validateCollectionSchema — valid baseline
// ============================================================================

describe("validateCollectionSchema — valid schema", () => {
  it("accepts a fully valid schema", () => {
    const result = validateCollectionSchema(validSchema(), "portfolio");
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });
});

// ============================================================================
// Rule: type matches folder name and pattern ^[a-z0-9-]+$
// ============================================================================

describe("validateCollectionSchema — type / folder name", () => {
  it("rejects when type does not match the folder name", () => {
    const result = validateCollectionSchema(validSchema({ type: "portfolio" }), "team");
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /folder/i.test(e)), result.errors.join("; "));
  });

  it("rejects a type with invalid characters", () => {
    const result = validateCollectionSchema(validSchema({ type: "My Portfolio" }), "My Portfolio");
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /type/i.test(e)));
  });

  it("rejects a missing type", () => {
    const s = validSchema();
    delete s.type;
    const result = validateCollectionSchema(s, "portfolio");
    assert.equal(result.valid, false);
  });
});

// ============================================================================
// Rule: slugPrefix pattern + reserved + default
// ============================================================================

describe("validateCollectionSchema — slugPrefix", () => {
  it("rejects an invalid slugPrefix when hasItemPages is true", () => {
    const result = validateCollectionSchema(
      validSchema({ hasItemPages: true, slugPrefix: "Bad Prefix" }),
      "portfolio",
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /slugprefix/i.test(e)));
  });

  it("rejects the reserved slugPrefix 'assets'", () => {
    const result = validateCollectionSchema(
      validSchema({ hasItemPages: true, slugPrefix: "assets" }),
      "portfolio",
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /reserved/i.test(e)));
  });

  it("defaults slugPrefix to type when omitted", () => {
    const s = validSchema();
    delete s.slugPrefix;
    const result = validateCollectionSchema(s, "portfolio");
    assert.equal(result.valid, true);
    assert.equal(result.normalized.slugPrefix, "portfolio");
  });
});

// ============================================================================
// Rule: exactly one usedAsTitle, must be a text setting
// ============================================================================

describe("validateCollectionSchema — usedAsTitle", () => {
  it("rejects when no setting declares usedAsTitle", () => {
    const result = validateCollectionSchema(
      validSchema({
        settings: [
          { type: "header", id: "h", label: "H" },
          { type: "text", id: "title", label: "Title" },
        ],
      }),
      "portfolio",
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /usedastitle/i.test(e)));
  });

  it("rejects when more than one setting declares usedAsTitle", () => {
    const result = validateCollectionSchema(
      validSchema({
        settings: [
          { type: "text", id: "title", label: "Title", usedAsTitle: true },
          { type: "text", id: "subtitle", label: "Subtitle", usedAsTitle: true },
        ],
      }),
      "portfolio",
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /usedastitle/i.test(e)));
  });

  it("rejects when usedAsTitle is not on a text setting", () => {
    const result = validateCollectionSchema(
      validSchema({
        settings: [{ type: "textarea", id: "title", label: "Title", usedAsTitle: true }],
      }),
      "portfolio",
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /usedastitle/i.test(e) && /text/i.test(e)));
  });
});

// ============================================================================
// Rule: defaultSort must be in the allowed set; defaults to "manual"
// ============================================================================

describe("validateCollectionSchema — defaultSort", () => {
  it("rejects an unknown defaultSort", () => {
    const result = validateCollectionSchema(validSchema({ defaultSort: "random" }), "portfolio");
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /defaultsort/i.test(e)));
  });

  it("defaults to 'manual' when omitted", () => {
    const s = validSchema();
    delete s.defaultSort;
    const result = validateCollectionSchema(s, "portfolio");
    assert.equal(result.valid, true);
    assert.equal(result.normalized.defaultSort, "manual");
  });

  it("accepts each allowed defaultSort value", () => {
    for (const v of ["manual", "created_desc", "created_asc", "title_asc", "title_desc"]) {
      const result = validateCollectionSchema(validSchema({ defaultSort: v }), "portfolio");
      assert.equal(result.valid, true, `expected ${v} to be valid`);
    }
  });
});

// ============================================================================
// Rule: settings may only use supported setting types
// ============================================================================

describe("validateCollectionSchema — setting types", () => {
  it("rejects an unsupported setting type", () => {
    const result = validateCollectionSchema(
      validSchema({
        settings: [
          { type: "text", id: "title", label: "Title", usedAsTitle: true },
          { type: "carousel", id: "car", label: "Carousel" },
        ],
      }),
      "portfolio",
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /carousel/i.test(e)));
  });

  it("accepts the gallery setting type", () => {
    const result = validateCollectionSchema(
      validSchema({
        settings: [
          { type: "text", id: "title", label: "Title", usedAsTitle: true },
          { type: "gallery", id: "gallery", label: "Gallery" },
        ],
      }),
      "portfolio",
    );
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it("rejects a setting missing an id", () => {
    const result = validateCollectionSchema(
      validSchema({
        settings: [
          { type: "text", id: "title", label: "Title", usedAsTitle: true },
          { type: "text", label: "No id" },
        ],
      }),
      "portfolio",
    );
    assert.equal(result.valid, false);
  });
});

// ============================================================================
// Rule: multiple / repeater / blocks are invalid in v1 (rejected, not ignored)
// ============================================================================

describe("validateCollectionSchema — disallowed v1 constructs", () => {
  it("rejects a setting with `multiple`", () => {
    const result = validateCollectionSchema(
      validSchema({
        settings: [
          { type: "text", id: "title", label: "Title", usedAsTitle: true },
          { type: "image", id: "imgs", label: "Images", multiple: true },
        ],
      }),
      "portfolio",
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /multiple/i.test(e)));
  });

  it("rejects a setting with `repeater`", () => {
    const result = validateCollectionSchema(
      validSchema({
        settings: [
          { type: "text", id: "title", label: "Title", usedAsTitle: true },
          { type: "text", id: "r", label: "R", repeater: [] },
        ],
      }),
      "portfolio",
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /repeater/i.test(e)));
  });

  it("rejects a schema-level `blocks` key", () => {
    const result = validateCollectionSchema(validSchema({ blocks: [] }), "portfolio");
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /blocks/i.test(e)));
  });
});

// ============================================================================
// validateCollectionSchema — table columns (v1: text-only)
// ============================================================================

describe("validateCollectionSchema — table columns", () => {
  const withTable = (columns) =>
    validSchema({
      settings: [
        { type: "text", id: "title", label: "Title", usedAsTitle: true },
        { type: "table", id: "rates", label: "Rates", columns },
      ],
    });

  it("accepts a table with valid text columns", () => {
    const result = validateCollectionSchema(
      withTable([
        { id: "label", type: "text", label: "Season" },
        { id: "price", type: "text", label: "Price" },
      ]),
      "portfolio",
    );
    assert.equal(result.valid, true, result.errors.join("; "));
  });

  it("rejects a table with missing/empty columns", () => {
    assert.equal(validateCollectionSchema(withTable([]), "portfolio").valid, false);
    assert.equal(validateCollectionSchema(withTable(undefined), "portfolio").valid, false);
  });

  it("rejects a non-allowlist column type (number until added, gallery/richtext)", () => {
    for (const type of ["number", "gallery", "richtext"]) {
      const result = validateCollectionSchema(withTable([{ id: "c", type, label: "C" }]), "portfolio");
      assert.equal(result.valid, false, `expected column type "${type}" rejected`);
      assert.ok(result.errors.some((e) => /column type/i.test(e)));
    }
  });

  it("rejects duplicate column ids", () => {
    const result = validateCollectionSchema(
      withTable([
        { id: "x", type: "text", label: "X" },
        { id: "x", type: "text", label: "X2" },
      ]),
      "portfolio",
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /duplicate/i.test(e)));
  });

  it("rejects reserved / non-pattern column ids", () => {
    for (const id of ["__proto__", "constructor", "prototype", "", "1bad", "has space", "a-b"]) {
      const result = validateCollectionSchema(withTable([{ id, type: "text", label: "X" }]), "portfolio");
      assert.equal(result.valid, false, `expected invalid column id ${JSON.stringify(id)} rejected`);
    }
  });

  it("rejects usedAsTitle on a table (must be a text setting)", () => {
    const result = validateCollectionSchema(
      validSchema({
        settings: [
          {
            type: "table",
            id: "rates",
            label: "Rates",
            usedAsTitle: true,
            columns: [{ id: "label", type: "text", label: "L" }],
          },
        ],
      }),
      "portfolio",
    );
    assert.equal(result.valid, false);
  });
});

// ============================================================================
// listCollectionSchemas — filesystem read, skip-invalid, slugPrefix uniqueness
// ============================================================================

describe("listCollectionSchemas", () => {
  after(async () => {
    await fs.remove(TEST_ROOT);
    console.warn = _origWarn;
    console.error = _origError;
  });

  it("returns an empty array when no collection-types dir exists", async () => {
    const result = await listCollectionSchemas("no-collections-project");
    assert.deepEqual(result, []);
  });

  it("reads and returns valid schemas, normalized", async () => {
    const folder = "valid-project";
    await writeSchema(folder, "portfolio", validSchema());
    await writeSchema(
      folder,
      "team",
      validSchema({
        type: "team",
        slugPrefix: "team",
        hasItemPages: false,
        settings: [{ type: "text", id: "name", label: "Name", usedAsTitle: true }],
      }),
    );

    const result = await listCollectionSchemas(folder);
    const types = result.map((s) => s.type).sort();
    assert.deepEqual(types, ["portfolio", "team"]);
    // normalized defaults applied
    const team = result.find((s) => s.type === "team");
    assert.equal(team.defaultSort, "manual");
  });

  it("skips an invalid schema but returns the valid ones (no throw)", async () => {
    const folder = "mixed-project";
    await writeSchema(folder, "portfolio", validSchema());
    // invalid: no usedAsTitle setting
    await writeSchema(folder, "broken", {
      type: "broken",
      settings: [{ type: "text", id: "x", label: "X" }],
    });

    const result = await listCollectionSchemas(folder);
    assert.deepEqual(
      result.map((s) => s.type),
      ["portfolio"],
    );
  });

  it("skips a schema whose type does not match its folder name", async () => {
    const folder = "mismatch-project";
    // folder is "wrongname" but type says "portfolio"
    await writeSchema(folder, "wrongname", validSchema({ type: "portfolio" }));
    const result = await listCollectionSchemas(folder);
    assert.deepEqual(result, []);
  });

  it("skips all collections that share a slugPrefix (collision)", async () => {
    const folder = "collision-project";
    await writeSchema(folder, "alpha", validSchema({ type: "alpha", slugPrefix: "shared" }));
    await writeSchema(folder, "beta", validSchema({ type: "beta", slugPrefix: "shared" }));
    await writeSchema(folder, "gamma", validSchema({ type: "gamma", slugPrefix: "gamma" }));

    const result = await listCollectionSchemas(folder);
    assert.deepEqual(
      result.map((s) => s.type),
      ["gamma"],
    );
  });
});

// ============================================================================
// Example theme schemas shipped with the `arch` theme must validate
// ============================================================================

describe("example arch theme collection schemas", () => {
  for (const type of ["portfolio", "team"]) {
    it(`themes/arch/collection-types/${type}/schema.json is valid`, async () => {
      const schemaPath = path.join(THEMES_SEED_DIR, "arch", "collection-types", type, "schema.json");
      const raw = await fs.readJSON(schemaPath);
      const result = validateCollectionSchema(raw, type);
      assert.equal(result.valid, true, result.errors.join("; "));
    });
  }
});

// ============================================================================
// validateThemeCollectionSchemas — theme upload gate (reject, don't skip)
// ============================================================================

describe("validateThemeCollectionSchemas", () => {
  const THEMES_TMP = path.join(TEST_ROOT, "themes-upload");

  async function makeThemeDir(name, build) {
    const dir = path.join(THEMES_TMP, name);
    await fs.ensureDir(dir);
    await build(dir);
    return dir;
  }

  it("passes a theme with no collection-types dir", async () => {
    const dir = await makeThemeDir("plain", async () => {});
    const result = await validateThemeCollectionSchemas(dir);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it("passes a theme with valid collection schemas", async () => {
    const dir = await makeThemeDir("good", async (d) => {
      await fs.outputJSON(path.join(d, "collection-types", "portfolio", "schema.json"), validSchema());
    });
    const result = await validateThemeCollectionSchemas(dir);
    assert.equal(result.valid, true, result.errors.join("; "));
  });

  it("rejects a theme with an invalid schema, naming the collection", async () => {
    const dir = await makeThemeDir("bad-schema", async (d) => {
      await fs.outputJSON(path.join(d, "collection-types", "broken", "schema.json"), {
        type: "broken",
        settings: [{ type: "text", id: "x", label: "X" }], // no usedAsTitle
      });
    });
    const result = await validateThemeCollectionSchemas(dir);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /broken/.test(e)));
  });

  it("rejects two collections sharing a slugPrefix", async () => {
    const dir = await makeThemeDir("dup-prefix", async (d) => {
      await fs.outputJSON(
        path.join(d, "collection-types", "alpha", "schema.json"),
        validSchema({ type: "alpha", slugPrefix: "shared" }),
      );
      await fs.outputJSON(
        path.join(d, "collection-types", "beta", "schema.json"),
        validSchema({ type: "beta", slugPrefix: "shared" }),
      );
    });
    const result = await validateThemeCollectionSchemas(dir);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /slugprefix/i.test(e) && /shared/.test(e)));
  });

  it("rejects a reserved slugPrefix", async () => {
    const dir = await makeThemeDir("reserved", async (d) => {
      await fs.outputJSON(
        path.join(d, "collection-types", "assets", "schema.json"),
        validSchema({ type: "assets", slugPrefix: "assets" }),
      );
    });
    const result = await validateThemeCollectionSchemas(dir);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /reserved/i.test(e)));
  });

  it("rejects a preset that contains a collection-types/ folder (BLOCKER-1)", async () => {
    const dir = await makeThemeDir("bad-preset", async (d) => {
      await fs.outputJSON(path.join(d, "collection-types", "portfolio", "schema.json"), validSchema());
      await fs.outputJSON(
        path.join(d, "presets", "blog-starter", "collection-types", "posts", "schema.json"),
        validSchema({ type: "posts", slugPrefix: "posts" }),
      );
    });
    const result = await validateThemeCollectionSchemas(dir);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => /preset/i.test(e) && /blog-starter/.test(e)),
      result.errors.join("; "),
    );
  });
});

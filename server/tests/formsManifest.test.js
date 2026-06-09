/**
 * Forms Manifest Builder Test Suite
 *
 * Tests buildFormsManifest from formsManifestService.js.
 *
 * Form/field keys are auto-derived from form_name and field labels via handleize.
 * The builder is pure-function — given a pagesDataArray and an app version,
 * it returns { manifest, warnings } or throws with a collected error list.
 *
 * Run with: node --test server/tests/formsManifest.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Liquid } from "liquidjs";

import { buildFormsManifest } from "../services/formsManifestService.js";
import { registerHandleizeFilter } from "@widgetizer/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIDGET_LIQUID_PATH = join(
  __dirname,
  "..",
  "..",
  "src",
  "core",
  "widgets",
  "core-form",
  "widget.liquid",
);
const WIDGET_TEMPLATE = readFileSync(WIDGET_LIQUID_PATH, "utf-8");

function makeLiquidEngine() {
  const engine = new Liquid({
    extname: ".liquid",
    cache: false,
    outputEscape: "escape",
  });
  registerHandleizeFilter(engine);
  return engine;
}

function extractInputNames(html) {
  const names = new Set();
  const re = /\sname="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    names.add(m[1]);
  }
  names.delete("website");
  return [...names].sort();
}

function extractOptionValues(html) {
  const values = [];
  const re = /<option\s+value="([^"]*)"[^>]*>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1] !== "") values.push(m[1]);
  }
  return values;
}

function extractFormAction(html) {
  const m = /\saction="([^"]+)"/.exec(html);
  return m ? m[1] : null;
}

function extractFormDataAttr(html) {
  const m = /data-widgetizer-form="([^"]+)"/.exec(html);
  return m ? m[1] : null;
}

const APP_VERSION = "0.10.0";

function makeFormWidget({ formName = "Contact", blocks }) {
  const blocksObj = {};
  const blocksOrder = [];
  blocks.forEach((block, idx) => {
    const id = `block-${idx}`;
    blocksObj[id] = block;
    blocksOrder.push(id);
  });
  return {
    type: "core-form",
    settings: { form_name: formName },
    blocks: blocksObj,
    blocksOrder,
  };
}

function makePage({ id = "index", widgets = {} } = {}) {
  return {
    id,
    widgets,
    widgetsOrder: Object.keys(widgets),
  };
}

const SIMPLE_FIELDS = [
  { type: "field", settings: { label: "Your name", type: "text", required: true } },
  { type: "field", settings: { label: "Email address", type: "email", required: true } },
  { type: "field", settings: { label: "Message", type: "textarea", required: true } },
];

describe("buildFormsManifest", () => {
  it("returns null manifest when no form widgets are present", () => {
    const pages = [makePage({ widgets: {} })];
    const { manifest, warnings } = buildFormsManifest(pages, APP_VERSION);
    assert.equal(manifest, null);
    assert.deepEqual(warnings, []);
  });

  it("derives form key and field keys from form name and field labels", () => {
    const widget = makeFormWidget({ formName: "Contact", blocks: SIMPLE_FIELDS });
    const pages = [makePage({ widgets: { w1: widget } })];

    const { manifest } = buildFormsManifest(pages, APP_VERSION);
    assert.equal(manifest.schema_version, 1);
    assert.equal(manifest.generator, "widgetizer");
    assert.equal(manifest.generator_version, APP_VERSION);
    assert.equal(manifest.forms.length, 1);

    const form = manifest.forms[0];
    assert.equal(form.key, "contact");
    assert.equal(form.name, "Contact");
    assert.equal(form.widget, "widgetizer/core-form");
    assert.equal(form.page_path, "/index.html");
    assert.deepEqual(
      form.fields.map((f) => f.key),
      ["your-name", "email-address", "message"],
    );
  });

  it("falls back to 'contact' when form_name is missing or empty", () => {
    const widget = makeFormWidget({ formName: "", blocks: SIMPLE_FIELDS });
    const { manifest } = buildFormsManifest(
      [makePage({ widgets: { w: widget } })],
      APP_VERSION,
    );
    assert.equal(manifest.forms[0].key, "contact");
    assert.equal(manifest.forms[0].name, "Contact");
  });

  it("applies default max_length per field type", () => {
    const widget = makeFormWidget({ blocks: SIMPLE_FIELDS });
    const { manifest } = buildFormsManifest(
      [makePage({ widgets: { w: widget } })],
      APP_VERSION,
    );
    const [name, email, message] = manifest.forms[0].fields;
    assert.equal(name.max_length, 500);
    assert.equal(email.max_length, 320);
    assert.equal(message.max_length, 5000);
  });

  it("parses choice options as one label per line and derives values via handleize", () => {
    const widget = makeFormWidget({
      blocks: [
        ...SIMPLE_FIELDS,
        {
          type: "choice",
          settings: {
            label: "Topic",
            type: "select",
            options: "General inquiry\nSupport\nSales",
          },
        },
      ],
    });
    const { manifest } = buildFormsManifest(
      [makePage({ widgets: { w: widget } })],
      APP_VERSION,
    );
    const topic = manifest.forms[0].fields.find((f) => f.key === "topic");
    assert.equal(topic.type, "select");
    assert.deepEqual(topic.options, [
      { value: "general-inquiry", label: "General inquiry" },
      { value: "support", label: "Support" },
      { value: "sales", label: "Sales" },
    ]);
  });

  it("emits consent blocks as type=checkbox without max_length", () => {
    const widget = makeFormWidget({
      blocks: [
        ...SIMPLE_FIELDS,
        { type: "consent", settings: { label: "I agree", required: true } },
      ],
    });
    const { manifest } = buildFormsManifest(
      [makePage({ widgets: { w: widget } })],
      APP_VERSION,
    );
    const consent = manifest.forms[0].fields.find((f) => f.key === "i-agree");
    assert.equal(consent.type, "checkbox");
    assert.equal(consent.required, true);
    assert.ok(!("max_length" in consent), "checkbox fields should not carry max_length");
  });

  it("never emits a 'website' field for the honeypot", () => {
    const widget = makeFormWidget({ blocks: SIMPLE_FIELDS });
    const { manifest } = buildFormsManifest(
      [makePage({ widgets: { w: widget } })],
      APP_VERSION,
    );
    const websiteField = manifest.forms[0].fields.find((f) => f.key === "website");
    assert.equal(
      websiteField,
      undefined,
      "honeypot field 'website' must never appear in the manifest",
    );
  });

  it("dedupes forms by derived form key across multiple pages (first page wins)", () => {
    const widgetA = makeFormWidget({ formName: "Contact", blocks: SIMPLE_FIELDS });
    const widgetB = makeFormWidget({ formName: "Contact", blocks: SIMPLE_FIELDS });
    const pages = [
      makePage({ id: "index", widgets: { w: widgetA } }),
      makePage({ id: "contact", widgets: { w: widgetB } }),
    ];

    const { manifest, warnings } = buildFormsManifest(pages, APP_VERSION);
    assert.equal(manifest.forms.length, 1);
    assert.equal(manifest.forms[0].page_path, "/index.html");
    assert.deepEqual(warnings, []);
  });

  it("throws when two forms have the same derived key but different fields (HTML/manifest mismatch would break submissions)", () => {
    const widgetA = makeFormWidget({ formName: "Contact", blocks: SIMPLE_FIELDS });
    const widgetB = makeFormWidget({
      formName: "Contact",
      blocks: [
        { type: "field", settings: { label: "Your name", type: "text" } },
        { type: "field", settings: { label: "Phone", type: "tel" } },
      ],
    });
    const pages = [
      makePage({ id: "index", widgets: { w: widgetA } }),
      makePage({ id: "contact", widgets: { w: widgetB } }),
    ];

    assert.throws(
      () => buildFormsManifest(pages, APP_VERSION),
      (err) => {
        assert.equal(err.statusCode, 400);
        return err.formsErrors.some(
          (m) =>
            m.includes("produce the same identifier") && m.includes("different fields"),
        );
      },
    );
  });

  it("throws when two fields in the same form derive to the same key", () => {
    const widget = makeFormWidget({
      blocks: [
        { type: "field", settings: { label: "Email", type: "email" } },
        { type: "field", settings: { label: "  email  ", type: "email" } },
      ],
    });
    assert.throws(
      () => buildFormsManifest([makePage({ widgets: { w: widget } })], APP_VERSION),
      (err) => {
        assert.equal(err.statusCode, 400);
        return err.formsErrors.some((m) => m.includes("produce the same identifier"));
      },
    );
  });

  it("throws when a field label is missing", () => {
    const widget = makeFormWidget({
      blocks: [{ type: "field", settings: { label: "", type: "text" } }],
    });
    assert.throws(
      () => buildFormsManifest([makePage({ widgets: { w: widget } })], APP_VERSION),
      (err) => err.formsErrors.some((m) => m.includes("field label is required")),
    );
  });

  it("throws when a field label cannot be converted to an identifier", () => {
    const widget = makeFormWidget({
      blocks: [{ type: "field", settings: { label: "!!!", type: "text" } }],
    });
    assert.throws(
      () => buildFormsManifest([makePage({ widgets: { w: widget } })], APP_VERSION),
      (err) => err.formsErrors.some((m) => m.includes("cannot be converted to an identifier")),
    );
  });

  it("throws when site exceeds 5 unique forms", () => {
    const pages = [];
    for (let i = 0; i < 6; i++) {
      const widget = makeFormWidget({ formName: `Form ${i}`, blocks: SIMPLE_FIELDS });
      pages.push(makePage({ id: `page-${i}`, widgets: { w: widget } }));
    }
    assert.throws(
      () => buildFormsManifest(pages, APP_VERSION),
      (err) => err.formsErrors.some((m) => m.includes("more than the 5 limit")),
    );
  });

  it("throws when a single form exceeds 30 fields", () => {
    const blocks = [];
    for (let i = 0; i < 31; i++) {
      blocks.push({ type: "field", settings: { label: `Field ${i}`, type: "text" } });
    }
    const widget = makeFormWidget({ blocks });
    assert.throws(
      () => buildFormsManifest([makePage({ widgets: { w: widget } })], APP_VERSION),
      (err) => err.formsErrors.some((m) => m.includes("more than the 30 limit")),
    );
  });

  it("throws when a choice field has no options", () => {
    const widget = makeFormWidget({
      blocks: [
        { type: "choice", settings: { label: "Topic", type: "select", options: "" } },
      ],
    });
    assert.throws(
      () => buildFormsManifest([makePage({ widgets: { w: widget } })], APP_VERSION),
      (err) => err.formsErrors.some((m) => m.includes("at least one option")),
    );
  });

  it("throws when two options in a choice field derive to the same value", () => {
    const widget = makeFormWidget({
      blocks: [
        {
          type: "choice",
          settings: {
            label: "Topic",
            type: "select",
            options: "Sales\nsales\n  Sales  ",
          },
        },
      ],
    });
    assert.throws(
      () => buildFormsManifest([makePage({ widgets: { w: widget } })], APP_VERSION),
      (err) => err.formsErrors.some((m) => m.includes("produce the same value")),
    );
  });

  it("throws when a form has zero usable field blocks", () => {
    const widget = makeFormWidget({ blocks: [] });
    assert.throws(
      () => buildFormsManifest([makePage({ widgets: { w: widget } })], APP_VERSION),
      (err) => err.formsErrors.some((m) => m.includes("at least one field block")),
    );
  });

  it("uses home pageId as index.html in page_path", () => {
    const widget = makeFormWidget({ blocks: SIMPLE_FIELDS });
    const pages = [makePage({ id: "home", widgets: { w: widget } })];
    const { manifest } = buildFormsManifest(pages, APP_VERSION);
    assert.equal(manifest.forms[0].page_path, "/index.html");
  });

  it("uses a non-home page id verbatim in page_path", () => {
    const widget = makeFormWidget({ blocks: SIMPLE_FIELDS });
    const pages = [makePage({ id: "about", widgets: { w: widget } })];
    const { manifest } = buildFormsManifest(pages, APP_VERSION);
    assert.equal(manifest.forms[0].page_path, "/about.html");
  });

  it("ignores non-form widgets when scanning pages", () => {
    const formWidget = makeFormWidget({ blocks: SIMPLE_FIELDS });
    const otherWidget = { type: "banner", settings: {}, blocks: {}, blocksOrder: [] };
    const pages = [
      makePage({
        id: "index",
        widgets: { banner: otherWidget, form: formWidget },
      }),
    ];
    const { manifest } = buildFormsManifest(pages, APP_VERSION);
    assert.equal(manifest.forms.length, 1);
    assert.equal(manifest.forms[0].key, "contact");
  });

  it("throws when two same-key forms have a choice field with different option values (hosted contract violation)", () => {
    const blocksA = [
      { type: "field", settings: { label: "Your name", type: "text", required: true } },
      {
        type: "choice",
        settings: {
          label: "Topic",
          type: "select",
          options: "General inquiry\nSales\nSupport",
        },
      },
    ];
    const blocksB = [
      { type: "field", settings: { label: "Your name", type: "text", required: true } },
      {
        type: "choice",
        settings: {
          label: "Topic",
          type: "select",
          options: "General inquiry\nSales\nPress", // 'Support' replaced with 'Press'
        },
      },
    ];
    const pages = [
      makePage({ id: "index", widgets: { w: makeFormWidget({ formName: "Contact", blocks: blocksA }) } }),
      makePage({ id: "contact", widgets: { w: makeFormWidget({ formName: "Contact", blocks: blocksB }) } }),
    ];

    assert.throws(
      () => buildFormsManifest(pages, APP_VERSION),
      (err) => {
        assert.equal(err.statusCode, 400);
        return err.formsErrors.some(
          (m) => m.includes("produce the same identifier") && m.includes("different fields"),
        );
      },
    );
  });

  it("dedupes same-key forms when choice options are identical but in a different order (order doesn't affect hosted validation)", () => {
    const blocksA = [
      { type: "field", settings: { label: "Your name", type: "text", required: true } },
      {
        type: "choice",
        settings: {
          label: "Topic",
          type: "select",
          options: "General inquiry\nSales\nSupport",
        },
      },
    ];
    const blocksB = [
      { type: "field", settings: { label: "Your name", type: "text", required: true } },
      {
        type: "choice",
        settings: {
          label: "Topic",
          type: "select",
          options: "Support\nSales\nGeneral inquiry",
        },
      },
    ];
    const pages = [
      makePage({ id: "index", widgets: { w: makeFormWidget({ formName: "Contact", blocks: blocksA }) } }),
      makePage({ id: "contact", widgets: { w: makeFormWidget({ formName: "Contact", blocks: blocksB }) } }),
    ];

    const { manifest, warnings } = buildFormsManifest(pages, APP_VERSION);
    assert.equal(manifest.forms.length, 1, "Forms with the same option value set should dedupe to one manifest entry");
    assert.deepEqual(warnings, []);
  });

  it("preserves choice option values up to 200 chars without truncating to the 64-char key cap", () => {
    // The hosted spec allows option values up to 200 chars; only form/field keys are capped at 64.
    // If the JS truncates to 64 while the Liquid template truncates to 200, the rendered HTML
    // submits a longer value than the manifest knows about → hosted service rejects the submission.
    const longLabel = "A".repeat(100); // 100-char single token → 100-char handleized output
    const widget = makeFormWidget({
      blocks: [
        ...SIMPLE_FIELDS,
        {
          type: "choice",
          settings: {
            label: "Topic",
            type: "select",
            options: `Short option\n${longLabel}`,
          },
        },
      ],
    });
    const { manifest } = buildFormsManifest(
      [makePage({ widgets: { w: widget } })],
      APP_VERSION,
    );
    const topic = manifest.forms[0].fields.find((f) => f.key === "topic");
    const longOption = topic.options.find((o) => o.label === longLabel);
    assert.ok(longOption, "Long option should be present in the manifest");
    assert.equal(longOption.value.length, 100, "Long option value should NOT be truncated to 64 — keep full handleized length up to 200");
    assert.equal(longOption.value, longLabel.toLowerCase());
  });
});

describe("widget.liquid rendering vs manifest consistency", () => {
  it("every input name in the rendered HTML appears as a field key in the manifest", async () => {
    const widget = {
      id: "w1",
      type: "core-form",
      settings: { form_name: "Customer Feedback", style: "outlined", color_scheme: "standard-primary" },
      blocks: {
        b1: { type: "field", settings: { label: "Your name", type: "text", required: true } },
        b2: { type: "field", settings: { label: "Email address", type: "email", required: true } },
        b3: { type: "field", settings: { label: "Phone number", type: "tel" } },
        b4: { type: "field", settings: { label: "Message", type: "textarea", required: true } },
        b5: { type: "consent", settings: { label: "I agree to be contacted", required: true } },
      },
      blocksOrder: ["b1", "b2", "b3", "b4", "b5"],
      index: 1,
    };
    const engine = makeLiquidEngine();
    const html = await engine.parseAndRender(WIDGET_TEMPLATE, { widget });

    const { manifest } = buildFormsManifest(
      [{ id: "index", widgets: { w1: widget }, widgetsOrder: ["w1"] }],
      APP_VERSION,
    );
    const manifestKeys = new Set(manifest.forms[0].fields.map((f) => f.key));
    const htmlNames = extractInputNames(html);

    assert.ok(htmlNames.length > 0, "HTML should have at least one named input");
    for (const name of htmlNames) {
      assert.ok(
        manifestKeys.has(name),
        `HTML input name="${name}" is not present as a field key in the manifest (manifest keys: ${[...manifestKeys].join(", ")})`,
      );
    }
    for (const key of manifestKeys) {
      assert.ok(
        htmlNames.includes(key),
        `Manifest field key "${key}" is not rendered as an input name (HTML names: ${htmlNames.join(", ")})`,
      );
    }
  });

  it("form action URL and data-widgetizer-form attribute match the manifest form key", async () => {
    const widget = {
      id: "w1",
      type: "core-form",
      settings: { form_name: "Quote Request", style: "outlined", color_scheme: "standard-primary" },
      blocks: {
        b1: { type: "field", settings: { label: "Name", type: "text", required: true } },
      },
      blocksOrder: ["b1"],
      index: 1,
    };
    const engine = makeLiquidEngine();
    const html = await engine.parseAndRender(WIDGET_TEMPLATE, { widget });

    const { manifest } = buildFormsManifest(
      [{ id: "index", widgets: { w1: widget }, widgetsOrder: ["w1"] }],
      APP_VERSION,
    );
    const formKey = manifest.forms[0].key;
    assert.equal(formKey, "quote-request");
    assert.equal(extractFormDataAttr(html), formKey);
    assert.equal(extractFormAction(html), `/__widgetizer/forms/${formKey}`);
  });

  it("rendered <option value> attributes match the manifest option values (including 100-char labels)", async () => {
    const longLabel = "A".repeat(100);
    const widget = {
      id: "w1",
      type: "core-form",
      settings: { form_name: "Contact", style: "outlined", color_scheme: "standard-primary" },
      blocks: {
        b1: { type: "field", settings: { label: "Name", type: "text", required: true } },
        b2: {
          type: "choice",
          settings: {
            label: "Topic",
            type: "select",
            options: `General inquiry\nSupport\n${longLabel}`,
          },
        },
      },
      blocksOrder: ["b1", "b2"],
      index: 1,
    };
    const engine = makeLiquidEngine();
    const html = await engine.parseAndRender(WIDGET_TEMPLATE, { widget });

    const { manifest } = buildFormsManifest(
      [{ id: "index", widgets: { w1: widget }, widgetsOrder: ["w1"] }],
      APP_VERSION,
    );
    const topic = manifest.forms[0].fields.find((f) => f.key === "topic");
    const manifestValues = topic.options.map((o) => o.value);
    const htmlOptionValues = extractOptionValues(html);

    assert.deepEqual(
      htmlOptionValues,
      manifestValues,
      "Rendered <option value> attributes must match the manifest options[].value list exactly",
    );
    assert.equal(htmlOptionValues.find((v) => v === longLabel.toLowerCase())?.length, 100);
  });

  it("renders the same radio input name for every option in a radio choice field", async () => {
    const widget = {
      id: "w1",
      type: "core-form",
      settings: { form_name: "RSVP", style: "outlined", color_scheme: "standard-primary" },
      blocks: {
        b1: {
          type: "choice",
          settings: {
            label: "Attending",
            type: "radio",
            options: "Yes\nNo\nMaybe",
            required: true,
          },
        },
      },
      blocksOrder: ["b1"],
      index: 1,
    };
    const engine = makeLiquidEngine();
    const html = await engine.parseAndRender(WIDGET_TEMPLATE, { widget });

    // All three radios should carry the same name attribute
    const radioMatches = [...html.matchAll(/<input\s+[^>]*type="radio"[^>]*>/g)];
    assert.equal(radioMatches.length, 3);
    const names = radioMatches.map((m) => /\sname="([^"]+)"/.exec(m[0])[1]);
    assert.deepEqual(new Set(names), new Set(["attending"]));
  });

  it("renders the honeypot field with name='website' and the hosted contract attributes", async () => {
    const widget = {
      id: "w1",
      type: "core-form",
      settings: { form_name: "Contact", style: "outlined", color_scheme: "standard-primary" },
      blocks: {
        b1: { type: "field", settings: { label: "Name", type: "text", required: true } },
      },
      blocksOrder: ["b1"],
      index: 1,
    };
    const engine = makeLiquidEngine();
    const html = await engine.parseAndRender(WIDGET_TEMPLATE, { widget });

    assert.match(html, /name="website"/);
    assert.match(html, /data-widgetizer-honeypot/);
    assert.match(html, /data-widgetizer-turnstile/);
    assert.match(html, /data-widgetizer-form-status/);
  });
});

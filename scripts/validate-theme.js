#!/usr/bin/env node
/**
 * App-owned Widgetizer theme validator.
 *
 *   npm run validate:theme -- <theme-folder> [--json] [--strict]
 *
 * Checks a theme folder against what the Widgetizer app actually supports:
 * setting types, Liquid tags/filters and their arguments, editor attributes,
 * starter pages, menus, locales, collections, presets and updates.
 *
 * Uses the app's dependencies, Liquid engine and current source catalog.
 * Static checks do not certify runtime data, browser behavior or visual quality.
 *
 * Exit code: 0 clean, 1 errors found (or warnings with --strict), 2 bad usage.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Hash, TokenKind, toValueSync } from "liquidjs";
import { createLiquidEngine } from "@widgetizer/render-engine";
import { splitAssetRef } from "@widgetizer/core/assetUrl";
import { validateCollectionSchema } from "../packages/builder-server/src/services/collectionService.js";
import { sanitizeVideoPath } from "../packages/builder-server/src/services/sanitizationService.js";
import { buildContract } from "./build-theme-skill-contract.js";

export function validateTheme(dir) {
  const contract = buildContract();

  // ---------------------------------------------------------------------------
  // Contract-derived lookups
  // ---------------------------------------------------------------------------

  const SETTING_TYPES = new Set(contract.settingTypes);
  const CUSTOM_TAGS = contract.liquid.customTags;
  const CORE_WIDGETS = contract.coreWidgets;
  const coreWidgetSchemas = new Map();
  const coreWidgetsDir = fileURLToPath(new URL("../packages/core/src/widgets/", import.meta.url));
  const CORE_SNIPPETS = new Set(contract.coreSnippets);
  const CORE_SITE_KEYS = new Set(contract.coreSiteKeys);
  const FONTS = contract.fonts;
  const engine = createLiquidEngine({ strictFilters: true });

  // Names an author might reach for from other systems, and what to use instead.
  const SETTING_TYPE_HINTS = {
    toggle: "checkbox",
    boolean: "checkbox",
    switch: "checkbox",
    string: "text",
    url: "link",
    html: "richtext (sanitized) or code (raw)",
    rich_text: "richtext",
    inline_richtext: "richtext",
    wysiwyg: "richtext",
    liquid: "code",
    image_picker: "image",
    img: "image",
    images: "gallery",
    video_url: "youtube",
    dropdown: "select",
    color_picker: "color",
    colour: "color",
    font: "font_picker",
    slider: "range",
    link_list: "menu",
    navigation: "menu",
    repeater: "blocks on the widget, or a gallery/table field",
    list: "blocks on the widget, or a gallery/table field",
    paragraph: 'header (with a "description")',
    collection: 'a top-level "collection" declaration on the widget schema',
  };
  const FOREIGN_TAG_HINTS = {
    schema: "Widget schemas live in schema.json, not in a {% schema %} tag.",
    section: "Widgetizer has no sections; pages are built from widgets in templates/*.json.",
    sections: "Widgetizer has no section groups; the layout prints {{ header | raw }} and {{ footer | raw }}.",
    style: "Use a plain <style> element, or enqueue a CSS file.",
    stylesheet: "Use a plain <style> element, or enqueue a CSS file.",
    javascript: "Use a plain <script> element, or enqueue a JS file.",
    form: "Use the core-form widget for forms.",
    paginate: 'Pagination comes from the widget schema\'s "collection.perPageSetting" and the `pagination` object.',
    content_for: "The layout prints {{ main_content | raw }}.",
  };
  const FOREIGN_FILTER_HINTS = {
    asset_url: "Use {% asset src: 'file' %} or the enqueue tags.",
    asset_img_url: "Use {% asset src: 'file' %} for theme images.",
    img_url: "Use {% image src: path, size: 'medium', output: 'url' %}.",
    image_url: "Use {% image src: path, size: 'medium', output: 'url' %}.",
    image_tag: "Use {% image src: path %}.",
    img_tag: "Use {% image src: path %}.",
    stylesheet_tag: "Use {% asset src: 'file.css' %} or {% enqueue_style %}.",
    script_tag: "Use {% asset src: 'file.js' %} or {% enqueue_script %}.",
    file_url: "Build file links from `filePath` and the file's basename.",
    link_to: "Write the <a> element directly.",
    translate: "Use the `t` filter.",
    handle: "Use `handleize`.",
    money: "Widgetizer has no price formatting filter.",
    placeholder_svg_tag: "Use {% placeholder_image %}.",
  };
  const FOREIGN_OBJECTS = {
    "section.settings": "Use widget.settings.",
    "section.blocks": "Use widget.blocks with widget.blocksOrder.",
    "section.id": "Use widget.id.",
    "shop.": "Use `project` for site details.",
    "settings.": "Global theme settings are read as theme.<group>.<id>.",
    content_for_header: "Use the layout tags ({% seo %}, {% header_assets %}, ...).",
    content_for_layout: "Use {{ main_content | raw }}.",
    "routes.": "Use the page_url / item_url filters.",
  };

  const SETTING_PROPERTIES = new Set([
    "type",
    "id",
    "label",
    "description",
    "default",
    "defaultKey",
    "required",
    "usedAsTitle",
    "usedAsDate",
    "options",
    "min",
    "max",
    "step",
    "unit",
    "outputAsCssVar",
    "allow_alpha",
    "allow_source",
    "allow_headings",
    "allow_images",
    "min_height",
    "placeholder",
    "language",
    "rows",
    "size",
    "compact",
    "layout",
    "hide_text",
    "embedOptions",
    "columns",
    "allow_patterns",
  ]);
  const WIDGET_SCHEMA_PROPERTIES = new Set([
    "type",
    "displayName",
    "description",
    "category",
    "aliases",
    "settings",
    "blocks",
    "defaultBlocks",
    "maxBlocks",
    "supportsTransparentHeader",
    "collection",
  ]);
  // The editor adds these two controls to a widget that declares a collection.
  const INJECTED_LISTING_SETTINGS = { listing_anchor: "checkbox", paginate: "checkbox" };
  // Theme setting groups the app reads by name. Putting the setting elsewhere silently disables the feature.
  const RESERVED_GROUP_FOR_SETTING = {
    favicon: ["general", "site icons ({{ site_icons }})"],
    date_format: ["general", "the format_date filter's default format"],
    custom_css: ["advanced", "{% custom_css %}"],
    custom_head_scripts: ["advanced", "{% custom_head_scripts %}"],
    custom_footer_scripts: ["advanced", "{% custom_footer_scripts %}"],
  };

  const VERSION_RE = /^\d+\.\d+\.\d+$/;
  const SLUG_RE = /^[a-z0-9-]+$/;
  const TABLE_COLUMN_ID_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  const RESERVED_COLUMN_IDS = new Set(["__proto__", "constructor", "prototype"]);
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const RAW_SAFE_TYPES = new Set(["richtext", "code"]);

  // ---------------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------------

  const findings = [];
  const themeRoot = path.resolve(dir);

  function report(level, file, rule, message) {
    const relative = file ? path.relative(themeRoot, file).split(path.sep).join("/") || "." : ".";
    findings.push({ level, file: relative, rule, message });
  }
  const error = (file, rule, message) => report("error", file, rule, message);
  const warn = (file, rule, message) => report("warning", file, rule, message);

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------

  const exists = (target) => fs.existsSync(target);
  const isDir = (target) => exists(target) && fs.statSync(target).isDirectory();
  const isFile = (target) => exists(target) && fs.statSync(target).isFile();
  const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const listDirs = (dir) =>
    isDir(dir)
      ? fs
          .readdirSync(dir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
      : [];
  const listFiles = (dir, extension) =>
    isDir(dir)
      ? fs
          .readdirSync(dir, { withFileTypes: true })
          .filter((entry) => entry.isFile() && (!extension || entry.name.endsWith(extension)))
          .map((entry) => entry.name)
      : [];

  function readJson(file) {
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch (cause) {
      error(file, "unreadable-file", `Cannot read file: ${cause.message}`);
      return undefined;
    }
    try {
      const value = JSON.parse(text.replace(/^\uFEFF/, ""));
      if (!isObject(value)) {
        error(file, "json-shape", "Expected a JSON object, not an array, primitive or null.");
        return undefined;
      }
      return value;
    } catch (cause) {
      error(file, "invalid-json", `Not valid JSON (${cause.message}). JSON allows no comments and no trailing commas.`);
      return undefined;
    }
  }

  function pngSize(file) {
    const buffer = fs.readFileSync(file);
    const isPng =
      buffer.length > 24 && buffer.readUInt32BE(0) === 0x89504e47 && buffer.toString("ascii", 12, 16) === "IHDR";
    return isPng ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) } : null;
  }

  function distance(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i++) {
      let previous = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const current = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
        previous = current;
      }
    }
    return row[b.length];
  }

  function nearest(name, candidates) {
    let best = null;
    let bestDistance = Math.max(2, Math.floor(name.length / 3)) + 1;
    for (const candidate of candidates) {
      const d = distance(name, candidate);
      if (d < bestDistance) {
        best = candidate;
        bestDistance = d;
      }
    }
    return best;
  }

  const didYouMean = (name, candidates) => {
    const match = nearest(name, candidates);
    return match ? ` Did you mean "${match}"?` : "";
  };

  function valueAt(source, dottedKey) {
    let node = source;
    for (const part of dottedKey.split(".")) {
      if (!isObject(node)) return undefined;
      node = node[part];
    }
    return node;
  }

  function walkStrings(value, visit) {
    if (typeof value === "string") visit(value);
    else if (Array.isArray(value)) value.forEach((entry) => walkStrings(entry, visit));
    else if (isObject(value)) Object.values(value).forEach((entry) => walkStrings(entry, visit));
  }

  // ---------------------------------------------------------------------------
  // Theme state, filled as the theme is read
  // ---------------------------------------------------------------------------

  const theme = {
    manifest: null,
    groups: new Map(), // group name → Map(setting id → setting)
    globalSettingsById: new Map(), // setting id → [setting, ...] across groups
    locale: null, // locales/en.json
    icons: null, // Set of icon names, or null when there is no icons.json
    snippets: new Set(),
    assets: new Set(), // paths relative to assets/, forward slashes
    widgets: new Map(), // type → { dir, file, schema, settings: Map, blocks: Map(type → Map), isGlobal }
    collections: new Map(), // type → { schema, fields: Map(id → setting) }
    imageSizes: new Set(contract.imageSizes),
    usesEnqueue: false,
  };

  // ---------------------------------------------------------------------------
  // Setting definitions and values
  // ---------------------------------------------------------------------------

  /** Problems with `value` as a value for `setting`; an empty list when it fits. */
  function valueProblems(setting, value) {
    const problems = [];
    const type = setting.type;
    const typeName = Array.isArray(value) ? "an array" : value === null ? "null" : `a ${typeof value}`;
    const expect = (what) => problems.push(`must be ${what}, found ${typeName}`);

    switch (type) {
      case "text":
      case "textarea":
      case "richtext":
      case "code":
      case "color":
      case "menu":
        if (typeof value !== "string") expect("a string");
        break;
      case "number":
        if (typeof value !== "number" && value !== "") expect("a number");
        break;
      case "range":
        if (typeof value !== "number") expect("a number");
        else if (
          typeof setting.min === "number" &&
          typeof setting.max === "number" &&
          (value < setting.min || value > setting.max)
        ) {
          problems.push(`${value} is outside min ${setting.min} / max ${setting.max}`);
        }
        break;
      case "checkbox":
        if (typeof value !== "boolean") expect("true or false (not a string)");
        break;
      case "select":
      case "radio": {
        const values = Array.isArray(setting.options) ? setting.options.map((option) => option?.value) : [];
        if (values.length > 0 && !values.includes(value)) {
          problems.push(
            `${JSON.stringify(value)} is not one of its options (${values.map((v) => JSON.stringify(v)).join(", ")})`,
          );
        }
        break;
      }
      case "date":
        if (typeof value !== "string") expect("a YYYY-MM-DD string");
        else if (value !== "" && !DATE_RE.test(value)) problems.push(`"${value}" is not a YYYY-MM-DD date`);
        break;
      case "icon":
        if (typeof value !== "string") expect("an icon name string");
        else if (value !== "" && theme.icons && !theme.icons.has(value)) {
          problems.push(`icon "${value}" is not in assets/icons.json.${didYouMean(value, theme.icons)}`);
        }
        break;
      case "image":
        if (typeof value !== "string") expect("an image path string");
        else if (value !== "" && !value.startsWith("/uploads/images/")) {
          problems.push(
            `"${value}" must be empty or start with /uploads/images/ (theme images are not media-library images)`,
          );
        }
        break;
      case "file":
        if (typeof value !== "string") expect("a file path string");
        else if (value !== "" && !value.startsWith("/uploads/files/")) {
          problems.push(`"${value}" must be empty or start with /uploads/files/`);
        }
        break;
      case "video":
        if (typeof value !== "string") expect("an MP4 path string");
        else if (value !== "" && sanitizeVideoPath(value) !== value) {
          problems.push(`"${value}" must be empty or an /uploads/files/<name>.mp4 path`);
        }
        break;
      case "gallery":
        if (!Array.isArray(value)) expect("an array of image paths");
        else if (value.some((entry) => typeof entry !== "string" || !entry.startsWith("/uploads/images/"))) {
          problems.push("every entry must be a /uploads/images/... path string");
        }
        break;
      case "font_picker":
        if (!isObject(value) || typeof value.stack !== "string" || typeof value.weight !== "number") {
          problems.push('must be { "stack": "...", "weight": 400 }');
        } else if (!Object.hasOwn(FONTS, value.stack)) {
          const family = value.stack.split(",")[0].replaceAll('"', "").trim().toLowerCase();
          const close = Object.keys(FONTS)
            .filter((stack) => stack.toLowerCase().includes(family))
            .slice(0, 3);
          problems.push(
            `font stack ${JSON.stringify(value.stack)} is not in the font catalog` +
              (close.length ? ` (closest: ${close.map((stack) => JSON.stringify(stack)).join(", ")})` : "") +
              '; copy the exact stack from contract.json "fonts"',
          );
        } else if (!FONTS[value.stack].includes(value.weight)) {
          problems.push(
            `weight ${value.weight} is not available for that font (available: ${FONTS[value.stack].join(", ")})`,
          );
        }
        break;
      case "link":
        if (!isObject(value)) expect('an object like { "href": "", "text": "", "target": "_self" }');
        else {
          if (value.href !== undefined && typeof value.href !== "string") problems.push('"href" must be a string');
          if (value.text !== undefined && typeof value.text !== "string") problems.push('"text" must be a string');
          if (value.target !== undefined && !["_self", "_blank"].includes(value.target))
            problems.push('"target" must be "_self" or "_blank"');
          if ("label" in value || "url" in value || "link" in value) {
            problems.push('a link value uses "href" and "text" (menu items are the ones that use "label" and "link")');
          }
        }
        break;
      case "table": {
        const columnIds = new Set((Array.isArray(setting.columns) ? setting.columns : []).map((column) => column?.id));
        if (!Array.isArray(value)) expect("an array of row objects");
        else {
          for (const row of value) {
            if (!isObject(row)) {
              problems.push("every row must be an object keyed by column id");
              break;
            }
            const unknown = Object.keys(row).find((key) => !columnIds.has(key));
            if (unknown) {
              problems.push(`row key "${unknown}" is not a declared column`);
              break;
            }
          }
        }
        break;
      }
      case "youtube":
        if (value !== "" && !isObject(value)) expect("an embed object or an empty string");
        break;
      default:
        break;
    }
    return problems;
  }

  /**
   * Validate an array of setting definitions (theme group, widget, block, or collection).
   * Returns Map(id → setting) for the value-bearing settings.
   */
  function checkSettingDefinitions(file, settings, where) {
    const byId = new Map();
    if (settings === undefined) return byId;
    if (!Array.isArray(settings)) {
      error(file, "settings-shape", `${where}: "settings" must be an array of setting definitions.`);
      return byId;
    }

    settings.forEach((setting, index) => {
      const label = `${where} setting #${index + 1}${setting?.id ? ` ("${setting.id}")` : ""}`;
      if (!isObject(setting)) {
        error(file, "settings-shape", `${label} must be an object.`);
        return;
      }
      if (!SETTING_TYPES.has(setting.type)) {
        const hint = SETTING_TYPE_HINTS[setting.type];
        error(
          file,
          "unknown-setting-type",
          `${label}: "${setting.type}" is not a Widgetizer setting type.` +
            (hint ? ` Use ${hint}.` : didYouMean(String(setting.type), SETTING_TYPES)) +
            ` Supported: ${[...SETTING_TYPES].join(", ")}.`,
        );
        return;
      }

      for (const key of Object.keys(setting)) {
        if (!SETTING_PROPERTIES.has(key)) {
          const hint = key === "info" ? ' Use "description".' : key === "name" ? ' Use "label".' : "";
          warn(file, "unknown-setting-property", `${label}: "${key}" is not a setting property the app reads.${hint}`);
        }
      }

      if (typeof setting.label !== "string" || setting.label === "") {
        error(file, "setting-label", `${label} needs a "label".`);
      }
      if (setting.type === "header") return;

      if (typeof setting.id !== "string" || setting.id === "") {
        error(file, "setting-id", `${label} needs an "id".`);
        return;
      }
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(setting.id)) {
        warn(
          file,
          "setting-id",
          `${label}: use letters, digits and underscores so Liquid can read it as settings.${setting.id}.`,
        );
      }
      if (byId.has(setting.id)) {
        error(file, "duplicate-setting-id", `${where}: setting id "${setting.id}" is used more than once.`);
      }
      byId.set(setting.id, setting);

      if (setting.type === "select" || setting.type === "radio") {
        const options = setting.options;
        if (!Array.isArray(options) || options.length === 0) {
          error(file, "setting-options", `${label} needs a non-empty "options" array of { "value", "label" }.`);
        } else if (
          options.some((option) => !isObject(option) || option.value === undefined || typeof option.label !== "string")
        ) {
          error(file, "setting-options", `${label}: every option needs a "value" and a "label".`);
        }
      }
      if (setting.type === "range" && (typeof setting.min !== "number" || typeof setting.max !== "number")) {
        error(file, "setting-range", `${label} needs numeric "min" and "max".`);
      }
      if (setting.type === "table") checkTableColumns(file, setting, label);
      if (setting.outputAsCssVar !== undefined && where.startsWith("widget")) {
        warn(file, "css-var-scope", `${label}: "outputAsCssVar" only works on global theme settings in theme.json.`);
      }

      if (setting.default !== undefined) {
        for (const problem of valueProblems(setting, setting.default)) {
          error(file, "setting-default", `${label}: default ${problem}.`);
        }
      }
      if (setting.defaultKey !== undefined) checkSiteKey(file, setting.defaultKey, `${label} defaultKey`);
    });
    return byId;
  }

  function checkTableColumns(file, setting, label) {
    const columns = setting.columns;
    if (!Array.isArray(columns) || columns.length === 0) {
      error(file, "table-columns", `${label} needs a non-empty "columns" array.`);
      return;
    }
    const seen = new Set();
    for (const column of columns) {
      if (
        !isObject(column) ||
        typeof column.id !== "string" ||
        !TABLE_COLUMN_ID_RE.test(column.id) ||
        RESERVED_COLUMN_IDS.has(column.id)
      ) {
        error(
          file,
          "table-columns",
          `${label}: column ids must match ${TABLE_COLUMN_ID_RE} (found ${JSON.stringify(column?.id)}).`,
        );
        continue;
      }
      if (seen.has(column.id)) error(file, "table-columns", `${label}: column id "${column.id}" is used twice.`);
      seen.add(column.id);
      if (column.type !== "text")
        error(file, "table-columns", `${label}: column "${column.id}" must have type "text".`);
    }
  }

  /** Check a stored settings object (template instance, preset item, preset override) against definitions. */
  function checkSettingValues(file, values, definitions, where, { unknownIsError = true } = {}) {
    if (values === undefined) return;
    if (!isObject(values)) {
      error(
        file,
        "settings-shape",
        `${where}: "settings" must be an object keyed by setting id (definitions are arrays, stored values are objects).`,
      );
      return;
    }
    for (const [id, value] of Object.entries(values)) {
      const setting = definitions.get(id);
      if (!setting) {
        const message = `${where}: "${id}" is not a setting of this ${where.includes("block") ? "block" : "widget"}.${didYouMean(id, definitions.keys())}`;
        if (unknownIsError) error(file, "unknown-setting", message);
        else warn(file, "unknown-setting", message);
        continue;
      }
      for (const problem of valueProblems(setting, value)) {
        error(file, "setting-value", `${where}: "${id}" ${problem}.`);
      }
    }
  }

  function checkSiteKey(file, key, where) {
    if (typeof key !== "string" || key === "") {
      error(file, "translation-key", `${where} must be a visitor-string key such as "site.common.next".`);
      return;
    }
    const dotted = key.startsWith("site.") ? key.slice(5) : key;
    const inTheme = typeof valueAt(theme.locale?.site, dotted) === "string";
    if (!inTheme && !CORE_SITE_KEYS.has(`site.${dotted}`)) {
      error(
        file,
        "unknown-translation-key",
        `${where}: "${key}" is not in locales/en.json under "site" (and is not a core string). An unknown key renders as its last word.`,
      );
    }
  }

  function checkLabelKeys(file, json) {
    walkStrings(json, (value) => {
      if (!value.startsWith("tTheme:")) return;
      const key = value.slice("tTheme:".length);
      if (typeof valueAt(theme.locale, key) !== "string") {
        error(file, "unknown-label-key", `"${value}" has no matching string in locales/en.json (expected at ${key}).`);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Liquid scanning
  // ---------------------------------------------------------------------------

  /** Replace string-literal contents with underscores so punctuation inside them is ignored. Length is preserved. */
  const maskStrings = (text) =>
    text.replace(/'[^']*'|"[^"]*"/g, (literal) => literal[0] + "_".repeat(literal.length - 2) + literal[0]);

  function literalValue(token) {
    return token && [TokenKind.Quoted, TokenKind.Number, TokenKind.Literal].includes(token.kind)
      ? token.content
      : undefined;
  }

  function tagArguments(tag) {
    const hash = tag.node.hash || new Hash(tag.args);
    return Object.entries(hash.hash).map(([key, token]) => ({
      key,
      value: token?.getText() ?? "",
      literal: literalValue(token),
    }));
  }

  function scanLiquid(source, file) {
    const templates = engine.parse(source, file);
    const tags = [];
    const outputs = [];
    const visit = (nodes) => {
      for (const node of nodes) {
        const token = node.token;
        const line = token.getPosition()[0];
        if (token.kind === TokenKind.Tag) {
          const name = token.name;
          if (!["raw", "comment", "#", "liquid"].includes(name)) {
            tags.push({ name, args: token.content.slice(name.length).trim(), line, node });
          }
          // App hash tags expose their parsed arguments to LiquidJS's scope analysis.
          // This annotates this parse only; the runtime tag implementations stay unchanged.
          if (Object.hasOwn(CUSTOM_TAGS, name) && node.hash && !node.arguments) {
            node.arguments = () => Object.values(node.hash.hash).filter(Boolean);
          }
          if (name === "echo") outputs.push({ body: token.content.slice(name.length).trim(), line, node });
        } else if (token.kind === TokenKind.Output) {
          outputs.push({ body: token.content, line, node });
        }
        // Each snippet is checked separately in its own scope. Do not follow includes here.
        if (node.children) visit(toValueSync(node.children(false, true)));
      }
    };
    visit(templates);
    return { tags, outputs, analysis: engine.analyzeSync(templates, { partials: false }) };
  }

  /**
   * @param {string} file
   * @param {object} context
   *   kind: "layout" | "widget" | "snippet" | "item-template"
   *   widget: the widget record, for kind "widget"
   */
  function checkLiquid(file, context) {
    const source = fs.readFileSync(file, "utf8");
    let parsed;
    try {
      parsed = scanLiquid(source, file);
    } catch (cause) {
      const unknownTag = cause.message.match(/tag ["']?([\w-]+)["']? not found/);
      const unknownFilter = cause.message.match(/undefined filter: ([\w-]+)/);
      const rule = unknownTag ? "unknown-tag" : unknownFilter ? "unknown-filter" : "liquid-syntax";
      const hint = unknownTag
        ? FOREIGN_TAG_HINTS[unknownTag[1]]
        : unknownFilter
          ? FOREIGN_FILTER_HINTS[unknownFilter[1]]
          : "";
      error(file, rule, `${cause.message}${hint ? ` ${hint}` : ""}`);
      return null;
    }
    const { tags, outputs, analysis } = parsed;
    const at = (line) => `line ${line}: `;
    const widget = context.widget;

    for (const tag of tags) {
      if (tag.name === "layout" || tag.name === "block") {
        warn(
          file,
          "unsupported-tag",
          `${at(tag.line)}{% ${tag.name} %} is not part of the theme contract; layout.liquid is the only layout.`,
        );
      }
      if (tag.name === "include") {
        warn(
          file,
          "prefer-render",
          `${at(tag.line)}use {% render %} instead of {% include %}; pass what the snippet needs as arguments.`,
        );
      }

      if (tag.name === "render" || tag.name === "include") checkRenderTag(file, tag, at);
      if (Object.hasOwn(CUSTOM_TAGS, tag.name)) checkCustomTag(file, tag, context, at);
      if (tag.name === "for" && /\bin\s+widget\.blocks\b(?!Order)/.test(tag.args)) {
        error(
          file,
          "block-order",
          `${at(tag.line)}loop over widget.blocksOrder and read widget.blocks[id]; looping widget.blocks ignores the order the author set.`,
        );
      }
    }

    // Literal visitor-string keys are app data, beyond Liquid's syntax checks.
    for (const piece of [
      ...tags.map((tag) => ({ text: tag.args, line: tag.line })),
      ...outputs.map((output) => ({ text: output.body, line: output.line })),
    ]) {
      // Literal visitor-string keys: 'site.x.y' | t
      for (const match of piece.text.matchAll(/(['"])([\w.-]+)\1\s*\|\s*t\b(?![\w])/g)) {
        checkSiteKey(file, match[2], `${at(piece.line)}t filter`);
      }
    }
    checkReferences(file, analysis, context, at);

    for (const output of outputs) checkOutput(file, output, context, at);

    if (context.kind === "widget") {
      if (!/data-widget-id\s*=\s*["']\{\{-?\s*widget\.id\s*-?\}\}["']/.test(source)) {
        error(
          file,
          "editor-attributes",
          'The widget\'s outer element needs data-widget-id="{{ widget.id }}" or the editor cannot select or update it.',
        );
      }
      if (widget.blocks.size > 0) {
        if (!/widget\.blocksOrder/.test(source)) {
          warn(file, "block-order", "The schema declares blocks but the template never reads widget.blocksOrder.");
        } else if (!/data-block-id/.test(source)) {
          warn(
            file,
            "editor-attributes",
            "Each rendered block needs data-block-id set to its id so the editor can select it.",
          );
        }
      }
    }
    return { tags, outputs, source };
  }

  function checkRenderTag(file, tag, at) {
    const literal = typeof tag.node.file === "string" ? tag.node.file : literalValue(tag.node.file);
    if (typeof literal !== "string") return;
    const name = literal.replace(/\.liquid$/, "");
    if (!theme.snippets.has(name) && !CORE_SNIPPETS.has(name)) {
      error(
        file,
        "missing-snippet",
        `${at(tag.line)}snippet "${name}" does not exist in snippets/ (core snippets: ${[...CORE_SNIPPETS].join(", ")}).${didYouMean(name, [...theme.snippets, ...CORE_SNIPPETS])}`,
      );
    }
    if (name === "icon" && theme.icons) {
      const icon = tagArguments(tag).find((argument) => argument.key === "icon");
      if (icon && typeof icon.literal === "string" && icon.literal !== "" && !theme.icons.has(icon.literal)) {
        warn(
          file,
          "unknown-icon",
          `${at(tag.line)}icon "${icon.literal}" is not in assets/icons.json.${didYouMean(icon.literal, theme.icons)}`,
        );
      }
    }
  }

  function checkCustomTag(file, tag, context, at) {
    const allowed = CUSTOM_TAGS[tag.name];
    const args = tagArguments(tag);
    const named = new Map(args.filter((argument) => argument.key).map((argument) => [argument.key, argument]));
    const tagLabel = `{% ${tag.name} %}`;

    if (allowed.length === 0) {
      if (args.length > 0) warn(file, "tag-arguments", `${at(tag.line)}${tagLabel} takes no arguments.`);
      return;
    }
    for (const key of named.keys()) {
      if (!allowed.includes(key)) {
        error(
          file,
          "unknown-tag-argument",
          `${at(tag.line)}${tagLabel} has no "${key}" argument. It accepts: ${allowed.join(", ")}.${didYouMean(key, allowed)}`,
        );
      }
    }
    if (args.some((argument) => argument.value === "")) {
      error(file, "tag-arguments", `${at(tag.line)}${tagLabel} takes named values, e.g. {% ${tag.name} src: ... %}.`);
    }
    if (!named.has("src")) {
      if (tag.name !== "placeholder_image")
        error(file, "tag-arguments", `${at(tag.line)}${tagLabel} needs "src"; without it the tag prints nothing.`);
    }
    if (tag.name === "enqueue_preload" && !named.has("as")) {
      error(file, "tag-arguments", `${at(tag.line)}${tagLabel} needs "as" (image, style, script, font...).`);
    }
    for (const flag of ["defer", "async", "theme", "lazy", "srcset", "autoplay", "controls", "mute", "loop"]) {
      const argument = named.get(flag);
      if (argument && typeof argument.literal === "string" && allowed.includes(flag)) {
        error(file, "tag-arguments", `${at(tag.line)}${tagLabel} "${flag}" must be true or false without quotes.`);
      }
    }

    const src = named.get("src");
    const srcLiteral = src && typeof src.literal === "string" ? splitAssetRef(src.literal).path : null;

    if (tag.name === "image") {
      const size = named.get("size");
      if (size && typeof size.literal === "string" && !theme.imageSizes.has(size.literal)) {
        warn(
          file,
          "image-size",
          `${at(tag.line)}image size "${size.literal}" is not a default size (${[...theme.imageSizes].join(", ")}); it will fall back to the original.`,
        );
      }
      if (srcLiteral !== null && srcLiteral !== "" && !srcLiteral.startsWith("/uploads/images/")) {
        error(
          file,
          "image-source",
          `${at(tag.line)}{% image %} only loads media-library images. For a file in the theme's assets/ use {% asset src: '${srcLiteral}' %}.`,
        );
      }
    }

    if (tag.name === "enqueue_style" || tag.name === "enqueue_script") {
      theme.usesEnqueue = true;
      if (srcLiteral === null) return;
      const shared = named.get("theme")?.literal === true || context.kind !== "widget";
      if (shared) {
        if (!theme.assets.has(srcLiteral))
          error(file, "missing-asset", `${at(tag.line)}"${srcLiteral}" does not exist in the theme's assets/ folder.`);
      } else {
        if (srcLiteral.includes("/")) {
          warn(
            file,
            "widget-asset-path",
            `${at(tag.line)}keep widget CSS/JS at the widget's root; export copies it by file name only.`,
          );
        }
        if (!isFile(path.join(context.widget.dir, srcLiteral))) {
          const inAssets = theme.assets.has(srcLiteral);
          error(
            file,
            "missing-asset",
            `${at(tag.line)}"${srcLiteral}" does not exist beside this widget's template.` +
              (inAssets ? " It is in assets/: add `theme: true`." : ""),
          );
        } else {
          context.widget.enqueued.add(srcLiteral);
        }
      }
    }

    if (tag.name === "asset" && srcLiteral !== null) {
      if (context.kind === "widget") {
        if (/\.(css|js)$/.test(srcLiteral)) {
          warn(
            file,
            "asset-in-widget",
            `${at(tag.line)}inside a widget use {% enqueue_style %} / {% enqueue_script %}; a direct {% asset %} is not added to the export.`,
          );
        }
      } else if (!theme.assets.has(srcLiteral)) {
        error(file, "missing-asset", `${at(tag.line)}"${srcLiteral}" does not exist in the theme's assets/ folder.`);
      }
    }

    if (tag.name === "placeholder_image") {
      const aspect = named.get("aspect");
      if (
        aspect &&
        typeof aspect.literal === "string" &&
        !["landscape", "portrait", "square"].includes(aspect.literal)
      ) {
        warn(
          file,
          "tag-arguments",
          `${at(tag.line)}placeholder aspect "${aspect.literal}" is not landscape, portrait or square.`,
        );
      }
      if (srcLiteral !== null && !theme.assets.has(srcLiteral)) {
        error(file, "missing-asset", `${at(tag.line)}"${srcLiteral}" does not exist in the theme's assets/ folder.`);
      }
    }
  }

  /** Setting types declared under `id` anywhere a non-widget `.settings.<id>` could point. */
  function typesForLooseSetting(id, widget) {
    const types = new Set();
    const sources = [];
    if (widget) sources.push(...widget.blocks.values());
    else for (const record of theme.widgets.values()) sources.push(record.settings, ...record.blocks.values());
    for (const collection of theme.collections.values()) sources.push(collection.fields);
    for (const source of sources) if (source.has(id)) types.add(source.get(id).type);
    return types;
  }

  function checkReferences(file, analysis, context, at) {
    const widget = context.widget;
    for (const [needle, hint] of Object.entries(FOREIGN_OBJECTS)) {
      const parts = needle.replace(/\.$/, "").split(".");
      // Snippet parameters are supplied by their caller; arbitrary names are valid.
      if (context.kind === "snippet") continue;
      for (const reference of analysis.globals[parts[0]] || []) {
        if (parts.every((part, index) => reference.segments[index] === part)) {
          error(
            file,
            "foreign-object",
            `${at(reference.location.row)}"${needle.replace(/\.$/, "")}" is not a supplied Widgetizer object. ${hint}`,
          );
        }
      }
    }

    for (const reference of Object.values(analysis.variables).flat()) {
      const [owner, group, id] = reference.segments;
      if (typeof id !== "string") continue; // Computed keys need runtime data.
      const prefix = at(reference.location.row);
      if (owner === "widget" && group === "settings" && widget) {
        if (widget.settings.has(id) || (widget.schema.collection && Object.hasOwn(INJECTED_LISTING_SETTINGS, id)))
          continue;
        error(
          file,
          "unknown-setting",
          `${prefix}widget.settings.${id} is not declared in this widget's schema.json.${didYouMean(id, widget.settings.keys())}`,
        );
      } else if (group === "settings" && owner !== "widget" && owner !== "section" && context.kind !== "snippet") {
        if (typesForLooseSetting(id, widget).size === 0) {
          warn(
            file,
            "unknown-setting",
            `${prefix}${owner}.settings.${id} does not match a known block or collection field; verify the value supplied at runtime.`,
          );
        }
      }
    }

    for (const reference of analysis.globals.theme || []) {
      const [, group, id] = reference.segments;
      if (typeof group !== "string") continue;
      const settings = theme.groups.get(group);
      if (!settings) {
        error(
          file,
          "unknown-theme-setting",
          `${at(reference.location.row)}theme.${group}: theme.json has no settings group "${group}".${didYouMean(group, theme.groups.keys())}`,
        );
      } else if (typeof id === "string" && !settings.has(id) && !["size", "first", "last"].includes(id)) {
        error(
          file,
          "unknown-theme-setting",
          `${at(reference.location.row)}theme.${group}.${id} is not a setting in theme.json.${didYouMean(id, settings.keys())}`,
        );
      }
    }
  }

  function checkOutput(file, output, context, at) {
    const masked = maskStrings(output.body);
    const initial = output.node.value.initial.postfix;
    const props = initial.length === 1 ? initial[0].props : undefined;
    const base = props?.every((token) => [TokenKind.Word, TokenKind.Quoted].includes(token.kind))
      ? props.map((token) => token.content).join(".")
      : masked.split("|")[0].trim();
    const filters = output.node.value.filters.map((filter) => filter.name);
    const isRaw = filters.includes("raw");
    const neutralised = filters.some((filter) =>
      ["escape", "escape_once", "strip_html", "rte_text", "url_encode", "handleize"].includes(filter),
    );

    if (context.kind === "layout" && ["header", "main_content", "footer"].includes(base) && !isRaw) {
      error(file, "layout-raw", `${at(output.line)}{{ ${base} }} is rendered HTML; print it with {{ ${base} | raw }}.`);
    }

    const reference = base.match(/^([a-zA-Z_]\w*)\.settings\.([a-zA-Z_]\w*)$/);
    if (!reference) return;
    const [, owner, id] = reference;

    let types;
    if (owner === "widget" && context.widget) {
      const setting = context.widget.settings.get(id);
      types = new Set(setting ? [setting.type] : []);
    } else if (context.kind !== "snippet") {
      types = typesForLooseSetting(id, context.widget);
    } else {
      return;
    }
    if (types.size === 0) return;

    const allPlain = [...types].every((type) => !RAW_SAFE_TYPES.has(type));
    const allRich = [...types].every((type) => type === "richtext");
    if (isRaw && allPlain && !neutralised) {
      error(
        file,
        "raw-on-plain-text",
        `${at(output.line)}${base} is a ${[...types].join("/")} setting; "| raw" would print visitor-unsafe HTML. Remove raw, or make the setting richtext.`,
      );
    }
    if (
      !isRaw &&
      allRich &&
      !filters.some((filter) =>
        ["strip_html", "rte_text", "rte_blank", "truncate", "truncatewords", "size"].includes(filter),
      )
    ) {
      warn(
        file,
        "richtext-without-raw",
        `${at(output.line)}${base} is richtext; without "| raw" its HTML shows as text.`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // theme.json, locales, icons, assets, snippets
  // ---------------------------------------------------------------------------

  function loadManifest() {
    const file = path.join(themeRoot, "theme.json");
    if (!isFile(file)) {
      error(file, "required-file", "theme.json is required.");
      return;
    }
    const manifest = readJson(file);
    if (!isObject(manifest)) return;
    theme.manifest = manifest;

    for (const key of ["name", "version", "author"]) {
      if (!manifest[key]) error(file, "manifest", `"${key}" is required.`);
    }
    if (manifest.version && !VERSION_RE.test(String(manifest.version))) {
      error(
        file,
        "manifest",
        `version "${manifest.version}" must be digits.digits.digits, for example 1.0.0 (no "v", no suffix).`,
      );
    }

    const settings = manifest.settings;
    if (settings !== undefined && !isObject(settings)) {
      error(file, "manifest", '"settings" must be an object.');
      return;
    }
    const global = settings?.global;
    if (global !== undefined && !isObject(global)) {
      error(file, "manifest", '"settings.global" must be an object of group name → array of settings.');
      return;
    }

    for (const [group, definitions] of Object.entries(global || {})) {
      const byId = checkSettingDefinitions(file, definitions, `theme group "${group}"`);
      theme.groups.set(group, byId);
      for (const [id, setting] of byId) {
        if (!theme.globalSettingsById.has(id)) theme.globalSettingsById.set(id, []);
        theme.globalSettingsById.get(id).push(setting);

        const reserved = RESERVED_GROUP_FOR_SETTING[id];
        if (reserved && reserved[0] !== group) {
          warn(
            file,
            "reserved-group",
            `"${id}" is in group "${group}", but the app reads it only from "${reserved[0]}" (${reserved[1]}).`,
          );
        }
        if (setting.type === "font_picker" && group !== "typography") {
          warn(
            file,
            "reserved-group",
            `font picker "${id}" is in group "${group}"; {% fonts %} only loads fonts picked in the "typography" group.`,
          );
        }
      }
    }
    for (const [id, definitions] of theme.globalSettingsById) {
      if (definitions.length > 1) {
        warn(
          file,
          "duplicate-setting-id",
          `global setting id "${id}" appears in more than one group; preset overrides are a flat id map and would change all of them.`,
        );
      }
    }

    if (isObject(settings?.imageSizes)) {
      theme.imageSizes = new Set(["thumb", ...Object.keys(settings.imageSizes)]);
    }
    checkLabelKeys(file, manifest);
  }

  function loadLocales() {
    const dir = path.join(themeRoot, "locales");
    const english = path.join(dir, "en.json");
    if (!isFile(english)) {
      warn(
        english,
        "locales",
        'locales/en.json is missing. Add at least {} plus "global.<group>.name" for each theme settings group.',
      );
      return;
    }
    theme.locale = readJson(english) || {};
    for (const name of listFiles(dir, ".json")) {
      if (name !== "en.json") readJson(path.join(dir, name));
    }
  }

  function checkGroupNames() {
    if (!theme.locale) return;
    for (const group of theme.groups.keys()) {
      if (typeof valueAt(theme.locale, `global.${group}.name`) !== "string") {
        warn(
          path.join(themeRoot, "locales", "en.json"),
          "group-name",
          `Add "global.${group}.name"; the editor shows it as the settings group's title.`,
        );
      }
    }
  }

  function loadIcons() {
    const file = path.join(themeRoot, "assets", "icons.json");
    if (!isFile(file)) return;
    const data = readJson(file);
    if (!isObject(data)) return;
    const names = new Set();
    const add = (icons) => {
      for (const [name, icon] of Object.entries(icons)) {
        names.add(name);
        if (!isObject(icon) || typeof icon.body !== "string" || !icon.body.trim().startsWith("<svg")) {
          error(file, "icons", `icon "${name}" must be { "body": "<svg ...>...</svg>" }.`);
        }
      }
    };
    if (isObject(data.icons)) add(data.icons);
    else if (isObject(data.groups)) Object.values(data.groups).forEach((group) => isObject(group) && add(group));
    else
      error(
        file,
        "icons",
        'icons.json needs either "icons": { name: { body } } or "groups": { Group: { name: { body } } }.',
      );
    theme.icons = names;
  }

  function loadAssets() {
    const root = path.join(themeRoot, "assets");
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else theme.assets.add(path.relative(root, full).split(path.sep).join("/"));
      }
    };
    if (isDir(root)) walk(root);
  }

  function loadSnippets() {
    for (const name of listFiles(path.join(themeRoot, "snippets"), ".liquid")) {
      theme.snippets.add(name.replace(/\.liquid$/, ""));
    }
  }

  // ---------------------------------------------------------------------------
  // Collections
  // ---------------------------------------------------------------------------

  function loadCollections() {
    const root = path.join(themeRoot, "collection-types");
    const prefixes = new Map();

    for (const folder of listDirs(root)) {
      const dir = path.join(root, folder);
      const file = path.join(dir, "schema.json");
      if (!isFile(file)) {
        error(file, "required-file", `collection-types/${folder}/ needs a schema.json.`);
        continue;
      }
      const schema = readJson(file);
      if (!isObject(schema)) continue;

      if (typeof schema.type !== "string" || !SLUG_RE.test(schema.type)) {
        error(file, "collection-type", `"type" must match ${SLUG_RE}.`);
      } else if (schema.type !== folder) {
        error(file, "collection-type", `"type" is "${schema.type}" but the folder is "${folder}"; they must match.`);
      }
      if ("blocks" in schema)
        error(
          file,
          "collection-schema",
          "Collections have no blocks; items are flat records. Use a gallery or table field for repeated content.",
        );

      const fields = checkSettingDefinitions(file, schema.settings ?? [], "collection");
      if (!Array.isArray(schema.settings)) error(file, "collection-schema", '"settings" must be an array of fields.');
      for (const setting of Array.isArray(schema.settings) ? schema.settings : []) {
        for (const key of ["multiple", "repeater", "blocks"]) {
          if (isObject(setting) && key in setting)
            error(file, "collection-schema", `field "${setting.id}": "${key}" is not supported.`);
        }
      }

      const validation = validateCollectionSchema(schema, folder);
      for (const message of validation.errors) error(file, "collection-schema", message);

      if (schema.hasItemPages) {
        const prefix = schema.slugPrefix ?? schema.type;
        if (typeof prefix !== "string" || !SLUG_RE.test(prefix) || prefix === "assets") {
          error(file, "collection-prefix", `slugPrefix "${prefix}" must match ${SLUG_RE} and cannot be "assets".`);
        } else {
          if (prefix === "page")
            warn(file, "collection-prefix", 'slugPrefix "page" collides with pagination paths (page/2/...).');
          if (prefixes.has(prefix))
            error(
              file,
              "collection-prefix",
              `slugPrefix "${prefix}" is also used by collection "${prefixes.get(prefix)}".`,
            );
          prefixes.set(prefix, schema.type);
        }
        if (!isFile(path.join(dir, "template.liquid"))) {
          error(
            path.join(dir, "template.liquid"),
            "required-file",
            '"hasItemPages" is true, so this collection needs a template.liquid.',
          );
        }
      }

      checkLabelKeys(file, schema);
      theme.collections.set(folder, { schema, fields, dir });
    }
  }

  // ---------------------------------------------------------------------------
  // Widgets
  // ---------------------------------------------------------------------------

  function loadWidget(dir, folder, isGlobal) {
    const file = path.join(dir, "schema.json");
    const template = path.join(dir, "widget.liquid");
    if (!isFile(file)) error(file, "required-file", `Widget "${folder}" needs a schema.json.`);
    if (!isFile(template)) error(template, "required-file", `Widget "${folder}" needs a widget.liquid.`);
    if (!isFile(file)) return;

    const schema = readJson(file);
    if (!isObject(schema)) return;

    if (schema.type !== folder)
      error(
        file,
        "widget-type",
        `"type" is ${JSON.stringify(schema.type)} but the folder is "${folder}"; they must match.`,
      );
    if (!isGlobal && (folder === "header" || folder === "footer")) {
      error(file, "widget-type", `"${folder}" is reserved for the global widget at widgets/global/${folder}/.`);
    }
    if (folder.startsWith("core-"))
      error(file, "widget-type", 'Widget types starting with "core-" are reserved for the app\'s own widgets.');
    if (typeof schema.displayName !== "string" || schema.displayName === "")
      warn(file, "widget-name", 'Add a "displayName"; the editor shows it in the widget picker.');
    for (const key of Object.keys(schema)) {
      if (!WIDGET_SCHEMA_PROPERTIES.has(key))
        warn(file, "unknown-schema-property", `"${key}" is not a widget schema property the app reads.`);
    }

    const settings = checkSettingDefinitions(file, schema.settings, "widget");
    const blocks = new Map();
    if (schema.blocks !== undefined) {
      if (!Array.isArray(schema.blocks)) error(file, "blocks-shape", '"blocks" must be an array of block definitions.');
      else {
        for (const block of schema.blocks) {
          if (!isObject(block) || typeof block.type !== "string" || block.type === "") {
            error(file, "blocks-shape", 'Every block definition needs a "type".');
            continue;
          }
          if (blocks.has(block.type)) error(file, "blocks-shape", `Block type "${block.type}" is defined twice.`);
          if (typeof block.displayName !== "string")
            warn(file, "widget-name", `Block "${block.type}" should have a "displayName".`);
          if ("blocks" in block) error(file, "blocks-shape", `Block "${block.type}": blocks cannot contain blocks.`);
          blocks.set(block.type, checkSettingDefinitions(file, block.settings, `widget block "${block.type}"`));
        }
      }
    }

    if (schema.maxBlocks !== undefined && (typeof schema.maxBlocks !== "number" || schema.maxBlocks < 0)) {
      error(file, "blocks-shape", '"maxBlocks" must be a number (0 or omitted means unlimited).');
    }
    if (schema.defaultBlocks !== undefined) {
      if (!Array.isArray(schema.defaultBlocks))
        error(file, "blocks-shape", '"defaultBlocks" must be an array of block instances.');
      else {
        schema.defaultBlocks.forEach((instance, index) => {
          const where = `defaultBlocks[${index}] block`;
          const definitions = blocks.get(instance?.type);
          if (!definitions) {
            error(
              file,
              "unknown-block-type",
              `${where}: "${instance?.type}" is not a block type of this widget.${didYouMean(String(instance?.type), blocks.keys())}`,
            );
            return;
          }
          checkSettingValues(file, instance.settings, definitions, where);
          for (const [id, key] of Object.entries(instance.defaultKeys || {})) {
            if (!definitions.has(id))
              error(
                file,
                "unknown-setting",
                `${where}: defaultKeys "${id}" is not a setting of block "${instance.type}".`,
              );
            checkSiteKey(file, key, `${where} defaultKeys.${id}`);
          }
        });
      }
    }

    if (schema.collection !== undefined) {
      const declaration = schema.collection;
      if (!isObject(declaration) || typeof declaration.type !== "string") {
        error(file, "collection-listing", '"collection" must be { "type": "<collection type>" }.');
      } else {
        if (!theme.collections.has(declaration.type)) {
          error(
            file,
            "collection-listing",
            `"collection.type" is "${declaration.type}", but collection-types/${declaration.type}/ does not exist.${didYouMean(declaration.type, theme.collections.keys())}`,
          );
        }
        if (declaration.perPageSetting !== undefined) {
          const perPage = settings.get(declaration.perPageSetting);
          if (!perPage)
            error(
              file,
              "collection-listing",
              `"collection.perPageSetting" names "${declaration.perPageSetting}", which is not a setting of this widget.`,
            );
          else if (!["number", "range"].includes(perPage.type))
            error(
              file,
              "collection-listing",
              `"collection.perPageSetting" must name a number setting; "${declaration.perPageSetting}" is ${perPage.type}.`,
            );
        }
        for (const id of Object.keys(INJECTED_LISTING_SETTINGS)) {
          if (settings.has(id))
            warn(
              file,
              "collection-listing",
              `Do not define "${id}" yourself; the editor adds it to a collection widget.`,
            );
        }
      }
    }

    checkLabelKeys(file, schema);
    theme.widgets.set(folder, { dir, file, template, schema, settings, blocks, isGlobal, enqueued: new Set() });
  }

  function loadWidgets() {
    const root = path.join(themeRoot, "widgets");
    for (const folder of listDirs(root)) {
      if (folder === "global") continue;
      loadWidget(path.join(root, folder), folder, false);
    }
    for (const folder of listDirs(path.join(root, "global"))) {
      if (folder !== "header" && folder !== "footer") {
        warn(
          path.join(root, "global", folder),
          "widget-type",
          `widgets/global/ only holds "header" and "footer"; "${folder}" will not be used.`,
        );
        continue;
      }
      loadWidget(path.join(root, "global", folder), folder, true);
    }
  }

  function checkWidgetAssets() {
    // Export copies widget CSS/JS into one shared assets/ folder by file name.
    const owners = new Map();
    for (const name of theme.assets) {
      if (!name.includes("/") && /\.(css|js)$/.test(name)) owners.set(name, "assets/");
    }
    for (const [type, widget] of theme.widgets) {
      for (const name of listFiles(widget.dir).filter((file) => /\.(css|js)$/.test(file))) {
        const where = `widgets/${widget.isGlobal ? "global/" : ""}${type}/`;
        if (owners.has(name)) {
          error(
            path.join(widget.dir, name),
            "asset-name-collision",
            `"${name}" also exists in ${owners.get(name)}. Export copies widget files by name into one folder, so names must be unique (e.g. ${type}-${name}).`,
          );
        } else {
          owners.set(name, where);
        }
        if (!widget.enqueued.has(name)) {
          warn(
            path.join(widget.dir, name),
            "unused-widget-asset",
            `"${name}" is never enqueued by this widget's template, so it will not load or export.`,
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Menus and starter pages
  // ---------------------------------------------------------------------------

  function checkMenus(dir) {
    const ids = new Set();
    for (const name of listFiles(dir, ".json")) {
      const file = path.join(dir, name);
      const menu = readJson(file);
      if (!isObject(menu)) continue;
      const id = name.replace(/\.json$/, "");
      ids.add(id);
      if (menu.id !== id) warn(file, "menu", `"id" should be "${id}" to match the file name.`);
      if (typeof menu.name !== "string" || menu.name === "")
        warn(file, "menu", 'Add a "name"; the editor lists menus by it.');
      if (!Array.isArray(menu.items)) {
        error(file, "menu", '"items" must be an array.');
        continue;
      }
      const walk = (items, depth) => {
        for (const item of items) {
          if (!isObject(item) || typeof item.label !== "string" || typeof item.link !== "string") {
            error(
              file,
              "menu",
              'Every menu item needs "label" and "link" strings (a link *setting* uses "text" and "href"; a menu item does not).',
            );
            continue;
          }
          if (depth === 4)
            warn(file, "menu", `"${item.label}" is a fourth level; the core menu snippet renders three.`);
          if (item.items !== undefined && !Array.isArray(item.items))
            error(file, "menu", `"${item.label}": "items" must be an array.`);
          else if (item.items) walk(item.items, depth + 1);
        }
      };
      walk(menu.items, 1);
    }
    return ids;
  }

  function definitionsForInstance(type) {
    const widget = theme.widgets.get(type);
    if (widget)
      return {
        settings: widget.settings,
        blocks: widget.blocks,
        maxBlocks: widget.schema.maxBlocks,
        collection: widget.schema.collection,
      };
    if (Object.hasOwn(CORE_WIDGETS, type)) {
      if (theme.manifest?.useCoreWidgets === false) return null;
      if (!coreWidgetSchemas.has(type)) {
        coreWidgetSchemas.set(
          type,
          JSON.parse(fs.readFileSync(path.join(coreWidgetsDir, type, "schema.json"), "utf8")),
        );
      }
      const core = coreWidgetSchemas.get(type);
      const asMap = (settings = []) =>
        new Map(settings.filter((setting) => setting.type !== "header").map((setting) => [setting.id, setting]));
      return {
        settings: asMap(core.settings),
        blocks: new Map((core.blocks || []).map((block) => [block.type, asMap(block.settings)])),
        maxBlocks: core.maxBlocks,
        core: true,
      };
    }
    return null;
  }

  function checkLinkTargets(file, where, definitions, values, pageSlugs, menuIds) {
    for (const [id, value] of Object.entries(isObject(values) ? values : {})) {
      const setting = definitions.get(id);
      if (!setting) continue;
      if (setting.type === "link" && isObject(value) && typeof value.href === "string") {
        const page = value.href.match(/^([a-z0-9-]+)\.html(?:[#?].*)?$/);
        if (page && !pageSlugs.has(page[1])) {
          warn(
            file,
            "broken-link",
            `${where}: "${id}" links to ${value.href}, but there is no ${page[1]}.json page in this templates folder.`,
          );
        }
      }
      if (setting.type === "menu" && typeof value === "string" && value !== "" && !menuIds.has(value)) {
        warn(file, "missing-menu", `${where}: "${id}" names menu "${value}", but menus/${value}.json does not exist.`);
      }
    }
  }

  function checkWidgetInstance(file, key, instance, pageSlugs, menuIds, { global = false } = {}) {
    const where = `widget "${key}"`;
    if (!isObject(instance) || typeof instance.type !== "string") {
      error(file, "template-shape", `${where} needs a "type".`);
      return;
    }
    if (!global && (instance.type === "header" || instance.type === "footer")) {
      error(
        file,
        "template-shape",
        `${where}: "${instance.type}" is a global widget and belongs in templates/global/${instance.type}.json, not on a page.`,
      );
      return;
    }
    const definitions = definitionsForInstance(instance.type);
    if (!definitions) {
      const candidates = [...theme.widgets.keys(), ...Object.keys(CORE_WIDGETS)];
      error(
        file,
        "unknown-widget-type",
        `${where}: there is no widget "${instance.type}" in this theme${theme.manifest?.useCoreWidgets === false ? " (core widgets are switched off)" : ""}.${didYouMean(instance.type, candidates)}`,
      );
      return;
    }

    const settingDefinitions = new Map(definitions.settings);
    if (definitions.collection) {
      for (const [id, type] of Object.entries(INJECTED_LISTING_SETTINGS)) settingDefinitions.set(id, { id, type });
    }
    checkSettingValues(file, instance.settings, settingDefinitions, where);
    checkLinkTargets(file, where, settingDefinitions, instance.settings, pageSlugs, menuIds);

    const blocks = instance.blocks;
    const order = instance.blocksOrder;
    if (blocks === undefined && order === undefined) return;
    if (!isObject(blocks ?? {}) || !Array.isArray(order ?? [])) {
      error(
        file,
        "template-shape",
        `${where}: "blocks" must be an object keyed by block id and "blocksOrder" an array of those ids.`,
      );
      return;
    }
    const blockMap = blocks ?? {};
    const orderList = order ?? [];
    if (new Set(orderList).size !== orderList.length)
      error(file, "template-shape", `${where}: blocksOrder contains duplicate ids.`);
    for (const id of orderList) {
      if (!Object.hasOwn(blockMap, id))
        error(file, "template-shape", `${where}: blocksOrder lists "${id}", which is not in "blocks".`);
    }
    for (const [id, block] of Object.entries(blockMap)) {
      if (!orderList.includes(id))
        warn(file, "template-shape", `${where}: block "${id}" is not in blocksOrder, so it will not render.`);
      const blockWhere = `${where} block "${id}"`;
      const blockDefinitions = definitions.blocks.get(block?.type);
      if (!blockDefinitions) {
        error(
          file,
          "unknown-block-type",
          `${blockWhere}: "${block?.type}" is not a block type of widget "${instance.type}".${didYouMean(String(block?.type), definitions.blocks.keys())}`,
        );
        continue;
      }
      checkSettingValues(file, block.settings, blockDefinitions, blockWhere);
      checkLinkTargets(file, blockWhere, blockDefinitions, block.settings, pageSlugs, menuIds);
    }
    if (
      typeof definitions.maxBlocks === "number" &&
      definitions.maxBlocks > 0 &&
      orderList.length > definitions.maxBlocks
    ) {
      warn(
        file,
        "template-shape",
        `${where} has ${orderList.length} blocks; the widget's maxBlocks is ${definitions.maxBlocks}.`,
      );
    }
  }

  function checkTemplates(dir, menuIds) {
    const pageFiles = listFiles(dir, ".json");
    const pageSlugs = new Set(pageFiles.map((name) => name.replace(/\.json$/, "")));

    for (const name of pageFiles) {
      const file = path.join(dir, name);
      const page = readJson(file);
      if (!isObject(page)) continue;
      const slug = name.replace(/\.json$/, "");

      if (typeof page.name !== "string" || page.name === "")
        error(
          file,
          "template-shape",
          'A page needs a "name" (it is the page title source; there is no "title" property).',
        );
      if (page.slug !== slug)
        error(
          file,
          "template-shape",
          `"slug" is ${JSON.stringify(page.slug)} but the file is ${name}; they must match.`,
        );
      if (!SLUG_RE.test(slug) || slug === "page")
        error(file, "template-shape", `Page slug "${slug}" must match ${SLUG_RE} and cannot be "page".`);
      for (const foreign of ["sections", "order", "title", "layout"]) {
        if (foreign in page)
          error(
            file,
            "template-shape",
            `"${foreign}" is not a page property. Pages use "name", "slug", "widgets" and "widgetsOrder".`,
          );
      }

      const widgets = page.widgets ?? {};
      const order = page.widgetsOrder ?? [];
      if (!isObject(widgets) || !Array.isArray(order)) {
        error(
          file,
          "template-shape",
          '"widgets" must be an object keyed by widget id and "widgetsOrder" an array of those ids.',
        );
        continue;
      }
      if (new Set(order).size !== order.length) error(file, "template-shape", "widgetsOrder contains duplicate ids.");
      for (const id of order) {
        if (!Object.hasOwn(widgets, id))
          error(file, "template-shape", `widgetsOrder lists "${id}", which is not in "widgets".`);
      }
      let paginating = 0;
      for (const [id, instance] of Object.entries(widgets)) {
        if (!order.includes(id))
          warn(file, "template-shape", `Widget "${id}" is not in widgetsOrder, so it will not render.`);
        checkWidgetInstance(file, id, instance, pageSlugs, menuIds);
        if (instance?.settings?.paginate === true) paginating++;
      }
      if (paginating > 1) error(file, "pagination", "Only one widget per page may paginate.");
    }

    for (const type of ["header", "footer"]) {
      const file = path.join(dir, "global", `${type}.json`);
      if (!isFile(file)) continue;
      const instance = readJson(file);
      if (!isObject(instance)) continue;
      if ("widgets" in instance || "widgetsOrder" in instance) {
        error(
          file,
          "template-shape",
          `templates/global/${type}.json holds one widget instance ("type", "settings", optional "blocks"/"blocksOrder"), not a page's "widgets" map.`,
        );
        continue;
      }
      if (instance.type !== type) error(file, "template-shape", `"type" must be "${type}".`);
      else if (!theme.widgets.get(type)?.isGlobal)
        error(file, "unknown-widget-type", `There is no widgets/global/${type}/ to render this.`);
      else checkWidgetInstance(file, type, instance, pageSlugs, menuIds, { global: true });
    }
    return pageSlugs;
  }

  // ---------------------------------------------------------------------------
  // Layout, presets, updates, package
  // ---------------------------------------------------------------------------

  function checkLayout() {
    const file = path.join(themeRoot, "layout.liquid");
    if (!isFile(file)) {
      error(file, "required-file", "layout.liquid is required.");
      return;
    }
    const parsed = checkLiquid(file, { kind: "layout" });
    if (!parsed) return;
    const { tags, outputs } = parsed;
    const hasTag = (name) => tags.some((tag) => tag.name === name);
    const prints = (name) => outputs.some((output) => maskStrings(output.body).split("|")[0].trim() === name);

    if (!prints("main_content"))
      error(file, "layout", "The layout must print {{ main_content | raw }} or pages render empty.");
    for (const type of ["header", "footer"]) {
      if (theme.widgets.get(type)?.isGlobal && !prints(type))
        warn(file, "layout", `The theme has a global ${type} but the layout never prints {{ ${type} | raw }}.`);
    }
    if (!prints("body_class"))
      warn(file, "layout", 'Add class="{{ body_class }}" to <body>; the app uses it for page and state classes.');
    if (!hasTag("seo"))
      warn(file, "layout", "Add {% seo %} in <head>; it prints the title, meta, canonical and structured data.");
    if (!hasTag("header_assets") || !hasTag("footer_assets")) {
      const message =
        "The layout needs both {% header_assets %} (in <head>) and {% footer_assets %} (before </body>) to print enqueued CSS and JS.";
      if (theme.usesEnqueue) error(file, "layout", message);
      else warn(file, "layout", message);
    }
    const hasCssVars = [...theme.groups.values()].some((group) =>
      [...group.values()].some((setting) => setting.outputAsCssVar || setting.type === "font_picker"),
    );
    if (hasCssVars && !hasTag("theme_settings"))
      warn(
        file,
        "layout",
        "Settings use outputAsCssVar or font pickers, but the layout has no {% theme_settings %} to print them.",
      );
    if (
      [...(theme.groups.get("typography")?.values() ?? [])].some((setting) => setting.type === "font_picker") &&
      !hasTag("fonts")
    ) {
      warn(file, "layout", "The theme has font pickers, but the layout has no {% fonts %} to load the chosen fonts.");
    }
    for (const [tag, id] of [
      ["custom_css", "custom_css"],
      ["custom_head_scripts", "custom_head_scripts"],
      ["custom_footer_scripts", "custom_footer_scripts"],
    ]) {
      if (theme.groups.get("advanced")?.has(id) && !hasTag(tag))
        warn(file, "layout", `theme.json defines "${id}" but the layout has no {% ${tag} %}, so it does nothing.`);
    }
  }

  /** The theme's own screenshot is landscape; a preset's is square, because the app shows preset cards square. */
  function checkScreenshot(file, width, height) {
    if (!isFile(file)) return;
    const size = pngSize(file);
    if (!size) error(file, "screenshot", "screenshot.png is not a valid PNG file.");
    else if (size.width !== width || size.height !== height) {
      warn(file, "screenshot", `screenshot.png is ${size.width}×${size.height}; use ${width}×${height}.`);
    }
  }

  function checkPresets(rootMenuIds) {
    const root = path.join(themeRoot, "presets");
    if (!isDir(root)) return;
    const file = path.join(root, "presets.json");
    if (!isFile(file)) {
      error(file, "required-file", "presets/ needs a presets.json registry.");
      return;
    }
    const registry = readJson(file);
    if (!isObject(registry) || !Array.isArray(registry.presets)) {
      error(file, "presets", '"presets" must be an array of { "id", "name", "description" }.');
      return;
    }
    const ids = new Set();
    for (const preset of registry.presets) {
      if (!isObject(preset) || typeof preset.id !== "string" || typeof preset.name !== "string") {
        error(file, "presets", 'Every preset needs an "id" and a "name".');
        continue;
      }
      if (ids.has(preset.id)) error(file, "presets", `Preset id "${preset.id}" is listed twice.`);
      ids.add(preset.id);
    }
    if (registry.default !== undefined && !ids.has(registry.default))
      error(file, "presets", `"default" is "${registry.default}", which is not a listed preset.`);

    for (const folder of listDirs(root)) {
      if (!ids.has(folder))
        warn(
          path.join(root, folder),
          "presets",
          `presets/${folder}/ is not listed in presets.json, so it cannot be chosen.`,
        );
    }
    for (const id of ids) {
      const dir = path.join(root, id);
      if (!isDir(dir)) {
        if (id !== registry.default)
          warn(
            file,
            "presets",
            `Preset "${id}" has no presets/${id}/ folder; it silently falls back to the theme's own templates and settings.`,
          );
        continue;
      }
      if (isDir(path.join(dir, "collection-types")))
        error(
          path.join(dir, "collection-types"),
          "presets",
          "A preset cannot contain collection-types/; collection definitions belong to the theme.",
        );

      checkScreenshot(path.join(dir, "screenshot.png"), 1024, 1024);

      const overridesFile = path.join(dir, "preset.json");
      if (isFile(overridesFile)) {
        const overrides = readJson(overridesFile);
        if (isObject(overrides)) {
          if (!isObject(overrides.settings ?? {}))
            error(overridesFile, "presets", '"settings" must be a flat object of global setting id → value.');
          for (const [settingId, value] of Object.entries(isObject(overrides.settings) ? overrides.settings : {})) {
            const definitions = theme.globalSettingsById.get(settingId);
            if (!definitions) {
              warn(
                overridesFile,
                "unknown-setting",
                `"${settingId}" is not a global setting in theme.json, so this override does nothing.${didYouMean(settingId, theme.globalSettingsById.keys())}`,
              );
              continue;
            }
            for (const problem of valueProblems(definitions[0], value))
              error(overridesFile, "setting-value", `"${settingId}" ${problem}.`);
          }
        }
      }

      const menuIds = isDir(path.join(dir, "menus")) ? checkMenus(path.join(dir, "menus")) : rootMenuIds;
      checkTemplates(
        isDir(path.join(dir, "templates")) ? path.join(dir, "templates") : path.join(themeRoot, "templates"),
        menuIds,
      );

      for (const type of listDirs(path.join(dir, "collections"))) {
        const collection = theme.collections.get(type);
        const itemsDir = path.join(dir, "collections", type);
        if (!collection) {
          error(itemsDir, "presets", `Preset items for "${type}", but collection-types/${type}/ does not exist.`);
          continue;
        }
        for (const name of listFiles(itemsDir, ".json")) {
          if (name.startsWith("_")) continue;
          const itemFile = path.join(itemsDir, name);
          const item = readJson(itemFile);
          if (!isObject(item)) continue;
          if (item.slug !== name.replace(/\.json$/, ""))
            error(
              itemFile,
              "collection-item",
              `"slug" must be "${name.replace(/\.json$/, "")}" to match the file name.`,
            );
          checkSettingValues(itemFile, item.settings, collection.fields, "item");
          for (const field of collection.fields.values()) {
            const value = item.settings?.[field.id];
            if (field.required && (value === undefined || value === ""))
              error(itemFile, "collection-item", `Required field "${field.id}" is missing.`);
          }
        }
      }
    }
  }

  function checkUpdates() {
    const root = path.join(themeRoot, "updates");
    for (const version of listDirs(root)) {
      const file = path.join(root, version, "theme.json");
      if (!VERSION_RE.test(version))
        error(path.join(root, version), "updates", `Update folder "${version}" must be named digits.digits.digits.`);
      if (!isFile(file)) {
        error(file, "updates", "Every update folder needs its own full theme.json.");
        continue;
      }
      const manifest = readJson(file);
      if (isObject(manifest) && manifest.version !== version)
        error(file, "updates", `"version" is "${manifest.version}" but the folder is "${version}"; they must match.`);
    }
    if (isDir(path.join(themeRoot, "latest"))) {
      warn(
        path.join(themeRoot, "latest"),
        "updates",
        "latest/ is generated by the app from updates/. Do not author or ship it in the theme source.",
      );
    }
  }

  function checkPackage() {
    for (const name of ["layout.liquid", "screenshot.png"]) {
      if (!isFile(path.join(themeRoot, name)))
        error(path.join(themeRoot, name), "required-file", `${name} is required.`);
    }
    for (const name of ["assets", "templates", "widgets"]) {
      if (!isDir(path.join(themeRoot, name)))
        error(path.join(themeRoot, name), "required-file", `The ${name}/ folder is required.`);
    }
    checkScreenshot(path.join(themeRoot, "screenshot.png"), 1280, 720);
    for (const name of ["node_modules", "package.json", ".git"]) {
      if (exists(path.join(themeRoot, name))) {
        warn(
          path.join(themeRoot, name),
          "package",
          `${name} is inside the theme folder; everything here is copied into every project. Keep build tooling outside the theme.`,
        );
      }
    }
    const usesIcons = [...theme.widgets.values()].some((widget) =>
      [...widget.settings.values(), ...[...widget.blocks.values()].flatMap((block) => [...block.values()])].some(
        (setting) => setting.type === "icon",
      ),
    );
    if (usesIcons && !theme.icons) {
      error(
        path.join(themeRoot, "assets", "icons.json"),
        "icons",
        "A widget has an icon setting, but assets/icons.json does not exist, so the picker is empty.",
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Run
  // ---------------------------------------------------------------------------

  function runChecks() {
    // Locales first: every schema check resolves its tTheme: labels against them.
    loadLocales();
    loadIcons();
    loadManifest();
    loadAssets();
    loadSnippets();
    loadCollections();
    loadWidgets();
    checkGroupNames();

    // Widget, snippet and item templates first: the layout check needs to know whether anything is enqueued.
    for (const widget of theme.widgets.values()) {
      if (isFile(widget.template)) checkLiquid(widget.template, { kind: "widget", widget });
    }
    for (const name of theme.snippets)
      checkLiquid(path.join(themeRoot, "snippets", `${name}.liquid`), { kind: "snippet" });
    for (const collection of theme.collections.values()) {
      const template = path.join(collection.dir, "template.liquid");
      if (isFile(template)) checkLiquid(template, { kind: "item-template" });
    }
    checkLayout();
    checkWidgetAssets();

    const menuIds = checkMenus(path.join(themeRoot, "menus"));
    // Menu defaults in schemas point at starter menus too.
    for (const widget of theme.widgets.values()) {
      for (const setting of widget.settings.values()) {
        if (
          setting.type === "menu" &&
          typeof setting.default === "string" &&
          setting.default !== "" &&
          !menuIds.has(setting.default)
        ) {
          const presetHasIt = listDirs(path.join(themeRoot, "presets")).some((preset) =>
            isFile(path.join(themeRoot, "presets", preset, "menus", `${setting.default}.json`)),
          );
          if (!presetHasIt)
            warn(
              widget.file,
              "missing-menu",
              `Setting "${setting.id}" defaults to menu "${setting.default}", but menus/${setting.default}.json does not exist.`,
            );
        }
      }
    }
    checkTemplates(path.join(themeRoot, "templates"), menuIds);
    checkPresets(menuIds);
    checkUpdates();
    checkPackage();
  }

  runChecks();
  return {
    theme: themeRoot,
    name: theme.manifest?.name,
    appVersion: contract.appVersion,
    errors: findings.filter((finding) => finding.level === "error").length,
    warnings: findings.filter((finding) => finding.level === "warning").length,
    findings,
  };
}

function main() {
  const args = process.argv.slice(2);
  const target = args.find((arg) => !arg.startsWith("--"));
  const asJson = args.includes("--json");
  const strict = args.includes("--strict");
  if (!target) {
    console.error("Usage: npm run validate:theme -- <theme-folder> [--json] [--strict]");
    process.exit(2);
  }
  const dir = path.resolve(target);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error(`Not a folder: ${dir}`);
    process.exit(2);
  }

  let result;
  try {
    result = validateTheme(dir);
  } catch (cause) {
    result = {
      theme: dir,
      errors: 1,
      warnings: 0,
      findings: [{ level: "error", file: ".", rule: "validation-failed", message: cause.message }],
    };
  }
  const { errors, warnings, findings } = result;

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Widgetizer theme check: ${result.name ?? path.basename(dir)} (${dir})`);
    console.log(`Checked against Widgetizer ${result.appVersion ?? "current source"}.\n`);
    const byFile = new Map();
    for (const finding of findings) {
      if (!byFile.has(finding.file)) byFile.set(finding.file, []);
      byFile.get(finding.file).push(finding);
    }
    for (const [file, list] of byFile) {
      console.log(file);
      for (const finding of list) {
        console.log(`  ${finding.level === "error" ? "ERROR" : "warn "}  [${finding.rule}] ${finding.message}`);
      }
      console.log("");
    }
    console.log(
      errors === 0 && warnings === 0
        ? "No problems found. This checks the rules only: still open the theme in the editor and export it."
        : `${errors} error(s), ${warnings} warning(s).`,
    );
  }
  process.exit(errors > 0 || (strict && warnings > 0) ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

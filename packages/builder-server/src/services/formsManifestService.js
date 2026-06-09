const FORM_WIDGET_TYPE = "core-form";
const MANIFEST_SCHEMA_VERSION = 1;
const GENERATOR_NAME = "widgetizer";
const WIDGET_IDENTIFIER = "widgetizer/core-form";

const MAX_FORMS_PER_SITE = 5;
const MAX_FIELDS_PER_FORM = 30;
const MAX_OPTIONS_PER_FIELD = 50;
const MAX_OPTION_LENGTH = 200;
const MAX_KEY_LENGTH = 64;
const KEY_PATTERN = /^[a-z0-9_-]{1,64}$/;
const SUPPORTED_FIELD_TYPES = new Set([
  "text",
  "email",
  "tel",
  "url",
  "textarea",
  "select",
  "radio",
  "checkbox",
]);

const DEFAULT_MAX_LENGTH = {
  text: 500,
  email: 320,
  tel: 500,
  url: 500,
  textarea: 5000,
  select: 500,
  radio: 500,
};

// Mirrors @widgetizer/core filters/handleizeFilter.js EXACTLY — no truncation. The Liquid template
// applies its own truncation (64 for keys, 200 for option values) via the `truncate` filter
// to match the hosted contract caps. Truncating here too would silently diverge from the
// rendered HTML for long labels.
function handleize(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function handleizeKey(str) {
  return handleize(str).slice(0, MAX_KEY_LENGTH);
}

function handleizeOptionValue(str) {
  return handleize(str).slice(0, MAX_OPTION_LENGTH);
}

function optionValuesMatch(a, b) {
  const arrA = Array.isArray(a) ? a : [];
  const arrB = Array.isArray(b) ? b : [];
  if (arrA.length !== arrB.length) return false;
  const setA = new Set(arrA.map((o) => o.value));
  for (const opt of arrB) {
    if (!setA.has(opt.value)) return false;
  }
  return true;
}

function fieldsMatch(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const fa = a[i];
    const fb = b[i];
    if (fa.key !== fb.key) return false;
    if (fa.type !== fb.type) return false;
    if (Boolean(fa.required) !== Boolean(fb.required)) return false;
    // For choice fields, options[].value is part of the hosted contract: any submitted
    // value not in the manifest's options is rejected. Two forms sharing a key but
    // differing in option values would render HTML the manifest can't validate against.
    if (fa.type === "select" || fa.type === "radio") {
      if (!optionValuesMatch(fa.options, fb.options)) return false;
    }
  }
  return true;
}

function parseChoiceOptions(rawOptions, fieldPath, errors) {
  if (typeof rawOptions !== "string" || !rawOptions.trim()) return [];

  const seenValues = new Set();
  const options = [];

  for (const line of rawOptions.split(/\r?\n/)) {
    const label = line.trim();
    if (!label) continue;

    if (label.length > MAX_OPTION_LENGTH) {
      errors.push(`${fieldPath}: option label "${label.slice(0, 30)}…" exceeds ${MAX_OPTION_LENGTH} characters`);
      continue;
    }

    const value = handleizeOptionValue(label);
    if (!value) {
      errors.push(`${fieldPath}: option label "${label}" cannot be converted to an identifier (use letters and numbers)`);
      continue;
    }
    if (seenValues.has(value)) {
      errors.push(
        `${fieldPath}: two options ("${label}") produce the same value "${value}". Rename one of them.`,
      );
      continue;
    }
    seenValues.add(value);
    options.push({ value, label });
  }

  return options;
}

function buildField(block, widgetId, pageId, errors) {
  const settings = block.settings || {};
  const label = settings.label;
  const fieldPath = `page "${pageId}" → widget "${widgetId}" → field "${label || "(missing label)"}"`;

  if (!label || typeof label !== "string" || !label.trim()) {
    errors.push(`${fieldPath}: field label is required`);
    return null;
  }
  if (label.length > 200) {
    errors.push(`${fieldPath}: field label exceeds 200 characters`);
    return null;
  }

  const key = handleizeKey(label);
  if (!key) {
    errors.push(
      `${fieldPath}: label "${label}" cannot be converted to an identifier (use letters and numbers in the label)`,
    );
    return null;
  }
  if (!KEY_PATTERN.test(key)) {
    // Defensive — handleize output should already match KEY_PATTERN.
    errors.push(`${fieldPath}: generated field key "${key}" is not valid`);
    return null;
  }

  let type;
  switch (block.type) {
    case "field":
      type = settings.type || "text";
      break;
    case "choice":
      type = settings.type === "radio" ? "radio" : "select";
      break;
    case "consent":
      type = "checkbox";
      break;
    default:
      errors.push(`${fieldPath}: unsupported block type "${block.type}"`);
      return null;
  }

  if (!SUPPORTED_FIELD_TYPES.has(type)) {
    errors.push(`${fieldPath}: field type "${type}" is not supported`);
    return null;
  }

  const field = {
    key,
    label,
    type,
    required: Boolean(settings.required),
  };

  if (type !== "checkbox" && DEFAULT_MAX_LENGTH[type]) {
    field.max_length = DEFAULT_MAX_LENGTH[type];
  }

  if (type === "select" || type === "radio") {
    const options = parseChoiceOptions(settings.options, fieldPath, errors);
    if (options.length === 0) {
      errors.push(`${fieldPath}: this choice field needs at least one option (one per line)`);
      return null;
    }
    if (options.length > MAX_OPTIONS_PER_FIELD) {
      errors.push(`${fieldPath}: this choice field has ${options.length} options, more than the ${MAX_OPTIONS_PER_FIELD} limit`);
      return null;
    }
    field.options = options;
  }

  return field;
}

function buildFormFromWidget(widget, widgetId, pageId, pagePath, errors) {
  const settings = widget.settings || {};
  const formName = (settings.form_name || "").trim() || "Contact";
  const path = `page "${pageId}" → widget "${widgetId}"`;

  if (formName.length > 200) {
    errors.push(`${path}: form name exceeds 200 characters`);
    return null;
  }

  const formKey = handleizeKey(formName) || "contact";
  if (!KEY_PATTERN.test(formKey)) {
    errors.push(`${path}: generated form key "${formKey}" is not valid (use letters and numbers in the form name)`);
    return null;
  }

  const blockIds = Array.isArray(widget.blocksOrder) ? widget.blocksOrder : [];
  const blocks = widget.blocks || {};
  const fields = [];
  const seenKeys = new Map();

  for (const blockId of blockIds) {
    const block = blocks[blockId];
    if (!block) continue;
    if (block.type !== "field" && block.type !== "choice" && block.type !== "consent") continue;

    const field = buildField(block, widgetId, pageId, errors);
    if (!field) continue;

    if (seenKeys.has(field.key)) {
      const previousLabel = seenKeys.get(field.key);
      errors.push(
        `${path}: two fields ("${previousLabel}" and "${field.label}") produce the same identifier "${field.key}". Rename one of them.`,
      );
      continue;
    }
    seenKeys.set(field.key, field.label);
    fields.push(field);
  }

  if (fields.length === 0) {
    errors.push(`${path}: form must contain at least one field block`);
    return null;
  }
  if (fields.length > MAX_FIELDS_PER_FORM) {
    errors.push(
      `${path}: form has ${fields.length} fields, more than the ${MAX_FIELDS_PER_FORM} limit`,
    );
    return null;
  }

  return {
    key: formKey,
    name: formName,
    widget: WIDGET_IDENTIFIER,
    page_path: pagePath,
    fields,
  };
}

/**
 * Builds the widgetizer.forms.json manifest from a project's pages.
 *
 * Form keys and field keys are auto-derived from the user-supplied form name and field
 * labels via the same `handleize` slug rules the widget.liquid uses. Two widgets that
 * share a derived form key are treated as the same form (deduped); two fields in the
 * same form that produce the same derived key error out with a clear message.
 *
 * @param {Array<{id: string, slug?: string, widgets?: object, widgetsOrder?: string[]}>} pagesDataArray
 * @param {string} generatorVersion - widgetizer app version
 * @returns {{manifest: object|null, warnings: string[]}}
 * @throws {Error} If any validation against the hosted contract fails. The error carries
 *                 a `formsErrors` array listing every problem (collected, not bailing on first).
 */
export function buildFormsManifest(pagesDataArray, generatorVersion) {
  const errors = [];
  const warnings = [];
  const formsByKey = new Map();

  for (const pageData of pagesDataArray) {
    const pageId = pageData.id;
    if (!pageId) continue;

    const outputFilename = pageId === "index" || pageId === "home" ? "index.html" : `${pageId}.html`;
    const pagePath = `/${outputFilename}`;

    const widgets = pageData.widgets || {};
    const order = Array.isArray(pageData.widgetsOrder) ? pageData.widgetsOrder : Object.keys(widgets);

    for (const widgetId of order) {
      const widget = widgets[widgetId];
      if (!widget || widget.type !== FORM_WIDGET_TYPE) continue;

      const form = buildFormFromWidget(widget, widgetId, pageId, pagePath, errors);
      if (!form) continue;

      const existing = formsByKey.get(form.key);
      if (existing) {
        if (!fieldsMatch(existing.fields, form.fields)) {
          errors.push(
            `Two forms named "${existing.name}" (on ${existing.page_path}) and "${form.name}" ` +
              `(on ${form.page_path}) produce the same identifier "${form.key}" but have different fields. ` +
              `Submissions from "${form.page_path}" would be rejected by the hosting service because its ` +
              `fields don't match the manifest entry. Rename one of these forms so each has a unique name.`,
          );
        }
      } else {
        formsByKey.set(form.key, form);
      }
    }
  }

  if (formsByKey.size > MAX_FORMS_PER_SITE) {
    errors.push(
      `This site has ${formsByKey.size} distinct forms, more than the ${MAX_FORMS_PER_SITE} limit. ` +
        `Reduce the number of unique form names used across pages.`,
    );
  }

  if (errors.length > 0) {
    const message =
      `widgetizer.forms.json validation failed:\n  - ${errors.join("\n  - ")}`;
    const err = new Error(message);
    err.statusCode = 400;
    err.errorTitle = "Export failed: Form configuration invalid";
    err.formsErrors = errors;
    throw err;
  }

  if (formsByKey.size === 0) {
    return { manifest: null, warnings };
  }

  const manifest = {
    schema_version: MANIFEST_SCHEMA_VERSION,
    generator: GENERATOR_NAME,
    generator_version: generatorVersion,
    forms: Array.from(formsByKey.values()),
  };

  return { manifest, warnings };
}

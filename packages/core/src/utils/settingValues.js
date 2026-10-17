import fontDefinitions from "../config/fonts.json" with { type: "json" };

export const FONT_WEIGHTS = Object.fromEntries(
  [...fontDefinitions.system, ...fontDefinitions.google].map((font) => [font.stack, font.availableWeights]),
);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VIDEO_RE = /^\/uploads\/files\/[^/\\]+\.mp4$/i;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Problems with `value` as a value for `setting`; an empty list when it fits.
 * Shared by the theme checker and the assistant, so both accept the same values.
 *
 * @param {{ type: string, options?: object[], min?: number, max?: number, columns?: object[] }} setting
 * @param {unknown} value
 * @param {{ icons?: Set<string>|null, fonts?: Record<string, number[]>, isVideoPath?: (value: string) => boolean }} [context]
 * @returns {string[]}
 */
export function settingValueProblems(setting, value, { icons = null, fonts = FONT_WEIGHTS, isVideoPath = (path) => VIDEO_RE.test(path) } = {}) {
  const problems = [];
  const typeName = Array.isArray(value) ? "an array" : value === null ? "null" : `a ${typeof value}`;
  const expect = (what) => problems.push(`must be ${what}, found ${typeName}`);

  switch (setting.type) {
    case "text":
    case "textarea":
    case "richtext":
    case "code":
    case "color":
    case "menu":
      if (typeof value !== "string") expect("a string");
      break;
    case "number":
    case "range":
      if (setting.type === "number" && value === "") break;
      if (typeof value !== "number" || !Number.isFinite(value)) expect("a number");
      else if ((typeof setting.min === "number" && value < setting.min) || (typeof setting.max === "number" && value > setting.max)) {
        problems.push(`${value} is outside min ${setting.min ?? "none"} / max ${setting.max ?? "none"}`);
      }
      break;
    case "checkbox":
      if (typeof value !== "boolean") expect("true or false (not a string)");
      break;
    case "select":
    case "radio": {
      const values = Array.isArray(setting.options) ? setting.options.map((option) => option?.value) : [];
      if (values.length > 0 && !values.includes(value)) {
        problems.push(`${JSON.stringify(value)} is not one of its options (${values.map((entry) => JSON.stringify(entry)).join(", ")})`);
      }
      break;
    }
    case "date":
      if (typeof value !== "string") expect("a YYYY-MM-DD string");
      else if (value !== "" && !DATE_RE.test(value)) problems.push(`"${value}" is not a YYYY-MM-DD date`);
      break;
    case "icon":
      if (typeof value !== "string") expect("an icon name string");
      else if (value !== "" && icons && !icons.has(value)) problems.push(`icon "${value}" is not in assets/icons.json`);
      break;
    case "image":
      if (typeof value !== "string") expect("an image path string");
      else if (value !== "" && !value.startsWith("/uploads/images/")) {
        problems.push(`"${value}" must be empty or start with /uploads/images/ (theme images are not media-library images)`);
      }
      break;
    case "file":
      if (typeof value !== "string") expect("a file path string");
      else if (value !== "" && !value.startsWith("/uploads/files/")) problems.push(`"${value}" must be empty or start with /uploads/files/`);
      break;
    case "video":
      if (typeof value !== "string") expect("an MP4 path string");
      else if (value !== "" && !isVideoPath(value)) problems.push(`"${value}" must be empty or an /uploads/files/<name>.mp4 path`);
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
      } else if (!Object.hasOwn(fonts, value.stack)) {
        const family = value.stack.split(",")[0].replaceAll('"', "").trim().toLowerCase();
        const close = Object.keys(fonts)
          .filter((stack) => stack.toLowerCase().includes(family))
          .slice(0, 3);
        problems.push(
          `font stack ${JSON.stringify(value.stack)} is not in the font catalog` +
            (close.length ? ` (closest: ${close.map((stack) => JSON.stringify(stack)).join(", ")})` : "") +
            '; copy the exact stack from contract.json "fonts"',
        );
      } else if (!fonts[value.stack].includes(value.weight)) {
        problems.push(`weight ${value.weight} is not available for that font (available: ${fonts[value.stack].join(", ")})`);
      }
      break;
    case "link":
      if (!isObject(value)) expect('an object like { "href": "", "text": "", "target": "_self" }');
      else {
        if (value.href !== undefined && typeof value.href !== "string") problems.push('"href" must be a string');
        if (value.text !== undefined && typeof value.text !== "string") problems.push('"text" must be a string');
        if (value.target !== undefined && !["_self", "_blank"].includes(value.target)) problems.push('"target" must be "_self" or "_blank"');
        if ("label" in value || "url" in value || "link" in value) {
          problems.push('a link value uses "href" and "text" (menu items are the ones that use "label" and "link")');
        }
        if ("page" in value || "item" in value) problems.push('a link value names its page with "href" (and "pageUuid"), not "page" or "item"');
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

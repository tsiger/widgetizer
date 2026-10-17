import { settingValueProblems } from "@widgetizer/core/settingValues";
import { toolError } from "../errors.js";
import { resolveReferences } from "./references.js";

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function definitionsOf(settings) {
  return new Map((Array.isArray(settings) ? settings : []).filter((setting) => setting?.id && setting.type !== "header").map((setting) => [setting.id, setting]));
}

/** References resolved and every given value checked against its setting; rich text cleaned as it renders. */
export async function checkedValues(values, definitions, { reader, scope, lang, where }) {
  if (!isObject(values)) return {};
  const [{ settings }] = await resolveReferences([{ op: "values", settings: values }], { reader, scope, lang });
  const out = {};
  for (const [key, value] of Object.entries(settings)) {
    const setting = definitions.get(key);
    if (!setting) throw toolError("INVALID_EDIT", `${where} has no setting "${key}".`);
    const problems = settingValueProblems(setting, value);
    if (problems.length) throw toolError("INVALID_EDIT", `${where}, "${key}" ${problems.join("; ")}.`);
    out[key] =
      setting.type === "richtext" && reader.sanitizeRichText
        ? reader.sanitizeRichText(value, { allowHeadings: Boolean(setting.allow_headings), allowImages: Boolean(setting.allow_images) })
        : value;
  }
  return out;
}

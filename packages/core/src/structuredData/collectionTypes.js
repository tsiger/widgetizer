// What a collection schema's `structuredData` block may declare: per supported
// type, each property it can map and the setting types that property accepts.
const FIELD_RULES = Object.freeze({
  BlogPosting: Object.freeze({
    headline: Object.freeze({ types: ["text"], required: true }),
    datePublished: Object.freeze({ types: ["date"] }),
    description: Object.freeze({ types: ["text", "textarea"] }),
    image: Object.freeze({ types: ["image"] }),
    articleBody: Object.freeze({ types: ["richtext", "textarea"] }),
  }),
});

export const COLLECTION_STRUCTURED_DATA_TYPES = Object.freeze(Object.keys(FIELD_RULES));

/**
 * Check a collection schema's `structuredData` block against its settings. Every
 * mapped property must be one the type supports and must name an existing,
 * non-header setting of an accepted type, so a mapping can never point at a
 * missing field.
 * @param {*} block - The schema's `structuredData` value
 * @param {Array<object>} settings - The schema's settings
 * @returns {string[]} One message per problem; empty when valid.
 */
export function validateCollectionStructuredData(block, settings) {
  if (!block || typeof block !== "object" || Array.isArray(block)) {
    return ["`structuredData` must be an object."];
  }

  const rules = typeof block.type === "string" && Object.hasOwn(FIELD_RULES, block.type) ? FIELD_RULES[block.type] : null;
  if (!rules) {
    const found =
      typeof block.type === "string"
        ? JSON.stringify(block.type)
        : Array.isArray(block.type)
          ? "a list"
          : `a value of type ${typeof block.type}`;
    return [`\`structuredData.type\` must be one of: ${COLLECTION_STRUCTURED_DATA_TYPES.join(", ")} (found ${found}).`];
  }

  const settingsById = new Map(
    (Array.isArray(settings) ? settings : [])
      .filter((setting) => setting && typeof setting === "object" && setting.type !== "header")
      .map((setting) => [setting.id, setting]),
  );

  const errors = [];
  for (const [property, fieldId] of Object.entries(block)) {
    if (property === "type") continue;
    const where = `\`structuredData.${property}\``;
    if (!Object.hasOwn(rules, property)) {
      errors.push(`${where} is not a ${block.type} property core supports.`);
      continue;
    }
    if (typeof fieldId !== "string" || !fieldId) {
      errors.push(`${where} must name a setting id.`);
      continue;
    }
    const setting = settingsById.get(fieldId);
    if (!setting) {
      errors.push(`${where} points at "${fieldId}", which is not a setting.`);
    } else if (!rules[property].types.includes(setting.type)) {
      errors.push(
        `${where} points at "${fieldId}", a ${setting.type} setting; it must be ${rules[property].types.join(" or ")}.`,
      );
    }
  }

  for (const [property, rule] of Object.entries(rules)) {
    if (rule.required && block[property] === undefined) {
      errors.push(`\`structuredData.${property}\` is required for ${block.type}.`);
    }
  }

  return errors;
}

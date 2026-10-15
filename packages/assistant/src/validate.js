import { toolError } from "./errors.js";
import { ERROR_CODES } from "./protocol.js";

// The subset of JSON Schema the tools declare: object/string/integer/boolean/array,
// enum, required, min/max, length, pattern, items and additionalProperties:false.
// Messages name the argument and the fix, since the model reads them.

function fail(message) {
  throw toolError(ERROR_CODES.INVALID_ARGUMENTS, message);
}

function check(schema, value, name) {
  if (schema.enum && !schema.enum.includes(value)) {
    fail(`${name} must be one of: ${schema.enum.join(", ")}.`);
  }
  switch (schema.type) {
    case "string":
      if (typeof value !== "string") fail(`${name} must be a string.`);
      if (schema.minLength !== undefined && value.length < schema.minLength) fail(`${name} can't be empty.`);
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        fail(`${name} must be at most ${schema.maxLength} characters.`);
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        fail(`${name} isn't valid${schema.description ? `: ${schema.description}` : "."}`);
      }
      return value;
    case "integer":
      if (!Number.isInteger(value)) fail(`${name} must be a whole number.`);
      if (schema.minimum !== undefined && value < schema.minimum) fail(`${name} must be at least ${schema.minimum}.`);
      if (schema.maximum !== undefined && value > schema.maximum) fail(`${name} must be at most ${schema.maximum}.`);
      return value;
    case "boolean":
      if (typeof value !== "boolean") fail(`${name} must be true or false.`);
      return value;
    case "array": {
      if (!Array.isArray(value)) fail(`${name} must be a list.`);
      if (schema.minItems !== undefined && value.length < schema.minItems) fail(`${name} can't be empty.`);
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        fail(`${name} can have at most ${schema.maxItems} entries.`);
      }
      return schema.items ? value.map((item, index) => check(schema.items, item, `${name}[${index}]`)) : value;
    }
    case "object":
      return checkObject(schema, value, name);
    default:
      return value;
  }
}

function checkObject(schema, value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${name} must be an object.`);
  const properties = schema.properties ?? {};
  if (schema.additionalProperties === false) {
    const unknown = Object.keys(value).filter((key) => !(key in properties));
    if (unknown.length) {
      fail(`Unknown argument(s): ${unknown.join(", ")}. Allowed: ${Object.keys(properties).join(", ") || "none"}.`);
    }
  }
  for (const key of schema.required ?? []) {
    if (value[key] === undefined) fail(`${key} is required.`);
  }
  const result = {};
  for (const [key, propertySchema] of Object.entries(properties)) {
    if (value[key] === undefined) continue;
    result[key] = check(propertySchema, value[key], key);
  }
  return result;
}

/** Validate tool arguments against the tool's input schema; returns the checked arguments. */
export function validateArguments(inputSchema, args) {
  if (args !== undefined && (args === null || typeof args !== "object" || Array.isArray(args))) {
    fail("Arguments must be an object.");
  }
  return checkObject(inputSchema, args ?? {}, "arguments");
}

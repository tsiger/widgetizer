import { describe, it, expect } from "vitest";
import { validateArguments } from "../validate.js";

const schema = {
  type: "object",
  properties: {
    page: { type: "string", minLength: 1, pattern: "^[a-z]+$", description: "A page slug." },
    count: { type: "integer", minimum: 1, maximum: 5 },
    which: { type: "string", enum: ["header", "footer"] },
    ids: { type: "array", items: { type: "string" }, maxItems: 2 },
    flag: { type: "boolean" },
  },
  required: ["page"],
  additionalProperties: false,
};

const message = (args) => {
  try {
    validateArguments(schema, args);
    return null;
  } catch (error) {
    return error.message;
  }
};

describe("validateArguments", () => {
  it("accepts valid arguments and drops nothing it knows", () => {
    expect(validateArguments(schema, { page: "about", count: 2, which: "header", ids: ["a"], flag: true })).toEqual({
      page: "about",
      count: 2,
      which: "header",
      ids: ["a"],
      flag: true,
    });
  });

  it("explains each kind of mistake in words the model can act on", () => {
    expect(message({})).toBe("page is required.");
    expect(message({ page: "../x" })).toBe("page isn't valid: A page slug.");
    expect(message({ page: "a", count: 9 })).toBe("count must be at most 5.");
    expect(message({ page: "a", count: 1.5 })).toBe("count must be a whole number.");
    expect(message({ page: "a", which: "side" })).toBe("which must be one of: header, footer.");
    expect(message({ page: "a", ids: ["x", "y", "z"] })).toBe("ids can have at most 2 entries.");
    expect(message({ page: "a", ids: [1] })).toBe("ids[0] must be a string.");
    expect(message({ page: "a", flag: "yes" })).toBe("flag must be true or false.");
    expect(message({ page: "a", extra: 1 })).toMatch(/^Unknown argument\(s\): extra/);
  });
});

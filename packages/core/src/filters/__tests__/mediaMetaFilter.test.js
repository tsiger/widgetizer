import { describe, it, expect } from "vitest";
import { registerMediaMetaFilter } from "../mediaMetaFilter.js";

/**
 * `media_meta` is the second consumer of media metadata, beside `{% image %}`,
 * and it has to answer for the same language: a Greek page asking for a caption
 * must not be handed the English one.
 */
const FILE = {
  metadata: { alt: "A dog on a beach", title: "Our dog", caption: "Summer" },
  translations: {
    el: { alt: "Ένας σκύλος", title: null, caption: "Καλοκαίρι" },
    de: { alt: "", title: null, caption: null },
  },
};

// A stand-in engine that hands back the registered filter, bound to a context.
function filterFor(language, files = { "dog.jpg": FILE }) {
  let registered;
  registerMediaMetaFilter({ registerFilter: (_name, fn) => (registered = fn) });
  const vars = { mediaFiles: files, page: language ? { language } : undefined };
  const context = {
    get: (path) => path.reduce((value, key) => (value == null ? value : value[key]), vars),
  };
  return (...args) => registered.call({ context }, ...args);
}

describe("media_meta across languages", () => {
  it("answers with the page's language", () => {
    expect(filterFor("el")("/uploads/images/dog.jpg", "caption")).toBe("Καλοκαίρι");
    expect(filterFor("el")("/uploads/images/dog.jpg", "alt")).toBe("Ένας σκύλος");
  });

  it("inherits the default language for a field nobody translated", () => {
    expect(filterFor("el")("/uploads/images/dog.jpg", "title")).toBe("Our dog");
  });

  it("resolves the object form too, not just a named field", () => {
    expect(filterFor("el")("/uploads/images/dog.jpg")).toEqual({
      alt: "Ένας σκύλος",
      title: "Our dog",
      caption: "Καλοκαίρι",
    });
  });

  it("keeps the default language's own text", () => {
    expect(filterFor("en")("/uploads/images/dog.jpg", "caption")).toBe("Summer");
    expect(filterFor(undefined)("/uploads/images/dog.jpg", "caption")).toBe("Summer");
  });

  it("returns an empty string for a deliberately blank field, not the default's", () => {
    expect(filterFor("de")("/uploads/images/dog.jpg", "alt")).toBe("");
  });

  it("still answers empty for an unknown file or a non-string path", () => {
    expect(filterFor("el")("/uploads/images/missing.jpg", "alt")).toBe("");
    expect(filterFor("el")(null, "alt")).toBe("");
  });
});

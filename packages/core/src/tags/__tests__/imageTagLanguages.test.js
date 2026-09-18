import { describe, it, expect } from "vitest";
import { ImageTag } from "../imageTag.js";
import { resolveMediaMetadata } from "../../utils/mediaMetadata.js";

/**
 * The media library is shared across languages — same binaries, same grid —
 * and only alt/title/caption vary (§6). The tag picks the language of the page
 * it is rendering into, inherits what nobody translated, and honours a
 * deliberately empty alt instead of reading the default language's description
 * to a screen reader.
 */
const FILE = {
  type: "image/jpeg",
  path: "/uploads/images/dog.jpg",
  width: 800,
  height: 600,
  sizes: {},
  metadata: { alt: "A dog on a beach", title: "Our dog", caption: "Summer" },
  translations: {
    el: { alt: "Ένας σκύλος", title: null, caption: null },
    de: { alt: "", title: null, caption: null },
  },
};

// The tag reads everything through context.get([...]), so a lookup stub is enough.
function render(language, file = FILE, args = "") {
  const vars = { mediaFiles: { "dog.jpg": file }, imagePath: "/images", page: { language } };
  const context = {
    get: (path) => path.reduce((value, key) => (value == null ? value : value[key]), vars),
  };
  const tag = Object.create(ImageTag);
  tag.parse({ args: `src: "dog.jpg"${args}` });
  const iterator = tag.render.call(tag, context);
  let step = iterator.next();
  // The only yield is the hash render, which needs no async work here.
  while (!step.done) step = iterator.next(hashFor(`src: "dog.jpg"${args}`));
  return step.value;
}

function hashFor(args) {
  const options = {};
  for (const pair of args.split(",")) {
    const [key, raw] = pair.split(":").map((part) => part.trim());
    if (!key) continue;
    options[key] = raw?.replace(/^["']|["']$/g, "");
  }
  return options;
}

describe("{% image %} across languages", () => {
  it("uses the translated alt on that language's page", () => {
    expect(render("el")).toContain('alt="Ένας σκύλος"');
  });

  it("inherits the default language where nothing was translated", () => {
    // Greek translated the alt but not the title.
    expect(render("el")).toContain('title="Our dog"');
  });

  it("keeps the default language's own text", () => {
    expect(render("en")).toContain('alt="A dog on a beach"');
  });

  it("honours a deliberately empty alt rather than reading the default one out", () => {
    const html = render("de");
    expect(html).toContain('alt=""');
    expect(html).not.toContain("A dog on a beach");
  });

  it("falls back to the default when the page has no language at all", () => {
    expect(render(undefined)).toContain('alt="A dog on a beach"');
  });

  it("still lets the template override the alt outright", () => {
    expect(render("el", FILE, ', alt: "Written on the tag"')).toContain('alt="Written on the tag"');
  });
});

describe("resolveMediaMetadata", () => {
  it("treats a missing language, a missing entry and a null field all as inherit", () => {
    expect(resolveMediaMetadata(FILE, "fr")).toEqual(FILE.metadata);
    expect(resolveMediaMetadata(FILE, undefined)).toEqual(FILE.metadata);
    expect(resolveMediaMetadata(FILE, "el").caption).toBe("Summer");
  });

  it("keeps an empty string as an empty string", () => {
    expect(resolveMediaMetadata(FILE, "de").alt).toBe("");
  });

  it("answers with empty strings for a file that has no metadata at all", () => {
    expect(resolveMediaMetadata({}, "el")).toEqual({ alt: "", title: "", caption: "" });
  });
});

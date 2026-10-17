import { describe, it, expect } from "vitest";
import { resolveReferences } from "../edits/references.js";
import { settingValueProblems } from "@widgetizer/core/settingValues";

const reader = {
  mediaFile: async (scope, id) => (id === "m1" ? { id, path: "/uploads/images/cake.jpg" } : null),
  readPage: async (scope, slug) => (slug === "about" ? { uuid: "page-about" } : null),
  collectionItem: async (scope, type, slug) => (type === "news" && slug === "launch" ? { uuid: "item-launch" } : null),
  collectionSchemas: async () => [{ type: "news", slugPrefix: "blog" }],
};
const context = { reader, scope: {}, lang: { language: "en" } };

describe("references in edits", () => {
  it("turns library media, page links and item links into stored values", async () => {
    const [operation] = await resolveReferences(
      [
        {
          op: "update",
          settings: {
            image: { media: "m1", file: "cake.jpg" },
            gallery: [{ media: "m1" }],
            cta: { text: "About us", page: "about" },
            story: { text: "Read", item: { type: "news", slug: "launch" } },
            title: "Kept",
          },
        },
      ],
      context,
    );
    expect(operation.settings).toEqual({
      image: "/uploads/images/cake.jpg",
      gallery: ["/uploads/images/cake.jpg"],
      cta: { text: "About us", target: "_self", href: "about.html", pageUuid: "page-about" },
      story: { text: "Read", target: "_self", href: "blog/launch.html", collectionType: "news", collectionItemUuid: "item-launch" },
      title: "Kept",
    });
  });

  it("resolves a library file inside a link, keeping the link's other fields", async () => {
    const [operation] = await resolveReferences(
      [{ op: "update", settings: { cta: { text: "Brochure", href: { media: "m1", file: "cake.jpg" }, target: "_blank" } } }],
      context,
    );
    expect(operation.settings.cta).toEqual({ text: "Brochure", href: "/uploads/images/cake.jpg", target: "_blank" });
  });

  it("refuses media, pages and items the site doesn't have", async () => {
    await expect(resolveReferences([{ op: "update", settings: { image: { media: "other" } } }], context)).rejects.toThrow(/no media "other"/);
    await expect(resolveReferences([{ op: "update", settings: { cta: { text: "x", page: "nope" } } }], context)).rejects.toThrow(/no page "nope"/);
    await expect(
      resolveReferences([{ op: "add", blocks: [{ type: "card", settings: { link: { item: { type: "news", slug: "gone" } } } }] }], context),
    ).rejects.toThrow(/news item "gone"/);
  });
});

describe("the shared value checker", () => {
  it("enforces a minimum or a maximum on its own", () => {
    expect(settingValueProblems({ type: "number", min: 0 }, -1)).toHaveLength(1);
    expect(settingValueProblems({ type: "number", max: 10 }, 11)).toHaveLength(1);
    expect(settingValueProblems({ type: "number", min: 0 }, "")).toEqual([]);
    expect(settingValueProblems({ type: "range", min: 1 }, 0)).toHaveLength(1);
    expect(settingValueProblems({ type: "number" }, Number.NaN)).toHaveLength(1);
  });

  it("refuses a link that still names its page instead of pointing to it", () => {
    expect(settingValueProblems({ type: "link" }, { text: "x", page: "about" })).toHaveLength(1);
  });
});

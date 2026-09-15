import { describe, it, expect } from "vitest";
import { summarizeStructuredData } from "../structuredDataSummary.js";

describe("summarizeStructuredData", () => {
  it("reports nothing for a ready site or a missing result", () => {
    const ready = summarizeStructuredData({
      readiness: [
        { item: "siteUrl", ok: true },
        { item: "name", ok: true },
      ],
      warnings: [],
    });
    expect(ready).toEqual({
      missing: [],
      emptyArticleFields: null,
      noListingPage: null,
      ambiguousListingPage: null,
      hasProblems: false,
    });
    expect(summarizeStructuredData(undefined).hasProblems).toBe(false);
  });

  it("lists missing readiness items in order", () => {
    const summary = summarizeStructuredData({
      readiness: [
        { item: "siteUrl", ok: false },
        { item: "name", ok: true },
        { item: "logo", ok: false },
      ],
    });
    expect(summary.missing).toEqual(["siteUrl", "logo"]);
    expect(summary.hasProblems).toBe(true);
  });

  it("counts each warning kind by distinct page, with the first page as the example", () => {
    const summary = summarizeStructuredData({
      readiness: [],
      warnings: [
        { path: "news/alpha.html", code: "noListingPage" },
        { path: "news/beta.html", code: "emptyArticleFields", fields: ["image"] },
        { path: "news/beta.html", code: "noListingPage" },
        { path: "news/gamma.html", code: "emptyArticleFields", fields: ["description"] },
        { path: "projects/one.html", code: "ambiguousListingPage" },
      ],
    });
    expect(summary.emptyArticleFields).toEqual({ count: 2, path: "news/beta.html" });
    expect(summary.noListingPage).toEqual({ count: 2, path: "news/alpha.html" });
    expect(summary.ambiguousListingPage).toEqual({ count: 1, path: "projects/one.html" });
    expect(summary.hasProblems).toBe(true);
  });

  it("counts an ambiguous listing alone as a problem", () => {
    expect(summarizeStructuredData({ warnings: [{ path: "a.html", code: "ambiguousListingPage" }] }).hasProblems).toBe(true);
  });
});

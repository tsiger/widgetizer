import { describe, it, expect } from "vitest";
import { outputPathPrefixFor } from "../linkPrefixer.js";

describe("outputPathPrefixFor", () => {
  it("climbs one level per folder in the output path", () => {
    expect(outputPathPrefixFor("index.html")).toBe("");
    expect(outputPathPrefixFor("about.html")).toBe("");
    expect(outputPathPrefixFor("news/alpha.html")).toBe("../");
    expect(outputPathPrefixFor("blog/page/2.html")).toBe("../../");
    expect(outputPathPrefixFor("page/2.html")).toBe("../");
  });
});

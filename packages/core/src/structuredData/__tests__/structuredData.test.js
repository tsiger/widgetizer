import { describe, it, expect, vi } from "vitest";
import {
  buildGraph,
  GRAPH_BUILDERS,
  siteNodeId,
  urlNodeId,
  pruneEmpty,
  serializeJsonLd,
  jsonLdScript,
} from "../index.js";
import { websiteNode, identityNode, webPageNode } from "../siteNodes.js";
import { articleNode } from "../articleNode.js";
import { breadcrumbNode } from "../breadcrumbNode.js";

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

const scriptBody = (html) => html.match(/^<script type="application\/ld\+json">(.*)<\/script>$/s)?.[1];

describe("node ids", () => {
  it("anchors site nodes on the Site URL base, whatever its trailing slash or subfolder", () => {
    expect(siteNodeId("https://example.com", "website")).toBe("https://example.com/#website");
    expect(siteNodeId("https://example.com/", "website")).toBe("https://example.com/#website");
    expect(siteNodeId("https://user.github.io/repo", "identity")).toBe("https://user.github.io/repo/#identity");
    expect(siteNodeId("https://user.github.io/repo/", "identity")).toBe("https://user.github.io/repo/#identity");
  });

  it("gives no site id without a usable Site URL", () => {
    expect(siteNodeId("", "website")).toBe("");
    expect(siteNodeId(undefined, "website")).toBe("");
    expect(siteNodeId("not a url", "website")).toBe("");
  });

  it("anchors page nodes on their absolute address, replacing any fragment", () => {
    expect(urlNodeId("https://example.com/about.html", "webpage")).toBe("https://example.com/about.html#webpage");
    expect(urlNodeId("https://example.com/news/alpha", "article")).toBe("https://example.com/news/alpha#article");
    expect(urlNodeId("https://example.com/about.html#team", "webpage")).toBe("https://example.com/about.html#webpage");
    expect(urlNodeId("about.html", "webpage")).toBe("");
    expect(urlNodeId("", "webpage")).toBe("");
  });

  it("gives no page id for a malformed absolute address", () => {
    for (const url of [
      "https://",
      "https:///page",
      "https://example .com/page",
      "https://example.com:bad/",
      "https://example.com:99999/",
      "https://example.com/a b",
      'https://example.com/"x',
      "https://example.com/<x>",
      "ftp://example.com/page",
      "https://\\page",
      "https://example.com/a\\b",
      `https://example.com/a${String.fromCharCode(1)}b`,
      `https://example.com/a${String.fromCharCode(0x7f)}b`,
      `https://example.com/a${String.fromCharCode(0xa0)}b`,
      undefined,
      42,
    ]) {
      expect(urlNodeId(url, "webpage")).toBe("");
    }
  });

  it("keeps a valid address exactly as given", () => {
    expect(urlNodeId("https://Example.com:8443/Blog/?q=1", "webpage")).toBe("https://Example.com:8443/Blog/?q=1#webpage");
  });
});

describe("pruneEmpty", () => {
  it("drops empty values at every depth and keeps numbers and booleans", () => {
    expect(
      pruneEmpty({
        name: "Acme",
        blank: "  ",
        missing: undefined,
        nothing: null,
        zero: 0,
        no: false,
        list: ["", null, "a", [], {}],
        nested: { inner: { deeper: "" }, keep: { "@type": "Thing" } },
      }),
    ).toEqual({ name: "Acme", zero: 0, no: false, list: ["a"], nested: { keep: { "@type": "Thing" } } });
  });

  it("returns undefined when nothing is left", () => {
    expect(pruneEmpty({ a: "", b: [null], c: {} })).toBeUndefined();
    expect(pruneEmpty([])).toBeUndefined();
  });
});

describe("serializeJsonLd", () => {
  it("wraps nodes in a schema.org graph", () => {
    const json = serializeJsonLd([{ "@type": "WebSite", "@id": "https://example.com/#website", name: "Acme", alternate: "" }]);
    expect(JSON.parse(json)).toEqual({
      "@context": "https://schema.org",
      "@graph": [{ "@type": "WebSite", "@id": "https://example.com/#website", name: "Acme" }],
    });
  });

  it("emits nothing for an empty graph", () => {
    expect(serializeJsonLd([])).toBe("");
    expect(serializeJsonLd([{ name: "" }])).toBe("");
    expect(serializeJsonLd(undefined)).toBe("");
    expect(jsonLdScript([])).toBe("");
  });

  it("cannot be broken out of by user text", () => {
    const hostile = [
      "</script><script>alert(1)</script>",
      "</SCRIPT >",
      "<!-- <script>",
      "]]>",
      "a & b",
      `line${LINE_SEPARATOR}separator${PARAGRAPH_SEPARATOR}paragraph`,
      '"quoted" \\ backslash',
    ];
    const nodes = hostile.map((name, index) => ({ "@type": "Thing", "@id": `https://example.com/#n${index}`, name }));
    const html = jsonLdScript(nodes);
    const body = scriptBody(html);

    expect(body).toBeDefined();
    for (const unsafe of ["<", ">", "&", LINE_SEPARATOR, PARAGRAPH_SEPARATOR]) {
      expect(body.includes(unsafe)).toBe(false);
    }
    expect(html.match(/<\/script/gi)).toHaveLength(1);
    expect(JSON.parse(body)["@graph"].map((node) => node.name)).toEqual(hostile);
  });
});

describe("buildGraph", () => {
  const page = { slug: "about", name: "About" };
  const withSite = { page, project: { siteUrl: "https://example.com/site" } };

  it("registers the site nodes in output order", () => {
    expect(GRAPH_BUILDERS).toEqual([websiteNode, identityNode, webPageNode, articleNode, breadcrumbNode]);
    expect(buildGraph(withSite).map((node) => node["@type"])).toEqual(["WebPage"]);
  });

  it("hands builders the normalised Site URL and collects single nodes and lists", () => {
    const seen = [];
    const nodes = buildGraph(withSite, [
      (context) => {
        seen.push(context.siteUrl);
        return { "@id": siteNodeId(context.siteUrl, "website") };
      },
      () => [{ "@id": "https://example.com/site/about.html#webpage" }, null, "not a node", ["nested"]],
      () => undefined,
    ]);
    expect(seen).toEqual(["https://example.com/site/"]);
    expect(nodes).toEqual([
      { "@id": "https://example.com/site/#website" },
      { "@id": "https://example.com/site/about.html#webpage" },
    ]);
  });

  it("runs no builder at all without a usable Site URL", () => {
    const builder = vi.fn(() => ({ "@id": "x" }));
    for (const project of [undefined, {}, { siteUrl: "" }, { siteUrl: "not a url" }]) {
      expect(buildGraph({ page, project }, [builder])).toEqual([]);
    }
    expect(builder).not.toHaveBeenCalled();
  });

  it("skips a builder that throws and keeps the others", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const nodes = buildGraph(withSite, [
      function broken() {
        throw new Error("boom");
      },
      () => ({ "@id": "https://example.com/site/#website" }),
    ]);
    expect(nodes).toEqual([{ "@id": "https://example.com/site/#website" }]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("broken"));
    warn.mockRestore();
  });

  it("keeps going when a builder throws something that is not an Error", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const nodes = buildGraph(withSite, [
      () => {
        throw null;
      },
      () => {
        throw undefined;
      },
      () => {
        throw "plain string";
      },
      () => {
        throw { toString: null };
      },
      () => {
        const error = new Error("hidden");
        Object.defineProperty(error, "message", {
          get() {
            throw new Error("getter");
          },
        });
        throw error;
      },
      () => ({ "@id": "https://example.com/site/#website" }),
    ]);
    expect(nodes).toEqual([{ "@id": "https://example.com/site/#website" }]);
    expect(warn).toHaveBeenCalledTimes(5);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("(unprintable thrown value)"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("null"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("plain string"));
    warn.mockRestore();
  });
});

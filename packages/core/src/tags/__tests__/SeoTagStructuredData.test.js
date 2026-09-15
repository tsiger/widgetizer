import { describe, it, expect, vi, beforeEach } from "vitest";

const builders = vi.hoisted(() => []);
vi.mock("../../structuredData/builders.js", () => ({ GRAPH_BUILDERS: builders }));

const { SeoTag } = await import("../SeoTag.js");

const render = (vars) => SeoTag.render({ getAll: () => vars });
const page = { slug: "about", name: "About" };
const project = { siteUrl: "https://example.com", siteTitle: "Acme" };

beforeEach(() => {
  builders.length = 0;
});

describe("SeoTag structured data", () => {
  it("adds nothing when the graph is empty", () => {
    const html = render({ page, project });
    expect(html).toContain("<title>About - Acme</title>");
    expect(html).not.toContain("application/ld+json");
  });

  it("appends one escaped JSON-LD script after the meta tags", () => {
    builders.push(({ siteUrl, page: current }) => ({
      "@type": "WebPage",
      "@id": `${siteUrl}about.html#webpage`,
      name: `${current.name} </script><b>`,
    }));
    const html = render({ page, project });
    const scripts = html.match(/<script type="application\/ld\+json">.*?<\/script>/gs);

    expect(scripts).toHaveLength(1);
    expect(html.indexOf("application/ld+json")).toBeGreaterThan(html.indexOf("twitter:title"));
    expect(scripts[0]).toContain("About \\u003c/script\\u003e\\u003cb\\u003e");
    expect(html.match(/<\/script/gi)).toHaveLength(1);
  });

  it("emits no script without a Site URL, while the meta tags still render", () => {
    builders.push(() => ({ "@type": "WebPage", "@id": "https://example.com/about.html#webpage" }));
    const html = render({ page, project: { siteTitle: "Acme" } });
    expect(html).toContain("<title>About - Acme</title>");
    expect(html).not.toContain("application/ld+json");
  });

  it("keeps the title and meta tags when structured data blows up", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    builders.push(() => {
      throw new Error("boom");
    });
    const circular = {};
    circular.self = circular;
    builders.push(() => ({ "@type": "Thing", "@id": "https://example.com/#x", circular }));

    const html = render({ page, project });
    expect(html).toContain("<title>About - Acme</title>");
    expect(html).toContain('<meta name="twitter:card"');
    expect(html).not.toContain("application/ld+json");
    expect(html).not.toContain("Error generating meta tags");
    warn.mockRestore();
    error.mockRestore();
  });
});

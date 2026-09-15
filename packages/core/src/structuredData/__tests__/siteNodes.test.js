import { describe, it, expect } from "vitest";
import { buildGraph } from "../index.js";

const SITE = "https://crumbly.example";

const BAKERY = {
  category: "bakery",
  logo: "/uploads/images/logo.png",
  email: "hello@crumbly.example",
  telephone: "+30 210 123 4567",
  priceRange: "€€",
  profiles: { instagram: "https://instagram.com/crumbly", facebook: "https://facebook.com/crumbly" },
  locations: [
    {
      streetAddress: "1 Baker St",
      addressLocality: "Athens",
      postalCode: "10558",
      addressCountry: "GR",
      openingHours: {
        monday: [{ opens: "07:00", closes: "14:00" }, { opens: "17:00", closes: "21:00" }],
        sunday: [],
      },
    },
  ],
  text: { publicName: "Crumbly Bakery", description: "Bread since 1990" },
};

const MEDIA = {
  "logo.png": { filename: "logo.png", type: "image/png", sizes: { large: { path: "/uploads/images/logo-large.png" } } },
};

const project = (overrides = {}) => ({ siteUrl: SITE, siteTitle: "Crumbly", siteIdentity: {}, ...overrides });
const graph = (page, projectData, mediaFiles = {}) => buildGraph({ page, project: projectData, mediaFiles });
const byType = (nodes) => Object.fromEntries(nodes.map((node) => [[].concat(node["@type"]).join("+"), node]));

describe("homepage", () => {
  it("emits WebSite, the identity and WebPage, linked by id", () => {
    const nodes = graph({ slug: "index", name: "Home", seo: { title: "Welcome" } }, project({ siteIdentity: BAKERY }), MEDIA);
    expect(nodes.map((node) => node["@type"])).toEqual(["WebSite", "Bakery", "WebPage"]);

    const { WebSite, Bakery, WebPage } = byType(nodes);
    expect(WebSite).toEqual({
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      url: `${SITE}/`,
      name: "Crumbly Bakery",
      publisher: { "@id": `${SITE}/#identity` },
    });
    expect(WebPage).toEqual({
      "@type": "WebPage",
      "@id": `${SITE}/#webpage`,
      url: `${SITE}/`,
      name: "Welcome",
      description: undefined,
      isPartOf: { "@id": `${SITE}/#website` },
      about: { "@id": `${SITE}/#identity` },
    });
    expect(Bakery).toMatchObject({
      "@id": `${SITE}/#identity`,
      name: "Crumbly Bakery",
      description: "Bread since 1990",
      url: `${SITE}/`,
      email: "hello@crumbly.example",
      telephone: "+30 210 123 4567",
      priceRange: "€€",
      sameAs: ["https://instagram.com/crumbly", "https://facebook.com/crumbly"],
      logo: `${SITE}/assets/images/logo-large.png`,
      image: `${SITE}/assets/images/logo-large.png`,
      address: {
        "@type": "PostalAddress",
        streetAddress: "1 Baker St",
        addressLocality: "Athens",
        postalCode: "10558",
        addressCountry: "GR",
      },
    });
  });

  it("writes split shifts as one entry per range and a closed day as 00:00–00:00", () => {
    const { Bakery } = byType(graph({ slug: "index", name: "Home" }, project({ siteIdentity: BAKERY })));
    expect(Bakery.openingHoursSpecification).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: "https://schema.org/Monday", opens: "07:00", closes: "14:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "https://schema.org/Monday", opens: "17:00", closes: "21:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "https://schema.org/Sunday", opens: "00:00", closes: "00:00" },
    ]);
  });

  it("treats a project with no business details as an organization named after the Site Title", () => {
    const nodes = graph({ slug: "index", name: "Home" }, project());
    expect(nodes.map((node) => node["@type"])).toEqual(["WebSite", "Organization", "WebPage"]);
    expect(byType(nodes).Organization).toEqual({
      "@type": "Organization",
      "@id": `${SITE}/#identity`,
      name: "Crumbly",
      description: "",
      url: `${SITE}/`,
      email: undefined,
      telephone: undefined,
      sameAs: [],
      logo: undefined,
    });
  });

  it("omits the identity and every reference to it when there is no name", () => {
    const nodes = graph({ slug: "index", name: "Home" }, project({ siteTitle: "" }));
    expect(nodes.map((node) => node["@type"])).toEqual(["WebSite", "WebPage"]);
    const { WebSite, WebPage } = byType(nodes);
    expect(WebSite.publisher).toBeUndefined();
    expect(WebPage.about).toBeUndefined();
  });

  it("gives a person an image, not a logo, and no business fields", () => {
    const { Person } = byType(
      graph(
        { slug: "home", name: "Home" },
        project({ siteIdentity: { ...BAKERY, category: "person", text: { publicName: "Jo Baker" } } }),
      ),
    );
    expect(Person.image).toBe(`${SITE}/assets/images/logo.png`);
    expect(Person.logo).toBeUndefined();
    expect(Person.address).toBeUndefined();
    expect(Person.openingHoursSpecification).toBeUndefined();
  });

  it("gives an organization a logo but no address or hours", () => {
    const { Organization } = byType(
      graph({ slug: "index", name: "Home" }, project({ siteIdentity: { ...BAKERY, category: "organization" } })),
    );
    expect(Organization.logo).toBe(`${SITE}/assets/images/logo.png`);
    expect(Organization.address).toBeUndefined();
    expect(Organization.priceRange).toBeUndefined();
  });

  it("declares LocalBusiness alongside a type schema.org files elsewhere", () => {
    const nodes = graph({ slug: "index", name: "Home" }, project({ siteIdentity: { category: "veterinary-clinic" } }));
    expect(nodes[1]["@type"]).toEqual(["VeterinaryCare", "LocalBusiness"]);
  });

  it("leaves out an address with no fields", () => {
    const { Bakery } = byType(
      graph({ slug: "index", name: "Home" }, project({ siteIdentity: { category: "bakery", locations: [{ text: { label: "x" } }] } })),
    );
    expect(Bakery.address).toBeUndefined();
  });
});

describe("other pages", () => {
  it("emit only WebPage, pointing at the site by id", () => {
    const nodes = graph({ slug: "about", name: "About", seo: { description: "Who we are" } }, project({ siteIdentity: BAKERY }));
    expect(nodes).toEqual([
      {
        "@type": "WebPage",
        "@id": `${SITE}/about.html#webpage`,
        url: `${SITE}/about.html`,
        name: "About",
        description: "Who we are",
        isPartOf: { "@id": `${SITE}/#website` },
        about: undefined,
      },
    ]);
  });

  it("follow Clean URLs and a subfolder Site URL", () => {
    const [node] = graph({ slug: "about", name: "About" }, project({ siteUrl: "https://user.github.io/repo", cleanUrls: true }));
    expect(node["@id"]).toBe("https://user.github.io/repo/about#webpage");
    expect(node.isPartOf).toEqual({ "@id": "https://user.github.io/repo/#website" });
  });

  it("anchor on the page's own address, not an explicit canonical override", () => {
    const [node] = graph({ slug: "about", name: "About", seo: { canonical_url: "https://elsewhere.example/about" } }, project());
    expect(node.url).toBe(`${SITE}/about.html`);
  });

  it("give a collection item its nested address", () => {
    const [node] = graph({ slug: "news/alpha", name: "Alpha" }, project());
    expect(node["@id"]).toBe(`${SITE}/news/alpha.html#webpage`);
  });

  it("give each paginated copy its own id and nothing else, the homepage's included", () => {
    const blog = graph({ slug: "blog", name: "Blog", pagination: { current: 2, total: 3 } }, project());
    expect(blog.map((node) => node["@id"])).toEqual([`${SITE}/blog/page/2.html#webpage`]);

    const home = graph({ slug: "index", name: "Home", pagination: { current: 2, total: 3 } }, project({ siteIdentity: BAKERY }));
    expect(home.map((node) => node["@type"])).toEqual(["WebPage"]);
    expect(home[0]["@id"]).toBe(`${SITE}/page/2.html#webpage`);
  });

  it("emit nothing without a Site URL", () => {
    expect(graph({ slug: "index", name: "Home" }, project({ siteUrl: "" }))).toEqual([]);
  });
});

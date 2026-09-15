import { describe, it, expect } from "vitest";
import {
  SITE_IDENTITY_CATEGORIES,
  PROFILE_NETWORKS,
  normalizeSiteIdentity,
  identityCategory,
  identityKind,
  resolveSiteIdentity,
  identityReadiness,
} from "../siteIdentity.js";

const fields = (errors) => errors.map((error) => `${error.field}:${error.code}`);

const FULL = {
  category: "bakery",
  logo: "/uploads/images/logo.png",
  email: "hello@crumbly.example",
  telephone: "+30 210 123 4567",
  priceRange: "€€",
  profiles: { facebook: "https://facebook.com/crumbly", instagram: "https://instagram.com/crumbly?hl=en" },
  locations: [
    {
      streetAddress: "1 Baker St",
      addressLocality: "Athens",
      addressRegion: "Attica",
      postalCode: "10558",
      addressCountry: "gr",
      openingHours: {
        monday: [{ opens: "07:00", closes: "14:00" }, { opens: "17:00", closes: "21:00" }],
        saturday: [{ opens: "22:00", closes: "02:00" }],
        sunday: [],
      },
      text: { label: "Main shop" },
    },
  ],
  text: { publicName: "Crumbly", description: "Bread since 1990" },
};

describe("categories", () => {
  it("has unique ids and a known kind on every row", () => {
    const ids = SITE_IDENTITY_CATEGORIES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of SITE_IDENTITY_CATEGORIES) {
      expect(["organization", "person", "localBusiness"]).toContain(entry.kind);
      expect(entry.schemaType).toMatch(/^[A-Z][A-Za-z]+$/);
    }
  });

  it("derives the kind from the category, defaulting to organization", () => {
    expect(identityKind({ category: "bakery" })).toBe("localBusiness");
    expect(identityKind({ category: "veterinary-clinic" })).toBe("localBusiness");
    expect(identityKind({ category: "person" })).toBe("person");
    expect(identityKind({ category: "organization" })).toBe("organization");
    expect(identityKind({})).toBe("organization");
    expect(identityKind(null)).toBe("organization");
    expect(identityCategory({ category: "nope" })).toBe(null);
  });
});

describe("normalizeSiteIdentity", () => {
  it("keeps a full valid identity, trimming text and upper-casing the country", () => {
    const { value, errors } = normalizeSiteIdentity({ ...FULL, text: { publicName: "  Crumbly ", description: "Bread since 1990" } });
    expect(errors).toEqual([]);
    expect(value.text.publicName).toBe("Crumbly");
    expect(value.locations[0].addressCountry).toBe("GR");
    expect(value).toEqual({ ...FULL, locations: [{ ...FULL.locations[0], addressCountry: "GR" }] });
  });

  it("returns an empty identity for nothing", () => {
    expect(normalizeSiteIdentity(undefined)).toEqual({ value: {}, errors: [] });
    expect(normalizeSiteIdentity(null)).toEqual({ value: {}, errors: [] });
    expect(normalizeSiteIdentity({})).toEqual({ value: {}, errors: [] });
  });

  it("rejects a non-object", () => {
    expect(fields(normalizeSiteIdentity("bakery").errors)).toEqual(["siteIdentity:invalid"]);
    expect(fields(normalizeSiteIdentity([]).errors)).toEqual(["siteIdentity:invalid"]);
  });

  it("prunes empty strings, empty groups and empty locations", () => {
    const { value, errors } = normalizeSiteIdentity({
      email: "  ",
      profiles: { facebook: "" },
      locations: [{ streetAddress: "", text: { label: " " } }, {}],
      text: { publicName: "" },
    });
    expect(errors).toEqual([]);
    expect(value).toEqual({});
  });

  it("names every rejected field", () => {
    const { value, errors } = normalizeSiteIdentity({
      category: "spaceport",
      logo: "https://cdn.example.com/logo.png",
      email: "not-an-email",
      telephone: "call me",
      priceRange: 5,
      profiles: { facebook: "javascript:alert(1)", myspace: "https://myspace.com/x", twitter: "https://localhost" },
      text: { publicName: "x".repeat(201) },
    });
    expect(fields(errors)).toEqual([
      "category:unknown",
      "logo:invalid",
      "email:invalid",
      "telephone:invalid",
      "priceRange:invalid",
      "profiles.facebook:invalid",
      "profiles.myspace:unknown",
      "profiles.twitter:invalid",
      "text.publicName:tooLong",
    ]);
    expect(value).toEqual({});
  });

  it("accepts only an uploaded image path as the logo", () => {
    expect(normalizeSiteIdentity({ logo: "/uploads/images/logo.svg" }).errors).toEqual([]);
    for (const logo of ["/uploads/images/..", "/uploads/images/../x.png", "/uploads/files/logo.png", "uploads/images/logo.png"]) {
      expect(fields(normalizeSiteIdentity({ logo }).errors)).toEqual(["logo:invalid"]);
    }
  });

  it("accepts every named network and nothing else", () => {
    const profiles = Object.fromEntries(PROFILE_NETWORKS.map((network) => [network, `https://${network}.example.com/me`]));
    expect(normalizeSiteIdentity({ profiles })).toEqual({ value: { profiles }, errors: [] });
  });

  it("rejects bad opening hours and drops the whole day", () => {
    const { value, errors } = normalizeSiteIdentity({
      locations: [
        {
          addressLocality: "Athens",
          openingHours: {
            monday: [{ opens: "09:00", closes: "17:00" }, { opens: "25:00", closes: "26:00" }],
            tuesday: [{ opens: "09:00", closes: "09:00" }],
            funday: [],
            wednesday: "closed",
            thursday: Array.from({ length: 5 }, () => ({ opens: "09:00", closes: "10:00" })),
            friday: [{ opens: "09:00", closes: "17:00" }],
          },
        },
      ],
    });
    expect(fields(errors)).toEqual([
      "locations.0.openingHours.monday.1:invalid",
      "locations.0.openingHours.tuesday.0:invalid",
      "locations.0.openingHours.funday:unknown",
      "locations.0.openingHours.wednesday:invalid",
      "locations.0.openingHours.thursday:tooMany",
    ]);
    expect(value.locations[0].openingHours).toEqual({ friday: [{ opens: "09:00", closes: "17:00" }] });
  });

  it("requires opening times to be strings, without throwing", () => {
    const { value, errors } = normalizeSiteIdentity({
      locations: [
        {
          addressLocality: "Athens",
          openingHours: {
            monday: [{ opens: ["09:00"], closes: "17:00" }],
            tuesday: [{ opens: "09:00", closes: { toString: null } }],
            friday: [{ opens: "09:00", closes: "17:00" }],
          },
        },
      ],
    });
    expect(fields(errors)).toEqual([
      "locations.0.openingHours.monday.0:invalid",
      "locations.0.openingHours.tuesday.0:invalid",
    ]);
    expect(value.locations[0].openingHours).toEqual({ friday: [{ opens: "09:00", closes: "17:00" }] });
  });

  it("rejects markup in URL fields instead of accepting a rewritten address", () => {
    expect(normalizeSiteIdentity({ profiles: { facebook: "https://example.com/profile?query=foo&ref=site" } })).toEqual({
      value: { profiles: { facebook: "https://example.com/profile?query=foo&ref=site" } },
      errors: [],
    });
    for (const url of ["https://example.com/profile?query=<foo>&ref=site", 'https://example.com/"x', "https://example.com/a b"]) {
      expect(fields(normalizeSiteIdentity({ profiles: { facebook: url } }).errors)).toEqual(["profiles.facebook:invalid"]);
    }
    expect(fields(normalizeSiteIdentity({ logo: "/uploads/images/<x>.png" }).errors)).toEqual(["logo:invalid"]);
  });

  it("rejects a bad country, too many locations and non-list locations", () => {
    expect(fields(normalizeSiteIdentity({ locations: [{ addressCountry: "Greece" }] }).errors)).toEqual([
      "locations.0.addressCountry:tooLong",
    ]);
    expect(fields(normalizeSiteIdentity({ locations: [{ addressCountry: "g1" }] }).errors)).toEqual([
      "locations.0.addressCountry:invalid",
    ]);
    expect(fields(normalizeSiteIdentity({ locations: Array.from({ length: 21 }, () => ({})) }).errors)).toEqual([
      "locations:tooMany",
    ]);
    expect(fields(normalizeSiteIdentity({ locations: {} }).errors)).toEqual(["locations:invalid"]);
  });
});

describe("resolveSiteIdentity", () => {
  it("fills in kind, schema type and the name from Site Title", () => {
    const resolved = resolveSiteIdentity({ category: "veterinary-clinic" }, { siteTitle: "Tailside", name: "My project" });
    expect(resolved).toMatchObject({ kind: "localBusiness", schemaType: "VeterinaryCare", name: "Tailside", description: "" });
  });

  it("prefers the public name and treats no category as an organization", () => {
    const resolved = resolveSiteIdentity({ text: { publicName: "Acme" } }, { siteTitle: "Site" });
    expect(resolved).toMatchObject({ category: "organization", kind: "organization", schemaType: "Organization", name: "Acme" });
  });

  it("never falls back to the internal project name", () => {
    expect(resolveSiteIdentity({}, { name: "My project" }).name).toBe("");
  });
});

describe("identityReadiness", () => {
  const items = (identity, project) =>
    Object.fromEntries(identityReadiness(identity, project).map((entry) => [entry.item, entry.ok]));

  it("asks a local business for Site URL, name, logo and address", () => {
    expect(items(FULL, { siteUrl: "https://crumbly.example" })).toEqual({ siteUrl: true, name: true, logo: true, address: true });
    expect(items({ category: "bakery" }, { siteUrl: "", siteTitle: "" })).toEqual({
      siteUrl: false,
      name: false,
      logo: false,
      address: false,
    });
  });

  it("asks an organization for no address and a person for no logo", () => {
    expect(Object.keys(items({}, { siteTitle: "Acme" }))).toEqual(["siteUrl", "name", "logo"]);
    expect(Object.keys(items({ category: "person" }, { siteTitle: "Jo" }))).toEqual(["siteUrl", "name"]);
  });

  it("does not count an invalid stored Site URL", () => {
    expect(items({}, { siteUrl: "https://example.com/?q=1" }).siteUrl).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { identityToForm, formToIdentity, identityErrorAt } from "../siteIdentityForm.js";

const STORED = {
  category: "bakery",
  logo: "/uploads/images/logo.png",
  email: "hello@crumbly.example",
  telephone: "+30 210 123 4567",
  priceRange: "€€",
  profiles: { instagram: "https://instagram.com/crumbly" },
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
      text: { label: "Main shop" },
    },
    { addressLocality: "Patras", addressCountry: "GR" },
  ],
  text: { publicName: "Crumbly", description: "Bread since 1990" },
};

describe("identityToForm", () => {
  it("gives an empty project a blank form with every field present", () => {
    const form = identityToForm(undefined);
    expect(form.category).toBe("");
    expect(form.profiles.facebook).toBe("");
    expect(Object.keys(form.profiles)).toHaveLength(15);
    expect(form.location).toEqual({
      streetAddress: "",
      addressLocality: "",
      addressRegion: "",
      postalCode: "",
      addressCountry: "",
      label: "",
    });
    expect(form.hours.monday).toEqual({ mode: "unset", ranges: [] });
    expect(form.extraLocations).toEqual([]);
  });

  it("maps the primary location, its hours modes and the other locations", () => {
    const form = identityToForm(STORED);
    expect(form.publicName).toBe("Crumbly");
    expect(form.location.label).toBe("Main shop");
    expect(form.hours.monday).toEqual({
      mode: "open",
      ranges: [
        { opens: "07:00", closes: "14:00" },
        { opens: "17:00", closes: "21:00" },
      ],
    });
    expect(form.hours.sunday).toEqual({ mode: "closed", ranges: [] });
    expect(form.hours.tuesday).toEqual({ mode: "unset", ranges: [] });
    expect(form.extraLocations).toEqual([{ addressLocality: "Patras", addressCountry: "GR" }]);
  });
});

describe("formToIdentity", () => {
  it("round-trips a stored identity unchanged", () => {
    expect(formToIdentity(identityToForm(STORED))).toEqual({ value: STORED, errors: [] });
  });

  it("turns a blank form into an empty identity", () => {
    expect(formToIdentity(identityToForm({}))).toEqual({ value: {}, errors: [] });
  });

  it("drops empty ranges and treats an open day with none as not stated", () => {
    const form = identityToForm({ category: "bakery" });
    form.location.addressLocality = "Athens";
    form.hours.monday = { mode: "open", ranges: [{ opens: "", closes: "" }] };
    form.hours.tuesday = { mode: "open", ranges: [{ opens: "09:00", closes: "17:00" }, { opens: "", closes: "" }] };
    form.hours.wednesday = { mode: "closed", ranges: [{ opens: "09:00", closes: "17:00" }] };
    const { value, errors } = formToIdentity(form);
    expect(errors).toEqual([]);
    expect(value.locations[0].openingHours).toEqual({
      tuesday: [{ opens: "09:00", closes: "17:00" }],
      wednesday: [],
    });
  });

  it("reports problems at the stored-shape paths the fields look up", () => {
    const form = identityToForm({});
    form.email = "not-an-email";
    form.location.addressCountry = "G1";
    form.hours.friday = { mode: "open", ranges: [{ opens: "09:00", closes: "" }] };
    form.profiles.facebook = "facebook.com/me";
    const { errors } = formToIdentity(form);
    expect(errors.map((error) => error.field)).toEqual([
      "email",
      "profiles.facebook",
      "locations.0.addressCountry",
      "locations.0.openingHours.friday.0",
    ]);
  });
});

describe("formToIdentity — clearing the primary location", () => {
  it("refuses to let a hidden location take the emptied primary's place", () => {
    const form = identityToForm(STORED);
    form.location = { streetAddress: "", addressLocality: " ", addressRegion: "", postalCode: "", addressCountry: "", label: "" };
    form.hours = Object.fromEntries(Object.keys(form.hours).map((day) => [day, { mode: "unset", ranges: [] }]));
    const { errors } = formToIdentity(form);
    expect(errors).toContainEqual({ field: "locations.0.streetAddress", code: "primaryRequired" });
  });

  it("allows clearing the only location", () => {
    const form = identityToForm({ ...STORED, locations: [STORED.locations[0]] });
    form.location = { streetAddress: "", addressLocality: "", addressRegion: "", postalCode: "", addressCountry: "", label: "" };
    form.hours = Object.fromEntries(Object.keys(form.hours).map((day) => [day, { mode: "unset", ranges: [] }]));
    const { value, errors } = formToIdentity(form);
    expect(errors).toEqual([]);
    expect(value.locations).toBeUndefined();
  });

  it("keeps a primary that has only opening hours", () => {
    const form = identityToForm(STORED);
    form.location = { streetAddress: "", addressLocality: "", addressRegion: "", postalCode: "", addressCountry: "", label: "" };
    const { errors } = formToIdentity(form);
    expect(errors).toEqual([]);
  });
});

describe("identityErrorAt", () => {
  const errors = [
    { field: "locations.0.openingHours.friday.0", code: "invalid" },
    { field: "email", code: "invalid" },
  ];

  it("finds an error at a path or under it", () => {
    expect(identityErrorAt(errors, "email")).toEqual({ field: "email", code: "invalid" });
    expect(identityErrorAt(errors, "locations.0.openingHours.friday")?.code).toBe("invalid");
  });

  it("does not match a sibling that merely shares a prefix", () => {
    expect(identityErrorAt(errors, "locations.0.openingHours.fri")).toBeNull();
    expect(identityErrorAt([], "email")).toBeNull();
    expect(identityErrorAt(undefined, "email")).toBeNull();
  });
});

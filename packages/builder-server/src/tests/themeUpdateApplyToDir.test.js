import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { applyThemeUpdateToDir } from "../services/themeUpdateService.js";

async function makeFixture() {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "apply-"));
  const src = path.join(base, "source");
  const proj = path.join(base, "project");
  await fs.outputJson(path.join(src, "theme.json"), {
    version: "1.3.0",
    settings: {
      global: {
        colors: [
          { id: "primary", value: "#00f", default: "#00f" },
          { id: "accent", value: "#0f0", default: "#0f0" },
        ],
      },
    },
  });
  await fs.outputFile(path.join(src, "assets", "app.css"), "new");
  await fs.outputJson(path.join(src, "menus", "footer.json"), { name: "Footer", items: [] });
  await fs.outputJson(path.join(proj, "theme.json"), {
    version: "1.0.0",
    settings: {
      global: {
        colors: [
          { id: "primary", value: "#123456", default: "#00f" },
          { id: "gone", value: "#999", default: "#999" },
        ],
      },
    },
  });
  await fs.outputFile(path.join(proj, "assets", "old.css"), "stale");
  await fs.outputJson(path.join(proj, "menus", "main.json"), { name: "Main (edited)", items: [] });
  await fs.outputJson(path.join(proj, "pages", "home.json"), { id: "home", title: "My Home" });
  return { src, proj };
}

test("applyThemeUpdateToDir: wholesale replace, add-only, merge, version", async () => {
  const { src, proj } = await makeFixture();
  const result = await applyThemeUpdateToDir({ themeSourceDir: src, projectDir: proj });
  assert.equal(result.newVersion, "1.3.0");
  assert.equal(await fs.pathExists(path.join(proj, "assets", "old.css")), false);
  assert.equal(await fs.readFile(path.join(proj, "assets", "app.css"), "utf8"), "new");
  assert.equal((await fs.readJson(path.join(proj, "menus", "main.json"))).name, "Main (edited)");
  const footer = await fs.readJson(path.join(proj, "menus", "footer.json"));
  assert.equal(footer.id, "footer");
  assert.ok(footer.uuid);
  assert.equal((await fs.readJson(path.join(proj, "pages", "home.json"))).title, "My Home");
  const merged = await fs.readJson(path.join(proj, "theme.json"));
  const ids = merged.settings.global.colors.map((c) => c.id);
  assert.deepEqual(ids, ["primary", "accent"]);
  // User's customized value survives; the new setting keeps the theme default
  assert.equal(merged.settings.global.colors[0].value, "#123456");
  assert.equal(merged.settings.global.colors[1].value, "#0f0");
});

// A language's pages and a collection's main-language items both publish into a
// folder named by their code or slugPrefix. An update that brings in a collection
// prefixed with one of the project's languages is refused before the swap.
const collectionSchema = (type, extra = {}) => ({
  type,
  displayName: "Product",
  displayNamePlural: "Products",
  hasItemPages: true,
  settings: [{ type: "text", id: "title", label: "Title", required: true, usedAsTitle: true }],
  ...extra,
});
const writeCollection = (src, type, schema) =>
  fs.outputJson(path.join(src, "collection-types", type, "schema.json"), schema);

test("applyThemeUpdateToDir: refuses a collection that would publish into a language folder", async () => {
  const { src, proj } = await makeFixture();
  await writeCollection(src, "products", collectionSchema("products", { slugPrefix: "it" }));

  await assert.rejects(applyThemeUpdateToDir({ themeSourceDir: src, projectDir: proj, languages: ["it"] }), (error) => {
    assert.match(error.message, /"Products" collection in the it\/ folder.*This update was not applied/s);
    assert.equal(error.statusCode, 409);
    return true;
  });
  assert.equal(await fs.readFile(path.join(proj, "assets", "old.css"), "utf8"), "stale", "the project is untouched");
  assert.equal((await fs.readJson(path.join(proj, "theme.json"))).version, "1.0.0");
  assert.equal(await fs.pathExists(path.join(proj, "collection-types")), false);
  assert.equal(await fs.pathExists(path.join(proj, ".theme-update-stage")), false, "the staged copy is removed");
});

test("applyThemeUpdateToDir: a slugPrefix left out defaults to the type, and still clashes", async () => {
  const { src, proj } = await makeFixture();
  await writeCollection(src, "it", collectionSchema("it"));

  await assert.rejects(
    applyThemeUpdateToDir({ themeSourceDir: src, projectDir: proj, languages: ["it"] }),
    /in the it\/ folder/,
  );
});

// An interrupted run is undone before the check, so a refused update still
// repairs a project that run left half-swapped.
test("applyThemeUpdateToDir: a refused update still undoes an interrupted run", async () => {
  const { src, proj } = await makeFixture();
  await writeCollection(src, "products", collectionSchema("products", { slugPrefix: "it" }));
  await fs.remove(path.join(proj, "assets", "old.css"));
  await fs.outputFile(path.join(proj, ".theme-update-backup", "assets", "old.css"), "stale");
  await fs.outputJson(path.join(proj, ".theme-update-backup", ".in-progress"), { added: [], placedWhereAbsent: [] });

  await assert.rejects(
    applyThemeUpdateToDir({ themeSourceDir: src, projectDir: proj, languages: ["it"] }),
    (error) => error.statusCode === 409,
  );
  assert.equal(await fs.readFile(path.join(proj, "assets", "old.css"), "utf8"), "stale", "the displaced file is back");
  assert.equal(await fs.pathExists(path.join(proj, ".theme-update-backup")), false);
});

// A collection-types the update cannot read is a failed preparation, reported
// in the same words as any other, not a raw filesystem error.
test("applyThemeUpdateToDir: an unreadable collection-types fails the preparation safely", async () => {
  const { src, proj } = await makeFixture();
  await fs.outputFile(path.join(src, "collection-types"), "not a folder");

  await assert.rejects(
    applyThemeUpdateToDir({ themeSourceDir: src, projectDir: proj, languages: ["it"] }),
    /The update could not be prepared, so nothing in the project was changed/,
  );
  assert.equal(await fs.readFile(path.join(proj, "assets", "old.css"), "utf8"), "stale");
  assert.equal(await fs.pathExists(path.join(proj, ".theme-update-stage")), false);
});

// What the project would not load publishes nothing, so it is no clash.
test("applyThemeUpdateToDir: no clash from another language, list-only or invalid collections", async () => {
  const { src, proj } = await makeFixture();
  await writeCollection(src, "products", collectionSchema("products", { slugPrefix: "it" }));
  await writeCollection(src, "notes", collectionSchema("notes", { slugPrefix: "el", hasItemPages: false }));
  await writeCollection(src, "broken", { type: "broken", hasItemPages: true, slugPrefix: "el" });

  const result = await applyThemeUpdateToDir({ themeSourceDir: src, projectDir: proj, languages: ["el"] });
  assert.equal(result.newVersion, "1.3.0");
});

// Pages and menus an update adds get the page references a new project's get, so
// their links follow a page that is later renamed. Everything the project already
// has is left as it was, including links that happen to name an added page.
async function makeLinkFixture() {
  const { src, proj } = await makeFixture();
  await fs.outputJson(path.join(proj, "pages", "contact.json"), { id: "contact", slug: "contact", uuid: "contact-en" });
  await fs.outputJson(path.join(proj, "pages", "el", "contact.json"), {
    id: "contact",
    slug: "contact",
    uuid: "contact-el",
  });
  const ownPage = {
    id: "about",
    slug: "about",
    uuid: "about-en",
    widgets: { cta: { type: "banner", settings: { link: { href: "team.html", text: "Team" } } } },
  };
  await fs.outputJson(path.join(proj, "pages", "about.json"), ownPage);

  await fs.outputJson(path.join(src, "templates", "team.json"), {
    name: "Team",
    slug: "team",
    widgets: {
      intro: {
        type: "image-text",
        settings: {
          link: { href: "contact.html", text: "Talk to us" },
          external: { href: "https://example.com/x.html", text: "Elsewhere" },
          text: '<p><a href="contact.html">Write to us</a></p>',
          menu: "main",
        },
        blocks: { b1: { type: "button", settings: { link: { href: "careers.html", text: "Careers" } } } },
      },
    },
  });
  await fs.outputJson(path.join(src, "templates", "careers.json"), { name: "Careers", slug: "careers", widgets: {} });
  await fs.outputJson(path.join(src, "templates", "el", "team.json"), {
    name: "Ομάδα",
    slug: "team",
    widgets: { intro: { type: "image-text", settings: { link: { href: "contact.html", text: "Επικοινωνία" } } } },
  });
  await fs.outputJson(path.join(src, "menus", "team.json"), {
    name: "Team",
    items: [
      { label: "Contact", link: "contact.html", items: [{ label: "Careers", link: "careers.html", items: [] }] },
      { label: "Elsewhere", link: "https://example.com", items: [] },
    ],
  });
  const themeJson = await fs.readJson(path.join(src, "theme.json"));
  themeJson.settings.global.links = [
    { id: "cta", type: "link", default: { href: "contact.html", text: "Contact" } },
    { id: "kept", type: "link", default: { href: "contact.html", text: "Contact" } },
  ];
  await fs.outputJson(path.join(src, "theme.json"), themeJson);
  const projectTheme = await fs.readJson(path.join(proj, "theme.json"));
  projectTheme.settings.global.links = [{ id: "kept", type: "link", value: { href: "contact.html", text: "Mine" } }];
  await fs.outputJson(path.join(proj, "theme.json"), projectTheme);
  return { src, proj, ownPage };
}

test("applyThemeUpdateToDir: added pages and menus get page references", async () => {
  const { src, proj, ownPage } = await makeLinkFixture();
  const ownMenuBefore = await fs.readFile(path.join(proj, "menus", "main.json"), "utf8");
  await applyThemeUpdateToDir({ themeSourceDir: src, projectDir: proj, languages: ["el"] });

  const team = await fs.readJson(path.join(proj, "pages", "team.json"));
  const careers = await fs.readJson(path.join(proj, "pages", "careers.json"));
  assert.ok(team.uuid && careers.uuid, "added pages have their uuid straight away");
  const intro = team.widgets.intro;
  assert.equal(intro.settings.link.pageUuid, "contact-en");
  assert.equal(intro.blocks.b1.settings.link.pageUuid, careers.uuid, "a link to another added page resolves");
  assert.equal(intro.settings.external.pageUuid, undefined);
  assert.match(intro.settings.text, /data-page-uuid="contact-en"/);
  assert.equal(intro.settings.menu, "main", "a menu selection stays a slug, which resolves per language");

  const elTeam = await fs.readJson(path.join(proj, "pages", "el", "team.json"));
  assert.equal(elTeam.widgets.intro.settings.link.pageUuid, "contact-el", "a Greek page's link names the Greek page");

  const menu = await fs.readJson(path.join(proj, "menus", "team.json"));
  assert.equal(menu.items[0].pageUuid, "contact-en");
  assert.equal(menu.items[0].items[0].pageUuid, careers.uuid);
  assert.equal(menu.items[1].pageUuid, undefined);

  const links = (await fs.readJson(path.join(proj, "theme.json"))).settings.global.links;
  assert.equal(links.find((s) => s.id === "cta").default.pageUuid, "contact-en");
  assert.deepEqual(
    links.find((s) => s.id === "kept").value,
    { href: "contact.html", text: "Mine" },
    "the owner's value is kept",
  );

  assert.deepEqual(
    await fs.readJson(path.join(proj, "pages", "about.json")),
    ownPage,
    "the project's own page is untouched",
  );
  assert.equal(await fs.readFile(path.join(proj, "menus", "main.json"), "utf8"), ownMenuBefore);
});

test("applyThemeUpdateToDir: a failed swap leaves no enriched additions behind", async () => {
  const { src, proj } = await makeLinkFixture();
  const themeJsonPath = path.join(proj, "theme.json");
  const original = await fs.readFile(themeJsonPath, "utf8");
  // Fail partway through writing the additions: the added menu is written first.
  const failing = path.join(proj, "pages", "careers.json");
  const realOutputJson = fs.outputJson;
  fs.outputJson = async (file, ...rest) => {
    if (file === failing) throw new Error("disk full");
    return realOutputJson(file, ...rest);
  };
  try {
    await assert.rejects(applyThemeUpdateToDir({ themeSourceDir: src, projectDir: proj }), /left as it was/);
  } finally {
    fs.outputJson = realOutputJson;
  }
  assert.equal(await fs.pathExists(path.join(proj, "menus", "team.json")), false);
  assert.equal(await fs.pathExists(path.join(proj, "pages", "team.json")), false);
  assert.equal(await fs.readFile(themeJsonPath, "utf8"), original);
});

test("applyThemeUpdateToDir: added globals and slug-less templates, moved and theme-supplied settings", async () => {
  const { src, proj } = await makeFixture();
  await fs.outputJson(path.join(proj, "pages", "contact.json"), { id: "contact", slug: "contact", uuid: "contact-en" });
  // An added global is enriched like a page widget but, as in a new project, gets no uuid.
  await fs.outputJson(path.join(src, "templates", "global", "header.json"), {
    type: "header",
    settings: { cta: { href: "contact.html", text: "Contact" } },
    blocks: { b1: { type: "button", settings: { link: { href: "faq.html", text: "FAQ" } } } },
  });
  // A template without a slug is named after its file, and links to it resolve by that name.
  await fs.outputJson(path.join(src, "templates", "faq.json"), { name: "FAQ", widgets: {} });

  const themeJson = await fs.readJson(path.join(src, "theme.json"));
  themeJson.settings.global.footer = [
    // Moved here from `links` by the update; the owner's value travels with it.
    { id: "moved", type: "link", default: { href: "contact.html", text: "Contact" } },
    // The owner never set this one; the theme ships a value as well as a default.
    {
      id: "shipped",
      type: "link",
      value: { href: "faq.html", text: "FAQ" },
      default: { href: "faq.html", text: "FAQ" },
    },
  ];
  await fs.outputJson(path.join(src, "theme.json"), themeJson);
  const projectTheme = await fs.readJson(path.join(proj, "theme.json"));
  projectTheme.settings.global.links = [{ id: "moved", type: "link", value: { href: "contact.html", text: "Mine" } }];
  await fs.outputJson(path.join(proj, "theme.json"), projectTheme);

  await applyThemeUpdateToDir({ themeSourceDir: src, projectDir: proj });

  const faq = await fs.readJson(path.join(proj, "pages", "faq.json"));
  assert.equal(faq.slug, "faq");
  assert.ok(faq.uuid);

  const header = await fs.readJson(path.join(proj, "pages", "global", "header.json"));
  assert.equal(header.uuid, undefined, "a global gets no uuid");
  assert.equal(header.settings.cta.pageUuid, "contact-en");
  assert.equal(header.blocks.b1.settings.link.pageUuid, faq.uuid);

  const footer = (await fs.readJson(path.join(proj, "theme.json"))).settings.global.footer;
  const moved = footer.find((s) => s.id === "moved");
  assert.deepEqual(moved.value, { href: "contact.html", text: "Mine" }, "a moved owner value is kept as it was");
  assert.equal(moved.default.pageUuid, "contact-en");
  const shipped = footer.find((s) => s.id === "shipped");
  assert.equal(shipped.value.pageUuid, faq.uuid, "a value the theme supplies is enriched");
  assert.equal(shipped.default.pageUuid, faq.uuid);
});

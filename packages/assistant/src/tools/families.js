import { findThemeSetting } from "@widgetizer/core/themeSettingChanges";
import { normalizeSiteIdentity } from "@widgetizer/core/siteIdentity";
import { APPROVAL_ID, languageArg, nameArg } from "./shared.js";
import { toolError } from "../errors.js";
import { checkedValues, definitionsOf } from "../edits/values.js";
import { resolveReferences } from "../edits/references.js";

const JOB_ID = { type: "string", pattern: "^[a-f0-9-]{36}$", description: "The running job, from start_job." };
const SLUG = { type: "string", minLength: 1, maxLength: 100, pattern: "^[a-z0-9-]+$" };
const TYPE = {
  type: "string",
  minLength: 1,
  maxLength: 100,
  pattern: "^[a-z0-9-]+$",
  description: "The collection type, from read_collections.",
};
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const DESTRUCTIVE = { ...WRITE, destructiveHint: true };

function schemaFor(properties, required = []) {
  return {
    type: "object",
    properties: { jobId: JOB_ID, ...properties, approvalId: APPROVAL_ID },
    required: ["jobId", ...required],
    additionalProperties: false,
  };
}

function requireJobs(ctx) {
  if (!ctx.jobs) throw toolError("JOBS_UNAVAILABLE", "Changing sites isn't available in this Widgetizer.");
  return ctx.jobs;
}

/**
 * One job edit through an editor route. `build()` runs in the job's edit queue, right before the request, so
 * it reads what the previous edit saved; it returns what the edit changes (for the job's limits and record),
 * the request, and optionally where the saved page now is.
 */
async function routeEdit(ctx, { languages, build }) {
  const { approvalId, ...args } = ctx.args;
  return requireJobs(ctx).runRoute({
    jobId: ctx.args.jobId,
    session: ctx.session,
    languages,
    tool: ctx.toolName,
    args,
    approvalId: approvalId ?? null,
    build,
  });
}

const pageLink = (lang) => (data) =>
  data?.uuid ? { pageUuid: data.uuid, page: data.slug ?? data.id, language: lang.language } : null;

const isPlain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// Business details: nested groups (text, profiles) keep the fields a patch leaves out; locations are replaced as a list.
function mergeIdentity(current, patch) {
  const merged = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    merged[key] = isPlain(value) && isPlain(current[key]) ? { ...current[key], ...value } : value;
  }
  return merged;
}

const languageQuery = (lang) => ({ language: lang.language });
const pageLabel = (slug, lang) => `the page "${slug}" (${lang.language})`;

function flattenMenu(items, out = []) {
  for (const item of Array.isArray(items) ? items : []) {
    out.push(`${item?.label ?? ""}|${item?.link ?? ""}`);
    flattenMenu(item?.items, out);
  }
  return out;
}

async function resolveMenuItems(items, context) {
  const out = [];
  for (const item of items) {
    const { page, item: target, items: children, ...rest } = item;
    const entry = { label: String(rest.label ?? ""), link: rest.link ?? "", items: [] };
    if (page || target) {
      const [{ settings }] = await resolveReferences(
        [{ op: "values", settings: { link: { text: entry.label, page, item: target } } }],
        context,
      );
      entry.link = settings.link.href;
      if (settings.link.pageUuid) entry.pageUuid = settings.link.pageUuid;
      if (settings.link.collectionItemUuid) {
        entry.collectionItemUuid = settings.link.collectionItemUuid;
        entry.collectionType = settings.link.collectionType;
      }
    } else {
      for (const key of ["pageUuid", "collectionItemUuid", "collectionType"]) if (rest[key]) entry[key] = rest[key];
    }
    entry.items = Array.isArray(children) ? await resolveMenuItems(children, context) : [];
    out.push(entry);
  }
  return out;
}

const MENU_ITEMS = {
  type: "array",
  maxItems: 200,
  description:
    "The menu's items in order, each { label, link } or { label, page: slug } or { label, item: { type, slug } }, with optional items: [...] for a submenu. Items kept from read_menus may keep their pageUuid.",
  items: { type: "object" },
};

export const createPageTool = {
  name: "create_page",
  title: "Create a page",
  description: "Adds a new empty page in a running job. Fill it with edit_sections afterwards.",
  inputSchema: schemaFor(
    { name: { type: "string", minLength: 1, maxLength: 200 }, slug: SLUG, language: languageArg },
    ["name"],
  ),
  annotations: WRITE,
  recordsOutcome: true,
  async run(ctx) {
    await ctx.openSite();
    const lang = ctx.language(ctx.args.language);
    const label = `a new page "${ctx.args.name}" (${lang.language})`;
    const { data, receipt } = await routeEdit(ctx, {
      languages: [lang.language],
      build: async () => ({
        entries: [
          {
            key: `new-page:${ctx.args.slug ?? ctx.args.name}:${lang.language}`,
            counts: false,
            label,
            summary: `Add ${label}`,
            changes: { added: ["page"] },
          },
        ],
        request: (call) =>
          call({
            method: "POST",
            path: "/api/pages",
            query: languageQuery(lang),
            body: { name: ctx.args.name, slug: ctx.args.slug },
          }),
        linkFrom: pageLink(lang),
      }),
    });
    return { data: { page: data.slug ?? data.id, language: lang.language, changedSoFar: receipt } };
  },
};

export const updatePageTool = {
  name: "update_page",
  title: "Update page details",
  description:
    "Renames a page or changes its address (slug) or its SEO title and description, in a running job. Only what you pass changes.",
  inputSchema: schemaFor(
    {
      page: nameArg("The page's slug."),
      language: languageArg,
      name: { type: "string", minLength: 1, maxLength: 200 },
      slug: SLUG,
      seo: {
        type: "object",
        properties: {
          description: { type: "string", maxLength: 500 },
          og_title: { type: "string", maxLength: 200 },
          og_image: { type: "object", description: "{ media: id } from list_media." },
          robots: { type: "string", enum: ["index,follow", "noindex,follow", "index,nofollow", "noindex,nofollow"] },
        },
        additionalProperties: false,
      },
    },
    ["page"],
  ),
  annotations: WRITE,
  recordsOutcome: true,
  async run(ctx) {
    const { scope } = await ctx.openSite();
    const lang = ctx.language(ctx.args.language);
    const label = pageLabel(ctx.args.page, lang);
    let slug = ctx.args.slug ?? ctx.args.page;
    const { receipt } = await routeEdit(ctx, {
      languages: [lang.language],
      build: async () => {
        const current = await ctx.reader.readPage(scope, ctx.args.page, lang);
        if (!current) throw toolError("PAGE_NOT_FOUND", `There's no page "${ctx.args.page}" in ${lang.language}.`);
        let seo = ctx.args.seo;
        if (seo?.og_image) {
          const [{ settings }] = await resolveReferences([{ op: "values", settings: { image: seo.og_image } }], {
            reader: ctx.reader,
            scope,
            lang,
          });
          seo = { ...seo, og_image: settings.image };
        }
        slug = ctx.args.slug ?? current.slug ?? ctx.args.page;
        const body = {
          ...current,
          ...(ctx.args.name ? { name: ctx.args.name } : {}),
          slug,
          ...(seo ? { seo: { ...(current.seo ?? {}), ...seo } } : {}),
        };
        return {
          entries: [
            {
              key: `page:${current.uuid ?? ctx.args.page}:${lang.language}`,
              label,
              summary: `Change the details of ${label}`,
              changes: { updated: ["details"] },
              link: { pageUuid: current.uuid, page: slug, language: lang.language },
            },
          ],
          request: (call) =>
            call({
              method: "PUT",
              path: `/api/pages/${encodeURIComponent(ctx.args.page)}`,
              query: languageQuery(lang),
              body,
            }),
        };
      },
    });
    return { data: { page: slug, language: lang.language, changedSoFar: receipt } };
  },
};

export const duplicatePageTool = {
  name: "duplicate_page",
  title: "Duplicate a page",
  description: "Copies a page, with all its sections, in a running job.",
  inputSchema: schemaFor({ page: nameArg("The page's slug."), language: languageArg }, ["page"]),
  annotations: WRITE,
  recordsOutcome: true,
  async run(ctx) {
    await ctx.openSite();
    const lang = ctx.language(ctx.args.language);
    const label = `a copy of ${pageLabel(ctx.args.page, lang)}`;
    const { data, receipt } = await routeEdit(ctx, {
      languages: [lang.language],
      build: async () => ({
        entries: [
          {
            key: `copy:${ctx.args.page}:${lang.language}:${Date.now()}`,
            counts: false,
            label,
            summary: `Add ${label}`,
            changes: { added: ["page"] },
          },
        ],
        request: (call) =>
          call({
            method: "POST",
            path: `/api/pages/${encodeURIComponent(ctx.args.page)}/duplicate`,
            query: languageQuery(lang),
          }),
        linkFrom: pageLink(lang),
      }),
    });
    return { data: { page: data?.slug ?? data?.id, language: lang.language, changedSoFar: receipt } };
  },
};

export const deletePageTool = {
  name: "delete_page",
  title: "Delete a page",
  description: "Deletes a page in a running job. Always needs the user's OK (NEEDS_APPROVAL first).",
  inputSchema: schemaFor({ page: nameArg("The page's slug."), language: languageArg }, ["page"]),
  annotations: DESTRUCTIVE,
  recordsOutcome: true,
  async run(ctx) {
    const { scope } = await ctx.openSite();
    const lang = ctx.language(ctx.args.language);
    const label = pageLabel(ctx.args.page, lang);
    const { receipt } = await routeEdit(ctx, {
      languages: [lang.language],
      build: async () => {
        const current = await ctx.reader.readPage(scope, ctx.args.page, lang);
        if (!current) throw toolError("PAGE_NOT_FOUND", `There's no page "${ctx.args.page}" in ${lang.language}.`);
        return {
          entries: [
            {
              key: `page:${current.uuid ?? ctx.args.page}:${lang.language}`,
              label,
              summary: `Delete ${label}`,
              confirm: `delete ${label}`,
              changes: { removed: ["page"] },
            },
          ],
          request: (call) =>
            call({
              method: "DELETE",
              path: `/api/pages/${encodeURIComponent(ctx.args.page)}`,
              query: languageQuery(lang),
            }),
        };
      },
    });
    return { data: { deleted: ctx.args.page, language: lang.language, changedSoFar: receipt } };
  },
};

export const updateMenuTool = {
  name: "update_menu",
  title: "Update a menu",
  description:
    "Replaces a menu's items (and optionally its name) in a running job. Read it with read_menus first and send the whole list. Removing more than half of its items needs the user's OK.",
  inputSchema: schemaFor(
    {
      menu: nameArg("The menu's id."),
      language: languageArg,
      name: { type: "string", minLength: 1, maxLength: 200 },
      items: MENU_ITEMS,
    },
    ["menu", "items"],
  ),
  annotations: WRITE,
  recordsOutcome: true,
  async run(ctx) {
    const { scope } = await ctx.openSite();
    const lang = ctx.language(ctx.args.language);
    const { receipt } = await routeEdit(ctx, {
      languages: [lang.language],
      build: async () => {
        const current = await ctx.reader.readMenu(scope, ctx.args.menu, lang);
        if (!current) throw toolError("MENU_NOT_FOUND", `There's no menu "${ctx.args.menu}" in ${lang.language}.`);
        const items = await resolveMenuItems(ctx.args.items, { reader: ctx.reader, scope, lang });
        const label = `the menu "${current.name ?? ctx.args.menu}" (${lang.language})`;
        return {
          entries: [
            {
              key: `menu:${current.uuid ?? ctx.args.menu}:${lang.language}`,
              counts: false,
              label,
              unit: "items",
              before: flattenMenu(current.items),
              after: flattenMenu(items),
              summary: `Change ${label} to: ${flattenMenu(items)
                .map((entry) => entry.split("|")[0])
                .join(", ")}`,
              changes: { updated: ["items"] },
            },
          ],
          request: (call) =>
            call({
              method: "PUT",
              path: `/api/menus/${encodeURIComponent(ctx.args.menu)}`,
              query: languageQuery(lang),
              body: { ...current, name: ctx.args.name ?? current.name, items },
            }),
        };
      },
    });
    return { data: { menu: ctx.args.menu, language: lang.language, changedSoFar: receipt } };
  },
};

export const createMenuTool = {
  name: "create_menu",
  title: "Create a menu",
  description: "Adds a new menu in a running job.",
  inputSchema: schemaFor(
    { name: { type: "string", minLength: 1, maxLength: 200 }, language: languageArg, items: MENU_ITEMS },
    ["name"],
  ),
  annotations: WRITE,
  recordsOutcome: true,
  async run(ctx) {
    const { scope } = await ctx.openSite();
    const lang = ctx.language(ctx.args.language);
    const items = await resolveMenuItems(ctx.args.items ?? [], { reader: ctx.reader, scope, lang });
    const label = `a new menu "${ctx.args.name}" (${lang.language})`;
    const { data, receipt } = await routeEdit(ctx, {
      languages: [lang.language],
      build: async () => ({
        entries: [
          {
            key: `new-menu:${ctx.args.name}:${lang.language}`,
            counts: false,
            label,
            summary: `Add ${label}`,
            changes: { added: ["menu"] },
          },
        ],
        request: async (call) => {
          const created = await call({
            method: "POST",
            path: "/api/menus",
            query: languageQuery(lang),
            body: { name: ctx.args.name },
          });
          if (created.status >= 300 || !items.length) return created;
          const filled = await call({
            method: "PUT",
            path: `/api/menus/${encodeURIComponent(created.data.id)}`,
            query: languageQuery(lang),
            body: { ...created.data, items },
          });
          return filled.status < 300
            ? { status: filled.status, data: { ...created.data, items } }
            : { status: 500, data: filled.data };
        },
      }),
    });
    return { data: { menu: data?.id, language: lang.language, changedSoFar: receipt } };
  },
};

export const updateLookTool = {
  name: "update_look",
  title: "Change the site's look",
  description:
    "Changes theme settings (colours, fonts, style options) in a running job. Use the ids read_look shows; values must fit each setting.",
  inputSchema: schemaFor(
    {
      changes: {
        type: "array",
        minItems: 1,
        maxItems: 50,
        items: {
          type: "object",
          properties: {
            id: { type: "string", minLength: 1, maxLength: 100 },
            group: { type: "string", maxLength: 100 },
            value: {},
          },
          required: ["id"],
          additionalProperties: false,
        },
      },
    },
    ["changes"],
  ),
  annotations: WRITE,
  recordsOutcome: true,
  async run(ctx) {
    const { scope, project } = await ctx.openSite();
    const lang = ctx.language();
    let changes = [];
    const { receipt } = await routeEdit(ctx, {
      languages: [],
      build: async () => {
        const theme = await ctx.reader.readThemeJson(scope);
        changes = [];
        for (const change of ctx.args.changes) {
          const found = findThemeSetting(theme, change);
          if (!found?.item) {
            throw toolError(
              "INVALID_EDIT",
              found?.ambiguous
                ? `"${change.id}" is in several groups; give its group.`
                : `The theme has no setting "${change.id}".`,
            );
          }
          const checked = await checkedValues({ [change.id]: change.value }, new Map([[change.id, found.item]]), {
            reader: ctx.reader,
            scope,
            lang,
            where: "The look",
          });
          changes.push({ group: found.group, id: change.id, baseValue: found.item.value, value: checked[change.id] });
        }
        return {
          entries: [
            {
              key: "look",
              counts: false,
              label: "the site's look",
              summary: `Change the look: ${changes.map((change) => change.id).join(", ")}`,
              changes: { updated: changes.map((change) => change.id) },
            },
          ],
          request: (call) =>
            call({ method: "PATCH", path: `/api/themes/project/${encodeURIComponent(project.id)}`, body: { changes } }),
        };
      },
    });
    return { data: { changed: changes.map((change) => change.id), changedSoFar: receipt } };
  },
};

export const updateSiteDetailsTool = {
  name: "update_site_details",
  title: "Update site details",
  description:
    "Changes the site's title, description, address or business details (email, telephone, locations with address and opening hours, logo as { media: id }) in a running job. Only what you pass changes.",
  inputSchema: schemaFor({
    siteTitle: { type: "string", maxLength: 200 },
    description: { type: "string", maxLength: 1000 },
    siteUrl: { type: "string", maxLength: 500 },
    identity: {
      type: "object",
      description:
        "Business details to change: category, logo ({ media: id }), email, telephone, priceRange, profiles, locations, text.",
    },
  }),
  annotations: WRITE,
  recordsOutcome: true,
  async run(ctx) {
    const { scope, project: pinned } = await ctx.openSite();
    const lang = ctx.language();
    const { receipt } = await routeEdit(ctx, {
      languages: [],
      build: async () => {
        const project = (await ctx.listSites()).sites.find((site) => site.id === pinned.id);
        if (!project) throw toolError("NO_OPEN_SITE", "The site is gone.");
        let identity = ctx.args.identity;
        if (identity) {
          const [{ settings }] = await resolveReferences([{ op: "values", settings: identity }], {
            reader: ctx.reader,
            scope,
            lang,
          });
          identity = mergeIdentity(project.siteIdentity ?? {}, settings);
          const { value, errors } = normalizeSiteIdentity(identity);
          const refused = Object.keys(settings).filter(
            (key) => settings[key] != null && settings[key] !== "" && !(key in value),
          );
          if (errors.length || refused.length) {
            const fields = [...new Set([...refused, ...errors.map((error) => error.field ?? error)])].join(", ");
            throw toolError(
              "INVALID_EDIT",
              `These business details aren't valid or aren't known: ${fields}. Known: category, logo, email, telephone, priceRange, profiles, locations, text.`,
            );
          }
        }
        const body = {
          name: project.name,
          ...(ctx.args.siteTitle !== undefined ? { siteTitle: ctx.args.siteTitle } : {}),
          ...(ctx.args.description !== undefined ? { description: ctx.args.description } : {}),
          ...(ctx.args.siteUrl !== undefined ? { siteUrl: ctx.args.siteUrl } : {}),
          ...(identity ? { siteIdentity: identity } : {}),
        };
        return {
          entries: [
            {
              key: "site-details",
              counts: false,
              label: "the site's details",
              summary: `Change the site's details: ${Object.keys(body)
                .filter((key) => key !== "name")
                .join(", ")}`,
              changes: { updated: Object.keys(body).filter((key) => key !== "name") },
            },
          ],
          request: (call) => call({ method: "PUT", path: `/api/projects/${encodeURIComponent(project.id)}`, body }),
        };
      },
    });
    return { data: { changedSoFar: receipt } };
  },
};

async function itemContext(ctx, type) {
  const { scope } = await ctx.openSite();
  const lang = ctx.language(ctx.args.language);
  const schema = (await ctx.reader.collectionSchemas(scope)).find((entry) => entry.type === type);
  if (!schema) throw toolError("COLLECTION_NOT_FOUND", `There's no collection "${type}" in this theme.`);
  return { scope, lang, schema };
}

export const createItemTool = {
  name: "create_item",
  title: "Add a collection item",
  description: "Adds an item (a news post, a project, …) to a collection in a running job.",
  inputSchema: schemaFor(
    {
      type: TYPE,
      slug: SLUG,
      language: languageArg,
      settings: { type: "object", description: "Field values by field id." },
    },
    ["type", "settings"],
  ),
  annotations: WRITE,
  recordsOutcome: true,
  async run(ctx) {
    const { scope, lang, schema } = await itemContext(ctx, ctx.args.type);
    const settings = await checkedValues(ctx.args.settings, definitionsOf(schema.settings), {
      reader: ctx.reader,
      scope,
      lang,
      where: `A ${ctx.args.type} item`,
    });
    const label = `a new ${ctx.args.type} item (${lang.language})`;
    const { data, receipt } = await routeEdit(ctx, {
      languages: [lang.language],
      build: async () => ({
        entries: [
          {
            key: `items:${ctx.args.type}:${lang.language}`,
            counts: false,
            label: `the ${ctx.args.type} collection (${lang.language})`,
            summary: `Add ${label}`,
            changes: { added: [ctx.args.slug ?? "item"] },
          },
        ],
        request: (call) =>
          call({
            method: "POST",
            path: `/api/collections/${ctx.args.type}`,
            query: languageQuery(lang),
            body: { slug: ctx.args.slug, settings },
          }),
      }),
    });
    return { data: { item: data?.slug, language: lang.language, changedSoFar: receipt } };
  },
};

export const updateItemTool = {
  name: "update_item",
  title: "Change a collection item",
  description: "Changes fields of a collection item in a running job. Only the fields you pass change.",
  inputSchema: schemaFor({ type: TYPE, item: SLUG, slug: SLUG, language: languageArg, settings: { type: "object" } }, [
    "type",
    "item",
  ]),
  annotations: WRITE,
  recordsOutcome: true,
  async run(ctx) {
    const { scope, lang, schema } = await itemContext(ctx, ctx.args.type);
    const settings = await checkedValues(ctx.args.settings ?? {}, definitionsOf(schema.settings), {
      reader: ctx.reader,
      scope,
      lang,
      where: `The ${ctx.args.type} item`,
    });
    const label = `the ${ctx.args.type} item "${ctx.args.item}" (${lang.language})`;
    const { data, receipt } = await routeEdit(ctx, {
      languages: [lang.language],
      build: async () => {
        const current = await ctx.reader.collectionItem(scope, ctx.args.type, ctx.args.item, lang);
        if (!current)
          throw toolError("ITEM_NOT_FOUND", `There's no ${ctx.args.type} item "${ctx.args.item}" in ${lang.language}.`);
        return {
          entries: [
            {
              key: `items:${ctx.args.type}:${lang.language}`,
              counts: false,
              label: `the ${ctx.args.type} collection (${lang.language})`,
              summary: `Change ${label}: ${Object.keys(settings).join(", ")}`,
              changes: { updated: [ctx.args.item] },
            },
          ],
          request: (call) =>
            call({
              method: "PUT",
              path: `/api/collections/${ctx.args.type}/${ctx.args.item}`,
              query: languageQuery(lang),
              body: { slug: ctx.args.slug ?? current.slug ?? ctx.args.item, settings },
            }),
        };
      },
    });
    return { data: { item: data?.slug ?? ctx.args.item, language: lang.language, changedSoFar: receipt } };
  },
};

export const reorderItemsTool = {
  name: "reorder_items",
  title: "Reorder a collection",
  description: "Puts a collection's items in the given order, in a running job.",
  inputSchema: schemaFor(
    { type: TYPE, language: languageArg, order: { type: "array", minItems: 1, maxItems: 1000, items: SLUG } },
    ["type", "order"],
  ),
  annotations: WRITE,
  recordsOutcome: true,
  async run(ctx) {
    const { lang } = await itemContext(ctx, ctx.args.type);
    const { receipt } = await routeEdit(ctx, {
      languages: [lang.language],
      build: async () => ({
        entries: [
          {
            key: `items:${ctx.args.type}:${lang.language}`,
            counts: false,
            label: `the ${ctx.args.type} collection (${lang.language})`,
            summary: `Reorder the ${ctx.args.type} collection`,
            changes: { moved: ctx.args.order },
          },
        ],
        request: (call) =>
          call({
            method: "POST",
            path: `/api/collections/${ctx.args.type}/reorder`,
            query: languageQuery(lang),
            body: { order: ctx.args.order },
          }),
      }),
    });
    return { data: { changedSoFar: receipt } };
  },
};

export const deleteItemTool = {
  name: "delete_item",
  title: "Delete a collection item",
  description: "Deletes a collection item in a running job. Always needs the user's OK (NEEDS_APPROVAL first).",
  inputSchema: schemaFor({ type: TYPE, item: SLUG, language: languageArg }, ["type", "item"]),
  annotations: DESTRUCTIVE,
  recordsOutcome: true,
  async run(ctx) {
    const { scope, lang } = await itemContext(ctx, ctx.args.type);
    const label = `the ${ctx.args.type} item "${ctx.args.item}" (${lang.language})`;
    const { receipt } = await routeEdit(ctx, {
      languages: [lang.language],
      build: async () => {
        if (!(await ctx.reader.collectionItem(scope, ctx.args.type, ctx.args.item, lang))) {
          throw toolError("ITEM_NOT_FOUND", `There's no ${ctx.args.type} item "${ctx.args.item}" in ${lang.language}.`);
        }
        return {
          entries: [
            {
              key: `items:${ctx.args.type}:${lang.language}`,
              counts: false,
              label: `the ${ctx.args.type} collection (${lang.language})`,
              summary: `Delete ${label}`,
              confirm: `delete ${label}`,
              changes: { removed: [ctx.args.item] },
            },
          ],
          request: (call) =>
            call({
              method: "DELETE",
              path: `/api/collections/${ctx.args.type}/${ctx.args.item}`,
              query: languageQuery(lang),
            }),
        };
      },
    });
    return { data: { deleted: ctx.args.item, changedSoFar: receipt } };
  },
};

export const updateMediaDetailsTool = {
  name: "update_media_details",
  title: "Describe an image or file",
  description:
    "Sets a library file's alt text, title or caption (in one language), in a running job. Describe what the image actually shows.",
  inputSchema: schemaFor(
    {
      media: { type: "string", minLength: 1, maxLength: 100, description: "The media id from list_media." },
      language: languageArg,
      alt: { type: "string", maxLength: 500 },
      title: { type: "string", maxLength: 300 },
      caption: { type: "string", maxLength: 1000 },
    },
    ["media"],
  ),
  annotations: WRITE,
  recordsOutcome: true,
  async run(ctx) {
    const { scope, project } = await ctx.openSite();
    const lang = ctx.language(ctx.args.language);
    const isDefault = lang.language === lang.defaultLanguage;
    const given = Object.fromEntries(
      ["alt", "title", "caption"].filter((key) => ctx.args[key] !== undefined).map((key) => [key, ctx.args[key]]),
    );
    const { receipt } = await routeEdit(ctx, {
      languages: [lang.language],
      build: async () => {
        const file = await ctx.reader.mediaFile(scope, ctx.args.media);
        if (!file) throw toolError("MEDIA_NOT_FOUND", `There's no media "${ctx.args.media}" in this site's library.`);
        const saved = isDefault ? (file.metadata ?? {}) : (file.translations?.[lang.language] ?? {});
        const body = {
          alt: saved.alt ?? (isDefault ? "" : null),
          title: saved.title ?? (isDefault ? "" : null),
          caption: saved.caption ?? (isDefault ? "" : null),
          ...given,
        };
        const label = `the description of "${file.originalName ?? file.filename}" (${lang.language})`;
        return {
          entries: [
            {
              key: "media-details",
              counts: false,
              label: "media descriptions",
              summary: `Change ${label}`,
              changes: { updated: [file.id] },
            },
          ],
          request: (call) =>
            call({
              method: "PUT",
              path: `/api/media/projects/${encodeURIComponent(project.id)}/media/${encodeURIComponent(file.id)}/metadata`,
              query: languageQuery(lang),
              body,
            }),
        };
      },
    });
    return { data: { media: ctx.args.media, changedSoFar: receipt } };
  },
};

export const addLanguageTool = {
  name: "add_language",
  title: "Add a language",
  description:
    "Adds a language to the site in a running job that declared it in start_job's addLanguages. It creates that language's starting menus and header/footer; translate pages with translate_page.",
  inputSchema: schemaFor({ code: { type: "string", pattern: "^[a-z]{2}(-[a-z0-9]{2,8})?$" } }, ["code"]),
  annotations: WRITE,
  recordsOutcome: true,
  async run(ctx) {
    await ctx.openSite();
    const { receipt } = await routeEdit(ctx, {
      languages: [ctx.args.code],
      build: async () => ({
        entries: [
          {
            key: `language:${ctx.args.code}`,
            counts: false,
            label: `the language ${ctx.args.code}`,
            summary: `Add the language ${ctx.args.code}`,
            changes: { added: [ctx.args.code] },
          },
        ],
        request: (call) => call({ method: "POST", path: "/api/languages", body: { code: ctx.args.code } }),
      }),
    });
    return { data: { added: ctx.args.code, changedSoFar: receipt } };
  },
};

export const removeLanguageTool = {
  name: "remove_language",
  title: "Remove a language",
  description:
    "Removes a language and all its content in a running job. Always needs the user's OK (NEEDS_APPROVAL first).",
  inputSchema: schemaFor({ code: { type: "string", pattern: "^[a-z]{2}(-[a-z0-9]{2,8})?$" } }, ["code"]),
  annotations: DESTRUCTIVE,
  recordsOutcome: true,
  async run(ctx) {
    await ctx.openSite();
    const { receipt } = await routeEdit(ctx, {
      languages: [ctx.args.code],
      build: async () => ({
        entries: [
          {
            key: `language:${ctx.args.code}`,
            counts: false,
            label: `the language ${ctx.args.code}`,
            summary: `Remove the language ${ctx.args.code} and everything written in it`,
            confirm: `remove the language ${ctx.args.code} and its content`,
            changes: { removed: [ctx.args.code] },
          },
        ],
        request: (call) => call({ method: "DELETE", path: `/api/languages/${ctx.args.code}` }),
      }),
    });
    return { data: { removed: ctx.args.code, changedSoFar: receipt } };
  },
};

export const translatePageTool = {
  name: "translate_page",
  title: "Start a page's translation",
  description:
    "Creates a page's version in another site language (a copy to translate), in a running job. Then translate it with edit_sections and update_page in that language.",
  inputSchema: schemaFor(
    { page: nameArg("The page's slug in its own language."), language: languageArg, to: languageArg, slug: SLUG },
    ["page", "to"],
  ),
  annotations: WRITE,
  recordsOutcome: true,
  async run(ctx) {
    await ctx.openSite();
    const lang = ctx.language(ctx.args.language);
    const target = ctx.language(ctx.args.to);
    const label = `the ${target.language} version of ${pageLabel(ctx.args.page, lang)}`;
    const { data, receipt } = await routeEdit(ctx, {
      languages: [target.language],
      build: async () => ({
        entries: [
          {
            key: `new-page:${ctx.args.page}:${target.language}`,
            counts: false,
            label,
            summary: `Add ${label}`,
            changes: { added: ["page"] },
          },
        ],
        request: (call) =>
          call({
            method: "POST",
            path: `/api/pages/${encodeURIComponent(ctx.args.page)}/translations`,
            query: languageQuery(lang),
            body: { targetLanguage: target.language, slug: ctx.args.slug },
          }),
        linkFrom: pageLink(target),
      }),
    });
    return { data: { page: data?.slug, language: target.language, changedSoFar: receipt } };
  },
};

export const translateItemTool = {
  name: "translate_item",
  title: "Start a collection item's translation",
  description:
    "Creates a collection item's version in another site language, in a running job. Then translate its fields with update_item in that language.",
  inputSchema: schemaFor({ type: TYPE, item: SLUG, language: languageArg, to: languageArg }, ["type", "item", "to"]),
  annotations: WRITE,
  recordsOutcome: true,
  async run(ctx) {
    const { lang } = await itemContext(ctx, ctx.args.type);
    const target = ctx.language(ctx.args.to);
    const label = `the ${target.language} version of the ${ctx.args.type} item "${ctx.args.item}"`;
    const { data, receipt } = await routeEdit(ctx, {
      languages: [target.language],
      build: async () => ({
        entries: [
          {
            key: `items:${ctx.args.type}:${target.language}`,
            counts: false,
            label: `the ${ctx.args.type} collection (${target.language})`,
            summary: `Add ${label}`,
            changes: { added: [ctx.args.item] },
          },
        ],
        request: (call) =>
          call({
            method: "POST",
            path: `/api/collections/${ctx.args.type}/${ctx.args.item}/translations`,
            query: languageQuery(lang),
            body: { targetLanguage: target.language },
          }),
      }),
    });
    return { data: { item: data?.slug, language: target.language, changedSoFar: receipt } };
  },
};

export const familyTools = [
  createPageTool,
  updatePageTool,
  duplicatePageTool,
  deletePageTool,
  updateMenuTool,
  createMenuTool,
  updateLookTool,
  updateSiteDetailsTool,
  createItemTool,
  updateItemTool,
  reorderItemsTool,
  deleteItemTool,
  updateMediaDetailsTool,
  addLanguageTool,
  removeLanguageTool,
  translatePageTool,
  translateItemTool,
];

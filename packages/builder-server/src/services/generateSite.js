import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import TurndownService from "turndown";
import {
  renderWidget,
  renderPageLayout,
  renderSharedAreas,
  widgetSupportsTransparentHeader,
  planPagination,
} from "@widgetizer/render-engine";
import { MAX_FORMS_PER_SITE, LIMIT_KEYS } from "@widgetizer/core/adapters";
import { splitAssetRef } from "@widgetizer/core/assetUrl";
import { isHomeSlug, siteUrlBase, absoluteSiteUrl } from "@widgetizer/core/internalHref";
import {
  resolveLanguage,
  languageFolder,
  pageOutputPath,
  itemOutputPath as itemOutputPathFor,
} from "@widgetizer/core/contentAddress";
import { buildTranslations } from "@widgetizer/core/translations";
import { outputPathPrefixFor, prefixInternalHref } from "@widgetizer/core/linkPrefixer";
import { identityReadiness } from "@widgetizer/core/siteIdentity";
import { emptyArticleFields } from "@widgetizer/core/structuredData";
import { listingParentStatus } from "@widgetizer/core/breadcrumbs";
import { readThemeSetting } from "@widgetizer/core/themeSettingChanges";
import { isRenderedWidget, RESERVED_WIDGET_IDS, renderedWidgetOrder, uniqueWidgetOrder } from "@widgetizer/core/widgetOrder";
import { renderCollectionItemPageWithDeps } from "./renderingService.js";
import {
  listCollectionSchemas,
  listCollectionItems,
  loadCollectionTemplate,
  loadCollectionItemsByUuid,
} from "./collectionService.js";
import { buildSitemap, buildRobotsTxt } from "./seoArtifacts.js";
import { buildFormsManifest } from "./formsManifestService.js";
import { generateExportSiteIcons } from "../utils/siteIconHelpers.js";
import { formatHtml } from "../utils/htmlProcessor.js";
import { projectLanguages } from "../utils/contentLanguage.js";
import { listPagesFromDir, readAreasFromDir, readGlobalWidgetFromDir, readThemeDataFromDir } from "../utils/projectContentFs.js";

function rewriteStoragePaths(html, outputPathPrefix) {
  return html
    .replaceAll("/uploads/images/", `${outputPathPrefix}assets/images/`)
    .replaceAll("/uploads/files/", `${outputPathPrefix}assets/files/`);
}

const markerComment = (appVersion) => `<!--\nMade with Widgetizer v${appVersion}\nPer aspera ad astra\n-->\n`;

/** Content-only markdown of rendered widget HTML: scripts, forms and placeholder images have no place in it. */
function htmlToMarkdown(html) {
  const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });
  turndown.remove(["style", "script", "noscript", "form", "input", "button", "select", "textarea"]);
  return turndown.turndown(
    html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, "")
      .replace(/<img[^>]*src=["'][^"']*placeholder[^"']*["'][^>]*>/gi, ""),
  );
}

const frontmatter = (lines) => ["---", ...lines, "---", "", ""].join("\n");

async function findWidgetAssets(dir) {
  let results = [];
  for (const dirent of await fs.readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) results = results.concat(await findWidgetAssets(fullPath));
    else if (/\.(css|js)$/i.test(dirent.name)) results.push(fullPath);
  }
  return results;
}

/**
 * Generate a whole static site as a stream of files, for an app to write wherever
 * its sites live. Everything that makes a site what it is happens here: which
 * languages, pages and items exist, the checks that refuse a site before its first
 * file, rendering, the sitemap and the forms file.
 *
 * Each entry is `{ path, content }` or `{ path, source }` (an absolute file to
 * copy). An entry with `softFailure` is one the site can do without: an app that
 * tolerates losing it calls `softFailure(error)` when the write fails and carries
 * on; the stream reads what that did before it continues.
 *
 * @param {import("@widgetizer/render-engine").RenderDeps} deps
 * @param {object} options
 * @param {string} options.appVersion
 * @param {object} [options.projectData] - The project row the whole site is built from; read from `deps` when absent.
 * @param {string} options.assetVersion - The `?v=` token for this whole site.
 * @param {(code: string, details: object) => Error} options.refuse - The error for a site that
 *   can't be generated, in the app's own words. Codes: NO_HOMEPAGE, TWO_HOMEPAGES,
 *   INVALID_COLLECTION_ITEMS, MISSING_COLLECTION_TEMPLATE, LISTING_TOO_MANY_PAGES,
 *   HOMEPAGE_PAGES_CLASH, COLLECTION_LANGUAGE_CLASH, INVALID_FORMS.
 * @param {{ storage: object, scope: object, reader?: object }} [options.collections] - No collections when absent.
 * @param {object} [options.scope] - For `options.limits`.
 * @param {object} [options.limits] - Limits adapter, for the forms ceiling.
 * @param {boolean} [options.exportMarkdown]
 * @param {boolean} [options.formatPages=true] - Prettier is CPU work that blocks its thread: 2 s or more on a very large page.
 * @param {boolean} [options.generateIcons=true]
 * @param {string} [options.iconOutputDir] - Write the site icons here instead of yielding them.
 * @param {(rawThemeSettings: object) => string} [options.readIconSource] - Which theme setting holds the site icon.
 * @param {boolean} [options.failOnAssetScanError] - Fail when the widgets folder can't be read, instead of warning.
 * @param {(pages: object[], projectData: object) => object[]} [options.filterPages] - Pages left in the running.
 * @param {(projectDir: string) => Promise<object>} [options.readTheme]
 * @param {(lang: object) => Promise<object>} [options.readAreas]
 * @param {number} [options.maxListingPages] - Refuse a listing split into more pages than this.
 * @param {number} [options.maxWidgetsPerPage] - Stop rendering a page's widgets past this many.
 * @param {() => Promise<void>} [options.beforeFirstFile] - Runs once every check has passed.
 * @param {(html: string, page: { page: string, filename: string }) => Promise<void>} [options.inspectHtml]
 * @param {() => Promise<void | AsyncIterable<object>>} [options.afterPages] - Runs after the
 *   page and item pages; may return more entries.
 * @param {object} [options.report] - Filled in as the site is generated, since a generator's return
 *   value is lost in `for await`: `languages`, `languagesSkipped`, `structuredData`, `collections`,
 *   `pageOutputs` (`{ pageId, language, path }` for every page HTML file, paginated copies included),
 *   `formsCount`.
 * @returns {AsyncGenerator<{ path: string, content?: string | Buffer, source?: string, softFailure?: (error: Error) => void }>}
 */
export async function* generateSite(deps, options) {
  const {
    appVersion,
    assetVersion,
    refuse,
    collections = null,
    scope = null,
    limits = null,
    exportMarkdown = false,
    formatPages = true,
    generateIcons = true,
    iconOutputDir = null,
    readIconSource = (theme) => readThemeSetting(theme, { group: "general", id: "favicon" }) || "",
    failOnAssetScanError = false,
    filterPages = (pages) => pages,
    readTheme = readThemeDataFromDir,
    readAreas = null,
    maxListingPages = Infinity,
    maxWidgetsPerPage = Infinity,
    beforeFirstFile = null,
    inspectHtml = null,
    afterPages = null,
    report = {},
  } = options;
  const { projectId, projectDir } = deps;
  const projectData = options.projectData ?? deps.getProjectData();
  const siteUrl = projectData.siteUrl || "";
  // Snapshotted, so a toggle landing mid-export can't split one page's links from another's.
  const cleanUrls = !!projectData.cleanUrls;
  const defaultLanguage = projectData.defaultLanguage;
  const structuredData = { readiness: identityReadiness(projectData.siteIdentity, projectData), warnings: [] };
  report.structuredData = structuredData;
  const pageOutputs = [];
  report.pageOutputs = pageOutputs;

  const collectionStorage = collections?.storage || null;
  const collectionScope = collections?.scope || null;
  const collectionReader = collections?.reader || null;
  const readItems = (type, lang) =>
    collectionReader
      ? collectionReader.sorted(type, {}, lang)
      : listCollectionItems(collectionStorage, collectionScope, type, {}, lang);

  const rawThemeSettings = await readTheme(projectDir);

  const pageLang = (pageData) => ({ language: pageData.language, defaultLanguage });
  // A slug is unique per language, so anything keyed by page must key by the
  // language-qualified output path rather than the id alone.
  const pageIdentity = (pageData) => pageOutputPath(pageData.id, 1, pageLang(pageData));
  const allPages = filterPages(await listPagesFromDir(projectDir, { defaultLanguage }), projectData);

  // The default language needs a homepage: a page slugged "index" or "home",
  // both of which publish as index.html. page.id is the filename, the
  // authoritative slug.
  if (!allPages.some((pageData) => !languageFolder(pageLang(pageData)) && isHomeSlug(pageData.id))) {
    throw refuse("NO_HOMEPAGE", {});
  }

  // `index` and `home` both publish as the language's index.html, so a language
  // holding both would publish one over the other. The editor refuses the pair,
  // but older projects, imports and theme updates can still carry one.
  for (const language of new Set(allPages.map((pageData) => pageData.language))) {
    const homes = allPages.filter((pageData) => pageData.language === language && isHomeSlug(pageData.id));
    if (homes.length < 2) continue;
    throw refuse("TWO_HOMEPAGES", { folder: languageFolder(pageLang(homes[0])) });
  }

  // An enabled language is not a publishable one. A non-default language with no
  // homepage is left out entirely and named in the report: a site with
  // `/el/contact` but no `/el/` sends visitors nowhere. The default language is
  // not subject to this: a missing root homepage is refused above, because
  // skipping it would publish a site with no `/` at all.
  const languagesSkipped = [];
  const siteLanguages = [resolveLanguage("", defaultLanguage)];
  for (const language of projectLanguages(projectData).languages) {
    if (allPages.some((pageData) => pageData.language === language && isHomeSlug(pageData.id))) {
      siteLanguages.push(language);
    } else {
      languagesSkipped.push(language);
    }
  }
  report.languagesSkipped = languagesSkipped;
  report.languages = siteLanguages.slice(1);

  const included = new Set(siteLanguages);
  const pages = allPages.filter((pageData) => included.has(resolveLanguage(pageData.language, defaultLanguage)));

  // Link resolution must see the site being generated, not the project on disk.
  // The render engine loads this map itself when nobody supplies one, and that
  // load reads every page in every language, so a link into a skipped language
  // would resolve to a real-looking href for a file nobody writes. Seeded with
  // the included pages alone, such a target reads as absent and is cleared
  // exactly like a deleted one.
  const pagesByUuid = new Map();
  for (const pageData of pages) {
    if (pageData.uuid) pagesByUuid.set(pageData.uuid, pageData);
  }
  // null, not an empty Map, when there are no collections: "no map" means the
  // renderer cannot resolve item refs and must leave stored hrefs alone, while
  // an empty map would neutralize every item anchor.
  const languageContexts = siteLanguages.map((language) => ({ language, defaultLanguage }));
  const collectionItemsByUuid = collections
    ? await loadCollectionItemsByUuid(collectionStorage, collectionScope, collectionReader, languageContexts)
    : null;

  // Every collection, in every language about to be written: an untranslated
  // required field is a broken page whichever language it is in.
  const collectionSchemas = collections ? await listCollectionSchemas(collectionStorage, collectionScope) : [];
  const collectionsReport = [];
  const seoItemsByPrefix = new Map();
  const itemPageCollections = [];
  const invalidItems = [];
  const missingTemplates = [];
  for (const schema of collectionSchemas) {
    const itemsByLanguage = new Map();
    const itemCountByLanguage = {};
    let renderable = 0;
    const fieldLabels = new Map((schema.settings || []).map((setting) => [setting.id, setting.label]));
    for (const language of siteLanguages) {
      const items = await readItems(schema.type, { language, defaultLanguage });
      itemCountByLanguage[language] = items.length;
      for (const item of items) {
        if (!item.invalid) continue;
        // Enough to name the item on screen and open it.
        invalidItems.push({
          collection: schema.type,
          collectionName: schema.displayName || schema.displayNamePlural || schema.type,
          slug: item.slug,
          title: item.title,
          language,
          errors: (item.validationErrors || []).map((error) => ({
            ...error,
            fieldLabel: fieldLabels.get(error.fieldId) || error.fieldId,
          })),
        });
      }
      if (!schema.hasItemPages) continue;
      const valid = items.filter((item) => !item.invalid);
      itemsByLanguage.set(language, valid);
      renderable += valid.length;
      if (valid.length) {
        if (!seoItemsByPrefix.has(schema.slugPrefix)) seoItemsByPrefix.set(schema.slugPrefix, []);
        seoItemsByPrefix.get(schema.slugPrefix).push(...valid);
      }
    }
    collectionsReport.push({
      type: schema.type,
      itemPages: !!schema.hasItemPages,
      itemCount: Object.values(itemCountByLanguage).reduce((sum, count) => sum + count, 0),
      itemCountByLanguage,
    });
    if (schema.hasItemPages && renderable > 0) {
      const template = await loadCollectionTemplate(collectionStorage, collectionScope, schema.type);
      if (template === null) missingTemplates.push(schema.type);
      else itemPageCollections.push({ schema, template, itemsByLanguage });
    }
  }
  report.collections = collectionsReport;
  if (invalidItems.length > 0) throw refuse("INVALID_COLLECTION_ITEMS", { items: invalidItems });
  if (missingTemplates.length > 0) throw refuse("MISSING_COLLECTION_TEMPLATE", { types: missingTemplates });

  const paginationPlans = new Map();
  if (collections) {
    for (const pageData of pages) {
      const plan = await planPagination(deps, pageData.widgets, pageData.widgetsOrder, {
        pageSlug: pageData.id,
        language: pageData.language,
      });
      if (plan) paginationPlans.set(pageIdentity(pageData), plan);
    }
  }
  // Each copy of a split listing is a full page whose pager links to every other
  // copy, so the output grows with the square of the page count.
  for (const [identity, plan] of paginationPlans) {
    if (plan.total > maxListingPages) {
      throw refuse("LISTING_TOO_MANY_PAGES", { identity, total: plan.total, max: maxListingPages });
    }
  }
  const pageCounts = new Map([...paginationPlans].map(([identity, plan]) => [identity, plan.total]));

  // A split homepage publishes its copies at <language folder>/page/N.html, and
  // a collection prefixed "page" publishes that language's items in the same
  // folder, so one would silently overwrite the other.
  const pageCollection = collectionSchemas.find((schema) => schema.hasItemPages && schema.slugPrefix === "page");
  const splitHomepage = pageCollection
    ? pages.find((pageData) => isHomeSlug(pageData.id) && paginationPlans.has(pageIdentity(pageData)))
    : null;
  if (splitHomepage) {
    const folder = languageFolder(pageLang(splitHomepage));
    throw refuse("HOMEPAGE_PAGES_CLASH", { folder, pageDir: folder ? `${folder}/page/` : "page/", collection: pageCollection });
  }

  // A language publishes into a folder named by its code, and a collection's
  // main-language items into a folder named by its slugPrefix. When the two
  // match, items and that language's pages can overwrite each other.
  const languageFolders = new Set(siteLanguages.map((language) => languageFolder({ language, defaultLanguage })));
  const languageCollection = collectionSchemas.find(
    (schema) => schema.hasItemPages && languageFolders.has(schema.slugPrefix),
  );
  if (languageCollection) {
    throw refuse("COLLECTION_LANGUAGE_CLASH", { code: languageCollection.slugPrefix, collection: languageCollection });
  }

  // Forms are checked here, with the other refusals, so an invalid form stops
  // the site before its first file. The ceiling comes from the limits adapter;
  // the default applies when there is no usable answer. A limits adapter that
  // throws is a failure, not a refusal.
  const formsCap = await limits?.getLimit?.(scope, LIMIT_KEYS.MAX_FORMS_PER_SITE);
  const maxForms = typeof formsCap === "number" && formsCap > 0 ? formsCap : MAX_FORMS_PER_SITE;
  let formsResult;
  try {
    formsResult = buildFormsManifest(pages, appVersion, maxForms, { defaultLanguage });
  } catch (error) {
    if (Number.isInteger(error?.statusCode)) throw refuse("INVALID_FORMS", { error });
    throw error;
  }
  const { manifest: formsManifest, warnings: formsWarnings } = formsResult;
  for (const warning of formsWarnings) console.warn(`[forms manifest] ${warning}`);

  // --- Every check has passed: from here on, files are written ---
  if (beforeFirstFile) await beforeFirstFile();

  const seoItemPages = [...seoItemsByPrefix].map(([slugPrefix, items]) => ({ slugPrefix, items }));
  const seoOptions = {
    defaultLanguage,
    translationsOf: (current, kind, slugPrefix) =>
      buildTranslations({
        current,
        kind,
        slugPrefix,
        pages,
        items: seoItemsByPrefix.get(slugPrefix) || [],
        languages: siteLanguages,
        defaultLanguage,
        cleanUrls,
        siteUrl,
      }),
  };

  let siteIcons;
  if (generateIcons) {
    const iconsDir = iconOutputDir ?? (await fs.mkdtemp(path.join(os.tmpdir(), "wz-site-icons-")));
    try {
      siteIcons = await generateExportSiteIcons({
        outputDir: iconsDir,
        projectDir,
        projectName: projectData.name,
        siteTitle: projectData.siteTitle,
        siteIconSrc: readIconSource(rawThemeSettings),
      });
      if (!iconOutputDir) {
        for (const entry of await fs.readdir(iconsDir)) {
          yield { path: entry, content: await fs.readFile(path.join(iconsDir, entry)) };
        }
      }
    } finally {
      if (!iconOutputDir) await fs.remove(iconsDir);
    }
  }

  if (siteUrl && siteUrl.trim() !== "") {
    const skipSeo = (err) => console.warn(`Skipping sitemap/robots generation due to invalid siteUrl: ${siteUrl}`, err.message);
    try {
      let seoWriteFailed = false;
      const softFailure = (err) => {
        seoWriteFailed = true;
        skipSeo(err);
      };
      const sitemapXml = await buildSitemap(pages, siteUrl, seoItemPages, cleanUrls, pageCounts, seoOptions);
      if (sitemapXml) yield { path: "sitemap.xml", content: sitemapXml, softFailure };
      if (!seoWriteFailed) {
        const robotsTxt = buildRobotsTxt(pages, siteUrl, seoItemPages, cleanUrls, pageCounts, seoOptions);
        if (robotsTxt) yield { path: "robots.txt", content: robotsTxt, softFailure };
      }
    } catch (err) {
      skipSeo(err);
    }
  } else {
    console.warn(`Project ${projectId} has no siteUrl defined. Skipping sitemap.xml and robots.txt generation.`);
  }

  // The markdown alternates are absolute when there is a usable Site URL base,
  // and relative otherwise: the same gate as the canonicals and the sitemap.
  const mdBase = siteUrlBase(siteUrl);

  // A language's pages wear that language's header and footer. Areas are read
  // once per language too, so every page shows the same saved areas even if one
  // is edited meanwhile; they are rendered per page, since active menu items and
  // relative links depend on the page.
  const globalsByLanguage = new Map();
  for (const language of siteLanguages) {
    const lang = { language, defaultLanguage };
    globalsByLanguage.set(language, {
      header: await readGlobalWidgetFromDir(projectDir, "header", lang),
      footer: await readGlobalWidgetFromDir(projectDir, "footer", lang),
      areas: readAreas ? await readAreas(lang) : await readAreasFromDir(projectDir, lang),
    });
  }
  const globalsFor = (language) =>
    globalsByLanguage.get(resolveLanguage(language, defaultLanguage)) || { header: null, footer: null, areas: {} };

  if (pages.length === 0) {
    console.warn(`No exportable pages found for project ${projectId}. Only copying assets/images.`);
  }

  // Basenames of every asset enqueued while rendering. The project's widgets/
  // folder holds every theme widget's CSS/JS, used or not; this is what ships
  // only the used ones. A `src` may carry a query or fragment the emitted URL
  // keeps; the file on disk is named by the path part.
  const enqueuedAssetFiles = new Set();
  const collectEnqueuedAssets = (globals) => {
    for (const src of globals.enqueuedStyles.keys()) enqueuedAssetFiles.add(path.basename(splitAssetRef(src).path));
    for (const src of globals.enqueuedScripts.keys()) enqueuedAssetFiles.add(path.basename(splitAssetRef(src).path));
  };

  const baseGlobals = () => ({
    projectId,
    apiUrl: "",
    renderMode: "publish",
    themeSettingsRaw: rawThemeSettings,
    siteIcons,
    enqueuedStyles: new Map(),
    enqueuedScripts: new Map(),
    assetVersion,
    pagesByUuid,
    collectionItemsByUuid,
    cleanUrls,
  });

  /** Format (unless turned off), rewrite storage paths, then let the app inspect the page before the marker comment goes on. */
  async function finishHtml(rendered, outputPathPrefix, formatFailureNote, page) {
    let source = rendered;
    if (formatPages) {
      const formatted = await formatHtml(rendered);
      source = formatted.html;
      if (!formatted.success) console.warn(formatFailureNote(formatted.error));
    }
    const html = rewriteStoragePaths(source, outputPathPrefix);
    if (inspectHtml) await inspectHtml(html, page);
    return markerComment(appVersion) + html;
  }

  const withMarkdownLink = (html, href) =>
    html.replace("</head>", `  <link rel="alternate" type="text/markdown" href="${href}">\n</head>`);

  const pageRenders = pages.flatMap((pageData) => {
    const plan = paginationPlans.get(pageIdentity(pageData)) || null;
    return Array.from({ length: plan ? plan.total : 1 }, (_, index) => ({ pageData, plan, pageNumber: index + 1 }));
  });

  for (const { pageData, plan, pageNumber } of pageRenders) {
    const outputFilename = pageOutputPath(pageData.id, pageNumber, pageLang(pageData));
    const { header: headerData, footer: footerData, areas: areasData } = globalsFor(pageData.language);
    const sharedGlobals = {
      ...baseGlobals(),
      currentCanonicalPath: pageOutputPath(pageData.id, 1, pageLang(pageData)),
      currentPageData: pageData,
      outputPathPrefix: outputPathPrefixFor(outputFilename),
      ...(plan ? { paginationPlan: { ...plan, current: pageNumber } } : {}),
    };

    // Per page: a language with no header of its own renders none, not the last page's.
    const headerHtml = headerData
      ? await renderWidget(deps, "header", headerData, rawThemeSettings, "publish", sharedGlobals, null)
      : "";

    let pageWidgetsHtml = "";
    let widgetIndex = 0;
    const candidates = Array.isArray(pageData.widgetsOrder)
      ? uniqueWidgetOrder(pageData.widgetsOrder)
      : Object.keys(pageData.widgets || {});
    for (const widgetId of candidates) {
      if (!isRenderedWidget(pageData.widgets, widgetId)) {
        // A hand-made order can hold anything; only a missing widget is worth a word.
        if (typeof widgetId === "string" && !RESERVED_WIDGET_IDS.includes(widgetId)) {
          console.warn(` -> Widget data missing for ID: ${widgetId} on page ${pageData.id}`);
        }
        continue;
      }
      widgetIndex += 1; // 1-based: first widget = 1
      if (widgetIndex > maxWidgetsPerPage) {
        console.warn(`Page "${pageData.id}" has more than ${maxWidgetsPerPage} widgets; rendering stops there.`);
        break;
      }
      pageWidgetsHtml += await renderWidget(deps, widgetId, pageData.widgets[widgetId], rawThemeSettings, "publish", sharedGlobals, widgetIndex);
    }

    const footerHtml = footerData
      ? await renderWidget(deps, "footer", footerData, rawThemeSettings, "publish", sharedGlobals, null)
      : "";
    const sharedAreas = await renderSharedAreas(deps, areasData, rawThemeSettings, "publish", sharedGlobals);

    let extraBodyClasses = "";
    if (headerData?.settings?.transparent_on_hero) {
      // Over the first widget the page shows.
      const firstWidgetId = renderedWidgetOrder(pageData.widgets, pageData.widgetsOrder)[0];
      const firstWidget = firstWidgetId && pageData.widgets[firstWidgetId];
      if (firstWidget && (await widgetSupportsTransparentHeader(deps, firstWidget.type))) {
        extraBodyClasses = "transparent-header";
      }
    }

    const renderedHtml = await renderPageLayout(
      deps,
      { headerContent: headerHtml, mainContent: pageWidgetsHtml, footerContent: footerHtml, sharedAreas, extraBodyClasses },
      pageData,
      rawThemeSettings,
      "publish",
      sharedGlobals,
    );
    collectEnqueuedAssets(sharedGlobals);

    let html = await finishHtml(
      renderedHtml,
      sharedGlobals.outputPathPrefix,
      (error) => `Could not format HTML for ${pageData.id}.html: ${error}. Writing unformatted HTML.`,
      { page: pageData.id, filename: outputFilename },
    );

    const mdFilename = outputFilename.replace(/\.html$/, ".md");
    const withMarkdown = exportMarkdown && pageNumber === 1;
    if (withMarkdown) {
      html = withMarkdownLink(
        html,
        mdBase ? absoluteSiteUrl(siteUrl, mdFilename) : prefixInternalHref(mdFilename, sharedGlobals.outputPathPrefix),
      );
    }
    pageOutputs.push({ pageId: pageData.id, language: pageData.language, path: outputFilename });
    yield { path: outputFilename, content: html };

    if (withMarkdown) {
      const warn = (error) => console.warn(`Could not generate markdown for ${pageData.id}: ${error.message}`);
      try {
        const content =
          frontmatter([
            `title: ${pageData.name || pageData.id}`,
            `description: ${pageData.seo?.description || pageData.description || ""}`,
            "source_url:",
            `  html: '${outputFilename}'`,
            `  md: '${mdFilename}'`,
          ]) + htmlToMarkdown(pageWidgetsHtml);
        yield { path: mdFilename, content, softFailure: warn };
      } catch (error) {
        warn(error);
      }
    }
  }

  // Each item renders with fresh globals, so enqueued assets never bleed between items.
  for (const { schema, template, itemsByLanguage } of itemPageCollections) {
    for (const language of siteLanguages) {
      const lang = { language, defaultLanguage };
      const { header: headerData, footer: footerData, areas: areasData } = globalsFor(language);
      for (const item of itemsByLanguage.get(language) || []) {
        const itemPath = itemOutputPathFor(schema.slugPrefix, item.slug, lang);
        const sharedGlobals = {
          ...baseGlobals(),
          collectionCache: new Map(),
          outputPathPrefix: outputPathPrefixFor(itemPath),
          currentCanonicalPath: itemPath,
        };
        const { html: rendered, mainContentHtml, itemPageData } = await renderCollectionItemPageWithDeps(deps, {
          schema,
          item,
          template,
          rawThemeSettings,
          renderMode: "publish",
          sharedGlobals,
          headerData,
          footerData,
          areasData,
          projectData,
          siteUrl,
        });
        collectEnqueuedAssets(sharedGlobals);

        const emptyFields = emptyArticleFields(itemPageData.collectionItem);
        if (emptyFields.length) {
          structuredData.warnings.push({ path: itemPath, code: "emptyArticleFields", fields: emptyFields });
        }
        if (sharedGlobals.listingPages) {
          const listing = listingParentStatus(sharedGlobals.listingPages.get(schema.type), pagesByUuid, item.language);
          if (listing !== "resolved") {
            structuredData.warnings.push({
              path: itemPath,
              code: listing === "ambiguous" ? "ambiguousListingPage" : "noListingPage",
            });
          }
        }

        let html = await finishHtml(
          rendered,
          sharedGlobals.outputPathPrefix,
          (error) => `Could not format HTML for ${schema.slugPrefix}/${item.slug}.html: ${error}.`,
          { page: `${schema.slugPrefix}/${item.slug}`, filename: `${schema.slugPrefix}/${item.slug}.html` },
        );

        const mdPath = itemPath.replace(/\.html$/, ".md");
        if (exportMarkdown) {
          // Relative fallback stays in the item's own folder; the absolute form carries the prefix.
          html = withMarkdownLink(html, mdBase ? absoluteSiteUrl(siteUrl, mdPath) : `${item.slug}.md`);
        }
        yield { path: itemPath, content: html };

        if (exportMarkdown) {
          const warn = (error) => console.warn(`Could not generate markdown for ${schema.slugPrefix}/${item.slug}: ${error.message}`);
          try {
            const content =
              frontmatter([
                `title: ${itemPageData.name || item.slug}`,
                `description: ${itemPageData.seo?.description || ""}`,
                `collection: ${schema.type}`,
                `slug: ${item.slug}`,
                "source_url:",
                `  html: '${item.slug}.html'`,
                `  md: '${item.slug}.md'`,
              ]) + htmlToMarkdown(mainContentHtml);
            yield { path: mdPath, content, softFailure: warn };
          } catch (error) {
            warn(error);
          }
        }
      }
    }
  }

  const afterPagesEntries = afterPages ? await afterPages() : null;
  if (afterPagesEntries) yield* afterPagesEntries;

  // Widget CSS/JS, flattened into assets/: only what a rendered page enqueued.
  const widgetsDir = path.join(projectDir, "widgets");
  try {
    if (await fs.pathExists(widgetsDir)) {
      for (const source of await findWidgetAssets(widgetsDir)) {
        const filename = path.basename(source);
        if (!enqueuedAssetFiles.has(filename)) continue;
        yield {
          path: `assets/${filename}`,
          source,
          softFailure: (error) => console.error(`Error copying widget asset ${filename}:`, error),
        };
      }
    }
  } catch (findError) {
    if (failOnAssetScanError) throw findError;
    console.warn("Error finding or copying widget assets:", findError.message);
  }

  report.formsCount = formsManifest ? formsManifest.forms.length : 0;
  if (formsManifest) yield { path: "widgetizer.forms.json", content: JSON.stringify(formsManifest, null, 2) };
}

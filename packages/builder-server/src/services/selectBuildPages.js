import { isHomeSlug } from "@widgetizer/core/internalHref";
import { languageFolder, resolveLanguage } from "@widgetizer/core/contentAddress";
import { projectLanguages } from "../utils/contentLanguage.js";

/**
 * The pages and languages a site build includes, and the homepage checks that
 * refuse a build. generateSite builds from exactly this, so an app that needs to
 * know what the next build would hold (its forms, say) without building gets the
 * same answer.
 *
 * @param {object[]} pages - Every page in every language folder (`listPagesFromDir`),
 *   less any the app leaves out of a build.
 * @param {object} projectData - The project row: `defaultLanguage` and `languages`.
 * @param {{ refuse: (code: string, details: object) => Error }} options - The error for
 *   a site that can't be built, as in generateSite. Codes: NO_HOMEPAGE, TWO_HOMEPAGES.
 * @returns {{ pages: object[], languages: string[], languagesSkipped: string[] }}
 *   `languages` holds the non-default languages built, `languagesSkipped` the enabled
 *   ones left out for having no homepage.
 */
export function selectBuildPages(pages, projectData, { refuse }) {
  const defaultLanguage = projectData.defaultLanguage;
  const pageLang = (pageData) => ({ language: pageData.language, defaultLanguage });

  // The default language needs a homepage: a page slugged "index" or "home",
  // both of which publish as index.html. page.id is the filename, the
  // authoritative slug.
  if (!pages.some((pageData) => !languageFolder(pageLang(pageData)) && isHomeSlug(pageData.id))) {
    throw refuse("NO_HOMEPAGE", {});
  }

  // `index` and `home` both publish as the language's index.html, so a language
  // holding both would publish one over the other. The editor refuses the pair,
  // but older projects, imports and theme updates can still carry one.
  for (const language of new Set(pages.map((pageData) => pageData.language))) {
    const homes = pages.filter((pageData) => pageData.language === language && isHomeSlug(pageData.id));
    if (homes.length < 2) continue;
    throw refuse("TWO_HOMEPAGES", { folder: languageFolder(pageLang(homes[0])) });
  }

  // An enabled language is not a publishable one. A non-default language with no
  // homepage is left out entirely and named: a site with `/el/contact` but no
  // `/el/` sends visitors nowhere. The default language is not subject to this:
  // a missing root homepage is refused above, because skipping it would publish
  // a site with no `/` at all.
  const languagesSkipped = [];
  const siteLanguages = [resolveLanguage("", defaultLanguage)];
  for (const language of projectLanguages(projectData).languages) {
    if (pages.some((pageData) => pageData.language === language && isHomeSlug(pageData.id))) {
      siteLanguages.push(language);
    } else {
      languagesSkipped.push(language);
    }
  }

  const included = new Set(siteLanguages);
  return {
    pages: pages.filter((pageData) => included.has(resolveLanguage(pageData.language, defaultLanguage))),
    languages: siteLanguages.slice(1),
    languagesSkipped,
  };
}

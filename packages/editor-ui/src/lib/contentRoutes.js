/**
 * Editor routes for a piece of content. A slug is unique only per language, so
 * every link into the page editor has to name both — built here so no call site
 * can quietly drop the language and open the default language's page instead.
 */
export function pageEditorHref(page, isMultilang) {
  if (!isMultilang) return `/page-editor?pageId=${page.id}`;
  return `/page-editor?pageId=${page.slug || page.id}&language=${page.language}`;
}

export function pageSettingsHref(page, isMultilang) {
  if (!isMultilang) return `/pages/${page.id}/edit`;
  return `/pages/${page.id}/edit?language=${page.language}`;
}

export function pageAddHref(language) {
  return language ? `/pages/add?language=${language}` : "/pages/add";
}

export function menuStructureHref(menu, isMultilang) {
  const base = `/menus/${menu.id}/structure`;
  return isMultilang ? `${base}?language=${menu.language}` : base;
}

export function menuSettingsHref(menu, isMultilang) {
  const base = `/menus/edit/${menu.id}`;
  return isMultilang ? `${base}?language=${menu.language}` : base;
}

export function menuAddHref(language) {
  return language ? `/menus/add?language=${language}` : "/menus/add";
}

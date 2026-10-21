import {
  getAllProjects,
  getProjectById,
  getActiveProjectId,
  contentLanguage,
  listPageSlugs,
  readPage,
  readGlobal,
  listMenuIds,
  readMenu,
  readThemeJson,
  readWidgetSchemas,
  resolveSchemaDefaults,
  readLabelLocale,
  readWidgetGuidance,
  readThemeGuidance,
  readUploadBytes,
  getMediaFilesPage,
  getMediaFileById,
  getMediaIdsByPaths,
  listCollectionSchemas,
  listCollectionItems,
  readCollectionItem,
  renderSavedPagePreview,
  renderCollectionItemPreview,
  listThemes,
  listThemePresets,
  readPresetDetails,
  sanitizeRichText,
} from "@widgetizer/builder-server";

/**
 * The OSS assistant's view of the user's sites: the open site is the active
 * project, and every read goes through the same adapters and shared readers the
 * editor uses, scoped to the site the call pinned.
 *
 * @param {{ adapters: object }} options
 */
export function createAssistantSite({ adapters }) {
  const { storage, assetStorage, scopeResolver } = adapters;

  return {
    async listSites() {
      return { sites: getAllProjects(), openSiteId: getActiveProjectId() };
    },

    async openSite() {
      let scope;
      try {
        // The OSS resolver reads the active project and ignores the request.
        scope = await scopeResolver.resolveScope();
      } catch {
        return null;
      }
      const project = getProjectById(scope.projectId);
      return project ? { scope, project } : null;
    },

    reader: {
      contentLanguage,
      listPageSlugs: (scope, lang) => listPageSlugs(storage, scope, lang),
      readPage: (scope, slug, lang) => readPage(storage, scope, slug, lang),
      readGlobal: (scope, type, lang) => readGlobal(storage, scope, type, lang),
      listMenuIds: (scope, lang) => listMenuIds(storage, scope, lang),
      readMenu: (scope, id, lang) => readMenu(storage, scope, id, lang),
      readThemeJson: (scope) => readThemeJson(storage, scope),
      widgetSchemas: async (scope, lang) => resolveSchemaDefaults(await readWidgetSchemas(storage, scope), storage, scope, lang),
      labelLocale: (scope) => readLabelLocale(storage, scope),
      widgetGuidance: (scope, schema) => readWidgetGuidance(storage, scope, schema),
      themeGuidance: (scope) => readThemeGuidance(storage, scope),
      mediaPage: async (scope, options) => getMediaFilesPage(scope.projectId, options),
      mediaFile: async (scope, id) => getMediaFileById(scope.projectId, id),
      mediaIds: async (scope, paths) => getMediaIdsByPaths(scope.projectId, paths),
      uploadBytes: (scope, storedPath, maxBytes) => readUploadBytes(assetStorage, scope, storedPath, maxBytes),
      collectionSchemas: (scope) => listCollectionSchemas(storage, scope),
      collectionItems: (scope, type, options, lang) => listCollectionItems(storage, scope, type, options, lang),
      collectionItem: (scope, type, slug, lang) => readCollectionItem(storage, scope, type, slug, lang),
      renderPage: (scope, project, slug, lang) => renderSavedPagePreview({ storage, scope, project, slug, lang }),
      async renderItem(scope, project, collectionType, slug, lang) {
        const saved = await readCollectionItem(storage, scope, collectionType, slug, lang);
        if (!saved) {
          throw Object.assign(new Error(`There's no ${collectionType} item "${slug}" in ${lang.language}.`), {
            code: "ITEM_NOT_FOUND",
          });
        }
        return renderCollectionItemPreview({ storage, scope, project, collectionType, slug, savedItem: saved, lang });
      },
      presets: (themeId) => listThemePresets(themeId),
      // Installed themes, read from the theme source (not a site's copy): for choosing a new site's start.
      themes: () => listThemes(),
      presetDetails: (themeId, presetId) => readPresetDetails(themeId, presetId),
      sanitizeRichText,
    },
  };
}

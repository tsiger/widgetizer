import fs from "fs-extra";
import path from "path";
import { randomUUID } from "crypto";
import * as themeController from "../controllers/themeController.js";
import { processTemplatesRecursive } from "./templateHelpers.js";
import { enrichNewProjectReferences } from "./linkEnrichment.js";

/**
 * Scaffold a new project's on-disk content into an explicit directory.
 *
 * This is the directory-explicit core extracted from createProject so that a
 * different shell (e.g. hosted's per-user `data/users/<actor>/projects/<folder>`)
 * can scaffold without going through the global DATA_DIR. It performs ONLY the
 * filesystem work (theme copy, preset menus, template→pages init, link
 * enrichment, preset settings overrides) — no DB writes, no DATA_DIR path
 * resolution. Themes are still read from the seeded themes dir
 * (`getThemesDir()` → seeded from `THEMES_ROOT`), which is global by design.
 *
 * Mirrors the OSS createProject flow exactly; on failure it removes `projectDir`
 * and throws.
 *
 * @param {{ projectDir: string, theme: string, preset?: string }} args
 * @returns {Promise<string>} the installed theme version
 */
export async function scaffoldProjectContent({ projectDir, theme, preset }) {
  if (!theme) {
    throw new Error("Theme is required");
  }

  const pagesDir = path.join(projectDir, "pages");
  const menusDir = path.join(projectDir, "menus");

  await fs.ensureDir(projectDir);

  // Ensure seed themes are provisioned (idempotent no-op if already done)
  await themeController.ensureThemesDirectory();

  // Copy theme assets (excluding templates) and capture the installed version
  let themeVersion;
  try {
    themeVersion = await themeController.copyThemeToProject(theme, projectDir, ["templates"]);
  } catch (error) {
    await fs.remove(projectDir);
    throw new Error(`Failed to copy theme: ${error.message}`);
  }

  // Resolve preset paths (templates, menus, settings overrides). This can fail
  // on a preset whose settings file is present but unreadable, and the theme
  // has already been copied by now — so the half-made directory goes with it.
  let templatesDir;
  let presetMenusDir;
  let settingsOverrides;
  try {
    ({ templatesDir, menusDir: presetMenusDir, settingsOverrides } = await themeController.resolvePresetPaths(
      theme,
      preset,
    ));
  } catch (error) {
    await fs.remove(projectDir);
    console.error(`[projectScaffold] Reading the preset failed: ${error.message}`);
    throw new Error("The project could not be created from this preset, so nothing was created.");
  }

  // If preset has custom menus, replace root menus with preset menus
  // The preset's menus replace the theme's. Staged first, because the old
  // sequence removed the theme's menus and then copied — a failure between the
  // two left a project with no menus at all, and said it was created fine.
  if (presetMenusDir) {
    const stagedMenusDir = path.join(projectDir, ".preset-menus");
    try {
      await fs.remove(stagedMenusDir);
      await fs.copy(presetMenusDir, stagedMenusDir);
      await fs.remove(menusDir);
      await fs.move(stagedMenusDir, menusDir);
    } catch (error) {
      await fs.remove(stagedMenusDir).catch(() => {});
      await fs.remove(projectDir);
      console.error(`[projectScaffold] Applying the preset's menus failed: ${error.message}`);
      throw new Error("The project could not be created from this preset, so nothing was created.");
    }
  }

  // Initialize pages from theme/preset templates, then enrich link references
  try {
    await processTemplatesRecursive(templatesDir, pagesDir, async (template, slug, targetPath) => {
      const initializedPage = {
        ...template,
        ...(template.type !== "header" && template.type !== "footer"
          ? {
              uuid: randomUUID(),
              id: slug,
              slug,
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
            }
          : {}),
      };
      await fs.outputFile(targetPath, JSON.stringify(initializedPage, null, 2));
    });

    await enrichNewProjectReferences(pagesDir, menusDir);
  } catch (error) {
    await fs.remove(projectDir);
    throw new Error(`Failed to process templates: ${error.message}`);
  }

  // Apply preset settings overrides to the project's theme.json
  // A preset's settings are the preset. Applying only some of them would give
  // the project the preset's name and the theme's look.
  if (settingsOverrides) {
    try {
      const projectThemeJsonPath = path.join(projectDir, "theme.json");
      const themeJson = JSON.parse(await fs.readFile(projectThemeJsonPath, "utf8"));

      if (themeJson.settings && themeJson.settings.global) {
        for (const group of Object.values(themeJson.settings.global)) {
          if (!Array.isArray(group)) continue;
          for (const item of group) {
            if (item.id && settingsOverrides[item.id] !== undefined) {
              item.default = settingsOverrides[item.id];
            }
          }
        }
      }

      await fs.writeFile(projectThemeJsonPath, JSON.stringify(themeJson, null, 2));
    } catch (error) {
      await fs.remove(projectDir);
      console.error(`[projectScaffold] Applying the preset's settings failed: ${error.message}`);
      throw new Error("The project could not be created from this preset, so nothing was created.");
    }
  }

  return themeVersion;
}

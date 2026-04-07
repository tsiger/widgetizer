import chokidar from "chokidar";
import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { v4 as uuidv4 } from "uuid";
import { processTemplatesRecursive } from "../server/utils/templateHelpers.js";
import { enrichNewProjectReferences } from "../server/utils/linkEnrichment.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

const PROJECT_SHARED_EXCLUDES = new Set(["templates", "menus", "presets", "updates", "latest"]);

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--") && i + 1 < argv.length) {
      result[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return result;
}

export function normalizeRelPath(relPath) {
  return relPath.split(path.sep).join("/");
}

export function isProjectSharedPath(relPath) {
  const normalized = normalizeRelPath(relPath);
  const topDir = normalized.split("/")[0];
  return Boolean(normalized) && !PROJECT_SHARED_EXCLUDES.has(topDir);
}

function isGitPath(rootDir, filePath) {
  const rel = path.relative(rootDir, filePath);
  return rel.split(path.sep).includes(".git");
}

async function pathExists(targetPath) {
  return fs.pathExists(targetPath);
}

async function copyPath(src, dest) {
  await fs.ensureDir(path.dirname(dest));
  await fs.copy(src, dest, { overwrite: true });
}

async function removePath(dest) {
  await fs.remove(dest);
}

async function ensureDir(dest) {
  await fs.ensureDir(dest);
}

async function copyThemeSnapshot(srcDir, themeDest) {
  console.log(`[${stamp()}] [preset-sync] Full copy: ${path.relative(ROOT, srcDir)} -> ${path.relative(ROOT, themeDest)}`);
  await fs.copy(srcDir, themeDest, {
    overwrite: true,
    filter: (src) => !isGitPath(srcDir, src),
  });
}

async function copyProjectSharedSnapshot(srcDir, projectDest) {
  console.log(
    `[${stamp()}] [preset-sync] Full copy (shared only): ${path.relative(ROOT, srcDir)} -> ${path.relative(ROOT, projectDest)}`,
  );
  await fs.copy(srcDir, projectDest, {
    overwrite: true,
    filter: (src) => {
      if (isGitPath(srcDir, src)) return false;
      const rel = path.relative(srcDir, src);
      if (!rel) return true;
      return isProjectSharedPath(rel);
    },
  });
}

export function applySettingsOverrides(themeJson, settingsOverrides) {
  const nextThemeJson = JSON.parse(JSON.stringify(themeJson));

  if (!settingsOverrides || !nextThemeJson?.settings?.global) {
    return nextThemeJson;
  }

  for (const group of Object.values(nextThemeJson.settings.global)) {
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      if (item?.id && settingsOverrides[item.id] !== undefined) {
        item.default = settingsOverrides[item.id];
      }
    }
  }

  return nextThemeJson;
}

async function readJsonIfExists(filePath) {
  if (!(await pathExists(filePath))) return null;
  return fs.readJson(filePath);
}

async function collectJsonFilesRecursive(rootDir) {
  const files = [];

  async function walk(currentDir) {
    if (!(await pathExists(currentDir))) return;

    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const currentPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(currentPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(currentPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

async function removeEmptyDirectories(rootDir) {
  if (!(await pathExists(rootDir))) return;

  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await removeEmptyDirectories(path.join(rootDir, entry.name));
    }
  }

  const remaining = await fs.readdir(rootDir);
  if (remaining.length === 0) {
    await fs.remove(rootDir);
  }
}

async function removeExtraJsonFiles(targetDir, desiredRelativePaths) {
  if (!(await pathExists(targetDir))) return;

  const files = await collectJsonFilesRecursive(targetDir);
  for (const filePath of files) {
    const rel = normalizeRelPath(path.relative(targetDir, filePath));
    if (!desiredRelativePaths.has(rel)) {
      await fs.remove(filePath);
    }
  }

  await removeEmptyDirectories(targetDir);
}

async function collectExistingPageMetadata(projectPagesDir) {
  const metadata = new Map();
  const files = await collectJsonFilesRecursive(projectPagesDir);

  for (const filePath of files) {
    const rel = normalizeRelPath(path.relative(projectPagesDir, filePath));
    const page = await readJsonIfExists(filePath);
    if (!page) continue;
    metadata.set(rel, {
      uuid: page.uuid || null,
      created: page.created || null,
    });
  }

  return metadata;
}

async function collectExistingMenuMetadata(projectMenusDir) {
  const metadata = new Map();
  const files = await collectJsonFilesRecursive(projectMenusDir);

  for (const filePath of files) {
    const rel = normalizeRelPath(path.relative(projectMenusDir, filePath));
    const menu = await readJsonIfExists(filePath);
    if (!menu) continue;
    metadata.set(rel, {
      uuid: menu.uuid || null,
    });
  }

  return metadata;
}

export async function syncTemplatesToProject(templatesSourceDir, projectPagesDir) {
  const now = new Date().toISOString();
  const existingMetadata = await collectExistingPageMetadata(projectPagesDir);
  const desiredRelativePaths = new Set();

  if (await pathExists(templatesSourceDir)) {
    await processTemplatesRecursive(templatesSourceDir, projectPagesDir, async (template, slug, targetPath) => {
      const rel = normalizeRelPath(path.relative(projectPagesDir, targetPath));
      desiredRelativePaths.add(rel);

      if (template.type === "header" || template.type === "footer") {
        await fs.outputFile(targetPath, JSON.stringify(template, null, 2));
        return;
      }

      const existing = existingMetadata.get(rel);
      const initializedPage = {
        ...template,
        uuid: existing?.uuid || uuidv4(),
        id: slug,
        slug,
        created: existing?.created || now,
        updated: now,
      };

      await fs.outputFile(targetPath, JSON.stringify(initializedPage, null, 2));
    });
  }

  await removeExtraJsonFiles(projectPagesDir, desiredRelativePaths);
}

async function syncJsonTree(sourceDir, targetDir, existingMetadata, initializer) {
  const desiredRelativePaths = new Set();

  async function walk(currentSourceDir, currentTargetDir) {
    if (!(await pathExists(currentSourceDir))) return;

    await fs.ensureDir(currentTargetDir);
    const entries = await fs.readdir(currentSourceDir, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(currentSourceDir, entry.name);
      const targetPath = path.join(currentTargetDir, entry.name);

      if (entry.isDirectory()) {
        await walk(sourcePath, targetPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        const rel = normalizeRelPath(path.relative(targetDir, targetPath));
        desiredRelativePaths.add(rel);
        const json = await fs.readJson(sourcePath);
        const initialized = initializer(json, rel, existingMetadata.get(rel));
        await fs.outputFile(targetPath, JSON.stringify(initialized, null, 2));
      }
    }
  }

  if (await pathExists(sourceDir)) {
    await walk(sourceDir, targetDir);
  }

  await removeExtraJsonFiles(targetDir, desiredRelativePaths);
}

export async function syncMenusToProject(menusSourceDir, projectMenusDir) {
  const existingMetadata = await collectExistingMenuMetadata(projectMenusDir);

  await syncJsonTree(menusSourceDir, projectMenusDir, existingMetadata, (menu, _rel, existing) => {
    if (existing?.uuid) {
      return { ...menu, uuid: existing.uuid };
    }
    return menu;
  });
}

async function readSettingsOverrides(presetDir) {
  const presetJsonPath = path.join(presetDir, "preset.json");
  const presetJson = await readJsonIfExists(presetJsonPath);
  if (!presetJson?.settings || Object.keys(presetJson.settings).length === 0) {
    return null;
  }
  return presetJson.settings;
}

export async function resolvePresetSources(srcDir, presetId) {
  const presetDir = path.join(srcDir, "presets", presetId);
  const presetTemplatesDir = path.join(presetDir, "templates");
  const presetMenusDir = path.join(presetDir, "menus");
  const usesPresetTemplates = await pathExists(presetTemplatesDir);
  const usesPresetMenus = await pathExists(presetMenusDir);

  return {
    presetDir,
    presetTemplatesDir,
    presetMenusDir,
    templatesSourceDir: usesPresetTemplates ? presetTemplatesDir : path.join(srcDir, "templates"),
    menusSourceDir: usesPresetMenus ? presetMenusDir : path.join(srcDir, "menus"),
    settingsOverrides: await readSettingsOverrides(presetDir),
    usesPresetTemplates,
    usesPresetMenus,
  };
}

export async function syncProjectThemeJson(srcDir, projectDest, settingsOverrides) {
  const srcThemeJsonPath = path.join(srcDir, "theme.json");
  const themeJson = await fs.readJson(srcThemeJsonPath);
  const nextThemeJson = applySettingsOverrides(themeJson, settingsOverrides);
  await fs.outputFile(path.join(projectDest, "theme.json"), JSON.stringify(nextThemeJson, null, 2));
}

export async function syncPresetProject({ srcDir, project, projectDest, presetId }) {
  const presetSources = await resolvePresetSources(srcDir, presetId);

  await syncProjectThemeJson(srcDir, projectDest, presetSources.settingsOverrides);
  await syncTemplatesToProject(presetSources.templatesSourceDir, path.join(projectDest, "pages"));
  await syncMenusToProject(presetSources.menusSourceDir, path.join(projectDest, "menus"));
  await enrichNewProjectReferences(project);
}

export function shouldRebuildProject(relPath, presetId, presetSources) {
  const normalized = normalizeRelPath(relPath);

  if (normalized === "theme.json") return true;
  if (normalized === `presets/${presetId}`) return true;
  if (normalized === `presets/${presetId}/preset.json`) return true;
  if (normalized.startsWith(`presets/${presetId}/templates`)) return true;
  if (normalized.startsWith(`presets/${presetId}/menus`)) return true;

  if (!presetSources.usesPresetTemplates && (normalized === "templates" || normalized.startsWith("templates/"))) {
    return true;
  }

  if (!presetSources.usesPresetMenus && (normalized === "menus" || normalized.startsWith("menus/"))) {
    return true;
  }

  return false;
}

function buildConfig(args) {
  const themeId = args.theme ?? "arch";
  const presetId = typeof args.preset === "string" ? args.preset.trim() : "";
  const project = typeof args.project === "string" ? args.project.trim() : "";

  if (!presetId || !project) {
    throw new Error(
      [
        "Usage: node scripts/preset-sync.js --project <folder> --preset <id> [--theme <id>]",
        "",
        "  --project  Required. Project folder under data/projects/",
        "  --preset   Required. Preset id under themes/<theme>/presets/",
        "  --theme    Optional. Theme id under themes/ (default: arch)",
        "",
        "Example:",
        "  npm run preset:sync -- --project corkwell --preset corkwell",
      ].join("\n"),
    );
  }

  return {
    themeId,
    presetId,
    project,
    srcDir: path.join(ROOT, "themes", themeId),
    themeDest: path.join(ROOT, "data", "themes", themeId),
    projectDest: path.join(ROOT, "data", "projects", project),
  };
}

async function initialSync(config) {
  await copyThemeSnapshot(config.srcDir, config.themeDest);
  await copyProjectSharedSnapshot(config.srcDir, config.projectDest);
  await syncPresetProject(config);
}

async function syncThemePath(config, relPath, eventType) {
  const srcPath = path.join(config.srcDir, relPath);
  const destPath = path.join(config.themeDest, relPath);

  if (eventType === "unlink" || eventType === "unlinkDir") {
    await removePath(destPath);
    return;
  }

  if (eventType === "addDir") {
    await ensureDir(destPath);
    return;
  }

  await copyPath(srcPath, destPath);
}

async function syncProjectSharedPath(config, relPath, eventType) {
  if (!isProjectSharedPath(relPath) || normalizeRelPath(relPath) === "theme.json") {
    return;
  }

  const srcPath = path.join(config.srcDir, relPath);
  const destPath = path.join(config.projectDest, relPath);

  if (eventType === "unlink" || eventType === "unlinkDir") {
    await removePath(destPath);
    return;
  }

  if (eventType === "addDir") {
    await ensureDir(destPath);
    return;
  }

  await copyPath(srcPath, destPath);
}

async function handleSourceChange(config, filePath, eventType) {
  const relPath = path.relative(config.srcDir, filePath);
  if (!relPath || relPath.startsWith("..")) return;
  if (isGitPath(config.srcDir, filePath)) return;

  await syncThemePath(config, relPath, eventType);

  const presetSources = await resolvePresetSources(config.srcDir, config.presetId);
  if (shouldRebuildProject(relPath, config.presetId, presetSources)) {
    console.log(`[${stamp()}] [preset-sync] Rebuilding project content from preset ${config.presetId}`);
    await syncPresetProject(config);
    return;
  }

  await syncProjectSharedPath(config, relPath, eventType);
}

async function startWatcher(config) {
  const watcher = chokidar.watch(config.srcDir, {
    ignored: /(^|[/\\])\.git([/\\]|$)/,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });

  let pending = Promise.resolve();

  const runChange = (eventType, changedPath) => {
    pending = pending
      .then(async () => {
        const rel = normalizeRelPath(path.relative(config.srcDir, changedPath));
        console.log(`[${stamp()}] [preset-sync] ${eventType} ${rel}`);
        await handleSourceChange(config, changedPath, eventType);
      })
      .catch((error) => {
        console.error(`[${stamp()}] [preset-sync] Sync error:`, error);
      });
  };

  watcher
    .on("add", (changedPath) => runChange("add", changedPath))
    .on("change", (changedPath) => runChange("change", changedPath))
    .on("unlink", (changedPath) => runChange("unlink", changedPath))
    .on("addDir", (changedPath) => runChange("addDir", changedPath))
    .on("unlinkDir", (changedPath) => runChange("unlinkDir", changedPath))
    .on("error", (error) => console.error(`[${stamp()}] [preset-sync] Watcher error:`, error))
    .on("ready", () => {
      console.log(`[${stamp()}] [preset-sync] Watching themes/${config.themeId} for preset ${config.presetId}`);
      console.log(`[${stamp()}] [preset-sync] Destinations:`);
      console.log(`[${stamp()}] [preset-sync]   data/themes/${config.themeId}`);
      console.log(`[${stamp()}] [preset-sync]   data/projects/${config.project}`);
      console.log(`[${stamp()}] [preset-sync] Press Ctrl+C to stop.`);
    });
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const config = buildConfig(args);

  await fs.ensureDir(config.themeDest);
  await fs.ensureDir(config.projectDest);

  await initialSync(config);
  await startWatcher(config);
}

const isDirectRun =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  main().catch((error) => {
    console.error(`[${stamp()}] [preset-sync] ${error.message}`);
    process.exit(1);
  });
}

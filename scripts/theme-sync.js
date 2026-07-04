import chokidar from "chokidar";
import { copyFile, rm, mkdir } from "node:fs/promises";
import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Directories excluded from the project destination (matches copyThemeToProject logic)
const PROJECT_EXCLUDES = new Set(["templates", "presets", "updates", "latest"]);

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--") && i + 1 < argv.length) {
      result[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
const themeId = args.theme ?? "arch";
const project = typeof args.project === "string" ? args.project.trim() : "";

const srcDir = path.join(ROOT, "themes", themeId);
const themeDest = path.join(ROOT, "data", "themes", themeId);
const projectDest = project ? path.join(ROOT, "data", "projects", project) : null;

if (!existsSync(srcDir)) {
  console.error(`[${stamp()}] [sync] Theme not found: themes/${themeId}`);
  process.exit(1);
}

if (projectDest && !existsSync(projectDest)) {
  console.error(
    `[${stamp()}] [sync] Project folder not found: data/projects/${project}`,
    `\n[${stamp()}] [sync] Create the project first, or omit --project to sync only the runtime theme copy.`,
  );
  process.exit(1);
}

function isExcludedForProject(relPath) {
  const topDir = relPath.split(path.sep)[0];
  return PROJECT_EXCLUDES.has(topDir);
}

async function syncFile(relPath) {
  const src = path.join(srcDir, relPath);

  const targets = [path.join(themeDest, relPath)];
  if (projectDest && !isExcludedForProject(relPath)) {
    targets.push(path.join(projectDest, relPath));
  }

  for (const dest of targets) {
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(src, dest);
  }
}

async function removeFile(relPath) {
  const targets = [path.join(themeDest, relPath)];
  if (projectDest && !isExcludedForProject(relPath)) {
    targets.push(path.join(projectDest, relPath));
  }

  for (const dest of targets) {
    try {
      await rm(dest, { force: true });
    } catch {
      // already gone
    }
  }
}

async function removeDir(relPath) {
  const targets = [path.join(themeDest, relPath)];
  if (projectDest && !isExcludedForProject(relPath)) {
    targets.push(path.join(projectDest, relPath));
  }

  for (const dest of targets) {
    try {
      await rm(dest, { recursive: true, force: true });
    } catch {
      // already gone
    }
  }
}

function isGitPath(filePath) {
  const rel = path.relative(srcDir, filePath);
  return rel.split(path.sep).includes(".git");
}

function initialSync() {
  console.log(`[${stamp()}] [sync] Full copy: themes/${themeId} → data/themes/${themeId}`);
  cpSync(srcDir, themeDest, {
    recursive: true,
    filter: (src) => !isGitPath(src),
  });

  if (!projectDest) return;

  console.log(`[${stamp()}] [sync] Full copy: themes/${themeId} → data/projects/${project} (filtered)`);
  cpSync(srcDir, projectDest, {
    recursive: true,
    filter: (src) => {
      if (isGitPath(src)) return false;
      const rel = path.relative(srcDir, src);
      if (!rel) return true; // root
      return !isExcludedForProject(rel);
    },
  });
}

function startWatcher() {
  const watcher = chokidar.watch(srcDir, {
    ignored: /(^|[/\\])\.git([/\\]|$)/,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });

  watcher
    .on("add", (filePath) => {
      const rel = path.relative(srcDir, filePath);
      console.log(`[${stamp()}] [sync] + ${rel}`);
      syncFile(rel);
    })
    .on("change", (filePath) => {
      const rel = path.relative(srcDir, filePath);
      console.log(`[${stamp()}] [sync] ~ ${rel}`);
      syncFile(rel);
    })
    .on("unlink", (filePath) => {
      const rel = path.relative(srcDir, filePath);
      console.log(`[${stamp()}] [sync] - ${rel}`);
      removeFile(rel);
    })
    .on("addDir", (dirPath) => {
      const rel = path.relative(srcDir, dirPath);
      if (!rel) return;
      console.log(`[${stamp()}] [sync] +dir ${rel}`);
      const targets = [path.join(themeDest, rel)];
      if (projectDest && !isExcludedForProject(rel)) targets.push(path.join(projectDest, rel));
      targets.forEach((d) => mkdir(d, { recursive: true }));
    })
    .on("unlinkDir", (dirPath) => {
      const rel = path.relative(srcDir, dirPath);
      if (!rel) return;
      console.log(`[${stamp()}] [sync] -dir ${rel}`);
      removeDir(rel);
    })
    .on("error", (err) => console.error(`[${stamp()}] [sync] Watcher error:`, err))
    .on("ready", () => {
      console.log(`[${stamp()}] [sync] Watching themes/${themeId} for changes…`);
      console.log(`[${stamp()}] [sync] Destinations:`);
      console.log(`[${stamp()}] [sync]   data/themes/${themeId}`);
      console.log(`[${stamp()}] [sync]   data/projects/${project}`);
      console.log(`[${stamp()}] [sync] Press Ctrl+C to stop.`);
    });
}

initialSync();

// Without --project there is nothing to keep in sync live — the runtime theme
// copy is a one-shot mirror (e.g. to publish a new preset to the picker).
if (projectDest) {
  startWatcher();
} else {
  console.log(`[${stamp()}] [sync] Done. Runtime theme copy updated (no --project: one-shot, no watcher).`);
}

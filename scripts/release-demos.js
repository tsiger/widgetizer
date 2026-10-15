/**
 * Rebuild a theme's demo sites before a release, against the running local server.
 *
 * Pass 1 (demos): for every preset with a liveDemo, create a fresh "DEMO: <name>"
 * project, export the site, check it, copy it into the demos folder and save a
 * project backup ZIP under <backups>/<theme version>/.
 *
 * Pass 2 (upgrade): apply the theme update to projects still on an older version
 * and export them, to exercise the path existing users take. Nothing is copied.
 * When no such project exists it offers to import backup ZIPs from a folder.
 *
 * Usage:
 *   npm run demos:release -- [options]
 *
 *   --theme <id>          default "arch"
 *   --demos-dir <path>    or DEMOS_DIR in .env
 *   --backups-dir <path>  or DEMO_BACKUPS_DIR in .env
 *   --only a,b            limit both passes to these preset ids
 *   --except a,b          leave these preset ids out of both passes
 *   --check               pass 1 reports only: no demo is replaced, no backup saved
 *   --replace             delete earlier DEMO projects without asking
 *   --import-from <path>  folder of project ZIPs for pass 2 when none are left
 *   --no-import           never ask to import
 *   --skip-demos          skip pass 1
 *   --skip-upgrade        skip pass 2
 *   --api <url>           default http://localhost:<PORT or 3001>
 */
import dotenv from "dotenv";
import fs from "fs-extra";
import path from "node:path";
import readline from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(ROOT, ".env"), quiet: true });

const DEMO_PREFIX = "DEMO: ";
const PLACEHOLDER_RE =
  /\b(todo|tbd|fixme|lorem ipsum|very soon|untitled|sample text|your (?:text|title|heading) here|(?:heading|title|text) goes here)\b/i;

function parseArgs(argv) {
  const flags = new Set(["replace", "check", "no-import", "skip-demos", "skip-upgrade"]);
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    if (flags.has(key)) result[key] = true;
    else result[key] = argv[++i];
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));
const themeId = args.theme ?? "arch";
const api = (args.api ?? `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, "");
const demosDir = args["demos-dir"] ?? process.env.DEMOS_DIR;
const backupsDir = args["backups-dir"] ?? process.env.DEMO_BACKUPS_DIR;
const idList = (value) => (value ? new Set(value.split(",").map((s) => s.trim())) : null);
const [onlyIds, exceptIds] = [idList(args.only), idList(args.except)];
const wanted = (id) => (!onlyIds || onlyIds.has(id)) && !exceptIds?.has(id);

const report = [];
const note = (pass, preset, level, message) => {
  report.push({ pass, preset, level, message });
  console.log(`  ${level === "ok" ? "✔" : level === "warn" ? "!" : "✖"} ${message}`);
};

async function request(method, urlPath, { body, projectId, raw } = {}) {
  const headers = {};
  if (projectId) headers["X-Project-Id"] = projectId;
  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${api}${urlPath}`, { method, headers, body: payload });
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.message || json.error || text;
    } catch {
      // not JSON
    }
    throw new Error(`${method} ${urlPath} → ${res.status}: ${String(detail).slice(0, 300)}`);
  }
  return raw ? res : res.json();
}

async function ask(question) {
  if (!process.stdin.isTTY) return "";
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

const versionParts = (v) => String(v || "0").split(".").map((n) => parseInt(n, 10) || 0);
function isOlder(a, b) {
  const [x, y] = [versionParts(a), versionParts(b)];
  for (let i = 0; i < 3; i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0);
  }
  return false;
}

async function listHtml(dir, base = dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listHtml(full, base)));
    else if (entry.name.endsWith(".html") && !entry.name.startsWith("__export__")) {
      out.push(path.relative(base, full).split(path.sep).join("/"));
    }
  }
  return out.sort();
}

function visibleLines(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

const visibleText = (html) => visibleLines(html).join(" ");

function summarize(counts) {
  const entries = [...counts].map(([line, n]) => `"${line.length > 70 ? `${line.slice(0, 70)}…` : line}" (${n})`);
  return entries.slice(0, 6).join(", ") + (entries.length > 6 ? `, … ${entries.length - 6} more` : "");
}

async function targetExists(siteDir, fromFile, ref) {
  const clean = ref.split("#")[0].split("?")[0];
  if (!clean) return true;
  let decoded = clean;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    // keep the raw form
  }
  const target = path.resolve(path.dirname(path.join(siteDir, fromFile)), decoded);
  if (!target.startsWith(path.resolve(siteDir))) return true;
  for (const candidate of [target, `${target}.html`, path.join(target, "index.html")]) {
    if (await fs.pathExists(candidate)) return true;
  }
  return false;
}

async function checkSite(pass, preset, siteDir) {
  const pages = await listHtml(siteDir);
  const placeholders = [];
  const missing = new Set();

  for (const page of pages) {
    const html = await fs.readFile(path.join(siteDir, page), "utf8");
    const hit = visibleText(html).match(PLACEHOLDER_RE);
    if (hit) placeholders.push(`${page}: "${hit[0]}"`);

    const refs = [];
    for (const m of html.matchAll(/\s(?:src|href|poster)="([^"]*)"/g)) refs.push(m[1]);
    for (const m of html.matchAll(/\ssrcset="([^"]*)"/g)) {
      refs.push(...m[1].split(",").map((part) => part.trim().split(/\s+/)[0]));
    }
    for (const ref of refs) {
      if (!ref || /^([a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(ref) || ref.includes("{{")) continue;
      if (!(await targetExists(siteDir, page, ref.replace(/&amp;/g, "&")))) missing.add(`${page} → ${ref}`);
    }
  }

  if (placeholders.length) note(pass, preset, "warn", `placeholder text: ${placeholders.join("; ")}`);
  if (missing.size) {
    const list = [...missing];
    note(pass, preset, "warn", `${list.length} missing file(s), e.g. ${list.slice(0, 3).join("; ")}`);
  }
  if (await fs.pathExists(path.join(siteDir, "__export__issues.html"))) {
    note(pass, preset, "warn", `HTML validation issues: ${path.join(siteDir, "__export__issues.html")}`);
  }
  return pages;
}

async function compareWithDemo(preset, siteDir, pages, demoDir) {
  if (!(await fs.pathExists(demoDir))) {
    note("demos", preset, "warn", "no existing demo to compare with");
    return;
  }
  const old = await listHtml(demoDir);
  const added = pages.filter((p) => !old.includes(p));
  const removed = old.filter((p) => !pages.includes(p));
  if (added.length) note("demos", preset, "warn", `new pages: ${added.join(", ")}`);
  if (removed.length) note("demos", preset, "warn", `pages no longer exported: ${removed.join(", ")}`);

  // Text found on one side only, with the number of pages it is on.
  const [onlyDemo, onlyNew] = [new Map(), new Map()];
  const count = (map, lines, other) => {
    for (const line of new Set(lines)) if (!other.has(line)) map.set(line, (map.get(line) || 0) + 1);
  };
  const images = (html) => (html.match(/<img\b/gi) || []).length;
  const fewerImages = [];
  for (const page of pages.filter((p) => old.includes(p))) {
    const [before, after] = await Promise.all([
      fs.readFile(path.join(demoDir, page), "utf8"),
      fs.readFile(path.join(siteDir, page), "utf8"),
    ]);
    const [a, b] = [visibleLines(before), visibleLines(after)];
    count(onlyDemo, a, new Set(b));
    count(onlyNew, b, new Set(a));
    if (images(after) < images(before)) fewerImages.push(`${page} ${images(before)}→${images(after)}`);
  }
  if (onlyDemo.size) note("demos", preset, "warn", `text only in the current demo: ${summarize(onlyDemo)}`);
  if (onlyNew.size) note("demos", preset, "warn", `text only in the new export: ${summarize(onlyNew)}`);
  if (fewerImages.length) {
    note("demos", preset, "warn", `fewer images than the current demo: ${fewerImages.slice(0, 6).join(", ")}`);
  }
}

async function exportSite(pass, preset, project) {
  // The export route only serves the active project.
  await request("PUT", `/api/projects/active/${project.id}`);
  const result = await request("POST", "/api/export", { projectId: project.id, body: {} });
  for (const warning of result.warnings || []) note(pass, preset, "warn", `export warning: ${warning.message || warning}`);
  const pages = await checkSite(pass, preset, result.outputDir);
  return { outputDir: result.outputDir, pages };
}

async function saveBackup(project, file) {
  const res = await request("POST", `/api/projects/${project.id}/export`, { raw: true });
  await fs.ensureDir(path.dirname(file));
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(file));
}

async function runDemos(theme, presets) {
  console.log(`\nPass 1 — demos from ${presets.length} preset(s), ${theme.name} ${theme.version}`);

  const ids = new Set(presets.map((p) => p.id));
  const stale = (await request("GET", "/api/projects")).filter(
    (p) => p.theme === themeId && p.name.startsWith(DEMO_PREFIX) && ids.has(p.preset),
  );
  if (stale.length) {
    const confirmed =
      args.replace ||
      /^y/i.test(await ask(`${stale.length} DEMO project(s) from an earlier run will be deleted and recreated. Continue? [y/N] `));
    if (!confirmed) {
      console.log("  Skipped: earlier DEMO projects are still there (pass --replace to recreate them).");
      return;
    }
    for (const project of stale) await request("DELETE", `/api/projects/${project.id}`);
  }

  for (const preset of presets) {
    console.log(`\n${preset.name}`);
    try {
      const project = await request("POST", "/api/projects", {
        body: {
          name: `${DEMO_PREFIX}${preset.name}`,
          siteTitle: preset.name,
          description: preset.description || "",
          theme: themeId,
          preset: preset.id,
        },
      });
      if (project.themeVersion !== theme.version) {
        note("demos", preset.id, "warn", `created on ${project.themeVersion}, theme is ${theme.version}`);
      }

      const { outputDir, pages } = await exportSite("demos", preset.id, project);

      if (demosDir) {
        const demoDir = path.join(demosDir, preset.id);
        await compareWithDemo(preset.id, outputDir, pages, demoDir);
        if (!args.check) {
          await fs.remove(demoDir);
          await fs.copy(outputDir, demoDir, { filter: (src) => !path.basename(src).startsWith("__export__") });
        }
      }
      if (backupsDir && !args.check) {
        await saveBackup(project, path.join(backupsDir, theme.version, `${preset.id}.zip`));
      }
      const done = args.check ? "" : `${demosDir ? ", demo replaced" : ""}${backupsDir ? ", backup saved" : ""}`;
      note("demos", preset.id, "ok", `${pages.length} pages exported${done}`);
    } catch (error) {
      note("demos", preset.id, "fail", error.message);
    }
  }
}

async function importBackups(dir) {
  const zips = (await fs.readdir(dir)).filter((f) => f.endsWith(".zip")).sort();
  const chosen = zips.filter((f) => wanted(path.basename(f, ".zip")));
  console.log(`  Importing ${chosen.length} backup(s) from ${dir}`);
  for (const file of chosen) {
    try {
      const form = new FormData();
      form.append("projectZip", new Blob([await fs.readFile(path.join(dir, file))], { type: "application/zip" }), file);
      await request("POST", "/api/projects/import", { body: form });
    } catch (error) {
      note("upgrade", path.basename(file, ".zip"), "fail", `import failed: ${error.message}`);
    }
  }
}

async function runUpgrade(theme) {
  console.log(`\nPass 2 — upgrade older projects to ${theme.name} ${theme.version}`);

  const findOlder = async () =>
    (await request("GET", "/api/projects")).filter(
      (p) =>
        p.theme === themeId &&
        !p.name.startsWith(DEMO_PREFIX) &&
        isOlder(p.themeVersion, theme.version) &&
        wanted(p.preset),
    );

  let projects = await findOlder();
  if (!projects.length && !args["no-import"]) {
    const from =
      args["import-from"] ??
      (await ask("  No projects on an older version. Folder of project backups to import (empty to skip): "));
    if (from) {
      if (await fs.pathExists(from)) {
        await importBackups(from);
        projects = await findOlder();
      } else {
        console.log(`  Folder not found: ${from}`);
      }
    }
  }
  if (!projects.length) {
    console.log("  Nothing to upgrade.");
    return;
  }

  for (const project of projects) {
    const label = project.preset || project.folderName;
    console.log(`\n${project.name} (${project.themeVersion})`);
    try {
      if (!project.receiveThemeUpdates) {
        await request("PUT", `/api/projects/${project.id}/theme-updates`, { body: { enabled: true } });
      }
      const result = await request("POST", `/api/projects/${project.id}/theme-updates/apply`);
      if (!project.receiveThemeUpdates) {
        await request("PUT", `/api/projects/${project.id}/theme-updates`, { body: { enabled: false } });
      }
      if (!result.success) throw new Error(result.message || "update was not applied");

      const { pages } = await exportSite("upgrade", label, project);
      note("upgrade", label, "ok", `${result.previousVersion} → ${result.newVersion}, ${pages.length} pages exported`);
    } catch (error) {
      note("upgrade", label, "fail", error.message);
    }
  }
}

async function main() {
  let theme;
  try {
    theme = await request("GET", `/api/themes/${themeId}`);
  } catch (error) {
    console.error(`Cannot reach the server at ${api} (start it with "npm run server"): ${error.message}`);
    process.exit(1);
  }

  if (!args["skip-demos"]) {
    if (!demosDir) console.log("No demos folder given (--demos-dir or DEMOS_DIR): exports stay in data/publish.");
    else if (!(await fs.pathExists(demosDir))) throw new Error(`Demos folder not found: ${demosDir}`);
    if (!backupsDir) console.log("No backups folder given (--backups-dir or DEMO_BACKUPS_DIR): no backups are saved.");
    else if (!(await fs.pathExists(backupsDir))) throw new Error(`Backups folder not found: ${backupsDir}`);
  }

  // The server creates and updates projects from the runtime theme copy.
  const sync = spawnSync(process.execPath, [path.join(ROOT, "scripts", "theme-sync.js"), "--theme", themeId], {
    stdio: "inherit",
  });
  if (sync.status !== 0) throw new Error("theme sync failed");
  theme = await request("GET", `/api/themes/${themeId}`);

  const { presets: allPresets } = await request("GET", `/api/themes/${themeId}/presets`);
  const presets = allPresets.filter((p) => p.liveDemo && wanted(p.id));

  const activeBefore = await request("GET", "/api/projects/active");
  try {
    if (!args["skip-demos"]) await runDemos(theme, presets);
    if (!args["skip-upgrade"]) await runUpgrade(theme);
  } finally {
    if (activeBefore?.id) {
      await request("PUT", `/api/projects/active/${activeBefore.id}`).catch(() => {});
    }
  }

  const problems = report.filter((r) => r.level !== "ok");
  console.log(`\nSummary — ${report.filter((r) => r.level === "ok").length} ok, ${problems.length} to look at`);
  for (const r of problems) console.log(`  [${r.pass}] ${r.preset}: ${r.message}`);
  if (report.some((r) => r.level === "fail")) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

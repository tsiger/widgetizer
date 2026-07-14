import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseVersion as parseSemver } from "../packages/builder-server/src/utils/semver.js";
import { isWithinDirectory } from "../packages/core/src/utils/pathSecurity.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const BOOL_FLAGS = new Set(["dry-run", "force", "help"]);
const VALUE_FLAGS = new Set(["from", "version"]);
// preset-media/ is deliberately never delta'd: starter images resolve from the
// app's seed copy at project creation (resolvePresetPaths), so deltas and
// runtime theme copies stay small.
const EXCLUDED_TOP_LEVEL = new Set(["updates", "latest", "preset-media"]);
const EXCLUDED_FILES = new Set([".theme-package.json"]);
const DELETION_DIRS = new Set(["assets", "widgets", "snippets", "locales", "collection-types"]);
const DELETION_FILES = new Set(["layout.liquid"]);
const COPY_STATUSES = new Set(["A", "M", "T"]);

function usage() {
  return `
Usage:
  npm run theme:update-delta -- [theme-path] [options]

Options:
  --from <tag>       Previous app/theme release tag. Defaults to the highest semver tag below package.json version.
  --version <ver>    Target theme version. Defaults to package.json version.
  --dry-run          Print the update plan without writing files.
  --force            Replace an existing updates/<version> folder.
  --help             Show this help.

Examples:
  npm run theme:update-delta -- themes/arch --dry-run
  npm run theme:update-delta -- themes/arch --from 0.9.8 --version 0.9.9 --dry-run
  npm run theme:update-delta -- themes/arch --from 0.9.8 --version 0.9.9
`.trim();
}

function parseArgs(argv) {
  const result = { flags: {}, positional: [] };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (!arg.startsWith("--")) {
      result.positional.push(arg);
      continue;
    }

    const [rawName, inlineValue] = arg.slice(2).split("=", 2);
    if (BOOL_FLAGS.has(rawName)) {
      result.flags[rawName] = true;
      continue;
    }

    if (!VALUE_FLAGS.has(rawName)) {
      fail(`Unknown option: --${rawName}\n\n${usage()}`);
    }

    const value = inlineValue ?? argv[++i];
    if (!value || value.startsWith("--")) {
      fail(`Missing value for --${rawName}\n\n${usage()}`);
    }

    result.flags[rawName] = value;
  }

  return result;
}

function fail(message) {
  console.error(`[theme-update-delta] ${message}`);
  process.exit(1);
}

function warn(message) {
  console.log(`[theme-update-delta] Warning: ${message}`);
}

function log(message = "") {
  console.log(`[theme-update-delta] ${message}`);
}

function git(args, options = {}) {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: options.encoding ?? "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr = error.stderr?.toString().trim();
    throw new Error(stderr || error.message);
  }
}

function readJson(filePath) {
  return readFile(filePath, "utf8").then((content) => JSON.parse(content));
}

// parseSemver is the shared builder-server semver parser, re-exported here so
// the tool (and its tests) keep one source of truth for version parsing.
export { parseSemver };

export function parseVersionFromTag(tag) {
  // Accept a clean x.y.z only when it sits at the END of the tag, optionally
  // `v`-prefixed and preceded by start-of-string or a separator. Reject
  // leading-zero components so date/compound tags (e.g. `release-2024.01.15`)
  // don't masquerade as versions, and ignore trailing pre-release junk
  // (e.g. `arch-1.2.3-rc.0.9.9` -> null rather than the wrong 0.9.9).
  const match = /(?:^|[-/_])v?((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/.exec(String(tag));
  return match?.[1] ?? null;
}

export function compareVersions(a, b) {
  const left = typeof a === "string" ? parseSemver(a) : a;
  const right = typeof b === "string" ? parseSemver(b) : b;

  if (!left || !right) {
    throw new Error(`Cannot compare invalid versions: ${a}, ${b}`);
  }

  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

export function describeProgression(fromVersion, targetVersion) {
  const from = parseSemver(fromVersion);
  const target = parseSemver(targetVersion);
  if (!from || !target) return "custom version progression";

  if (from.major === target.major && from.minor === target.minor && target.patch === from.patch + 1) {
    return "patch release";
  }

  if (from.major === target.major && target.minor === from.minor + 1 && target.patch === 0) {
    return "minor release";
  }

  if (target.major === from.major + 1 && target.minor === 0 && target.patch === 0) {
    return "major release";
  }

  return "non-adjacent release";
}

function toGitPath(absPath, gitRoot) {
  if (!isWithinDirectory(path.resolve(gitRoot), path.resolve(absPath))) {
    fail(`Theme path must be inside the git repository: ${absPath}`);
  }
  const rel = path.relative(gitRoot, absPath);
  return rel.split(path.sep).join("/");
}

function resolveInside(parent, child) {
  const resolvedParent = path.resolve(parent);
  const resolvedChild = path.resolve(parent, child);
  if (!isWithinDirectory(resolvedParent, resolvedChild, { allowEqual: true })) {
    fail(`Refusing to write outside ${resolvedParent}: ${resolvedChild}`);
  }
  return resolvedChild;
}

export function isExcludedRelPath(relPath) {
  const parts = relPath.split("/");
  return EXCLUDED_TOP_LEVEL.has(parts[0]) || EXCLUDED_FILES.has(relPath);
}

export function isDeletionEligible(relPath) {
  const parts = relPath.split("/");
  return DELETION_FILES.has(relPath) || DELETION_DIRS.has(parts[0]);
}

export function parseDiffNameStatus(output, themeGitPath) {
  const prefix = `${themeGitPath.replace(/\/$/, "")}/`;
  const changes = [];

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const [statusRaw, gitPath] = line.split("\t");
    const status = statusRaw?.[0];

    if (!status || !gitPath) {
      throw new Error(`Unparseable git diff line: ${line}`);
    }

    // A git-quoted path (octal-escaped non-ASCII / control chars — these survive
    // even with core.quotePath=false) can't be matched against the theme prefix
    // and would be silently dropped from the delta. Fail loudly rather than ship
    // an incomplete update.
    if (gitPath.startsWith('"')) {
      throw new Error(`Refusing to skip a git-quoted diff path (incomplete delta): ${line}`);
    }

    if (!gitPath.startsWith(prefix)) {
      // Outside the requested theme. A scoped `git diff -- <theme>` shouldn't
      // emit these, but stay defensive and skip rather than fail.
      warn(`Skipping out-of-theme diff line: ${line}`);
      continue;
    }

    const relPath = gitPath.slice(prefix.length);
    if (isExcludedRelPath(relPath)) continue;

    changes.push({ status, relPath, required: false });
  }

  if (!changes.some((change) => change.relPath === "theme.json")) {
    changes.push({ status: "M", relPath: "theme.json", required: true });
  }

  return changes;
}

export function buildPlan(changes, themeDir) {
  const copies = [];
  const deletions = [];
  const skippedDeletions = [];
  const skippedStatuses = [];

  for (const change of changes) {
    if (COPY_STATUSES.has(change.status)) {
      const sourcePath = path.join(themeDir, ...change.relPath.split("/"));
      if (!existsSync(sourcePath)) {
        skippedStatuses.push({ ...change, reason: "source file is missing" });
        continue;
      }
      copies.push(change);
      continue;
    }

    if (change.status === "D") {
      if (isDeletionEligible(change.relPath)) {
        deletions.push(change);
      } else {
        skippedDeletions.push(change);
      }
      continue;
    }

    skippedStatuses.push({ ...change, reason: `unsupported git status ${change.status}` });
  }

  return { copies, deletions, skippedDeletions, skippedStatuses };
}

function printPlan({ copies, deletions, skippedDeletions, skippedStatuses }, outputDir, dryRun) {
  log(`${dryRun ? "Dry run" : "Plan"} output: ${path.relative(ROOT, outputDir) || outputDir}`);

  if (copies.length) {
    log(`Files to copy (${copies.length}):`);
    for (const change of copies) {
      const suffix = change.required ? " (required)" : "";
      console.log(`  ${change.status} ${change.relPath}${suffix}`);
    }
  } else {
    log("Files to copy: none");
  }

  if (deletions.length) {
    log(`Deletion markers to create (${deletions.length}):`);
    for (const change of deletions) {
      console.log(`  D deleted/${change.relPath}`);
    }
  }

  if (skippedDeletions.length) {
    log(`Skipped deletion markers (${skippedDeletions.length}):`);
    for (const change of skippedDeletions) {
      console.log(`  D ${change.relPath} (not deletion-eligible for project updates)`);
    }
  }

  if (skippedStatuses.length) {
    log(`Skipped changes (${skippedStatuses.length}):`);
    for (const change of skippedStatuses) {
      console.log(`  ${change.status} ${change.relPath} (${change.reason})`);
    }
  }

  log("Note: the plan is built from git-tracked changes (tag vs working tree).");
  log("      Brand-new files that are not yet 'git add'-ed will NOT appear above.");
}

async function writePlan(plan, themeDir, outputDir, force) {
  if (existsSync(outputDir)) {
    if (!force) {
      fail(`Output already exists: ${outputDir}\nUse --force to replace it.`);
    }

    const updatesDir = path.join(themeDir, "updates");
    if (!isWithinDirectory(path.resolve(updatesDir), path.resolve(outputDir))) {
      fail(`Refusing to remove path outside theme updates directory: ${outputDir}`);
    }
    await rm(outputDir, { recursive: true, force: true });
  }

  for (const change of plan.copies) {
    const sourcePath = path.join(themeDir, ...change.relPath.split("/"));
    const targetPath = resolveInside(outputDir, change.relPath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
  }

  for (const change of plan.deletions) {
    const markerPath = resolveInside(outputDir, path.posix.join("deleted", change.relPath));
    await mkdir(path.dirname(markerPath), { recursive: true });
    await writeFile(markerPath, "deleted by theme-update-delta\n", "utf8");
  }
}

function findPreviousTag(targetVersion) {
  const tags = git(["tag", "--list"])
    .split(/\r?\n/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => ({ tag, version: parseVersionFromTag(tag) }))
    .filter(({ version }) => version && parseSemver(version) && compareVersions(version, targetVersion) < 0)
    .sort((a, b) => compareVersions(a.version, b.version) || a.tag.localeCompare(b.tag));

  return tags.at(-1) ?? null;
}

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(usage());
    return;
  }

  const dryRun = Boolean(flags["dry-run"]);
  const force = Boolean(flags.force);
  const packageJson = await readJson(path.join(ROOT, "package.json"));
  const targetVersion = flags.version ?? packageJson.version;

  if (!parseSemver(targetVersion)) {
    fail(`Target version must be valid x.y.z semver: ${targetVersion}`);
  }

  const themeArg = positional[0] ?? path.join("themes", "arch");
  const themeDir = path.resolve(process.cwd(), themeArg);
  const themeJsonPath = path.join(themeDir, "theme.json");

  if (!existsSync(themeJsonPath)) {
    fail(`Theme path must contain theme.json: ${themeDir}`);
  }

  const gitRoot = git(["rev-parse", "--show-toplevel"]).trim();
  const themeGitPath = toGitPath(themeDir, gitRoot);
  const themeId = path.basename(themeDir);

  const from = flags.from ? { tag: flags.from, version: parseVersionFromTag(flags.from) } : findPreviousTag(targetVersion);
  if (!from?.tag) {
    fail(`Could not find a previous semver tag below ${targetVersion}. Pass --from <tag>.`);
  }

  try {
    git(["rev-parse", "--verify", `${from.tag}^{commit}`]);
  } catch {
    fail(`Git tag or commit not found: ${from.tag}`);
  }

  const currentTheme = await readJson(themeJsonPath);
  const sourceVersion = currentTheme.version;
  const versionMismatch =
    sourceVersion !== targetVersion
      ? `Theme source version is ${sourceVersion || "missing"}, but target update version is ${targetVersion}.`
      : null;

  if (versionMismatch && !dryRun) {
    fail(`${versionMismatch}\nBump ${path.relative(ROOT, themeJsonPath)} before generating the update folder.`);
  }

  if (versionMismatch && dryRun) {
    warn(`${versionMismatch} A real write will fail until theme.json is bumped.`);
  }

  let baselineVersion = from.version;
  try {
    const baselineThemeJson = git(["show", `${from.tag}:${themeGitPath}/theme.json`]);
    const baselineTheme = JSON.parse(baselineThemeJson);
    baselineVersion = baselineTheme.version || baselineVersion;
    if (from.version && baselineTheme.version && from.version !== baselineTheme.version) {
      warn(`Tag ${from.tag} looks like ${from.version}, but ${themeGitPath}/theme.json says ${baselineTheme.version}.`);
    }
  } catch (error) {
    fail(`Could not read ${themeGitPath}/theme.json from ${from.tag}: ${error.message}`);
  }

  if (!parseSemver(baselineVersion)) {
    fail(`Baseline theme version is not valid semver: ${baselineVersion}`);
  }

  if (compareVersions(baselineVersion, targetVersion) >= 0) {
    fail(`Target version must be newer than baseline: ${baselineVersion} -> ${targetVersion}`);
  }

  const progression = describeProgression(baselineVersion, targetVersion);
  if (progression === "non-adjacent release") {
    warn(`Version jump is non-adjacent: ${baselineVersion} -> ${targetVersion}. Continuing because it is still newer.`);
  }

  const outputDir = path.join(themeDir, "updates", targetVersion);

  log(`Detected app version ${packageJson.version} from package.json.`);
  log(`Using theme: ${themeId} (${path.relative(ROOT, themeDir)})`);
  log(`Using baseline tag: ${from.tag} (${baselineVersion})`);
  log(`Version progression: ${baselineVersion} -> ${targetVersion} (${progression}).`);
  log(`We will continue with ${themeId} update ${targetVersion}.`);

  const diffOutput = git([
    "-c",
    "core.quotePath=false",
    "diff",
    "--name-status",
    "--no-renames",
    from.tag,
    "--",
    themeGitPath,
  ]);
  const changes = parseDiffNameStatus(diffOutput, themeGitPath);
  const plan = buildPlan(changes, themeDir);

  printPlan(plan, outputDir, dryRun);

  if (dryRun) {
    log("Dry run complete. No files were written.");
    return;
  }

  await writePlan(plan, themeDir, outputDir, force);
  log(`Wrote ${path.relative(ROOT, outputDir)}.`);
}

// Only run the CLI when invoked directly (node scripts/theme-update-delta.js).
// Importing the module — e.g. from the test suite — must not shell out to git.
const isDirectRun = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  main().catch((error) => {
    fail(error.message);
  });
}

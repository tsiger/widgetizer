/**
 * Compact test reporter for node:test.
 *
 * Groups suites by logical category (Projects, Pages, Themes, etc.),
 * with file sub-headers within each group.
 *
 * Compact mode (default): one line per top-level suite (pass/fail + test count)
 * Verbose mode (VERBOSE=1): shows every individual test with full hierarchy
 *
 * Usage:
 *   node --test --test-reporter ./server/tests/reporter.js server/tests/*.test.js
 *   VERBOSE=1 node --test --test-reporter ./server/tests/reporter.js server/tests/*.test.js
 */

import path from "node:path";

// ── ANSI colors ──────────────────────────────────────────────────────────────

const reset = "\x1b[0m";
const green = "\x1b[32m";
const red = "\x1b[31m";
const cyan = "\x1b[36m";
const dim = "\x1b[2m";
const bold = "\x1b[1m";
const yellow = "\x1b[33m";

// ── Configuration ────────────────────────────────────────────────────────────

const VERBOSE = !!process.env.VERBOSE;

/** Map test filenames to logical groups */
const FILE_GROUPS = {
  "projects.test.js": "Projects",
  "pages.test.js": "Pages",
  "menus.test.js": "Menus",
  "media.test.js": "Media",
  "mediaUsage.test.js": "Media",
  "themes.test.js": "Themes",
  "themeUpdates.test.js": "Themes",
  "themeUpdateService.test.js": "Themes",
  "themeHelpers.test.js": "Themes",
  "themeWidgets.test.js": "Themes",
  "rendering.test.js": "Rendering",
  "sanitization.test.js": "Rendering",
  "tags.test.js": "Rendering",
  "preview.test.js": "Page Editor",
  "maxBlocks.test.js": "Page Editor",
  "export.test.js": "Export",
  "publish.test.js": "Publish",
  "appSettings.test.js": "Settings",
  "coreWidgets.test.js": "Widgets",
  "htmlProcessor.test.js": "Utilities",
  "semver.test.js": "Utilities",
  "hostedUrls.test.js": "Utilities",
};

/** Human-readable labels for test files (used to prefix [userId=...] suites) */
const FILE_LABELS = {
  "projects.test.js": "Projects",
  "pages.test.js": "Pages",
  "menus.test.js": "Menus",
  "media.test.js": "Media",
  "mediaUsage.test.js": "Media Usage",
  "themes.test.js": "Themes",
  "themeUpdates.test.js": "Theme Updates",
  "themeUpdateService.test.js": "Theme Update Service",
  "themeHelpers.test.js": "Theme Helpers",
  "themeWidgets.test.js": "Theme Widgets",
  "rendering.test.js": "Rendering",
  "sanitization.test.js": "Sanitization",
  "tags.test.js": "Tags",
  "preview.test.js": "Preview",
  "maxBlocks.test.js": "Max Blocks",
  "export.test.js": "Export",
  "publish.test.js": "Publish",
  "appSettings.test.js": "App Settings",
  "coreWidgets.test.js": "Core Widgets",
  "htmlProcessor.test.js": "HTML Processor",
  "semver.test.js": "Semver",
  "hostedUrls.test.js": "Hosted URLs",
  "multiUser.test.js": "Multi-User",
  "pathSecurity.test.js": "Path Security",
};

/** Display order for groups */
const GROUP_ORDER = [
  "Projects",
  "Pages",
  "Menus",
  "Media",
  "Themes",
  "Widgets",
  "Rendering",
  "Page Editor",
  "Export",
  "Settings",
  "Utilities",
  "Other",
];

function getGroup(filePath) {
  if (!filePath) return "Other";
  const filename = path.basename(filePath);
  return FILE_GROUPS[filename] || "Other";
}

function getFileLabel(filePath) {
  if (!filePath) return "";
  const filename = path.basename(filePath);
  return FILE_LABELS[filename] || filename.replace(".test.js", "");
}

function getFilename(filePath) {
  if (!filePath) return "unknown";
  return path.basename(filePath);
}

/**
 * Add a label prefix to [userId=...] suite names for context.
 * "[userId=local]" → "Projects [userId=local]"
 */
function labelSuiteName(suiteName, filePath) {
  if (suiteName.startsWith("[userId=")) {
    const label = getFileLabel(filePath);
    return label ? `${label} ${suiteName}` : suiteName;
  }
  return suiteName;
}

// ── State ────────────────────────────────────────────────────────────────────

let totalPass = 0;
let totalFail = 0;
let totalSuites = 0;
let failures = [];
let startTime = Date.now();

// Track per-suite child test counts: Map<suiteTestId, { name, pass, fail, file }>
const suiteCounts = new Map();

// Buffer completed lines by group → filename: Map<group, Map<filename, string[]>>
const groupResults = new Map();

// Current top-level suite tracking
let currentTopSuiteId = null;
let currentTopSuiteFile = null;

// ── Verbose mode state ───────────────────────────────────────────────────────

// Track nesting stack for verbose output: [{testId, name, nesting, isSuite}]
const nestingStack = [];

// Buffer verbose lines per file: Map<filename, string[]>
const verboseFileLines = new Map();

// Track which suites have had their header emitted (verbose)
const emittedSuiteHeaders = new Set();

function pushVerboseLine(filePath, line) {
  const filename = getFilename(filePath);
  if (!verboseFileLines.has(filename)) verboseFileLines.set(filename, []);
  verboseFileLines.get(filename).push(line);
}

function getVerboseIndent(nesting) {
  // nesting 0 = top-level suite (2 levels of base indent already from group+file)
  // Each nesting level adds 2 spaces
  return "      " + "  ".repeat(nesting);
}

// ── Reporter ─────────────────────────────────────────────────────────────────

export default async function* reporter(source) {
  for await (const event of source) {
    const { type, data } = event;

    if (type === "test:start") {
      if (data.nesting === 0) {
        // New top-level suite starting
        currentTopSuiteId = data.testId;
        currentTopSuiteFile = data.file;
        suiteCounts.set(data.testId, { pass: 0, fail: 0, file: data.file });
      }

      if (VERBOSE) {
        // Push to nesting stack
        nestingStack.push({
          testId: data.testId,
          name: data.name,
          nesting: data.nesting,
          file: data.file || currentTopSuiteFile,
        });
      }
    } else if (type === "test:pass") {
      if (data.nesting === 0 && data.details?.type === "suite") {
        // Top-level suite completed successfully
        totalSuites++;
        const info = suiteCounts.get(data.testId) || { pass: 0, fail: 0, file: null };
        suiteCounts.delete(data.testId);
        const total = info.pass + info.fail;
        const displayName = labelSuiteName(data.name, info.file || data.file);
        const line = `      ${green}✔${reset} ${displayName} ${dim}(${total} tests)${reset}\n`;

        const group = getGroup(info.file || data.file);
        const filename = getFilename(info.file || data.file);
        addGroupLine(group, filename, line);
      } else if (data.details?.type === "suite") {
        // Nested suite completed (verbose: pop stack)
        if (VERBOSE) popNestingStack(data.testId);
      } else {
        // Individual test passed
        totalPass++;
        if (currentTopSuiteId !== null) {
          const c = suiteCounts.get(currentTopSuiteId);
          if (c) c.pass++;
        }

        if (VERBOSE) {
          emitVerboseSuiteHeaders(data.file || currentTopSuiteFile, data.nesting);
          const indent = getVerboseIndent(data.nesting);
          pushVerboseLine(
            data.file || currentTopSuiteFile,
            `${indent}${green}✔${reset} ${dim}${data.name}${reset}\n`,
          );
          popNestingStack(data.testId);
        }
      }
    } else if (type === "test:fail") {
      if (data.nesting === 0 && data.details?.type === "suite") {
        // Top-level suite with at least one failure
        totalSuites++;
        const info = suiteCounts.get(data.testId) || { pass: 0, fail: 0, file: null };
        suiteCounts.delete(data.testId);
        const total = info.pass + info.fail;
        const displayName = labelSuiteName(data.name, info.file || data.file);
        const line = `      ${red}✖ ${displayName} (${total} tests, ${info.fail} failed)${reset}\n`;

        const group = getGroup(info.file || data.file);
        const filename = getFilename(info.file || data.file);
        addGroupLine(group, filename, line);
      } else if (data.details?.type === "suite") {
        // Nested suite failed (verbose: pop stack)
        if (VERBOSE) popNestingStack(data.testId);
      } else {
        // Individual test failed
        totalFail++;
        failures.push({
          name: data.name,
          error: data.details?.error?.message || "Unknown error",
          file: data.file,
        });
        if (currentTopSuiteId !== null) {
          const c = suiteCounts.get(currentTopSuiteId);
          if (c) c.fail++;
        }

        if (VERBOSE) {
          emitVerboseSuiteHeaders(data.file || currentTopSuiteFile, data.nesting);
          const indent = getVerboseIndent(data.nesting);
          pushVerboseLine(
            data.file || currentTopSuiteFile,
            `${indent}${red}✖ ${data.name}${reset}\n`,
          );
          const errorMsg = data.details?.error?.message;
          if (errorMsg) {
            pushVerboseLine(
              data.file || currentTopSuiteFile,
              `${indent}  ${dim}${errorMsg.split("\n")[0]}${reset}\n`,
            );
          }
          popNestingStack(data.testId);
        }
      }
    }
  }

  // ── Render output ────────────────────────────────────────────────────────

  yield "\n";

  if (VERBOSE) {
    yield* renderVerbose();
  } else {
    yield* renderCompact();
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total = totalPass + totalFail;

  if (totalFail === 0) {
    yield `${bold}${green}  ✔ ${total} tests passed${reset} ${dim}across ${totalSuites} suites in ${countGroups()} groups (${elapsed}s)${reset}\n`;
  } else {
    yield `${bold}${red}  ✖ ${totalFail} failed${reset}, ${green}${totalPass} passed${reset} ${dim}of ${total} tests across ${totalSuites} suites in ${countGroups()} groups (${elapsed}s)${reset}\n`;

    yield `\n${bold}${red}Failures:${reset}\n`;
    for (const f of failures) {
      yield `  ${red}✖ ${f.name}${reset}\n`;
      yield `    ${dim}${f.error}${reset}\n`;
    }
  }

  yield "\n";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function addGroupLine(group, filename, line) {
  if (!groupResults.has(group)) groupResults.set(group, new Map());
  const fileMap = groupResults.get(group);
  if (!fileMap.has(filename)) fileMap.set(filename, []);
  fileMap.get(filename).push(line);
}

function countGroups() {
  let count = 0;
  for (const group of GROUP_ORDER) {
    if (groupResults.has(group) && groupResults.get(group).size > 0) count++;
  }
  return count;
}

function* renderCompact() {
  for (const group of GROUP_ORDER) {
    const fileMap = groupResults.get(group);
    if (!fileMap || fileMap.size === 0) continue;

    yield `  ${bold}${cyan}${group}${reset}\n`;

    for (const [filename, lines] of fileMap) {
      yield `    ${dim}${filename}${reset}\n`;
      for (const line of lines) {
        yield line;
      }
    }

    yield "\n";
  }
}

function* renderVerbose() {
  // Organize verbose lines into group → filename structure
  for (const group of GROUP_ORDER) {
    const fileMap = groupResults.get(group);
    if (!fileMap || fileMap.size === 0) continue;

    yield `  ${bold}${cyan}${group}${reset}\n`;

    for (const filename of fileMap.keys()) {
      yield `    ${dim}${filename}${reset}\n`;
      const vLines = verboseFileLines.get(filename);
      if (vLines) {
        for (const line of vLines) {
          yield line;
        }
      }
    }

    yield "\n";
  }
}

function popNestingStack(testId) {
  // Pop entries from the stack up to and including the matching testId
  while (nestingStack.length > 0) {
    const top = nestingStack[nestingStack.length - 1];
    nestingStack.pop();
    if (top.testId === testId) break;
  }
}

/**
 * In verbose mode, emit suite header lines for any parent suites
 * that haven't been printed yet (so test results appear under their section).
 */
function emitVerboseSuiteHeaders(filePath, _testNesting) {
  for (const entry of nestingStack) {
    const key = `${entry.file}:${entry.testId}`;
    if (emittedSuiteHeaders.has(key)) continue;
    emittedSuiteHeaders.add(key);

    const indent = getVerboseIndent(entry.nesting);
    const displayName = entry.nesting === 0
      ? labelSuiteName(entry.name, entry.file)
      : entry.name;
    pushVerboseLine(
      entry.file || filePath,
      `${indent}${yellow}${displayName}${reset}\n`,
    );
  }
}

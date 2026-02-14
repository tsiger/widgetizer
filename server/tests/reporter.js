/**
 * Compact test reporter for node:test.
 *
 * Groups suites by logical category (Projects, Pages, Themes, etc.),
 * shows one line per top-level suite (pass/fail + test count),
 * a summary at the end, and full details only for failures.
 *
 * Usage: node --test --test-reporter ./server/tests/reporter.js server/tests/*.test.js
 */

import path from "node:path";

// ── ANSI colors ──────────────────────────────────────────────────────────────

const reset = "\x1b[0m";
const green = "\x1b[32m";
const red = "\x1b[31m";
const cyan = "\x1b[36m";
const dim = "\x1b[2m";
const bold = "\x1b[1m";

// ── Group configuration ──────────────────────────────────────────────────────

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
  "rendering.test.js": "Rendering",
  "sanitization.test.js": "Rendering",
  "tags.test.js": "Rendering",
  "preview.test.js": "Page Editor",
  "maxBlocks.test.js": "Page Editor",
  "export.test.js": "Export",
  "appSettings.test.js": "Settings",
  "coreWidgets.test.js": "Widgets",
  "htmlProcessor.test.js": "Utilities",
  "semver.test.js": "Utilities",
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

// ── State ────────────────────────────────────────────────────────────────────

let totalPass = 0;
let totalFail = 0;
let totalSuites = 0;
let failures = [];
let startTime = Date.now();

// Track per-suite child test counts: Map<suiteTestId, { name, pass, fail, file }>
const suiteCounts = new Map();

// Buffer completed suite lines by group: Map<group, string[]>
const groupResults = new Map();

let currentTopSuiteId = null;

// ── Reporter ─────────────────────────────────────────────────────────────────

export default async function* reporter(source) {
  for await (const event of source) {
    if (event.type === "test:pass") {
      if (event.data.nesting === 0 && event.data.details?.type === "suite") {
        // Top-level suite completed successfully
        totalSuites++;
        const info = suiteCounts.get(event.data.testId) || { pass: 0, fail: 0, file: null };
        suiteCounts.delete(event.data.testId);
        const total = info.pass + info.fail;
        const line = `    ${green}✔${reset} ${event.data.name} ${dim}(${total} tests)${reset}\n`;

        const group = getGroup(info.file || event.data.file);
        if (!groupResults.has(group)) groupResults.set(group, []);
        groupResults.get(group).push(line);
      } else if (event.data.nesting > 0 && event.data.details?.type !== "suite") {
        // Individual test passed — count it under its top-level suite
        totalPass++;
        if (currentTopSuiteId !== null) {
          const c = suiteCounts.get(currentTopSuiteId);
          if (c) c.pass++;
        }
      }
    } else if (event.type === "test:fail") {
      if (event.data.nesting === 0 && event.data.details?.type === "suite") {
        // Top-level suite with at least one failure
        totalSuites++;
        const info = suiteCounts.get(event.data.testId) || { pass: 0, fail: 0, file: null };
        suiteCounts.delete(event.data.testId);
        const total = info.pass + info.fail;
        const line = `    ${red}✖ ${event.data.name} (${total} tests, ${info.fail} failed)${reset}\n`;

        const group = getGroup(info.file || event.data.file);
        if (!groupResults.has(group)) groupResults.set(group, []);
        groupResults.get(group).push(line);
      } else if (event.data.details?.type !== "suite") {
        // Individual test failed
        totalFail++;
        failures.push({
          name: event.data.name,
          error: event.data.details?.error?.message || "Unknown error",
          file: event.data.file,
        });
        if (currentTopSuiteId !== null) {
          const c = suiteCounts.get(currentTopSuiteId);
          if (c) c.fail++;
        }
      }
    } else if (event.type === "test:start") {
      if (event.data.nesting === 0) {
        // New top-level suite starting
        currentTopSuiteId = event.data.testId;
        suiteCounts.set(event.data.testId, { pass: 0, fail: 0, file: event.data.file });
      }
    }
  }

  // ── Render grouped output ────────────────────────────────────────────────

  yield "\n";

  let groupCount = 0;
  for (const group of GROUP_ORDER) {
    const lines = groupResults.get(group);
    if (!lines || lines.length === 0) continue;

    groupCount++;
    yield `  ${bold}${cyan}${group}${reset}\n`;
    for (const line of lines) {
      yield line;
    }
    yield "\n";
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total = totalPass + totalFail;

  if (totalFail === 0) {
    yield `${bold}${green}  ✔ ${total} tests passed${reset} ${dim}across ${totalSuites} suites in ${groupCount} groups (${elapsed}s)${reset}\n`;
  } else {
    yield `${bold}${red}  ✖ ${totalFail} failed${reset}, ${green}${totalPass} passed${reset} ${dim}of ${total} tests across ${totalSuites} suites in ${groupCount} groups (${elapsed}s)${reset}\n`;

    yield `\n${bold}${red}Failures:${reset}\n`;
    for (const f of failures) {
      yield `  ${red}✖ ${f.name}${reset}\n`;
      yield `    ${dim}${f.error}${reset}\n`;
    }
  }

  yield "\n";
}

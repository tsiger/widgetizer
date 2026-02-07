/**
 * Compact test reporter for node:test.
 *
 * Shows one line per top-level suite (pass/fail + test count),
 * a summary at the end, and full details only for failures.
 *
 * Usage: node --test --test-reporter ./server/tests/reporter.js server/tests/*.test.js
 */

const reset = "\x1b[0m";
const green = "\x1b[32m";
const red = "\x1b[31m";
const dim = "\x1b[2m";
const bold = "\x1b[1m";

let totalPass = 0;
let totalFail = 0;
let totalSuites = 0;
let failures = [];
let startTime = Date.now();

// Track per-suite child test counts: Map<suiteTestId, { name, pass, fail }>
const suiteCounts = new Map();

export default async function* reporter(source) {
  for await (const event of source) {
    if (event.type === "test:pass") {
      if (event.data.nesting === 0 && event.data.details?.type === "suite") {
        // Top-level suite completed successfully
        totalSuites++;
        const counts = suiteCounts.get(event.data.testId) || { pass: 0, fail: 0 };
        suiteCounts.delete(event.data.testId);
        const total = counts.pass + counts.fail;
        yield `  ${green}✔${reset} ${event.data.name} ${dim}(${total} tests)${reset}\n`;
      } else if (event.data.nesting > 0 && event.data.details?.type !== "suite") {
        // Individual test passed — count it under its top-level suite
        totalPass++;
        // Walk up: nesting=1 tests belong to a nesting=0 suite
        // The parentId chain isn't exposed, so we track the most recent top-level suite
        if (currentTopSuiteId !== null) {
          const c = suiteCounts.get(currentTopSuiteId);
          if (c) c.pass++;
        }
      } else if (event.data.nesting === 1 && event.data.details?.type === "suite") {
        // Nested sub-suite passed — nothing to print
      }
    } else if (event.type === "test:fail") {
      if (event.data.nesting === 0 && event.data.details?.type === "suite") {
        // Top-level suite with at least one failure
        totalSuites++;
        const counts = suiteCounts.get(event.data.testId) || { pass: 0, fail: 0 };
        suiteCounts.delete(event.data.testId);
        const total = counts.pass + counts.fail;
        yield `  ${red}✖ ${event.data.name} (${total} tests, ${counts.fail} failed)${reset}\n`;
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
        suiteCounts.set(event.data.testId, { pass: 0, fail: 0 });
      }
    }
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total = totalPass + totalFail;

  yield "\n";

  if (totalFail === 0) {
    yield `${bold}${green}  ✔ ${total} tests passed${reset} ${dim}across ${totalSuites} suites (${elapsed}s)${reset}\n`;
  } else {
    yield `${bold}${red}  ✖ ${totalFail} failed${reset}, ${green}${totalPass} passed${reset} ${dim}of ${total} tests across ${totalSuites} suites (${elapsed}s)${reset}\n`;

    yield `\n${bold}${red}Failures:${reset}\n`;
    for (const f of failures) {
      yield `  ${red}✖ ${f.name}${reset}\n`;
      yield `    ${dim}${f.error}${reset}\n`;
    }
  }

  yield "\n";
}

let currentTopSuiteId = null;

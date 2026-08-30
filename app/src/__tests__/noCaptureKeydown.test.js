import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ConfirmationModal swallows every key at the DOCUMENT-capture rung while it is
// open, so nothing behind an open confirm can act. The one rung it cannot
// silence is window/document CAPTURE listeners registered elsewhere — they fire
// before (or beside) the modal's handler and would punch through the dialog.
// None exist today; this trips if one appears, so its author finds this
// explanation instead of shipping a shortcut that fires behind modals.
const ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

// Finds addEventListener("keydown", …) calls whose argument list — parens
// balanced, capped at 400 chars — ends with `, true` or contains `capture: true`.
// Accepted blind spots: aliased addEventListener, computed event names, and
// listeners registered by dependencies.
function hasCaptureKeydown(src) {
  const re = /addEventListener\(\s*["']keydown["']/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const start = src.indexOf("(", m.index) + 1;
    let depth = 1;
    let i = start;
    while (i < src.length && depth > 0 && i - start < 400) {
      if (src[i] === "(") depth += 1;
      else if (src[i] === ")") depth -= 1;
      i += 1;
    }
    const call = src.slice(start, i);
    if (/,\s*true\s*\)$/.test(call) || /capture\s*:\s*true/.test(call)) return true;
  }
  return false;
}

function sourceFilesUnder(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "__tests__") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFilesUnder(full));
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("no capture-phase keydown listeners outside ConfirmationModal", () => {
  it("app/src, packages/*/src and electron/ register none", () => {
    const dirs = ["app/src", "electron", ...readdirSync(path.join(ROOT, "packages")).map((p) => `packages/${p}/src`)];
    const offenders = [];
    for (const dir of dirs) {
      let files;
      try {
        files = sourceFilesUnder(path.join(ROOT, dir));
      } catch {
        continue; // package without src/
      }
      for (const f of files) {
        if (/ConfirmationModal\.jsx$/.test(f)) continue; // the one sanctioned user
        if (hasCaptureKeydown(readFileSync(f, "utf8"))) offenders.push(path.relative(ROOT, f));
      }
    }
    expect(offenders).toEqual([]);
  });
});

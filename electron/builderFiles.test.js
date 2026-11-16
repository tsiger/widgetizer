import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import config from "./builder.config.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

// Every module the packaged server loads from app/ (server-common.js and what
// it imports by relative path), as repo-relative paths.
function appServerModules(entry = "app/server-common.js", seen = new Set()) {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const source = fs.readFileSync(path.join(ROOT, entry), "utf8");
  // Static imports, `export … from` and dynamic `import("…")`, relative paths only.
  for (const [, spec] of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
    appServerModules(path.posix.join(path.posix.dirname(entry), spec), seen);
  }
  return seen;
}

describe("electron-builder files", () => {
  it("ship every module the server loads from app/", () => {
    const modules = [...appServerModules()];
    expect(modules).toContain("app/viewerStartup.js");
    for (const file of modules) expect(config.files, file).toContain(file);
  });
});

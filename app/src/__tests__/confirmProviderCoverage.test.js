import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The navigation guards call useConfirm(), which throws if no <ConfirmProvider>
// is above it. That is a render-time crash on the page, not a test failure, so
// it shipped once already: the OSS picker routes (Projects add/edit, App
// settings) use the guards but live outside EditorProvider, which was the only
// place mounting the provider.
//
// This checks the shells rather than the pages: every root that hosts guard
// consumers must mount the provider. It cannot see a brand-new third shell —
// it fails when a mount is removed while consumers still exist.
const ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

const GUARD_HOOKS = /use(GuardedFormPage|FormNavigationGuard|NavigationGuard)|useConfirm\b/;

function sourceFilesUnder(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "__tests__") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFilesUnder(full));
    else if (/\.jsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const consumersUnder = (dir) =>
  sourceFilesUnder(path.join(ROOT, dir))
    .filter((f) => {
      const src = readFileSync(f, "utf8");
      // The provider and the hook's own definition are not consumers.
      if (/ConfirmProvider\.jsx$/.test(f)) return false;
      return GUARD_HOOKS.test(src) && /import/.test(src);
    })
    .map((f) => path.relative(ROOT, f).replace(/\\/g, "/"));

describe("ConfirmProvider covers every shell that uses the navigation guards", () => {
  it("the OSS shell mounts it — its picker routes use the guards", () => {
    const consumers = consumersUnder("app/src");
    // Non-vacuity: if this ever empties, the assertion below proves nothing.
    expect(consumers.length).toBeGreaterThan(0);
    expect(readFileSync(path.join(ROOT, "app/src/App.jsx"), "utf8")).toMatch(/<ConfirmProvider>/);
  });

  it("the editor shell mounts it — hosted composes EditorProvider without the OSS shell", () => {
    const consumers = consumersUnder("packages/editor-ui/src");
    expect(consumers.length).toBeGreaterThan(0);
    expect(readFileSync(path.join(ROOT, "packages/editor-ui/src/EditorShell.jsx"), "utf8")).toMatch(
      /<ConfirmProvider>/,
    );
  });
});

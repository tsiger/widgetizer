import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The navigation guards call useConfirm(), which throws if no <ConfirmProvider>
// is above it. That is a render-time crash on the page, not a test failure, so
// it shipped once already: the OSS picker routes (Projects add/edit, App
// settings) use the guards but live outside EditorProvider, which at the time
// was the only place mounting the provider.
//
// The rule now: the confirm dialog is one surface per window, so the *shell*
// mounts it (like ToastContainer) and EditorProvider does not. The OSS mount
// itself is proven tree-level by confirmProviderMount.test.jsx (a probe route
// rendered through the real <App/>); this file pins the other half — that no
// second mount creeps back into EditorProvider. Embedding shells are covered
// by their own repos' tests.
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
  it("EditorProvider does not mount it — shells own the confirm surface, so nesting never comes back", () => {
    // Non-vacuity: editor-ui does contain guard consumers; they rely on the shell.
    expect(consumersUnder("packages/editor-ui/src").length).toBeGreaterThan(0);
    expect(readFileSync(path.join(ROOT, "packages/editor-ui/src/EditorShell.jsx"), "utf8")).not.toMatch(
      /<ConfirmProvider/,
    );
  });
});

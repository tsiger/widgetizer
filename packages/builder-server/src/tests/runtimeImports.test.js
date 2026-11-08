/**
 * What the server and the desktop app import at run time.
 *
 * Production installs leave out dev dependencies (the Docker image prunes
 * them; the desktop app packs only dependencies), and an embedding app installs
 * a workspace package with only the dependencies that package itself declares.
 * So every package that run-time code imports must be declared, for run time,
 * by the package.json of the code that imports it: not just by the repo root,
 * and never only as a dev dependency. Run-time code is everything reached from
 * the entry points, plus every non-test source file of the workspace packages
 * the server runs (their public exports and the browser modules the server
 * serves aren't all reached from an entry point). Lint flags the same mistakes
 * while editing; this reads the real import graph with a parser, dynamic
 * imports and require() included.
 *
 * Run with: node --test packages/builder-server/src/tests/runtimeImports.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { builtinModules, createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Linter } from "eslint";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

// The server (web), and the desktop app's main process, preload and server.
const ENTRY_POINTS = ["server.js", "electron/main.js", "electron/preload.js", "electron/server-bootstrap.js"];
// Scanned whole, tests aside.
const WORKSPACES = ["builder-server", "adapters-local", "core", "render-engine"];

// Supplied by the runtime itself, not installed: the desktop app runs inside Electron.
const PROVIDED = { electron: (rel) => rel.startsWith("electron/") };

const isTestPath = (rel) => /(\.test\.js$|\/tests\/|\/__tests__\/)/.test(rel);

// Collects the module names a file loads: import and export…from declarations,
// import() with a literal name, and require() calls. Strings, templates and
// comments that merely mention one don't count.
const linter = new Linter({ configType: "flat" });
let found = [];
const collector = {
  rules: {
    collect: {
      create() {
        const add = (node) => {
          if (node?.type === "Literal" && typeof node.value === "string") found.push(node.value);
        };
        return {
          ImportDeclaration: (node) => add(node.source),
          ExportNamedDeclaration: (node) => add(node.source),
          ExportAllDeclaration: (node) => add(node.source),
          ImportExpression: (node) => add(node.source),
          CallExpression(node) {
            if (node.callee.type === "Identifier" && node.callee.name === "require") add(node.arguments[0]);
          },
        };
      },
    },
  },
};

export function moduleNames(code, filename) {
  found = [];
  const messages = linter.verify(
    code,
    [
      {
        plugins: { scan: collector },
        rules: { "scan/collect": "error" },
        languageOptions: {
          ecmaVersion: "latest",
          sourceType: filename.endsWith(".cjs") ? "commonjs" : "module",
        },
      },
    ],
    filename,
  );
  const fatal = messages.find((m) => m.fatal);
  if (fatal) throw new Error(`${filename} doesn't parse: ${fatal.message}`);
  return found;
}

const isBuiltin = (spec) => spec.startsWith("node:") || builtinModules.includes(spec.split("/")[0]);
const packageName = (spec) => spec.split("/").slice(0, spec.startsWith("@") ? 2 : 1).join("/");
const relPath = (file) => path.relative(REPO_ROOT, file).split(path.sep).join("/");

// The package.json that owns a file: its workspace's, or the root's.
function ownerOf(file) {
  const match = relPath(file).match(/^packages\/([^/]+)\//);
  const dir = match ? path.join(REPO_ROOT, "packages", match[1]) : REPO_ROOT;
  return { dir, manifest: JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")) };
}

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true, recursive: true }).flatMap((entry) => {
    const file = path.join(entry.parentPath, entry.name);
    return entry.isFile() && /\.(c|m)?js$/.test(entry.name) && !isTestPath(relPath(file)) ? [file] : [];
  });
}

/** Walks the import graph; returns files reached, package imports found, and anything unresolved. */
function walk() {
  const seen = new Set();
  const imports = []; // { from, name, owner, manifest }
  const unresolved = [];
  const queue = [
    ...ENTRY_POINTS.map((rel) => path.join(REPO_ROOT, rel)),
    ...WORKSPACES.flatMap((ws) => sourceFiles(path.join(REPO_ROOT, "packages", ws, "src"))),
  ];
  while (queue.length) {
    const file = queue.pop();
    const rel = relPath(file);
    if (seen.has(rel)) continue;
    seen.add(rel);
    const { dir, manifest } = ownerOf(file);
    const resolve = createRequire(file).resolve;
    for (const spec of moduleNames(fs.readFileSync(file, "utf8"), rel)) {
      if (isBuiltin(spec)) continue;
      const relative = spec.startsWith(".");
      if (!relative) {
        imports.push({ from: rel, name: packageName(spec), owner: path.relative(REPO_ROOT, dir) || ".", manifest });
        // Only the workspace packages are followed; installed packages are theirs to keep right.
        if (!packageName(spec).startsWith("@widgetizer/")) continue;
      }
      let target;
      try {
        target = fs.realpathSync(relative ? path.resolve(path.dirname(file), spec) : resolve(spec));
      } catch {
        unresolved.push(`${rel}: ${spec}`);
        continue;
      }
      if (/\.(c|m)?js$/.test(target) && !target.includes(`${path.sep}node_modules${path.sep}`)) queue.push(target);
    }
  }
  return { seen, imports, unresolved };
}

const runtimeDeclared = (manifest) =>
  new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.optionalDependencies ?? {})]);

describe("run-time imports", () => {
  it("reads only real module loads", () => {
    const code = [
      'const s = "a // b"; import a from "one";',
      'const open = "/*"; import "two"; const close = "*/";',
      'const n = 1; import "three";',
      'export const lazy = () => import ("four");',
      'export const json = () => import("five", { with: { type: "json" } });',
      "export * from \"six\";",
      'export { b } from "seven";',
      // eslint-disable-next-line no-template-curly-in-string -- source code with a template literal in it
      "const text = \"require('fake-one')\"; const tpl = `import(\"fake-two\") ${n}`;",
      '/** @param {import("fake-three").T} x */ export function f(x) { return require("eight") ?? x ?? a; }',
    ].join("\n");
    assert.deepEqual(moduleNames(code, "probe.js").sort(), ["eight", "five", "four", "one", "seven", "six", "three", "two"]);
    assert.deepEqual(moduleNames('const { x } = require("nine"); module.exports = x;', "probe.cjs"), ["nine"]);
  });

  const { seen, imports, unresolved } = walk();
  const rootManifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));

  it("follows the entry points and reads every workspace source file", () => {
    assert.deepEqual(unresolved, [], "imports the scan couldn't resolve");
    for (const rel of [
      "app/server-common.js",
      "packages/builder-server/src/createApp.js",
      "packages/render-engine/src/renderEngine.js",
      "packages/adapters-local/src/index.js",
      "packages/core/src/utils/blockLimits.js",
      "packages/core/src/runtime/previewRuntime.js",
    ]) {
      assert.ok(seen.has(rel), `expected the scan to reach ${rel}`);
    }
    assert.ok(seen.size > 150, `only ${seen.size} files reached; is the import scan working?`);
    assert.ok(
      imports.some((i) => i.name === "express"),
      "expected the scan to find the express import",
    );
  });

  it("finds every imported package declared for run time by the importing code's own package.json", () => {
    const rootRuntime = runtimeDeclared(rootManifest);
    const problems = [];
    for (const { from, name, owner, manifest } of imports) {
      if (PROVIDED[name]?.(from)) continue;
      if (name === manifest.name) continue;
      // A peer comes from whoever installs the package; here that's the root.
      const peer = name in (manifest.peerDependencies ?? {}) && rootRuntime.has(name);
      if (runtimeDeclared(manifest).has(name) || peer) continue;
      const dev = name in (manifest.devDependencies ?? {}) || name in (rootManifest.devDependencies ?? {});
      problems.push(
        `${from} imports ${name}, which ${owner}/package.json doesn't list in dependencies${dev ? " (it's a dev dependency, which production doesn't install)" : ""}`,
      );
    }
    assert.deepEqual([...new Set(problems)], []);
  });
});

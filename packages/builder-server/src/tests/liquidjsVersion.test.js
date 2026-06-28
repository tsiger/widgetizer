/**
 * liquidjs version floor in the live render engine.
 *
 * liquidjs <10.26.0 carries a CRITICAL RCE/SSTI (GHSA-gf2q-c269-pqgc) plus a
 * HIGH strip_html ReDoS and renderFile/symlink file-read advisories. The render
 * engine (@widgetizer/render-engine) drives all Liquid rendering, so the version
 * it actually resolves at runtime is what matters.
 *
 * In hosted, @widgetizer/render-engine is a vendor symlink into this OSS tree,
 * so the consumer's own lockfile is shadowed. The
 * engine resolves liquidjs from the OSS tree under its realpath. This test
 * reproduces that exact resolution (realpath of the engine entry, then resolve
 * liquidjs relative to it) and asserts the secure floor, so it guards both the
 * OSS standalone install and any consumer that vendors this package by symlink.
 *
 * Run with: node --test packages/builder-server/src/tests/liquidjsVersion.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { realpathSync } from "node:fs";

const MIN = [10, 26, 0]; // secure floor for the liquidjs advisories

// Resolve liquidjs exactly as the render engine does: follow the engine's real
// path (defeats the vendor-symlink lockfile-shadowing trap), then resolve
// liquidjs from there.
function resolveEngineLiquidVersion() {
  const reqHere = createRequire(import.meta.url);
  const engineMain = realpathSync(reqHere.resolve("@widgetizer/render-engine"));
  const reqEngine = createRequire(engineMain);
  return reqEngine("liquidjs/package.json").version;
}

function gte(version, min) {
  const parts = version.split("-")[0].split(".").map(Number);
  for (let i = 0; i < min.length; i++) {
    const a = parts[i] ?? 0;
    if (a > min[i]) return true;
    if (a < min[i]) return false;
  }
  return true;
}

describe("liquidjs version floor", () => {
  it("render engine resolves liquidjs >= 10.26.0", () => {
    const version = resolveEngineLiquidVersion();
    assert.ok(
      gte(version, MIN),
      `render-engine resolves liquidjs ${version}, but the secure floor is ${MIN.join(".")} ` +
        `(<10.26.0 carries a CRITICAL RCE + HIGH ReDoS). ` +
        `Bump liquidjs in packages/render-engine, packages/core, and the root package.json, then npm install.`,
    );
  });

  it("gte() comparator handles boundaries", () => {
    assert.equal(gte("10.26.0", MIN), true);
    assert.equal(gte("10.27.0", MIN), true);
    assert.equal(gte("11.0.0", MIN), true);
    assert.equal(gte("10.25.2", MIN), false);
    assert.equal(gte("9.99.99", MIN), false);
  });
});

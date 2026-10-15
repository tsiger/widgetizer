/**
 * A theme's own scripts must not put English on the page.
 *
 * Scripts build controls in the visitor's browser, long after the language has
 * been decided, so they cannot read a Liquid filter. The words have to arrive
 * from the markup — a `data-t-*` attribute the script reads — and the easiest
 * way to lose that is for someone to write a literal straight back in, which
 * renders correctly in English and is invisible until a translated site is
 * looked at.
 *
 * Run with: node --test packages/builder-server/src/tests/themeScriptStrings.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const ARCH = fileURLToPath(new URL("../../../../themes/arch/", import.meta.url));

/** A label set to a bare literal, rather than to something the page supplied. */
const WRITES_A_LITERAL = [
  // setAttribute("aria-label", "Pause")
  /setAttribute\(\s*["']aria-label["']\s*,\s*["'][A-Z][^"']*["']\s*\)/g,
  // textContent = "Pause"
  /\.textContent\s*=\s*["'][A-Z][^"']*["']/g,
  // aria-label="Pause" inside a template string
  /aria-label=\\?["'][A-Z][^"'${]*\\?["']/g,
];

async function scriptsUnder(dir) {
  const found = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "updates") continue;
      found.push(...(await scriptsUnder(full)));
    } else if (entry.name.endsWith(".js")) {
      found.push(full);
    }
  }
  return found;
}

describe("Arch's scripts", () => {
  it("never write a label of their own", async () => {
    const offenders = [];
    for (const file of await scriptsUnder(ARCH)) {
      const source = await fs.readFile(file, "utf8");
      for (const pattern of WRITES_A_LITERAL) {
        for (const [match] of source.matchAll(pattern)) {
          // A fallback beside the value the page supplied is the one allowed
          // form: it only shows on a page rendered before the theme had these.
          const at = source.indexOf(match);
          const line = source.slice(source.lastIndexOf("\n", at) + 1, source.indexOf("\n", at));
          if (/dataset|label\(|labelOf\(/.test(line)) continue;
          offenders.push(`${path.relative(ARCH, file)}: ${match.trim()}`);
        }
      }
    }
    assert.deepEqual(offenders, [], `a script is putting its own words on the page:\n  ${offenders.join("\n  ")}`);
  });
});

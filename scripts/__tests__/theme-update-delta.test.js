import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// Pure helpers from the release-time delta tool. These carry the policy that
// decides what lands in a theme's updates/<version>/ folder, so they are the
// parts worth locking down — the git/fs shell-out around them is exercised
// manually (--dry-run). Importing the module must NOT run main() (isDirectRun
// guard), or this import would shell out to git and fail.
import {
  parseSemver,
  parseVersionFromTag,
  compareVersions,
  describeProgression,
  isExcludedRelPath,
  isDeletionEligible,
  parseDiffNameStatus,
  buildPlan,
} from "../theme-update-delta.js";

const cleanupPaths = [];

async function makeTempDir(prefix) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  cleanupPaths.push(dir);
  return dir;
}

afterEach(async () => {
  while (cleanupPaths.length > 0) {
    await fs.remove(cleanupPaths.pop());
  }
});

describe("parseSemver", () => {
  it("parses a valid semver into numeric components", () => {
    expect(parseSemver("0.9.9")).toEqual({ major: 0, minor: 9, patch: 9 });
  });

  it("returns null for non-semver input", () => {
    expect(parseSemver("v0.9.9")).toBeNull();
    expect(parseSemver("0.9")).toBeNull();
    expect(parseSemver("")).toBeNull();
    expect(parseSemver(undefined)).toBeNull();
  });
});

describe("parseVersionFromTag", () => {
  it("extracts a clean trailing semver, optionally v-prefixed or separator-delimited", () => {
    expect(parseVersionFromTag("v0.9.8")).toBe("0.9.8");
    expect(parseVersionFromTag("0.9.8")).toBe("0.9.8");
    expect(parseVersionFromTag("arch-theme-1.2.3")).toBe("1.2.3");
  });

  it("returns null when the tag has no semver token", () => {
    expect(parseVersionFromTag("latest")).toBeNull();
  });

  it("rejects date/compound tags with leading-zero components", () => {
    // Old last-token regex greedily parsed this to 2024.01.15.
    expect(parseVersionFromTag("release-2024.01.15")).toBeNull();
  });

  it("does not grab a trailing pre-release version segment", () => {
    // Old behaviour returned the last x.y.z token => wrong baseline 0.9.9.
    expect(parseVersionFromTag("arch-1.2.3-rc.0.9.9")).toBeNull();
  });
});

describe("compareVersions", () => {
  it("orders versions by major, then minor, then patch", () => {
    expect(compareVersions("0.9.8", "0.9.9")).toBeLessThan(0);
    expect(compareVersions("0.10.0", "0.9.9")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "0.9.9")).toBeGreaterThan(0);
    expect(compareVersions("0.9.9", "0.9.9")).toBe(0);
  });

  it("accepts already-parsed semver objects", () => {
    expect(compareVersions(parseSemver("0.9.8"), parseSemver("0.9.9"))).toBeLessThan(0);
  });

  it("throws on invalid input", () => {
    expect(() => compareVersions("0.9", "0.9.9")).toThrow(/invalid versions/i);
  });
});

describe("describeProgression", () => {
  it("classifies adjacent releases", () => {
    expect(describeProgression("0.9.8", "0.9.9")).toBe("patch release");
    expect(describeProgression("0.9.9", "0.10.0")).toBe("minor release");
    expect(describeProgression("0.9.9", "1.0.0")).toBe("major release");
  });

  it("flags non-adjacent jumps and downgrades", () => {
    expect(describeProgression("0.9.8", "0.9.10")).toBe("non-adjacent release");
    expect(describeProgression("0.9.9", "0.9.8")).toBe("non-adjacent release");
  });

  it("falls back to a custom label for unparseable versions", () => {
    expect(describeProgression("0.9", "x")).toBe("custom version progression");
  });
});

describe("isExcludedRelPath", () => {
  it("excludes the updates/ and latest/ staging trees and the package marker", () => {
    expect(isExcludedRelPath("updates/0.9.9/theme.json")).toBe(true);
    expect(isExcludedRelPath("latest/theme.json")).toBe(true);
    expect(isExcludedRelPath(".theme-package.json")).toBe(true);
  });

  it("does not exclude real theme content", () => {
    expect(isExcludedRelPath("widgets/hero/widget.liquid")).toBe(false);
    expect(isExcludedRelPath("theme.json")).toBe(false);
  });
});

describe("isDeletionEligible", () => {
  it("allows deletions inside the updatable content dirs + layout.liquid", () => {
    expect(isDeletionEligible("layout.liquid")).toBe(true);
    expect(isDeletionEligible("assets/old.css")).toBe(true);
    expect(isDeletionEligible("widgets/hero/widget.liquid")).toBe(true);
    expect(isDeletionEligible("collection-types/news/schema.json")).toBe(true);
  });

  it("rejects deletions outside the eligible set", () => {
    expect(isDeletionEligible("theme.json")).toBe(false);
    expect(isDeletionEligible("config/settings.json")).toBe(false);
  });
});

describe("parseDiffNameStatus", () => {
  const THEME = "themes/arch";

  it("keeps in-theme changes, strips the prefix, and skips out-of-theme + excluded paths", () => {
    const output = [
      "M\tthemes/arch/widgets/hero/widget.liquid",
      "A\tthemes/arch/assets/new.css",
      "D\tthemes/arch/snippets/old.liquid",
      "M\tthemes/other/thing.liquid", // outside the theme prefix
      "A\tthemes/arch/updates/0.9.8/x.json", // excluded staging tree
    ].join("\n");

    const changes = parseDiffNameStatus(output, THEME);
    const byPath = Object.fromEntries(changes.map((c) => [c.relPath, c.status]));

    expect(byPath["widgets/hero/widget.liquid"]).toBe("M");
    expect(byPath["assets/new.css"]).toBe("A");
    expect(byPath["snippets/old.liquid"]).toBe("D");
    expect(byPath["thing.liquid"]).toBeUndefined();
    expect(changes.some((c) => c.relPath.startsWith("updates/"))).toBe(false);
  });

  it("always includes theme.json as a required change when the diff omits it", () => {
    const changes = parseDiffNameStatus("M\tthemes/arch/assets/new.css", THEME);
    const themeJson = changes.find((c) => c.relPath === "theme.json");
    expect(themeJson).toBeTruthy();
    expect(themeJson.required).toBe(true);
  });

  it("does not duplicate theme.json when the diff already lists it", () => {
    const changes = parseDiffNameStatus("M\tthemes/arch/theme.json", THEME);
    expect(changes.filter((c) => c.relPath === "theme.json")).toHaveLength(1);
  });

  it("throws on a git-quoted path rather than silently dropping it", () => {
    // What git emits for a non-ASCII filename; would be skipped (and lost from
    // the delta) by the old prefix check.
    const output = 'M\t"themes/arch/n\\303\\241me.css"';
    expect(() => parseDiffNameStatus(output, THEME)).toThrow(/quoted/i);
  });

  it("throws on an unparseable diff line", () => {
    expect(() => parseDiffNameStatus("garbage-no-tab", THEME)).toThrow(/unparseable/i);
  });
});

describe("buildPlan", () => {
  /** Lay down the source files a copy plan expects to exist on disk. */
  async function seedThemeDir(relFiles) {
    const dir = await makeTempDir("theme-delta-");
    for (const rel of relFiles) {
      const abs = path.join(dir, ...rel.split("/"));
      await fs.ensureDir(path.dirname(abs));
      await fs.writeFile(abs, "x");
    }
    return dir;
  }

  it("routes changes into copies / deletions / skipped buckets", async () => {
    const themeDir = await seedThemeDir([
      "theme.json",
      "widgets/hero/widget.liquid",
      "assets/new.css",
    ]);

    const changes = [
      { status: "M", relPath: "theme.json", required: true },
      { status: "M", relPath: "widgets/hero/widget.liquid", required: false },
      { status: "A", relPath: "assets/new.css", required: false },
      { status: "D", relPath: "snippets/old.liquid", required: false }, // eligible deletion
      { status: "D", relPath: "config/settings.json", required: false }, // ineligible deletion
      { status: "M", relPath: "widgets/ghost/widget.liquid", required: false }, // source missing
      { status: "R", relPath: "widgets/renamed.liquid", required: false }, // unsupported status
    ];

    const plan = buildPlan(changes, themeDir);

    expect(plan.copies.map((c) => c.relPath).sort()).toEqual(
      ["assets/new.css", "theme.json", "widgets/hero/widget.liquid"].sort(),
    );
    expect(plan.deletions.map((c) => c.relPath)).toEqual(["snippets/old.liquid"]);
    expect(plan.skippedDeletions.map((c) => c.relPath)).toEqual(["config/settings.json"]);

    const skippedByPath = Object.fromEntries(plan.skippedStatuses.map((c) => [c.relPath, c.reason]));
    expect(skippedByPath["widgets/ghost/widget.liquid"]).toMatch(/missing/i);
    expect(skippedByPath["widgets/renamed.liquid"]).toMatch(/unsupported git status R/i);
  });
});

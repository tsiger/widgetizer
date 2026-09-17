import { describe, it, expect } from "vitest";
import { groupLinkTargets } from "../linkTargetGroups.js";

// The richtext picker is a native <select>, so it cannot carry the combobox's
// filter row. Every language still has to be reachable (§4a) — the one being
// edited leads, and the rest say which language they are.
const OPTIONS = [
  { value: "p1", label: "About", group: "Pages", language: "en" },
  { value: "n1", label: "Launch day", group: "News", language: "en" },
  { value: "p2", label: "Sxetika", group: "Pages", language: "el" },
  { value: "n2", label: "Kalimera", group: "News", language: "el" },
];

describe("groupLinkTargets", () => {
  it("leads with the language being edited and keeps the others below it", () => {
    const groups = groupLinkTargets(OPTIONS, { isMultilang: true, editingLanguage: "el" });
    expect(groups.map((g) => g.label)).toEqual([
      "Pages · Ελληνικά",
      "News · Ελληνικά",
      "Pages · English",
      "News · English",
    ]);
  });

  it("names the language of a target that is not the one being edited", () => {
    const groups = groupLinkTargets(OPTIONS, { isMultilang: true, editingLanguage: "en" });
    const labels = groups.flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toEqual(["About", "Launch day", "Sxetika (el)", "Kalimera (el)"]);
  });

  it("splits one group name across languages instead of merging them", () => {
    const groups = groupLinkTargets(OPTIONS, { isMultilang: true, editingLanguage: "en" });
    expect(groups.filter((g) => g.key.startsWith("Pages")).map((g) => g.items.length)).toEqual([1, 1]);
  });

  it("is the plain grouping it always was while the site has one language", () => {
    const single = OPTIONS.filter((o) => o.language === "en");
    const groups = groupLinkTargets(single, { isMultilang: false, editingLanguage: "en" });
    expect(groups.map((g) => g.label)).toEqual(["Pages", "News"]);
    expect(groups.flatMap((g) => g.items.map((i) => i.label))).toEqual(["About", "Launch day"]);
  });
});

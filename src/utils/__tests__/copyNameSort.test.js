import { describe, it, expect } from "vitest";
import { compareNamesWithCopies, sortItemsByCopyName } from "../copyNameSort";

describe("compareNamesWithCopies", () => {
  it("sorts originals before copies", () => {
    const names = ["About (Copy 2)", "About (Copy)", "About"];
    const sorted = [...names].sort(compareNamesWithCopies);

    expect(sorted).toEqual(["About", "About (Copy)", "About (Copy 2)"]);
  });

  it("sorts by base name alphabetically", () => {
    const names = ["Contact", "About (Copy)", "About", "Blog"];
    const sorted = [...names].sort(compareNamesWithCopies);

    expect(sorted).toEqual(["About", "About (Copy)", "Blog", "Contact"]);
  });

  it("handles multi-digit copy numbers numerically", () => {
    const names = ["About (Copy 10)", "About (Copy 2)", "About (Copy 3)"];
    const sorted = [...names].sort(compareNamesWithCopies);

    expect(sorted).toEqual(["About (Copy 2)", "About (Copy 3)", "About (Copy 10)"]);
  });
});

describe("sortItemsByCopyName", () => {
  it("sorts item objects by their name field", () => {
    const items = [{ name: "About (Copy)" }, { name: "About" }, { name: "Blog" }];

    expect(sortItemsByCopyName(items)).toEqual([{ name: "About" }, { name: "About (Copy)" }, { name: "Blog" }]);
  });
});

import { describe, it, expect } from "vitest";
import { formatDateOnly, toDateOnlyFormat, DEFAULT_DATE_FORMAT } from "../utils/dateFormat.js";

describe("formatDateOnly", () => {
  it("formats with the default (MMMM D, YYYY)", () => {
    expect(formatDateOnly("2026-06-17")).toBe("June 17, 2026");
    expect(DEFAULT_DATE_FORMAT).toBe("MMMM D, YYYY");
  });

  it("honors supported date-only format tokens", () => {
    expect(formatDateOnly("2026-06-17", "D MMMM YYYY")).toBe("17 June 2026");
    expect(formatDateOnly("2026-06-17", "MMM D, YYYY")).toBe("Jun 17, 2026");
    expect(formatDateOnly("2026-06-17", "D MMM YYYY")).toBe("17 Jun 2026");
    expect(formatDateOnly("2026-06-17", "MM/DD/YYYY")).toBe("06/17/2026");
    expect(formatDateOnly("2026-06-17", "DD/MM/YYYY")).toBe("17/06/2026");
    expect(formatDateOnly("2026-06-17", "YYYY-MM-DD")).toBe("2026-06-17");
  });

  it("reduces timestamp format tokens to date-only (no spurious time)", () => {
    expect(toDateOnlyFormat("MMMM D, YYYY h:mm A")).toBe("MMMM D, YYYY");
    expect(formatDateOnly("2026-06-17", "MMMM D, YYYY h:mm A")).toBe("June 17, 2026");
  });

  it("is timezone-safe — never off-by-one for the parsed day", () => {
    expect(formatDateOnly("2026-01-01", "YYYY-MM-DD")).toBe("2026-01-01");
  });

  it("returns '' for invalid / non-date / impossible values", () => {
    expect(formatDateOnly("not-a-date")).toBe("");
    expect(formatDateOnly("2026-13-01")).toBe("");
    expect(formatDateOnly("2026-02-30")).toBe("");
    expect(formatDateOnly(null)).toBe("");
    expect(formatDateOnly(undefined)).toBe("");
  });
});

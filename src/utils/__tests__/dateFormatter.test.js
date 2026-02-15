import { describe, it, expect } from "vitest";
import { formatDate, formatCurrentDate, getAvailableDateFormats, isValidDateFormat, DATE_FORMATS } from "../dateFormatter";

// Fixed date: December 31, 2024 at 14:15:00 (local time)
// We construct with explicit year/month/day/hour/min to avoid timezone issues
const DEC_31 = new Date(2024, 11, 31, 14, 15, 0); // month is 0-indexed

// ============================================================================
// formatDate — date-only formats
// ============================================================================

describe("formatDate — date-only formats", () => {
  it("formats MM/DD/YYYY (US)", () => {
    expect(formatDate(DEC_31, "MM/DD/YYYY")).toBe("12/31/2024");
  });

  it("formats DD/MM/YYYY (EU)", () => {
    expect(formatDate(DEC_31, "DD/MM/YYYY")).toBe("31/12/2024");
  });

  it("formats YYYY-MM-DD (ISO)", () => {
    expect(formatDate(DEC_31, "YYYY-MM-DD")).toBe("2024-12-31");
  });

  it("formats MMM D, YYYY (short month)", () => {
    expect(formatDate(DEC_31, "MMM D, YYYY")).toBe("Dec 31, 2024");
  });

  it("formats MMMM D, YYYY (full month)", () => {
    expect(formatDate(DEC_31, "MMMM D, YYYY")).toBe("December 31, 2024");
  });

  it("formats D MMM YYYY", () => {
    expect(formatDate(DEC_31, "D MMM YYYY")).toBe("31 Dec 2024");
  });

  it("formats D MMMM YYYY", () => {
    expect(formatDate(DEC_31, "D MMMM YYYY")).toBe("31 December 2024");
  });
});

// ============================================================================
// formatDate — date+time formats
// ============================================================================

describe("formatDate — date+time formats", () => {
  it("formats MM/DD/YYYY h:mm A (12-hour)", () => {
    expect(formatDate(DEC_31, "MM/DD/YYYY h:mm A")).toBe("12/31/2024 2:15 PM");
  });

  it("formats DD/MM/YYYY HH:mm (24-hour)", () => {
    expect(formatDate(DEC_31, "DD/MM/YYYY HH:mm")).toBe("31/12/2024 14:15");
  });

  it("formats YYYY-MM-DD HH:mm", () => {
    expect(formatDate(DEC_31, "YYYY-MM-DD HH:mm")).toBe("2024-12-31 14:15");
  });

  it("formats MMM D, YYYY h:mm A", () => {
    expect(formatDate(DEC_31, "MMM D, YYYY h:mm A")).toBe("Dec 31, 2024 2:15 PM");
  });

  it("formats MMMM D, YYYY h:mm A", () => {
    expect(formatDate(DEC_31, "MMMM D, YYYY h:mm A")).toBe("December 31, 2024 2:15 PM");
  });

  it("formats D MMM YYYY HH:mm", () => {
    expect(formatDate(DEC_31, "D MMM YYYY HH:mm")).toBe("31 Dec 2024 14:15");
  });
});

// ============================================================================
// formatDate — time edge cases
// ============================================================================

describe("formatDate — time edge cases", () => {
  it("formats midnight as 12:00 AM", () => {
    const midnight = new Date(2024, 0, 1, 0, 0, 0);
    expect(formatDate(midnight, "MM/DD/YYYY h:mm A")).toBe("01/01/2024 12:00 AM");
  });

  it("formats noon as 12:00 PM", () => {
    const noon = new Date(2024, 0, 1, 12, 0, 0);
    expect(formatDate(noon, "MM/DD/YYYY h:mm A")).toBe("01/01/2024 12:00 PM");
  });

  it("formats 1 AM correctly", () => {
    const oneAm = new Date(2024, 0, 1, 1, 5, 0);
    expect(formatDate(oneAm, "MM/DD/YYYY h:mm A")).toBe("01/01/2024 1:05 AM");
  });

  it("pads 24-hour midnight as 00:00", () => {
    const midnight = new Date(2024, 0, 1, 0, 0, 0);
    expect(formatDate(midnight, "DD/MM/YYYY HH:mm")).toBe("01/01/2024 00:00");
  });

  it("pads single-digit minutes", () => {
    const d = new Date(2024, 5, 1, 9, 5, 0);
    expect(formatDate(d, "YYYY-MM-DD HH:mm")).toBe("2024-06-01 09:05");
  });
});

// ============================================================================
// formatDate — padding and month names
// ============================================================================

describe("formatDate — padding and month names", () => {
  it("pads single-digit months and days", () => {
    const jan1 = new Date(2024, 0, 1, 0, 0, 0);
    expect(formatDate(jan1, "MM/DD/YYYY")).toBe("01/01/2024");
  });

  it("does not pad day in named-month formats", () => {
    const jan1 = new Date(2024, 0, 1, 0, 0, 0);
    expect(formatDate(jan1, "D MMM YYYY")).toBe("1 Jan 2024");
  });

  it("uses correct short month names for all 12 months", () => {
    const expected = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let m = 0; m < 12; m++) {
      const d = new Date(2024, m, 15);
      expect(formatDate(d, "MMM D, YYYY")).toContain(expected[m]);
    }
  });
});

// ============================================================================
// formatDate — edge cases and invalid input
// ============================================================================

describe("formatDate — edge cases", () => {
  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatDate(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatDate("")).toBe("");
  });

  it("returns empty string for invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("");
  });

  it("falls back to MM/DD/YYYY for unknown format", () => {
    expect(formatDate(DEC_31, "UNKNOWN_FORMAT")).toBe("12/31/2024");
  });

  it("defaults to MM/DD/YYYY when no format is given", () => {
    expect(formatDate(DEC_31)).toBe("12/31/2024");
  });

  it("accepts a date string", () => {
    // Use ISO string to construct — note this will be in local time
    const d = new Date(2024, 5, 15, 10, 30, 0);
    expect(formatDate(d.toISOString(), "YYYY-MM-DD")).toBe("2024-06-15");
  });

  it("accepts a timestamp number", () => {
    const ts = new Date(2024, 0, 1, 0, 0, 0).getTime();
    expect(formatDate(ts, "YYYY-MM-DD")).toBe("2024-01-01");
  });
});

// ============================================================================
// formatCurrentDate
// ============================================================================

describe("formatCurrentDate", () => {
  it("returns a non-empty string", () => {
    expect(formatCurrentDate()).toBeTruthy();
  });

  it("defaults to MM/DD/YYYY format", () => {
    // Should match pattern: XX/XX/XXXX
    expect(formatCurrentDate()).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("respects the format argument", () => {
    expect(formatCurrentDate("YYYY-MM-DD")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ============================================================================
// getAvailableDateFormats / isValidDateFormat
// ============================================================================

describe("getAvailableDateFormats", () => {
  it("returns the DATE_FORMATS object", () => {
    expect(getAvailableDateFormats()).toBe(DATE_FORMATS);
  });

  it("contains at least the 13 defined formats", () => {
    expect(Object.keys(getAvailableDateFormats()).length).toBeGreaterThanOrEqual(13);
  });

  it("every format has a label and example", () => {
    for (const [, value] of Object.entries(getAvailableDateFormats())) {
      expect(value).toHaveProperty("label");
      expect(value).toHaveProperty("example");
    }
  });
});

describe("isValidDateFormat", () => {
  it("returns true for every defined format key", () => {
    for (const key of Object.keys(DATE_FORMATS)) {
      expect(isValidDateFormat(key)).toBe(true);
    }
  });

  it("returns false for an unknown format", () => {
    expect(isValidDateFormat("YYYY/DD/MM")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidDateFormat("")).toBe(false);
  });
});

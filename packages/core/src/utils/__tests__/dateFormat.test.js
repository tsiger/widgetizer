import { describe, it, expect } from "vitest";
import { formatDateOnly, toDateOnlyFormat, DEFAULT_DATE_FORMAT } from "../dateFormat.js";

const DATE = "2026-03-04";

// Every format the app offers. The month is the only part that may change with
// the language: which format a site uses is the site's choice, and localizing
// must not quietly take that over.
const FORMATS = [
  ["MMMM D, YYYY", "March 4, 2026", "Μαρτίου 4, 2026"],
  ["D MMMM YYYY", "4 March 2026", "4 Μαρτίου 2026"],
  ["MMM D, YYYY", "Mar 4, 2026", "Μαρ 4, 2026"],
  ["D MMM YYYY", "4 Mar 2026", "4 Μαρ 2026"],
  ["MM/DD/YYYY", "03/04/2026", "03/04/2026"],
  ["DD/MM/YYYY", "04/03/2026", "04/03/2026"],
  ["YYYY-MM-DD", "2026-03-04", "2026-03-04"],
];

describe("formatDateOnly", () => {
  it.each(FORMATS)("%s reads in English by default", (format, english) => {
    expect(formatDateOnly(DATE, format)).toBe(english);
  });

  it.each(FORMATS)("%s reads its month in the language asked for", (format, _english, greek) => {
    expect(formatDateOnly(DATE, format, "el")).toBe(greek);
  });

  // Many languages inflect a month differently on its own than inside a date.
  // Asking for the month by itself is asking for the wrong word in all of these
  // — Greek only looks fine because its two forms coincide.
  it.each([
    // language, what a date says, what the month called by itself would have said
    ["ru", "4 марта 2026", "4 март 2026"],
    ["pl", "4 marca 2026", "4 marzec 2026"],
    ["uk", "4 березня 2026", "4 березень 2026"],
    ["cs", "4 března 2026", "4 březen 2026"],
    ["el", "4 Μαρτίου 2026", "4 Μάρτιος 2026"],
  ])("%s uses the form a date wants, not the month's name on its own", (language, inDate, standalone) => {
    expect(formatDateOnly(DATE, "D MMMM YYYY", language)).toBe(inDate);
    expect(formatDateOnly(DATE, "D MMMM YYYY", language)).not.toBe(standalone);
  });

  // `MMM` asks for a NAME. Some languages write a short date with a number
  // (Czech `4. 3.`, Japanese), which is not what the format asked for.
  it.each(["cs", "ja"])("%s still gets a month name from MMM, never a number", (language) => {
    const short = formatDateOnly(DATE, "D MMM YYYY", language);
    expect(short).not.toBe("4 3 2026");
    expect(short).toMatch(/\p{L}/u);
  });

  it("keeps the numeric formats byte-identical whatever the language", () => {
    for (const language of ["en", "el", "de", "ja", "ar"]) {
      expect(formatDateOnly(DATE, "YYYY-MM-DD", language)).toBe("2026-03-04");
      expect(formatDateOnly(DATE, "DD/MM/YYYY", language)).toBe("04/03/2026");
      expect(formatDateOnly(DATE, "MM/DD/YYYY", language)).toBe("03/04/2026");
    }
  });

  it("falls back to English rather than failing on an unusable language", () => {
    expect(formatDateOnly(DATE, "D MMMM YYYY", "not a tag!!")).toBe("4 March 2026");
    expect(formatDateOnly(DATE, "D MMMM YYYY", "")).toBe("4 March 2026");
    expect(formatDateOnly(DATE, "D MMMM YYYY", undefined)).toBe("4 March 2026");
  });

  // The file formats by splitting the string on purpose: `new Date("2026-03-04")`
  // parses as UTC midnight and renders the day before in any zone behind UTC.
  it("reads the day off the string, not off a local Date", () => {
    for (const language of ["en", "el"]) {
      expect(formatDateOnly("2026-01-01", "D MMMM YYYY", language)).toMatch(/^1 /);
      expect(formatDateOnly("2026-12-31", "D MMMM YYYY", language)).toMatch(/^31 /);
    }
  });

  it("gives nothing for something that is not a calendar date", () => {
    for (const value of ["2026-02-30", "2026-13-01", "not a date", "", null, undefined]) {
      expect(formatDateOnly(value, "D MMMM YYYY", "el")).toBe("");
    }
  });

  it("still reduces a timestamp format to its date-only twin", () => {
    expect(toDateOnlyFormat("D MMMM YYYY HH:mm")).toBe("D MMMM YYYY");
    expect(formatDateOnly(DATE, "D MMMM YYYY HH:mm", "el")).toBe("4 Μαρτίου 2026");
  });

  it("defaults to the app's own format", () => {
    expect(formatDateOnly(DATE)).toBe(formatDateOnly(DATE, DEFAULT_DATE_FORMAT));
  });
});

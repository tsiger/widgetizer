/**
 * Date utilities: the shared, timezone-safe `formatDateOnly` / `toDateOnlyFormat`
 * (src/core/utils/dateFormat.js, used by the `format_date` Liquid filter and the
 * admin list) and `sanitizeDateValue` (the date setting-value coercion).
 *
 * Run with: node --test server/tests/dateUtils.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatDateOnly, toDateOnlyFormat } from "../../src/core/utils/dateFormat.js";
import { sanitizeDateValue } from "../services/sanitizationService.js";

describe("formatDateOnly", () => {
  it("renders each supported token (single-digit day, no timezone shift)", () => {
    const v = "2026-06-05";
    assert.equal(formatDateOnly(v, "MMMM D, YYYY"), "June 5, 2026");
    assert.equal(formatDateOnly(v, "D MMMM YYYY"), "5 June 2026");
    assert.equal(formatDateOnly(v, "MMM D, YYYY"), "Jun 5, 2026");
    assert.equal(formatDateOnly(v, "D MMM YYYY"), "5 Jun 2026");
    assert.equal(formatDateOnly(v, "MM/DD/YYYY"), "06/05/2026");
    assert.equal(formatDateOnly(v, "DD/MM/YYYY"), "05/06/2026");
    assert.equal(formatDateOnly(v, "YYYY-MM-DD"), "2026-06-05");
  });

  it("defaults to long form and reduces timestamp tokens to date-only", () => {
    assert.equal(formatDateOnly("2026-12-31"), "December 31, 2026");
    assert.equal(formatDateOnly("2026-12-31", "MMMM D, YYYY h:mm A"), "December 31, 2026");
    assert.equal(formatDateOnly("2026-12-31", "DD/MM/YYYY HH:mm"), "31/12/2026");
  });

  it("returns '' for blank / malformed / impossible dates and non-strings", () => {
    for (const bad of ["", "garbage", "2026/06/05", "2026-13-01", "2026-02-30", null, undefined, 123]) {
      assert.equal(formatDateOnly(bad), "");
    }
  });
});

describe("toDateOnlyFormat", () => {
  it("strips the time portion of timestamp tokens; date-only tokens pass through", () => {
    assert.equal(toDateOnlyFormat("MMMM D, YYYY h:mm A"), "MMMM D, YYYY");
    assert.equal(toDateOnlyFormat("YYYY-MM-DD HH:mm"), "YYYY-MM-DD");
    assert.equal(toDateOnlyFormat("D MMM YYYY"), "D MMM YYYY");
  });
});

describe("sanitizeDateValue", () => {
  it("keeps a valid YYYY-MM-DD value", () => {
    assert.equal(sanitizeDateValue("2026-06-05"), "2026-06-05");
  });

  it("coerces invalid / impossible / non-string values to ''", () => {
    for (const bad of ["", "2026-13-40", "2026-02-30", "06/05/2026", "<script>x</script>", 20260605, null, undefined]) {
      assert.equal(sanitizeDateValue(bad), "");
    }
  });
});

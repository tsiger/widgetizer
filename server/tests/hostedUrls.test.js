import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizeDashboardUrl } from "../utils/hostedUrls.js";
import { joinDashboardUrl } from "../../src/lib/hostedUrls.js";

describe("Hosted URL helpers", () => {
  it("normalizes the root dashboard URL without collapsing it", () => {
    assert.equal(normalizeDashboardUrl("/"), "/");
    assert.equal(normalizeDashboardUrl(undefined), "/");
  });

  it("strips trailing slashes from non-root dashboard URLs", () => {
    assert.equal(normalizeDashboardUrl("/dashboard/"), "/");
    assert.equal(
      normalizeDashboardUrl("https://publisher.widgetizer.org/dashboard/"),
      "https://publisher.widgetizer.org",
    );
  });

  it("joins hosted dashboard links without hardcoding a /dashboard prefix", () => {
    assert.equal(joinDashboardUrl("/", "/"), "/");
    assert.equal(joinDashboardUrl("/", "/account"), "/account");
    assert.equal(joinDashboardUrl("https://publisher.widgetizer.org", "/"), "https://publisher.widgetizer.org/");
    assert.equal(
      joinDashboardUrl("https://publisher.widgetizer.org/", "/account"),
      "https://publisher.widgetizer.org/account",
    );
  });
});

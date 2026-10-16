import { describe, it, expect } from "vitest";
import { windowOpenTarget } from "./windowOpenPolicy.js";

const ORIGINS = ["http://127.0.0.1:4100", "http://localhost:4100"];

describe("windowOpenTarget", () => {
  it("keeps the app server's own pages in an app window", () => {
    expect(windowOpenTarget("http://127.0.0.1:4100/api/export/x/index.html", ORIGINS)).toBe("content");
    expect(windowOpenTarget("http://localhost:4100/api/media/projects/p/media/m", ORIGINS)).toBe("content");
  });

  it("sends other web addresses to the browser", () => {
    expect(windowOpenTarget("https://docs.widgetizer.org/", ORIGINS)).toBe("external");
    expect(windowOpenTarget("http://127.0.0.1:9999/", ORIGINS)).toBe("external");
  });

  it("refuses everything else", () => {
    for (const url of ["about:blank", "javascript:alert(1)", "file:///C:/x", "data:text/html,x", "not a url"]) {
      expect(windowOpenTarget(url, ORIGINS)).toBe("deny");
    }
  });
});

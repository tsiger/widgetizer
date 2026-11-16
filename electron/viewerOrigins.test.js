import { describe, it, expect } from "vitest";
import { viewerOriginsFromEnv } from "./viewerOrigins.js";

describe("viewerOriginsFromEnv", () => {
  it("gives the loopback origins of EXPORT_VIEWER_PORT", () => {
    expect(viewerOriginsFromEnv({ EXPORT_VIEWER_PORT: "3002" })).toEqual([
      "http://127.0.0.1:3002",
      "http://localhost:3002",
    ]);
  });

  it("adds the EXPORT_VIEWER_URL origin", () => {
    expect(viewerOriginsFromEnv({ EXPORT_VIEWER_PORT: "3002", EXPORT_VIEWER_URL: "https://v.example.com/a" })).toEqual([
      "http://127.0.0.1:3002",
      "http://localhost:3002",
      "https://v.example.com",
    ]);
  });

  it("gives only the override origin when the port is unset or off", () => {
    expect(viewerOriginsFromEnv({})).toEqual([]);
    expect(viewerOriginsFromEnv({ EXPORT_VIEWER_PORT: "off" })).toEqual([]);
    expect(viewerOriginsFromEnv({ EXPORT_VIEWER_PORT: "off", EXPORT_VIEWER_URL: "https://v.example.com" })).toEqual([
      "https://v.example.com",
    ]);
  });

  it("ignores an invalid port or URL, and non-http(s) URLs", () => {
    expect(viewerOriginsFromEnv({ EXPORT_VIEWER_PORT: "abc" })).toEqual([]);
    expect(viewerOriginsFromEnv({ EXPORT_VIEWER_PORT: "70000" })).toEqual([]);
    expect(viewerOriginsFromEnv({ EXPORT_VIEWER_URL: "not a url" })).toEqual([]);
    expect(viewerOriginsFromEnv({ EXPORT_VIEWER_URL: "file:///etc/passwd" })).toEqual([]);
  });
});

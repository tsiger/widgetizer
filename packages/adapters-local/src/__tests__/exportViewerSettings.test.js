import { describe, it, expect } from "vitest";
import { viewerPortSetting, overrideOrigin, viewerOrigins } from "../exportViewerSettings.js";

describe("viewerPortSetting", () => {
  it("reads unset, off (any case), a port, 0 and nonsense", () => {
    expect(viewerPortSetting(undefined)).toEqual({ kind: "unset" });
    expect(viewerPortSetting("  ")).toEqual({ kind: "unset" });
    for (const off of ["off", "OFF", " Off "]) expect(viewerPortSetting(off)).toEqual({ kind: "off" });
    expect(viewerPortSetting("3002")).toEqual({ kind: "port", port: 3002 });
    expect(viewerPortSetting("0")).toEqual({ kind: "port", port: 0 });
    for (const bad of ["abc", "70000", "-1", "3002.0"]) expect(viewerPortSetting(bad)).toEqual({ kind: "invalid", value: bad });
  });
});

describe("overrideOrigin", () => {
  it("takes an absolute http(s) URL's origin, and nothing else", () => {
    expect(overrideOrigin("https://view.example.com/x?a=1#b")).toBe("https://view.example.com");
    expect(overrideOrigin(" http://v.example.com:8081/ ")).toBe("http://v.example.com:8081");
    for (const bad of [undefined, "", "view.example.com", "ftp://view.example.com", "file:///etc/passwd", "not a url"]) {
      expect(overrideOrigin(bad), String(bad)).toBeNull();
    }
  });
});

describe("viewerOrigins", () => {
  it("lists the port's loopback origins, then the override's", () => {
    expect(viewerOrigins(4567, "https://view.example.com/x")).toEqual([
      "http://127.0.0.1:4567",
      "http://localhost:4567",
      "https://view.example.com",
    ]);
    expect(viewerOrigins(null, "https://view.example.com")).toEqual(["https://view.example.com"]);
    expect(viewerOrigins(0, "nope")).toEqual([]);
  });
});

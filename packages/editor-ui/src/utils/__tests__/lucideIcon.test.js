import { describe, expect, it } from "vitest";
import { Database, Briefcase } from "lucide-react";
import { resolveLucideIcon } from "../lucideIcon";

describe("resolveLucideIcon", () => {
  it("returns the matching Lucide component for a known PascalCase name", () => {
    expect(resolveLucideIcon("Briefcase")).toBe(Briefcase);
  });

  it("falls back to Database for an unknown icon name", () => {
    expect(resolveLucideIcon("NotARealIcon")).toBe(Database);
  });

  it("falls back to Database for empty / nullish input", () => {
    expect(resolveLucideIcon("")).toBe(Database);
    expect(resolveLucideIcon(undefined)).toBe(Database);
    expect(resolveLucideIcon(null)).toBe(Database);
  });

  it("accepts a custom fallback component", () => {
    expect(resolveLucideIcon("StillNotReal", Briefcase)).toBe(Briefcase);
  });
});

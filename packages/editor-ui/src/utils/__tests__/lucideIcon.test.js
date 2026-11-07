import { describe, expect, it } from "vitest";
import { Database, Briefcase, EighthNotes, Trash } from "lucide-react";
import { resolveLucideIcon } from "../lucideIcon";

describe("resolveLucideIcon", () => {
  it("returns the matching Lucide component for a known PascalCase name", () => {
    expect(resolveLucideIcon("Briefcase")).toBe(Briefcase);
  });

  it("still resolves names Lucide has since replaced", () => {
    // Music is now EighthNotes and Trash2 is Trash; themes may use either name.
    expect(resolveLucideIcon("Music")).toBe(EighthNotes);
    expect(resolveLucideIcon("Trash2")).toBe(Trash);
    expect(resolveLucideIcon("Trash")).toBe(Trash);
  });

  it("falls back for names that are not icons", () => {
    expect(resolveLucideIcon("LucideProvider")).toBe(Database);
    expect(resolveLucideIcon("createLucideIcon")).toBe(Database);
    expect(resolveLucideIcon("constructor")).toBe(Database);
    expect(resolveLucideIcon("toString")).toBe(Database);
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

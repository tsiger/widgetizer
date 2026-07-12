import { describe, it, expect, vi } from "vitest";
import { buildRegistry } from "../registry.js";

describe("buildRegistry", () => {
  it("merges navItems/routes/commands in plugin-array order, then within-plugin order", () => {
    const a = {
      name: "a",
      navItems: [{ id: "a1" }, { id: "a2" }],
      routes: [{ path: "/a" }],
      commands: [{ id: "cmd-a" }],
    };
    const b = { name: "b", navItems: [{ id: "b1" }], routes: [{ path: "/b" }] };

    const reg = buildRegistry([a, b], { warn: () => {} });

    expect(reg.navItems.map((n) => n.id)).toEqual(["a1", "a2", "b1"]);
    expect(reg.routes.map((r) => r.path)).toEqual(["/a", "/b"]);
    expect(reg.commands.map((c) => c.id)).toEqual(["cmd-a"]);
  });

  it("tags every entry with its originating plugin name", () => {
    const reg = buildRegistry([{ name: "forms", navItems: [{ id: "n" }] }], { warn: () => {} });
    expect(reg.navItems[0].pluginName).toBe("forms");
  });

  it("tolerates plugins missing extension arrays and non-object entries", () => {
    const reg = buildRegistry([{ name: "empty" }, null, undefined, 42], { warn: () => {} });
    expect(reg).toEqual({ navItems: [], routes: [], commands: [] });
  });

  it("warns on truly unknown keys but not on reserved future ones", () => {
    const warn = vi.fn();
    buildRegistry(
      [{ name: "p", widgetTypes: [], inspectorPanels: [], somethingWeird: true }],
      { warn },
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("somethingWeird");
  });

  it("warns on a command id collision but keeps the FIRST-registered command (later one is dropped from dispatch)", () => {
    const warn = vi.fn();
    const first = { name: "a", commands: [{ id: "save", run: () => "a" }] };
    const second = { name: "b", commands: [{ id: "save", run: () => "b" }] };

    const reg = buildRegistry([first, second], { warn });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("save");
    expect(warn.mock.calls[0][0]).toContain("a");
    expect(warn.mock.calls[0][0]).toContain("b");
    // Both entries are present (buildRegistry itself doesn't dedupe/drop) —
    // it's commands.find(c => c.id === id) at the call site that only ever
    // reaches the first one, so the collision is a silent shadow, not a hard error.
    expect(reg.commands).toHaveLength(2);
    expect(reg.commands.find((c) => c.id === "save").pluginName).toBe("a");
  });

  it("does not warn when command ids are distinct", () => {
    const warn = vi.fn();
    buildRegistry(
      [{ name: "a", commands: [{ id: "save" }] }, { name: "b", commands: [{ id: "publish" }] }],
      { warn },
    );
    expect(warn).not.toHaveBeenCalled();
  });
});

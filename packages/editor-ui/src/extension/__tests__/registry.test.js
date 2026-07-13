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
});

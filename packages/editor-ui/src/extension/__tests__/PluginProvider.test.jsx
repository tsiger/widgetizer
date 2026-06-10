// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  PluginProvider,
  SlotOutlet,
  useNavItems,
  useCommands,
  useSlot,
  useHookRunner,
} from "../PluginProvider.jsx";

function NavProbe() {
  const nav = useNavItems();
  const commands = useCommands();
  return (
    <div>
      <span data-testid="nav">{nav.map((n) => n.id).join(",")}</span>
      <span data-testid="cmds">{commands.map((c) => c.id).join(",")}</span>
    </div>
  );
}

describe("PluginProvider (React layer)", () => {
  it("merges plugin registries and exposes them via hooks", () => {
    const plugins = [
      { name: "builtin", navItems: [{ id: "pages" }, { id: "media" }] },
      { name: "forms", navItems: [{ id: "forms" }], commands: [{ id: "open-forms" }] },
    ];
    render(
      <PluginProvider plugins={plugins}>
        <NavProbe />
      </PluginProvider>,
    );
    expect(screen.getByTestId("nav").textContent).toBe("pages,media,forms");
    expect(screen.getByTestId("cmds").textContent).toBe("open-forms");
  });

  it("renders a shell-provided slot via SlotOutlet and useSlot", () => {
    function SlotProbe() {
      const node = useSlot("sidebarFooter");
      return <div data-testid="footer">{node}</div>;
    }
    render(
      <PluginProvider plugins={[]} slots={{ topbarRight: <button>Publish</button>, sidebarFooter: <em>v1</em> }}>
        <SlotOutlet name="topbarRight" />
        <SlotProbe />
      </PluginProvider>,
    );
    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
    expect(screen.getByTestId("footer").textContent).toBe("v1");
  });

  it("renders nothing for an unset slot", () => {
    render(
      <PluginProvider plugins={[]}>
        <div data-testid="wrap">
          <SlotOutlet name="publishConfirmation" />
        </div>
      </PluginProvider>,
    );
    expect(screen.getByTestId("wrap").textContent).toBe("");
  });

  it("provides a hook runner through context", () => {
    // The runner's halt/ordering semantics are covered in hooks.test.js; here we
    // only assert the provider exposes a usable runner.
    function HookProbe() {
      const runner = useHookRunner();
      return <span data-testid="hr">{typeof runner.runBefore}/{typeof runner.runAfter}</span>;
    }
    render(
      <PluginProvider plugins={[{ name: "p", hooks: { beforePublish: async () => ({ proceed: false }) } }]}>
        <HookProbe />
      </PluginProvider>,
    );
    expect(screen.getByTestId("hr").textContent).toBe("function/function");
  });
});

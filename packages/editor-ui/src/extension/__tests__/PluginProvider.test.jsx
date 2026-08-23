// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("keeps the context value referentially stable across re-renders when plugins/slots are omitted", () => {
    // Default-parameter literals ([] / {}) are recreated on every render where
    // the caller omits the prop, silently defeating the provider's useMemo for
    // any non-memoizing caller. The defaults must be stable module constants.
    const seen = [];
    function IdentityProbe() {
      seen.push(useNavItems());
      return null;
    }
    function Host() {
      const [, setTick] = useState(0);
      return (
        <PluginProvider>
          <IdentityProbe />
          <button onClick={() => setTick((t) => t + 1)}>rerender</button>
        </PluginProvider>
      );
    }
    render(<Host />);
    fireEvent.click(screen.getByRole("button", { name: "rerender" }));

    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen[seen.length - 1]).toBe(seen[0]);
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

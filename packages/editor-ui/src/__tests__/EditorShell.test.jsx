// @vitest-environment jsdom
//
// Every other component test (EditorTopBar.test.jsx, PrimaryActionControl.test.jsx,
// PluginProvider.test.jsx) wraps its subject directly with <PluginProvider>,
// bypassing EditorShell/EditorProvider entirely — so the actual prop-threading
// path (EditorShell -> EditorProvider -> PluginProvider) that a real host
// exercises is never rendered anywhere. This file renders the real EditorShell
// and asserts a primaryActions/signals prop given at that top level actually
// reaches and is usable by the real PrimaryActionControl, and that omitting
// primaryActions falls back to the real DEFAULT_PRIMARY_ACTIONS.
//
// Layout (rendered by EditorShell) calls useLocation()/<Outlet/>, so a Router
// is required; a plain MemoryRouter is enough since <Outlet/> renders nothing
// without a matched <Route> — irrelevant here, PrimaryActionControl is
// injected via the real `topbarBanner` slot rather than through the routed
// page-editor page (which pulls in WidgetList/PreviewPanel/SettingsPanel and
// real network calls — well beyond this wiring test's scope). initialEntries
// is "/page-editor" so Layout's isPageEditor branch skips rendering Sidebar
// (whose own nav/query dependencies are irrelevant here too).
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EditorShell } from "../EditorShell.jsx";
import PrimaryActionControl from "../components/pageEditor/PrimaryActionControl.jsx";
import { usePrimaryActions, useToolbarSignals } from "../extension/PluginProvider.jsx";
import useAutoSave from "../stores/saveStore.js";
import useProjectStore from "../stores/projectStore.js";

function renderShell(props = {}) {
  return render(
    <MemoryRouter initialEntries={["/page-editor"]}>
      <EditorShell slots={{ topbarBanner: <PrimaryActionControl /> }} {...props} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useProjectStore.setState({ activeProject: { id: "p1" } });
  useAutoSave.setState({ isSaving: false, isAutoSaving: false, modifiedWidgets: new Set() });
});

describe("EditorShell — primaryActions/signals wiring", () => {
  it("threads a primaryActions/signals prop given at the top down to the rendered PrimaryActionControl", () => {
    const run = vi.fn().mockResolvedValue(undefined);
    renderShell({
      plugins: [{ name: "custom", commands: [{ id: "customCmd", run }] }],
      primaryActions: [{ id: "customAction", command: "customCmd", labelKey: "Custom Action", enabledWhen: "customSignal" }],
      signals: { customSignal: () => true },
    });

    const button = screen.getByRole("button", { name: "Custom Action" });
    expect(button).not.toBeDisabled(); // the top-level `signals` prop reached PrimaryActionControl's enabledWhen check
    fireEvent.click(button);
    expect(run).toHaveBeenCalledTimes(1); // the top-level `primaryActions` command actually dispatches
  });

  it("disables the rendered action when the top-level signals prop resolves its enabledWhen to false", () => {
    renderShell({
      plugins: [{ name: "custom", commands: [{ id: "customCmd", run: vi.fn() }] }],
      primaryActions: [{ id: "customAction", command: "customCmd", labelKey: "Custom Action", enabledWhen: "customSignal" }],
      signals: { customSignal: () => false },
    });

    expect(screen.getByRole("button", { name: "Custom Action" })).toBeDisabled();
  });

  it("falls back to DEFAULT_PRIMARY_ACTIONS (a plain Save button wired to the builtin save command) when primaryActions is omitted", () => {
    const save = vi.fn().mockResolvedValue({ status: "success" });
    useAutoSave.setState({ save, isSaving: false, modifiedWidgets: new Set(["w1"]) }); // hasUnsavedChanges() -> true

    renderShell();

    const button = screen.getByRole("button", { name: "pageEditor.toolbar.save" });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(save).toHaveBeenCalledWith(false); // the real builtinToolbarPlugin "save" command, reached via the default descriptor
  });

  it("keeps primaryActions/signals referentially stable across re-renders when omitted (§47 — shared frozen fallbacks, not fresh literals)", () => {
    const seen = [];
    function Probe() {
      seen.push({ actions: usePrimaryActions(), signals: useToolbarSignals() });
      return null;
    }
    // A fresh `<Probe/>`/slots object each render (as any real caller would
    // produce) so React actually re-renders Probe both times, rather than
    // bailing out early on an identical element reference — the thing under
    // test is EditorShell's own omitted primaryActions/signals, not slots.
    const { rerender } = render(
      <MemoryRouter initialEntries={["/page-editor"]}>
        <EditorShell slots={{ topbarBanner: <Probe /> }} />
      </MemoryRouter>,
    );
    rerender(
      <MemoryRouter initialEntries={["/page-editor"]}>
        <EditorShell slots={{ topbarBanner: <Probe /> }} />
      </MemoryRouter>,
    );

    expect(seen).toHaveLength(2);
    expect(seen[0].actions).toBe(seen[1].actions); // DEFAULT_PRIMARY_ACTIONS: already a frozen module constant
    expect(seen[0].signals).toBe(seen[1].signals); // EMPTY_OBJECT: was a fresh {} per render before the fix
  });
});

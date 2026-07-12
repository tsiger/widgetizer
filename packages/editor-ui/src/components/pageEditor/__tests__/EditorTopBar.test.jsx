// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PluginProvider } from "../../../extension/PluginProvider.jsx";
import { builtinToolbarPlugin, DEFAULT_PRIMARY_ACTIONS } from "../../../extension/toolbar.js";
import EditorTopBar from "../EditorTopBar.jsx";
import useAutoSave from "../../../stores/saveStore.js";
import useProjectStore from "../../../stores/projectStore.js";
import usePageStore from "../../../stores/pageStore.js";

vi.mock("../../../queries/pageManager", () => ({ getAllPages: vi.fn().mockResolvedValue([]) }));

function renderTopBar() {
  return render(
    <MemoryRouter>
      <PluginProvider plugins={[builtinToolbarPlugin]} primaryActions={DEFAULT_PRIMARY_ACTIONS}>
        <EditorTopBar pageName="Home" pageId="home" />
      </PluginProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useProjectStore.setState({ activeProject: { id: "p1" } });
  useAutoSave.setState({ isSaving: false, modifiedWidgets: new Set(["w1"]), structureModified: false, themeSettingsModified: false });
});

describe("EditorTopBar", () => {
  it("renders the primary-action control (Save)", () => {
    renderTopBar();
    expect(screen.getByRole("button", { name: "pageEditor.toolbar.save" })).toBeInTheDocument();
  });

  it("dispatches the save command on Ctrl+S", () => {
    const save = vi.fn().mockResolvedValue(undefined);
    useAutoSave.setState({ save });
    renderTopBar();
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect(save).toHaveBeenCalledWith(false);
  });

  it("routes Ctrl+S through the `save` command (not a direct store call)", () => {
    const run = vi.fn();
    render(
      <MemoryRouter>
        <PluginProvider
          plugins={[{ name: "t", commands: [{ id: "save", run }] }]}
          primaryActions={DEFAULT_PRIMARY_ACTIONS}
        >
          <EditorTopBar pageName="Home" pageId="home" />
        </PluginProvider>
      </MemoryRouter>,
    );
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("reconciles modifiedWidgets after Ctrl+Z (undo) so a revert-to-clean isn't left falsely dirty", () => {
    const reconcileModifiedWidgets = vi.fn();
    useAutoSave.setState({ reconcileModifiedWidgets });
    usePageStore.temporal.setState({ pastStates: [{ page: { id: "home", widgets: {} } }], futureStates: [] });
    renderTopBar();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(reconcileModifiedWidgets).toHaveBeenCalled();
  });

  it("reconciles modifiedWidgets after Ctrl+Shift+Z (redo)", () => {
    const reconcileModifiedWidgets = vi.fn();
    useAutoSave.setState({ reconcileModifiedWidgets });
    usePageStore.temporal.setState({ pastStates: [], futureStates: [{ page: { id: "home", widgets: {} } }] });
    renderTopBar();
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(reconcileModifiedWidgets).toHaveBeenCalled();
  });

  it("renders PrimaryActionControl (shows the split-button caret when a descriptor has menuItems)", () => {
    render(
      <MemoryRouter>
        <PluginProvider
          plugins={[{ name: "t", commands: [{ id: "save", run: vi.fn() }, { id: "extra", run: vi.fn() }] }]}
          primaryActions={[{ ...DEFAULT_PRIMARY_ACTIONS[0], menuItems: [{ id: "extra", command: "extra", labelKey: "x" }] }]}
        >
          <EditorTopBar pageName="Home" pageId="home" />
        </PluginProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "pageEditor.toolbar.moreActions" })).toBeInTheDocument();
  });
});

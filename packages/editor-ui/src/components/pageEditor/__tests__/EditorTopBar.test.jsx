// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PluginProvider } from "../../../extension/PluginProvider.jsx";
import EditorTopBar from "../EditorTopBar.jsx";
import useAutoSave from "../../../stores/saveStore.js";
import usePageStore from "../../../stores/pageStore.js";

vi.mock("../../../queries/pageManager", () => ({ getAllPages: vi.fn().mockResolvedValue([]) }));

function renderTopBar() {
  return render(
    <MemoryRouter>
      <PluginProvider>
        <EditorTopBar pageName="Home" pageId="home" />
      </PluginProvider>
    </MemoryRouter>,
  );
}

describe("EditorTopBar undo/redo dirty-tracking", () => {
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
});

describe("EditorTopBar manual-save failure handling", () => {
  // The new saveStore's save(false) REJECTS on genuine failure (the old store
  // swallowed with console.error); both manual callsites below are fire-and-forget,
  // so an unhandled rejection would otherwise surface as an unhandled promise
  // rejection instead of a logged error.
  it("logs and does not throw when the Save button's manual save rejects", async () => {
    const error = new Error("boom");
    const save = vi.fn().mockRejectedValue(error);
    useAutoSave.setState({ save, hasUnsavedChanges: () => true, isSaving: false });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderTopBar();
    fireEvent.click(screen.getByTitle("pageEditor.toolbar.save (Ctrl+S)"));
    await vi.waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to save:", error));
    consoleErrorSpy.mockRestore();
  });

  it("logs and does not throw when Ctrl+S's manual save rejects", async () => {
    const error = new Error("boom");
    const save = vi.fn().mockRejectedValue(error);
    useAutoSave.setState({ save, hasUnsavedChanges: () => true, isSaving: false });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderTopBar();
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await vi.waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to save:", error));
    consoleErrorSpy.mockRestore();
  });
});

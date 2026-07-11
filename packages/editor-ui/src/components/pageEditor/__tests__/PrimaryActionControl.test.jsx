// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PluginProvider } from "../../../extension/PluginProvider.jsx";
import PrimaryActionControl from "../PrimaryActionControl.jsx";
import useAutoSave from "../../../stores/saveStore.js";
import useProjectStore from "../../../stores/projectStore.js";
import useToastStore from "../../../stores/toastStore.js";

const saveDescriptor = {
  id: "save",
  command: "save",
  labelKey: "pageEditor.toolbar.save",
  busyLabelKey: "pageEditor.toolbar.saving",
  enabledWhen: "hasUnsavedChanges",
  busyWhen: "isSaving",
};

function renderControl({ actions, commands, signals = {} }) {
  return render(
    <PluginProvider plugins={[{ name: "t", commands }]} primaryActions={actions} signals={signals}>
      <PrimaryActionControl />
    </PluginProvider>,
  );
}

beforeEach(() => {
  useProjectStore.setState({ activeProject: { id: "p1" } });
  useAutoSave.setState({ isSaving: false, modifiedWidgets: new Set(["w1"]), structureModified: false, themeSettingsModified: false });
});

describe("PrimaryActionControl", () => {
  it("renders the primary label and dispatches its command with a ctx", () => {
    const run = vi.fn().mockResolvedValue(undefined);
    renderControl({ actions: [saveDescriptor], commands: [{ id: "save", run }] });
    fireEvent.click(screen.getByRole("button", { name: "pageEditor.toolbar.save" }));
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0][0]).toMatchObject({ projectId: "p1" });
    expect(typeof run.mock.calls[0][0].runCommand).toBe("function");
  });

  it("is disabled when its enabledWhen signal is false", () => {
    useAutoSave.setState({ modifiedWidgets: new Set() }); // hasUnsavedChanges → false
    renderControl({ actions: [saveDescriptor], commands: [{ id: "save", run: vi.fn() }] });
    expect(screen.getByRole("button", { name: "pageEditor.toolbar.save" })).toBeDisabled();
  });

  it("shows the busy label and disables while the command is in flight", async () => {
    let resolve;
    const run = vi.fn(() => new Promise((r) => { resolve = r; }));
    renderControl({ actions: [saveDescriptor], commands: [{ id: "save", run }] });
    fireEvent.click(screen.getByRole("button", { name: "pageEditor.toolbar.save" }));
    const busy = await screen.findByRole("button", { name: "pageEditor.toolbar.saving" });
    expect(busy).toBeDisabled();
    resolve();
    await waitFor(() => expect(screen.getByRole("button", { name: "pageEditor.toolbar.save" })).toBeInTheDocument());
  });

  it("surfaces an error toast when the command rejects", async () => {
    const showToast = vi.fn();
    useToastStore.setState({ showToast });
    const run = vi.fn().mockRejectedValue(new Error("boom"));
    renderControl({ actions: [saveDescriptor], commands: [{ id: "save", run }] });
    fireEvent.click(screen.getByRole("button", { name: "pageEditor.toolbar.save" }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("pageEditor.toolbar.actionFailed", "error"));
  });

  it("renders menuItems as a split button", () => {
    const actions = [{ ...saveDescriptor, menuItems: [{ id: "savePublish", command: "savePublish", labelKey: "pageEditor.toolbar.save" }] }];
    renderControl({ actions, commands: [{ id: "save", run: vi.fn() }, { id: "savePublish", run: vi.fn() }] });
    expect(screen.getByRole("button", { name: "pageEditor.toolbar.moreActions" })).toBeInTheDocument();
  });

  it("dispatches a menu item's command with a ctx when clicked", async () => {
    const publishRun = vi.fn().mockResolvedValue(undefined);
    const actions = [{ ...saveDescriptor, menuItems: [{ id: "savePublish", command: "savePublish", labelKey: "savePublishLabel" }] }];
    renderControl({ actions, commands: [{ id: "save", run: vi.fn() }, { id: "savePublish", run: publishRun }] });
    fireEvent.click(screen.getByRole("button", { name: "pageEditor.toolbar.moreActions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "savePublishLabel" }));
    await waitFor(() => expect(publishRun).toHaveBeenCalledTimes(1));
    expect(publishRun.mock.calls[0][0]).toMatchObject({ projectId: "p1" });
    expect(typeof publishRun.mock.calls[0][0].runCommand).toBe("function");
  });

  it("passes a descriptor's titleKey through as the primary button's tooltip", () => {
    renderControl({
      actions: [{ ...saveDescriptor, titleKey: "pageEditor.toolbar.saveHint" }],
      commands: [{ id: "save", run: vi.fn() }],
    });
    expect(screen.getByRole("button", { name: "pageEditor.toolbar.save" })).toHaveAttribute(
      "title",
      "pageEditor.toolbar.saveHint",
    );
  });
});

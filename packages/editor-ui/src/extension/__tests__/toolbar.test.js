import { describe, it, expect, vi, afterEach } from "vitest";
import { Save } from "lucide-react";
import {
  TOOLBAR_SIGNALS,
  resolveActionState,
  validatePrimaryActions,
  DEFAULT_PRIMARY_ACTIONS,
  builtinToolbarPlugin,
  readBuiltinToolbarSignals,
} from "../toolbar.js";
import useAutoSave from "../../stores/saveStore.js";

const saveAction = {
  id: "save",
  command: "save",
  labelKey: "pageEditor.toolbar.save",
  busyLabelKey: "pageEditor.toolbar.saving",
  enabledWhen: "hasUnsavedChanges",
  busyWhen: "isSaving",
};

describe("resolveActionState", () => {
  it("is enabled only when its enabledWhen signal is truthy", () => {
    expect(resolveActionState(saveAction, { hasUnsavedChanges: true, isSaving: false }).enabled).toBe(true);
    expect(resolveActionState(saveAction, { hasUnsavedChanges: false, isSaving: false }).enabled).toBe(false);
  });

  it("is always enabled when enabledWhen is omitted", () => {
    expect(resolveActionState({ id: "x", command: "x", labelKey: "x" }, {}).enabled).toBe(true);
  });

  it("is busy (and shows busyLabelKey) when busyWhen is truthy OR pending", () => {
    const bySignal = resolveActionState(saveAction, { hasUnsavedChanges: true, isSaving: true });
    expect(bySignal.busy).toBe(true);
    expect(bySignal.labelKey).toBe("pageEditor.toolbar.saving");

    const byPending = resolveActionState(saveAction, { hasUnsavedChanges: true, isSaving: false }, { pending: true });
    expect(byPending.busy).toBe(true);
    expect(byPending.labelKey).toBe("pageEditor.toolbar.saving");
  });

  it("shows labelKey when idle", () => {
    expect(resolveActionState(saveAction, { hasUnsavedChanges: true, isSaving: false }).labelKey).toBe(
      "pageEditor.toolbar.save",
    );
  });

  it("treats an unknown signal as false and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const state = resolveActionState({ id: "a", command: "a", labelKey: "a", enabledWhen: "nope" }, {});
    expect(state.enabled).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("validatePrimaryActions", () => {
  const vocab = { signalNames: ["publishPending"], commandIds: ["save", "savePublish"] };

  it("passes a valid list (builtin + shell signals, known commands)", () => {
    expect(() =>
      validatePrimaryActions(
        [{ ...saveAction, menuItems: [{ id: "savePublish", command: "savePublish", labelKey: "x", enabledWhen: "publishPending" }] }],
        vocab,
      ),
    ).not.toThrow();
  });

  it("throws, naming an unknown signal", () => {
    expect(() => validatePrimaryActions([{ ...saveAction, enabledWhen: "bogus" }], vocab)).toThrow(/bogus/);
  });

  it("throws, naming an unknown command", () => {
    expect(() => validatePrimaryActions([{ ...saveAction, command: "ghost" }], vocab)).toThrow(/ghost/);
  });

  it("throws when a menu item nests its own menuItems", () => {
    expect(() =>
      validatePrimaryActions([{ ...saveAction, menuItems: [{ id: "n", command: "save", labelKey: "x", menuItems: [] }] }], vocab),
    ).toThrow(/must not nest/);
  });

  it("throws on a missing required field", () => {
    expect(() => validatePrimaryActions([{ id: "x", labelKey: "x" }], vocab)).toThrow(/command/);
  });
});

describe("DEFAULT_PRIMARY_ACTIONS", () => {
  it("is a single plain Save action", () => {
    expect(DEFAULT_PRIMARY_ACTIONS).toHaveLength(1);
    expect(DEFAULT_PRIMARY_ACTIONS[0]).toMatchObject({ id: "save", command: "save", enabledWhen: "hasUnsavedChanges" });
    expect(DEFAULT_PRIMARY_ACTIONS[0].menuItems).toBeUndefined();
  });

  it("carries the Save icon (the standalone OSS/Electron topbar has no other way to get one)", () => {
    expect(DEFAULT_PRIMARY_ACTIONS[0].icon).toBe(Save);
  });
  it("validates against its own builtin vocabulary", () => {
    expect(() => validatePrimaryActions(DEFAULT_PRIMARY_ACTIONS, { commandIds: ["save"] })).not.toThrow();
  });
});

describe("builtinToolbarPlugin", () => {
  afterEach(() => vi.restoreAllMocks());
  const saveCmd = () => builtinToolbarPlugin.commands.find((c) => c.id === "save");

  it("contributes a `save` command that calls saveStore.save(false) when idle", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    useAutoSave.setState({ save, isSaving: false });
    await saveCmd().run();
    expect(save).toHaveBeenCalledWith(false);
  });

  it("does not start a save while one is already in flight", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    useAutoSave.setState({ save, isSaving: true });
    await saveCmd().run();
    expect(save).not.toHaveBeenCalled();
    useAutoSave.setState({ isSaving: false });
  });

  it("does not start a second, overlapping save while an autosave is already in flight (Ctrl+S/click racing the 60s tick)", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    useAutoSave.setState({ save, isSaving: false, isAutoSaving: true });
    await saveCmd().run();
    expect(save).not.toHaveBeenCalled();
    useAutoSave.setState({ isAutoSaving: false });
  });
});

describe("readBuiltinToolbarSignals", () => {
  it("reflects the save store", () => {
    useAutoSave.setState({ isSaving: true, modifiedWidgets: new Set(["w1"]), structureModified: false, themeSettingsModified: false });
    const sig = readBuiltinToolbarSignals();
    expect(sig.isSaving).toBe(true);
    expect(sig.hasUnsavedChanges).toBe(true);
    useAutoSave.setState({ isSaving: false, modifiedWidgets: new Set() });
  });
});

describe("TOOLBAR_SIGNALS", () => {
  it("lists the builtin signal names", () => {
    expect([...TOOLBAR_SIGNALS]).toEqual(["hasUnsavedChanges", "isSaving"]);
  });
});

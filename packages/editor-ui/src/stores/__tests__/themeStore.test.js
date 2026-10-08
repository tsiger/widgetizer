import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../queries/themeManager", () => ({
  getThemeSettings: vi.fn(),
  saveThemeSettingChanges: vi.fn(),
}));
vi.mock("../../queries/mediaManager", () => ({
  invalidateMediaCache: vi.fn(),
}));
vi.mock("../../lib/activeProjectId", () => ({
  getActiveProjectId: vi.fn(() => "project-a"),
}));

const { default: useThemeStore } = await import("../themeStore");
const { getThemeSettings, saveThemeSettingChanges } = await import("../../queries/themeManager");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore() {
  useThemeStore.getState().reset();
  useThemeStore.setState({
    settings: null,
    originalSettings: null,
    loading: false,
    error: null,
    loadedProjectId: null,
    activeLoadId: 0,
  });
}

function seedSettings() {
  const settings = {
    settings: {
      global: {
        colors: [
          { id: "primary_color", type: "color", value: "#ff0000" },
          { id: "secondary_color", type: "color", value: "#00ff00" },
        ],
      },
    },
  };

  useThemeStore.setState({
    settings: JSON.parse(JSON.stringify(settings)),
    originalSettings: JSON.parse(JSON.stringify(settings)),
    loadedProjectId: "project-a",
  });

  return settings;
}

// ============================================================================
// Tests
// ============================================================================

describe("themeStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  // --------------------------------------------------------------------------
  // loadSettings — failure clears stale data
  // --------------------------------------------------------------------------

  describe("loadSettings — failure handling", () => {
    it("clears previous project data on load failure", async () => {
      // Load project A successfully
      const projectASettings = {
        settings: { global: { colors: [{ id: "c1", value: "#aaa" }] } },
      };
      getThemeSettings.mockResolvedValueOnce(projectASettings);

      await useThemeStore.getState().loadSettings("project-a");
      expect(useThemeStore.getState().settings).toEqual(projectASettings);
      expect(useThemeStore.getState().loadedProjectId).toBe("project-a");

      // Now try loading project B — it fails
      getThemeSettings.mockRejectedValueOnce(new Error("Network error"));

      await useThemeStore.getState().loadSettings("project-b");

      const state = useThemeStore.getState();
      // Project A's data must NOT leak into project B
      expect(state.settings).toBeNull();
      expect(state.originalSettings).toBeNull();
      expect(state.loadedProjectId).toBe("project-b");
      expect(state.error).toBe("Network error");
      expect(state.loading).toBe(false);
    });

    it("does not clear data if a newer load superseded the failed one", async () => {
      // Start two loads in quick succession
      const slowFailure = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("slow fail")), 50),
      );
      const fastSuccess = Promise.resolve({
        settings: { global: { colors: [{ id: "c1", value: "#bbb" }] } },
      });

      getThemeSettings
        .mockImplementationOnce(() => slowFailure)
        .mockImplementationOnce(() => fastSuccess);

      const firstLoad = useThemeStore.getState().loadSettings("project-a");
      const secondLoad = useThemeStore.getState().loadSettings("project-b");

      await secondLoad;
      await firstLoad.catch(() => {}); // wait for the failure to resolve

      // Project B's data should be intact
      const state = useThemeStore.getState();
      expect(state.settings).not.toBeNull();
      expect(state.loadedProjectId).toBe("project-b");
      expect(state.error).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // saveSettings — warning handling
  // --------------------------------------------------------------------------

  describe("saveSettings", () => {
    const valueOf = (theme, id) => theme.settings.global.colors.find((s) => s.id === id).value;
    const withValues = (values) => ({
      settings: {
        global: {
          colors: [
            { id: "primary_color", type: "color", value: values.primary ?? "#ff0000" },
            { id: "secondary_color", type: "color", value: values.secondary ?? "#00ff00" },
          ],
        },
      },
    });
    const deferred = () => {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };

    it("sends only the changed settings, each with the value it started from", async () => {
      seedSettings();
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#0000ff");
      saveThemeSettingChanges.mockResolvedValueOnce({ theme: withValues({ primary: "#0000ff" }), warnings: [] });

      await useThemeStore.getState().saveSettings("project-a");

      expect(saveThemeSettingChanges).toHaveBeenCalledWith(
        "project-a",
        [{ group: "colors", id: "primary_color", baseValue: "#ff0000", value: "#0000ff" }],
        expect.any(Object),
      );
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(false);
    });

    it("takes the server's copy, including a value it corrected, without refetching", async () => {
      seedSettings();
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "bad");
      const saved = withValues({ primary: "#corrected" });
      saveThemeSettingChanges.mockResolvedValueOnce({
        theme: saved,
        warnings: [{ code: "VALUE_CORRECTED", id: "primary_color" }],
      });

      const result = await useThemeStore.getState().saveSettings("project-a");

      expect(result.warnings).toEqual([{ code: "VALUE_CORRECTED", id: "primary_color" }]);
      expect(getThemeSettings).not.toHaveBeenCalled();
      expect(useThemeStore.getState().settings).toEqual(saved);
      expect(useThemeStore.getState().originalSettings).toEqual(saved);
    });

    it("keeps an edit made during the save on top of the server's copy, even to the setting it sent", async () => {
      seedSettings();
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#111111");
      const response = deferred();
      saveThemeSettingChanges.mockReturnValueOnce(response.promise);

      const saving = useThemeStore.getState().saveSettings("project-a");
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#222222");
      useThemeStore.getState().updateThemeSetting("colors", "secondary_color", "#333333");
      response.resolve({ theme: withValues({ primary: "#111111" }), warnings: [] });
      await saving;

      const { settings, originalSettings } = useThemeStore.getState();
      expect(valueOf(originalSettings, "primary_color")).toBe("#111111");
      expect(valueOf(settings, "primary_color")).toBe("#222222");
      expect(valueOf(settings, "secondary_color")).toBe("#333333");
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(true);
    });

    it("does not put a corrected value back when nothing edited it during the save", async () => {
      seedSettings();
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "bad");
      saveThemeSettingChanges.mockResolvedValueOnce({ theme: withValues({ primary: "#000000" }), warnings: [] });

      await useThemeStore.getState().saveSettings("project-a");

      expect(valueOf(useThemeStore.getState().settings, "primary_color")).toBe("#000000");
    });

    // R-THEME-SAVE: save red, then blue while red is in flight.
    it("runs saves one at a time, so Reset gives what the server holds", async () => {
      seedSettings();
      const red = deferred();
      const blue = deferred();
      saveThemeSettingChanges.mockReturnValueOnce(red.promise).mockReturnValueOnce(blue.promise);

      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "red");
      const first = useThemeStore.getState().saveSettings("project-a");
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "blue");
      const second = useThemeStore.getState().saveSettings("project-a");

      // Blue is not sent until red has landed.
      expect(saveThemeSettingChanges).toHaveBeenCalledTimes(1);
      red.resolve({ theme: withValues({ primary: "red" }), warnings: [] });
      await first;
      await vi.waitFor(() => expect(saveThemeSettingChanges).toHaveBeenCalledTimes(2));
      expect(saveThemeSettingChanges.mock.calls[1][1]).toEqual([
        { group: "colors", id: "primary_color", baseValue: "red", value: "blue" },
      ]);
      blue.resolve({ theme: withValues({ primary: "blue" }), warnings: [] });
      await second;

      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(false);
      useThemeStore.getState().resetThemeSettings();
      expect(valueOf(useThemeStore.getState().settings, "primary_color")).toBe("blue");
    });

    it("coalesces saves requested meanwhile into one follow-up that all of them await", async () => {
      seedSettings();
      const first = deferred();
      saveThemeSettingChanges
        .mockReturnValueOnce(first.promise)
        .mockResolvedValueOnce({ theme: withValues({ primary: "#c" }), warnings: [] });

      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#a");
      const a = useThemeStore.getState().saveSettings("project-a");
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#c");
      const b = useThemeStore.getState().saveSettings("project-a");
      const c = useThemeStore.getState().saveSettings("project-a");
      expect(b).toBe(c);
      expect(useThemeStore.getState().saving).toBe(true);

      first.resolve({ theme: withValues({ primary: "#a" }), warnings: [] });
      await Promise.all([a, b, c]);
      expect(saveThemeSettingChanges).toHaveBeenCalledTimes(2);
      expect(useThemeStore.getState().saving).toBe(false);
    });

    // A caller reacting to the first save settling runs before the queued
    // follow-up starts; a save it requests there must join the follow-up, not
    // start a second save beside it.
    it("never has two saves in flight, even when one is requested as the first settles", async () => {
      seedSettings();
      let inFlightNow = 0;
      let maxInFlight = 0;
      const pending = [];
      saveThemeSettingChanges.mockImplementation(
        () =>
          new Promise((resolve) => {
            inFlightNow += 1;
            maxInFlight = Math.max(maxInFlight, inFlightNow);
            pending.push(() => {
              inFlightNow -= 1;
              resolve({ theme: useThemeStore.getState().settings, warnings: [] });
            });
          }),
      );

      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#a");
      const first = useThemeStore.getState().saveSettings("project-a");
      const chained = first.then(() => {
        useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#c");
        return useThemeStore.getState().saveSettings("project-a");
      });
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#b");
      const queued = useThemeStore.getState().saveSettings("project-a");

      pending.shift()();
      await vi.waitFor(() => expect(pending).toHaveLength(1));
      await Promise.resolve();
      await Promise.resolve();
      expect(inFlightNow).toBe(1);
      while (pending.length) {
        pending.shift()();
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      await Promise.all([first, chained, queued]);
      expect(maxInFlight).toBe(1);
    });

    it("skips the request when nothing differs, including a key-order-only difference", async () => {
      useThemeStore.setState({
        settings: { settings: { global: { g: [{ id: "link", type: "link", value: { href: "/a", text: "A" } }] } } },
        originalSettings: { settings: { global: { g: [{ id: "link", type: "link", value: { text: "A", href: "/a" } }] } } },
        loadedProjectId: "project-a",
      });

      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(false);
      const result = await useThemeStore.getState().saveSettings("project-a");
      expect(result).toEqual({ warnings: [], skipped: true });
      expect(saveThemeSettingChanges).not.toHaveBeenCalled();
    });

    it("writes nothing back when the store was reset or moved project during the save", async () => {
      seedSettings();
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#0000ff");
      const response = deferred();
      saveThemeSettingChanges.mockReturnValueOnce(response.promise);

      const saving = useThemeStore.getState().saveSettings("project-a");
      useThemeStore.getState().resetForProjectChange();
      useThemeStore.setState({ loadedProjectId: "project-b", settings: withValues({}), originalSettings: withValues({}) });
      response.resolve({ theme: withValues({ primary: "#0000ff" }), warnings: [] });

      expect(await saving).toMatchObject({ stale: true });
      expect(valueOf(useThemeStore.getState().originalSettings, "primary_color")).toBe("#ff0000");
    });

    // Discard-and-leave during a save: the values DID reach the server, so the
    // store takes them as they are rather than reverting them on top.
    it("takes the saved values with nothing on top when the draft was discarded during the save", async () => {
      seedSettings();
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#0000ff");
      const response = deferred();
      saveThemeSettingChanges.mockReturnValueOnce(response.promise);

      const saving = useThemeStore.getState().saveSettings("project-a");
      useThemeStore.getState().discardDraft();
      expect(useThemeStore.getState().isDraftDiscarded()).toBe(true);
      response.resolve({ theme: withValues({ primary: "#0000ff" }), warnings: [] });
      const result = await saving;

      expect(result.adopted).toBe(true);
      expect(valueOf(useThemeStore.getState().settings, "primary_color")).toBe("#0000ff");
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(false);
    });

    it("forgets the discard once the user edits again", () => {
      seedSettings();
      useThemeStore.getState().discardDraft();
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#0000ff");
      expect(useThemeStore.getState().isDraftDiscarded()).toBe(false);
    });

    it("never lowers the generation, so a save from before a reset still sees that it moved", () => {
      const before = useThemeStore.getState().generation;
      useThemeStore.getState().reset();
      useThemeStore.getState().resetForProjectChange();
      expect(useThemeStore.getState().generation).toBe(before + 2);
    });

    it("lets a save in flight land after the Reset button", async () => {
      seedSettings();
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#0000ff");
      const response = deferred();
      saveThemeSettingChanges.mockReturnValueOnce(response.promise);

      const saving = useThemeStore.getState().saveSettings("project-a");
      useThemeStore.getState().resetThemeSettings();
      response.resolve({ theme: withValues({ primary: "#0000ff" }), warnings: [] });
      await saving;

      expect(valueOf(useThemeStore.getState().originalSettings, "primary_color")).toBe("#0000ff");
    });

    describe("when the settings were changed elsewhere", () => {
      const conflict = (code = "THEME_SETTINGS_CHANGED") =>
        Object.assign(new Error("changed"), { status: 409, code, data: { code, conflicts: ["primary_color"] } });

      it("keeps the user's edits on top of the server's copy, unsaved, and resolves without throwing", async () => {
        seedSettings();
        useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#mine");
        saveThemeSettingChanges.mockRejectedValueOnce(conflict());
        getThemeSettings.mockResolvedValueOnce(withValues({ primary: "#theirs", secondary: "#their-other" }));

        const result = await useThemeStore.getState().saveSettings("project-a");

        expect(result).toMatchObject({ conflict: true });
        const { settings, originalSettings, conflict: recorded } = useThemeStore.getState();
        expect(valueOf(originalSettings, "primary_color")).toBe("#theirs");
        expect(valueOf(settings, "primary_color")).toBe("#mine");
        expect(valueOf(settings, "secondary_color")).toBe("#their-other");
        expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(true);
        expect(recorded.ids).toEqual(["primary_color"]);
      });

      // A theme update removed one changed setting while another screen changed
      // the other: the removed one cannot be kept, and the result says so.
      it("reports an edit it could not keep because the setting is gone", async () => {
        seedSettings();
        useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#mine");
        useThemeStore.getState().updateThemeSetting("colors", "secondary_color", "#also-mine");
        saveThemeSettingChanges.mockRejectedValueOnce(conflict());
        getThemeSettings.mockResolvedValueOnce({
          settings: { global: { colors: [{ id: "primary_color", type: "color", value: "#theirs" }] } },
        });

        const result = await useThemeStore.getState().saveSettings("project-a");

        expect(result.conflict).toBe(true);
        expect(result.warnings).toEqual([{ id: "secondary_color", code: "SETTING_REMOVED" }]);
        expect(valueOf(useThemeStore.getState().settings, "primary_color")).toBe("#mine");
      });

      it("treats a refused older theme version the same way", async () => {
        seedSettings();
        useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#mine");
        saveThemeSettingChanges.mockRejectedValueOnce(conflict("THEME_VERSION_CHANGED"));
        getThemeSettings.mockResolvedValueOnce(withValues({}));

        expect(await useThemeStore.getState().saveSettings("project-a")).toMatchObject({ conflict: true });
      });

      it("rejects and keeps its state when the server copy cannot be read", async () => {
        seedSettings();
        useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#mine");
        const before = useThemeStore.getState();
        saveThemeSettingChanges.mockRejectedValueOnce(conflict());
        getThemeSettings.mockRejectedValueOnce(new Error("offline"));

        await expect(useThemeStore.getState().saveSettings("project-a")).rejects.toThrow("offline");
        expect(useThemeStore.getState().settings).toBe(before.settings);
        expect(useThemeStore.getState().originalSettings).toBe(before.originalSettings);
      });

      it("still throws any other 409, such as the active-project guard", async () => {
        seedSettings();
        useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#mine");
        saveThemeSettingChanges.mockRejectedValueOnce(
          Object.assign(new Error("mismatch"), { status: 409, code: "PROJECT_MISMATCH" }),
        );

        await expect(useThemeStore.getState().saveSettings("project-a")).rejects.toMatchObject({
          code: "PROJECT_MISMATCH",
        });
      });
    });

    describe("against a server without the change-only route", () => {
      it("rebaselines to what it sent when nothing was corrected", async () => {
        seedSettings();
        useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#0000ff");
        saveThemeSettingChanges.mockResolvedValueOnce({ theme: null, warnings: [] });

        const result = await useThemeStore.getState().saveSettings("project-a");

        expect(result.adopted).toBe(false);
        expect(getThemeSettings).not.toHaveBeenCalled();
        expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(false);
      });

      it("takes the corrected copy as it is when the draft was discarded during the save", async () => {
        seedSettings();
        useThemeStore.getState().updateThemeSetting("colors", "primary_color", "bad");
        const response = deferred();
        saveThemeSettingChanges.mockReturnValueOnce(response.promise);
        getThemeSettings.mockResolvedValueOnce(withValues({ primary: "#corrected" }));

        const saving = useThemeStore.getState().saveSettings("project-a");
        useThemeStore.getState().discardDraft();
        response.resolve({ theme: null, warnings: [{ code: "VALUE_CORRECTED" }] });
        await saving;

        expect(valueOf(useThemeStore.getState().settings, "primary_color")).toBe("#corrected");
        expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(false);
      });

      it("reads back what it corrected, keeping an edit made meanwhile", async () => {
        seedSettings();
        useThemeStore.getState().updateThemeSetting("colors", "primary_color", "bad");
        saveThemeSettingChanges.mockResolvedValueOnce({ theme: null, warnings: [{ code: "VALUE_CORRECTED" }] });
        const read = deferred();
        getThemeSettings.mockReturnValueOnce(read.promise);

        const saving = useThemeStore.getState().saveSettings("project-a");
        await vi.waitFor(() => expect(getThemeSettings).toHaveBeenCalled());
        useThemeStore.getState().updateThemeSetting("colors", "secondary_color", "#edited");
        read.resolve(withValues({ primary: "#corrected" }));
        await saving;

        const { settings, originalSettings } = useThemeStore.getState();
        expect(valueOf(originalSettings, "primary_color")).toBe("#corrected");
        expect(valueOf(settings, "primary_color")).toBe("#corrected");
        expect(valueOf(settings, "secondary_color")).toBe("#edited");
      });
    });

    it("tells the registered listener what it expected and what the server holds", async () => {
      const listener = vi.fn();
      useThemeStore.onServerThemeAdopted(listener);
      try {
        seedSettings();
        useThemeStore.getState().updateThemeSetting("colors", "primary_color", "bad");
        const sent = useThemeStore.getState().settings;
        const saved = withValues({ primary: "#000000" });
        saveThemeSettingChanges.mockResolvedValueOnce({ theme: saved, warnings: [] });

        await useThemeStore.getState().saveSettings("project-a");

        expect(listener).toHaveBeenCalledWith(sent, saved, saved);
      } finally {
        useThemeStore.onServerThemeAdopted(null);
      }
    });
  });

  describe("invalidate", () => {
    it("drops the loaded copy so the next screen loads it fresh", () => {
      seedSettings();
      const before = useThemeStore.getState().generation;
      useThemeStore.getState().invalidate();
      const state = useThemeStore.getState();
      expect(state.settings).toBeNull();
      expect(state.loadedProjectId).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.generation).toBe(before + 1);
    });
  });

  // --------------------------------------------------------------------------
  // updateThemeSetting
  // --------------------------------------------------------------------------

  describe("updateThemeSetting", () => {
    it("updates a setting and makes hasUnsavedThemeChanges return true", () => {
      seedSettings();
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(false);

      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#0000ff");

      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(true);
      const primary = useThemeStore.getState().settings.settings.global.colors
        .find((s) => s.id === "primary_color");
      expect(primary.value).toBe("#0000ff");
    });
  });

  // --------------------------------------------------------------------------
  // reconcileFromServer
  // --------------------------------------------------------------------------

  describe("reconcileFromServer", () => {
    const serverCopy = () => ({
      settings: { global: { colors: [{ id: "primary_color", type: "color", value: "#server" }] } },
    });

    it("takes the server's copy as both the baseline and the draft when nothing has moved", async () => {
      seedSettings();
      getThemeSettings.mockResolvedValue(serverCopy());
      const expected = useThemeStore.getState().settings;

      const fresh = await useThemeStore.getState().reconcileFromServer("project-a", expected);

      expect(fresh).toEqual(serverCopy());
      expect(useThemeStore.getState().settings).toEqual(serverCopy());
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(false);
    });

    // The editor stays editable while this request is in flight, and the
    // newest thing the user typed outranks what the server just told us.
    it("keeps a draft that moved while the request was in flight, and still rebaselines", async () => {
      seedSettings();
      const expected = useThemeStore.getState().settings;
      getThemeSettings.mockImplementation(async () => {
        useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#typed");
        return serverCopy();
      });

      await useThemeStore.getState().reconcileFromServer("project-a", expected);

      expect(useThemeStore.getState().settings.settings.global.colors[0].value).toBe("#typed");
      expect(useThemeStore.getState().originalSettings).toEqual(serverCopy());
      // A newer edit against the server's copy is exactly what dirty means.
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(true);
    });

    it("writes nothing once the store has moved to another project", async () => {
      seedSettings();
      const expected = useThemeStore.getState().settings;
      getThemeSettings.mockImplementation(async () => {
        useThemeStore.setState({ loadedProjectId: "project-b" });
        return serverCopy();
      });

      const fresh = await useThemeStore.getState().reconcileFromServer("project-a", expected);

      expect(fresh).toBeNull();
      expect(useThemeStore.getState().settings).toEqual(expected);
      expect(useThemeStore.getState().originalSettings).toEqual(expected);
    });

    it("writes nothing when a newer load started while the request was in flight", async () => {
      seedSettings();
      const expected = useThemeStore.getState().settings;
      getThemeSettings.mockImplementation(async () => {
        useThemeStore.setState((prev) => ({ activeLoadId: prev.activeLoadId + 1 }));
        return serverCopy();
      });

      const fresh = await useThemeStore.getState().reconcileFromServer("project-a", expected);

      expect(fresh).toBeNull();
      expect(useThemeStore.getState().originalSettings).toEqual(expected);
    });

    // A reconcile used to bump the load counter, so a load already running
    // dropped its own result and never cleared `loading` (Settings stuck on its spinner).
    it("lets a load that is already running finish and clear its spinner", async () => {
      seedSettings();
      let resolveLoad;
      getThemeSettings
        .mockImplementationOnce(() => new Promise((resolve) => { resolveLoad = resolve; }))
        .mockResolvedValueOnce(serverCopy());

      const loading = useThemeStore.getState().loadSettings("project-a");
      expect(useThemeStore.getState().loading).toBe(true);
      await useThemeStore.getState().reconcileFromServer("project-a", useThemeStore.getState().settings);
      resolveLoad(serverCopy());
      await loading;

      expect(useThemeStore.getState().loading).toBe(false);
      expect(useThemeStore.getState().settings).toEqual(serverCopy());
    });

    it("leaves the store untouched when the read fails", async () => {
      seedSettings();
      const expected = useThemeStore.getState().settings;
      getThemeSettings.mockRejectedValue(new Error("offline"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const fresh = await useThemeStore.getState().reconcileFromServer("project-a", expected);

      expect(fresh).toBeNull();
      expect(useThemeStore.getState().settings).toEqual(expected);
      expect(useThemeStore.getState().originalSettings).toEqual(expected);
      errorSpy.mockRestore();
    });
  });

  // --------------------------------------------------------------------------
  // resetThemeSettings
  // --------------------------------------------------------------------------

  describe("resetThemeSettings", () => {
    it("reverts to original settings", () => {
      seedSettings();
      useThemeStore.getState().updateThemeSetting("colors", "primary_color", "#changed");
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(true);

      useThemeStore.getState().resetThemeSettings();
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // resetForProjectChange
  // --------------------------------------------------------------------------

  describe("resetForProjectChange", () => {
    it("clears all state", () => {
      seedSettings();
      useThemeStore.getState().resetForProjectChange();

      const state = useThemeStore.getState();
      expect(state.settings).toBeNull();
      expect(state.originalSettings).toBeNull();
      expect(state.loadedProjectId).toBeNull();
    });

    it("invalidates in-flight loads so stale responses are dropped", async () => {
      seedSettings();

      // Start a slow load
      const slowResponse = {
        settings: { global: { colors: [{ id: "c1", value: "#stale" }] } },
      };
      let resolveSlowLoad;
      getThemeSettings.mockImplementationOnce(
        () => new Promise((resolve) => { resolveSlowLoad = resolve; }),
      );

      const loadPromise = useThemeStore.getState().loadSettings("project-b");

      // Reset mid-flight — should bump activeLoadId
      useThemeStore.getState().resetForProjectChange();
      expect(useThemeStore.getState().settings).toBeNull();

      // Now the slow load resolves
      resolveSlowLoad(slowResponse);
      await loadPromise;

      // The stale response should have been dropped
      expect(useThemeStore.getState().settings).toBeNull();
      expect(useThemeStore.getState().loadedProjectId).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Project-switch coordination
  // --------------------------------------------------------------------------

  describe("project-switch coordination", () => {
    it("clears stale settings immediately when loading a different project", async () => {
      seedSettings();

      let resolveLoad;
      getThemeSettings.mockImplementationOnce(
        () => new Promise((resolve) => { resolveLoad = resolve; }),
      );

      const loadPromise = useThemeStore.getState().loadSettings("project-b");

      const stateWhileLoading = useThemeStore.getState();
      expect(stateWhileLoading.loading).toBe(true);
      expect(stateWhileLoading.loadedProjectId).toBe("project-b");
      expect(stateWhileLoading.settings).toBeNull();
      expect(stateWhileLoading.originalSettings).toBeNull();

      resolveLoad({ settings: { global: { colors: [{ id: "c1", value: "#bbb" }] } } });
      await loadPromise;
    });

    it("switching projects mid-load drops the first project's response", async () => {
      let resolveA;
      const dataA = { settings: { global: { colors: [{ id: "c1", value: "#aaa" }] } } };
      const dataB = { settings: { global: { colors: [{ id: "c1", value: "#bbb" }] } } };

      getThemeSettings
        .mockImplementationOnce(() => new Promise((r) => { resolveA = r; }))
        .mockResolvedValueOnce(dataB);

      // Start loading project A
      const loadA = useThemeStore.getState().loadSettings("project-a");
      // Immediately start loading project B (simulates project switch)
      const loadB = useThemeStore.getState().loadSettings("project-b");

      await loadB;

      // B should be loaded
      expect(useThemeStore.getState().loadedProjectId).toBe("project-b");
      expect(useThemeStore.getState().settings).toEqual(dataB);

      // Now A's slow response arrives
      resolveA(dataA);
      await loadA;

      // A's response should be dropped — B should still be current
      expect(useThemeStore.getState().loadedProjectId).toBe("project-b");
      expect(useThemeStore.getState().settings).toEqual(dataB);
    });

    it("loading the same project preserves unsaved draft", async () => {
      const serverData = { settings: { global: { colors: [{ id: "c1", value: "#server" }] } } };
      getThemeSettings.mockResolvedValueOnce(serverData);

      await useThemeStore.getState().loadSettings("project-a");

      // User edits a setting (creates a draft)
      useThemeStore.getState().updateThemeSetting("colors", "c1", "#draft");
      expect(useThemeStore.getState().hasUnsavedThemeChanges()).toBe(true);

      // loadSettings for the same project should be skippable by callers
      // (pageStore does this check), but if called directly it refetches
      getThemeSettings.mockResolvedValueOnce(serverData);
      await useThemeStore.getState().loadSettings("project-a");

      // Direct loadSettings always refetches — draft is lost
      // This is correct; the skip logic lives in pageStore.loadPage()
      expect(useThemeStore.getState().settings).toEqual(serverData);
    });
  });
});

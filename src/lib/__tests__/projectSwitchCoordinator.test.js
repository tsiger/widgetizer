import { describe, expect, it, vi } from "vitest";

import { handleActiveProjectChange, shouldResetProjectScopedStores } from "../projectSwitchCoordinator";

describe("projectSwitchCoordinator", () => {
  it("does not reset when there was no previous project", () => {
    expect(shouldResetProjectScopedStores(null, "project-b")).toBe(false);
  });

  it("does not reset when the project did not change", () => {
    expect(shouldResetProjectScopedStores("project-a", "project-a")).toBe(false);
  });

  it("resets when switching from one project to another", () => {
    expect(shouldResetProjectScopedStores("project-a", "project-b")).toBe(true);
  });

  it("resets when leaving a project context entirely", () => {
    expect(shouldResetProjectScopedStores("project-a", null)).toBe(true);
  });

  it("runs all project-scoped reset actions on change", () => {
    const themeReset = vi.fn();
    const widgetReset = vi.fn();
    const autoSaveReset = vi.fn();
    const clearPage = vi.fn();

    const didReset = handleActiveProjectChange({
      prevProjectId: "project-a",
      nextProjectId: "project-b",
      themeStore: { getState: () => ({ resetForProjectChange: themeReset }) },
      widgetStore: { getState: () => ({ resetForProjectChange: widgetReset }) },
      autoSaveStore: { getState: () => ({ reset: autoSaveReset }) },
      pageStore: { getState: () => ({ clearPage }) },
    });

    expect(didReset).toBe(true);
    expect(themeReset).toHaveBeenCalledTimes(1);
    expect(widgetReset).toHaveBeenCalledTimes(1);
    expect(autoSaveReset).toHaveBeenCalledTimes(1);
    expect(clearPage).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the project identity is unchanged", () => {
    const themeReset = vi.fn();
    const widgetReset = vi.fn();
    const autoSaveReset = vi.fn();
    const clearPage = vi.fn();

    const didReset = handleActiveProjectChange({
      prevProjectId: "project-a",
      nextProjectId: "project-a",
      themeStore: { getState: () => ({ resetForProjectChange: themeReset }) },
      widgetStore: { getState: () => ({ resetForProjectChange: widgetReset }) },
      autoSaveStore: { getState: () => ({ reset: autoSaveReset }) },
      pageStore: { getState: () => ({ clearPage }) },
    });

    expect(didReset).toBe(false);
    expect(themeReset).not.toHaveBeenCalled();
    expect(widgetReset).not.toHaveBeenCalled();
    expect(autoSaveReset).not.toHaveBeenCalled();
    expect(clearPage).not.toHaveBeenCalled();
  });
});

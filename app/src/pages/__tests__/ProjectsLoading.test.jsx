// @vitest-environment jsdom
/**
 * The projects list shows its spinner until the projects arrive, and says so
 * when they can't be read.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getAllProjects = vi.fn();
const showToast = vi.fn();

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("@widgetizer/editor-ui/queries/projectManager", () => ({
  getAllProjects: (...args) => getAllProjects(...args),
  deleteProject: vi.fn(),
  duplicateProject: vi.fn(),
  setActiveProject: vi.fn(),
  exportProject: vi.fn(),
}));
vi.mock("@widgetizer/editor-ui/stores/projectStore", () => {
  const state = { activeProject: { id: "p1" }, fetchActiveProject: vi.fn() };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("@widgetizer/editor-ui/stores/toastStore", () => {
  const state = { showToast: (...args) => showToast(...args) };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("@widgetizer/editor-ui/hooks/useFormatDate", () => ({ default: () => ({ formatDate: (d) => String(d) }) }));
vi.mock("@widgetizer/editor-ui/components/layout/PageLayout.jsx", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("@widgetizer/editor-ui/components/ui/LoadingSpinner.jsx", () => ({ default: () => <p>spinner</p> }));
vi.mock("../../components/projects/ProjectImportModal", () => ({ default: () => null }));

const { default: Projects } = await import("../Projects.jsx");

let pending;
beforeEach(() => {
  pending = [];
  showToast.mockReset();
  getAllProjects.mockReset().mockImplementation(() => new Promise((resolve, reject) => pending.push({ resolve, reject })));
});
afterEach(cleanup);

const project = (id, name) => ({ id, name, folderName: id, theme: "arch", updated: "2026-01-01", created: "2026-01-01" });

describe("the projects list while it loads", () => {
  it("shows the spinner until the projects arrive", async () => {
    render(<Projects />, { wrapper: MemoryRouter });
    expect(screen.getByText("spinner")).toBeTruthy();
    await act(async () => pending[0].resolve([project("p1", "Brightside"), project("p2", "Brewline")]));
    expect(screen.queryByText("spinner")).toBeNull();
    expect(screen.getByText("Brightside")).toBeTruthy();
    expect(screen.getByText("Brewline")).toBeTruthy();
  });

  it("says so when the projects can't be read, and stops the spinner", async () => {
    render(<Projects />, { wrapper: MemoryRouter });
    await act(async () => pending[0].reject(new Error("offline")));
    expect(screen.queryByText("spinner")).toBeNull();
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith("offline", "error");
  });
});

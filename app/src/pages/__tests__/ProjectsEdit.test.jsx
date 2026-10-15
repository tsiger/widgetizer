// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const getAllProjects = vi.fn();
const updateProject = vi.fn();
const getActiveProject = vi.fn();
const checkThemeUpdates = vi.fn();
const applyThemeUpdate = vi.fn();
const invalidateTheme = vi.fn();
let storeState;

vi.mock("@widgetizer/editor-ui/queries/projectManager", () => ({
  getAllProjects: (...args) => getAllProjects(...args),
  checkThemeUpdates: (...args) => checkThemeUpdates(...args),
  updateProject: (...args) => updateProject(...args),
  getActiveProject: (...args) => getActiveProject(...args),
  applyThemeUpdate: (...args) => applyThemeUpdate(...args),
}));
vi.mock("@widgetizer/editor-ui/stores/themeStore", () => ({
  default: { getState: () => ({ invalidate: invalidateTheme }) },
}));
vi.mock("@widgetizer/editor-ui/stores/projectStore", () => {
  const hook = (selector) => (selector ? selector(storeState) : storeState);
  hook.getState = () => storeState;
  return { default: hook };
});
vi.mock("@widgetizer/editor-ui/stores/toastStore", () => {
  const state = { showToast: vi.fn() };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("@widgetizer/editor-ui/hooks/useGuardedFormPage", () => ({
  default: () => ({ navigateSafely: vi.fn(), getDirtyTitle: (title) => title }),
}));
vi.mock("@widgetizer/editor-ui/components/layout/PageLayout.jsx", () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock("../../components/projects/ProjectForm.jsx", () => ({
  default: ({ onSubmit }) => (
    <>
      <p>project form</p>
      <button type="button" onClick={() => onSubmit({ name: "Bakery", folderName: "bakery-new" })}>
        submit form
      </button>
    </>
  ),
}));

import ProjectsEdit from "../ProjectsEdit.jsx";
import useToastStore from "@widgetizer/editor-ui/stores/toastStore";

function openDetails(id) {
  render(
    <MemoryRouter initialEntries={[`/projects/edit/${id}`]}>
      <Routes>
        <Route path="/projects/edit/:id" element={<ProjectsEdit />} />
        <Route path="/projects" element={<p>projects list</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getAllProjects.mockReset();
  checkThemeUpdates.mockReset().mockResolvedValue({ hasUpdate: false });
  applyThemeUpdate.mockReset();
  invalidateTheme.mockReset();
  getAllProjects.mockResolvedValue([
    { id: "p1", name: "Bakery" },
    { id: "p2", name: "Café" },
  ]);
});

describe("ProjectsEdit — active project only", () => {
  it("shows the details of the active project", async () => {
    storeState = { activeProject: { id: "p1" }, loading: false, setActiveProject: vi.fn() };
    openDetails("p1");
    expect(await screen.findByText("project form")).toBeInTheDocument();
  });

  it("sends another project's details back to the Projects list without loading it", async () => {
    storeState = { activeProject: { id: "p1" }, loading: false, setActiveProject: vi.fn() };
    openDetails("p2");
    expect(await screen.findByText("projects list")).toBeInTheDocument();
    expect(getAllProjects).not.toHaveBeenCalled();
  });

  it("waits for the active project to load before deciding", () => {
    storeState = { activeProject: null, loading: true, setActiveProject: vi.fn() };
    openDetails("p1");
    expect(screen.queryByText("projects list")).toBeNull();
    expect(screen.queryByText("project form")).toBeNull();
  });
});

// Site settings and the editor keep the theme settings they loaded until the
// project changes; saving that copy after an update used to put the old theme back.
describe("ProjectsEdit — applying a theme update", () => {
  it("drops the loaded theme settings so the next screen loads the updated ones", async () => {
    storeState = { activeProject: { id: "p1" }, loading: false, setActiveProject: vi.fn() };
    checkThemeUpdates.mockResolvedValue({ hasUpdate: true, currentVersion: "0.9.9", latestVersion: "0.9.10" });
    applyThemeUpdate.mockResolvedValue({ success: true, previousVersion: "0.9.9", newVersion: "0.9.10" });
    openDetails("p1");

    fireEvent.click(await screen.findByRole("button", { name: /apply update/i }));

    await waitFor(() => expect(invalidateTheme).toHaveBeenCalledTimes(1));
  });

  it("leaves the loaded theme settings alone when nothing was applied", async () => {
    storeState = { activeProject: { id: "p1" }, loading: false, setActiveProject: vi.fn() };
    checkThemeUpdates.mockResolvedValue({ hasUpdate: true, currentVersion: "0.9.9", latestVersion: "0.9.10" });
    applyThemeUpdate.mockResolvedValue({ success: false, message: "No update available" });
    openDetails("p1");

    fireEvent.click(await screen.findByRole("button", { name: /apply update/i }));

    await waitFor(() => expect(applyThemeUpdate).toHaveBeenCalled());
    expect(invalidateTheme).not.toHaveBeenCalled();
  });
});

describe("ProjectsEdit — folder rename", () => {
  beforeEach(() => {
    storeState = { activeProject: { id: "p1" }, loading: false, setActiveProject: vi.fn() };
    getAllProjects.mockResolvedValue([{ id: "p1", name: "Bakery", folderName: "bakery" }]);
    getActiveProject.mockReset().mockResolvedValue({ id: "p1", name: "Bakery", folderName: "bakery-new" });
    useToastStore.getState().showToast.mockReset();
  });

  it("warns, until dismissed, when the old folder could not be fully removed", async () => {
    updateProject.mockReset().mockResolvedValue({
      id: "p1",
      name: "Bakery",
      folderName: "bakery-new",
      folderLeftBehind: "/data/projects/bakery",
    });
    openDetails("p1");
    fireEvent.click(await screen.findByText("submit form"));

    const { showToast } = useToastStore.getState();
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith(expect.any(String), "warning", { duration: null });
  });

  it("reports a plain success when the rename left nothing behind", async () => {
    updateProject.mockReset().mockResolvedValue({ id: "p1", name: "Bakery", folderName: "bakery-new" });
    openDetails("p1");
    fireEvent.click(await screen.findByText("submit form"));

    const { showToast } = useToastStore.getState();
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith(expect.any(String), "success");
  });
});

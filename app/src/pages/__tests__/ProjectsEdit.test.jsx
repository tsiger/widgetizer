// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const getAllProjects = vi.fn();
let storeState;

vi.mock("@widgetizer/editor-ui/queries/projectManager", () => ({
  getAllProjects: (...args) => getAllProjects(...args),
  checkThemeUpdates: async () => ({ hasUpdate: false }),
  updateProject: vi.fn(),
  getActiveProject: vi.fn(),
  applyThemeUpdate: vi.fn(),
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
  default: () => <p>project form</p>,
}));

import ProjectsEdit from "../ProjectsEdit.jsx";

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

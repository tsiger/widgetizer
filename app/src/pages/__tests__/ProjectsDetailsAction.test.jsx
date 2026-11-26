// @vitest-environment jsdom
/**
 * The projects list offers "Project details" in the active project's row menu
 * only, because the details page opens for the active project alone.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const getAllProjects = vi.fn();

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
  const state = { showToast: vi.fn() };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("@widgetizer/editor-ui/hooks/useFormatDate", () => ({ default: () => ({ formatDate: (d) => String(d) }) }));
vi.mock("@widgetizer/editor-ui/components/layout/PageLayout.jsx", () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock("../../components/projects/ProjectImportModal", () => ({ default: () => null }));

const { default: Projects } = await import("../Projects.jsx");

const project = (id, name) => ({
  id,
  name,
  folderName: id,
  theme: "arch",
  updated: "2026-01-01",
  created: "2026-01-01",
});

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

async function renderList() {
  render(
    <MemoryRouter initialEntries={["/projects"]}>
      <Routes>
        <Route path="/projects" element={<Projects />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  await act(async () => {});
}

const openRowMenu = (name) =>
  fireEvent.click(within(screen.getByText(name).closest("tr")).getByLabelText("projects.actions.menu"));

beforeEach(() => {
  getAllProjects.mockReset().mockResolvedValue([project("p2", "Brewline"), project("p1", "Brightside")]);
});
afterEach(cleanup);

describe("the projects list's Project details action", () => {
  it("opens the active project's details page from its row menu", async () => {
    await renderList();
    openRowMenu("Brightside");
    expect(screen.queryByText("projects.actions.setActive")).toBeNull();
    fireEvent.click(screen.getByText("navigation.projectDetails"));
    expect(screen.getByTestId("where").textContent).toBe("/projects/edit/p1");
  });

  it("is not offered on a project that isn't active", async () => {
    await renderList();
    openRowMenu("Brewline");
    expect(screen.getByText("projects.actions.setActive")).toBeTruthy();
    expect(screen.queryByText("navigation.projectDetails")).toBeNull();
  });
});

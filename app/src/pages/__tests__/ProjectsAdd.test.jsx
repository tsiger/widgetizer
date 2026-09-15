// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const createProject = vi.fn();
const setActiveProject = vi.fn();
const updateProject = vi.fn();
const uploadProjectMedia = vi.fn();
const fetchActiveProject = vi.fn();
const showToast = vi.fn();
const navigateSafely = vi.fn();
let formData;

vi.mock("@widgetizer/editor-ui/queries/projectManager", () => ({
  createProject: (...args) => createProject(...args),
  setActiveProject: (...args) => setActiveProject(...args),
  updateProject: (...args) => updateProject(...args),
}));
vi.mock("@widgetizer/editor-ui/queries/mediaManager", () => ({
  uploadProjectMedia: (...args) => uploadProjectMedia(...args),
}));
vi.mock("@widgetizer/editor-ui/stores/projectStore", () => {
  const state = { fetchActiveProject: (...args) => fetchActiveProject(...args) };
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
vi.mock("@widgetizer/editor-ui/hooks/useGuardedFormPage", () => ({
  default: () => ({ navigateSafely: (...args) => navigateSafely(...args), getDirtyTitle: (title) => title }),
}));
vi.mock("@widgetizer/editor-ui/components/layout/PageLayout.jsx", () => ({
  default: ({ children }) => <div>{children}</div>,
}));
vi.mock("../../components/projects/ProjectForm.jsx", () => ({
  default: ({ onSubmit }) => (
    <button type="button" onClick={() => onSubmit(formData)}>
      create
    </button>
  ),
}));

import ProjectsAdd from "../ProjectsAdd.jsx";

const LOGO = new File(["png"], "logo.png", { type: "image/png" });
const CREATED = { id: "p1", name: "Crumbly", siteIdentity: { email: "hello@crumbly.example" } };

function create() {
  render(
    <MemoryRouter>
      <ProjectsAdd />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "create" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  createProject.mockResolvedValue(CREATED);
  setActiveProject.mockResolvedValue({});
  fetchActiveProject.mockResolvedValue();
  updateProject.mockResolvedValue({});
  uploadProjectMedia.mockResolvedValue({ processedFiles: [{ path: "/uploads/images/logo.png" }], rejectedFiles: [] });
  formData = { name: "Crumbly", theme: "arch", siteIdentity: CREATED.siteIdentity, logoFile: LOGO };
});

describe("ProjectsAdd — logo", () => {
  it("uploads the logo once the new project is active, then saves it as the logo", async () => {
    create();
    await waitFor(() => expect(navigateSafely).toHaveBeenCalled());

    expect(createProject.mock.calls[0][0]).not.toHaveProperty("logoFile");
    expect(uploadProjectMedia).toHaveBeenCalledWith("p1", [LOGO]);
    expect(fetchActiveProject.mock.invocationCallOrder[0]).toBeLessThan(uploadProjectMedia.mock.invocationCallOrder[0]);
    expect(updateProject).toHaveBeenCalledWith("p1", {
      name: "Crumbly",
      siteIdentity: { email: "hello@crumbly.example", logo: "/uploads/images/logo.png" },
    });
    expect(showToast).not.toHaveBeenCalledWith(expect.anything(), "warning");
  });

  it("uploads nothing when no logo was chosen", async () => {
    formData = { ...formData, logoFile: undefined };
    create();
    await waitFor(() => expect(navigateSafely).toHaveBeenCalled());

    expect(uploadProjectMedia).not.toHaveBeenCalled();
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("keeps the new project and warns when the upload is rejected", async () => {
    uploadProjectMedia.mockResolvedValue({ processedFiles: [], rejectedFiles: [{ originalName: "logo.png" }] });
    create();
    await waitFor(() => expect(navigateSafely).toHaveBeenCalled());

    expect(updateProject).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("projectsAdd.toasts.logoError", "warning");
  });

  it("keeps the new project and warns when saving the logo fails", async () => {
    updateProject.mockRejectedValue(new Error("nope"));
    create();
    await waitFor(() => expect(navigateSafely).toHaveBeenCalled());

    expect(showToast).toHaveBeenCalledWith("projectsAdd.toasts.logoError", "warning");
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

let projectState;
const showToast = vi.fn();

vi.mock("@widgetizer/editor-ui/lib/apiFetch", () => ({
  apiFetch: async () => ({ ok: true, json: async () => [{ id: "arch", name: "Arch", version: "0.9.10" }] }),
}));
vi.mock("@widgetizer/editor-ui/stores/projectStore", () => {
  const hook = (selector) => (selector ? selector(projectState) : projectState);
  hook.getState = () => projectState;
  return { default: hook };
});
vi.mock("@widgetizer/editor-ui/stores/toastStore", () => {
  const state = { showToast: (...args) => showToast(...args) };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
let languagesFetchJson;
vi.mock("@widgetizer/editor-ui/lib/apiFetch", async (importOriginal) => ({
  ...(await importOriginal()),
  editorFetchJson: (...args) => languagesFetchJson(...args),
}));
vi.mock("@widgetizer/editor-ui/queries/projectManager", () => ({
  invalidateProjectsListCache: vi.fn(),
  getAllProjects: async () => [],
}));
vi.mock("@widgetizer/editor-ui/queries/themeManager", () => ({
  getThemePresets: async () => ({ default: null, presets: [] }),
  getPresetScreenshotUrl: () => "",
  getThemeSettings: async () => ({}),
}));
vi.mock("@widgetizer/editor-ui/components/settings/inputs/ImageInput.jsx", () => ({
  default: () => <div data-testid="image-input" />,
}));
vi.mock("@widgetizer/editor-ui/hooks/useAppSettings", () => ({
  default: () => ({ settings: { media: { maxFileSizeMB: 5 } } }),
}));

import ProjectForm from "../ProjectForm.jsx";

const PROJECT = {
  id: "project-1",
  name: "Crumbly",
  folderName: "crumbly",
  theme: "arch",
  themeVersion: "0.9.10",
  siteTitle: "Crumbly",
  siteUrl: "",
  siteIdentity: { category: "bakery" },
};

const tab = (key) => screen.getByRole("tab", { name: new RegExp(`^forms\\.project\\.tabs\\.${key}$`) });
const panel = (key) => document.getElementById(`project-panel-${key}`);

function renderForm(overrides = {}) {
  const onSubmit = vi.fn(async () => false);
  render(
    <ProjectForm
      initialData={{ ...PROJECT, ...overrides }}
      onSubmit={onSubmit}
      isSubmitting={false}
      isDirty
      submitLabel="Save"
    />,
  );
  return onSubmit;
}

beforeEach(() => {
  showToast.mockReset();
  Element.prototype.scrollIntoView = () => {};
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  projectState = { activeProject: { id: "project-1" }, setActiveProject: vi.fn() };
  languagesFetchJson = vi.fn(async () => ({}));
});

describe("ProjectForm — edit page tabs", () => {
  it("shows four tabs with General open and the readiness line inside Identity", async () => {
    renderForm();
    await screen.findByRole("tablist");

    expect(panel("identity").querySelector("[role=status]")).not.toBeNull();
    expect(screen.getAllByRole("tab").map((element) => element.id)).toEqual([
      "project-tab-general",
      "project-tab-site",
      "project-tab-identity",
      "project-tab-business",
    ]);
    expect(panel("general")).toBeVisible();
    expect(panel("site")).not.toBeVisible();
    expect(screen.queryByRole("button", { name: /forms\.project\.moreSettings/ })).toBeNull();

    fireEvent.click(tab("site"));
    expect(panel("site")).toBeVisible();
    expect(document.getElementById("siteUrl")).toBeVisible();
  });

  it("drops the Business details tab for a category that is not a local business", async () => {
    renderForm({ siteIdentity: { category: "organization" } });
    await screen.findByRole("tablist");
    expect(document.getElementById("project-tab-business")).toBeNull();
  });

  it("opens the tab with the problem and marks it when a save is blocked", async () => {
    const onSubmit = renderForm();
    await screen.findByRole("tablist");

    fireEvent.click(tab("identity"));
    fireEvent.change(document.getElementById("identity-email"), { target: { value: "not-an-email" } });
    fireEvent.click(tab("general"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(panel("identity")).toBeVisible());
    expect(screen.getByRole("tab", { name: /identity/ }).querySelector("span[title]")).not.toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("opens the Site tab for an invalid Site Address", async () => {
    const onSubmit = renderForm();
    await screen.findByRole("tablist");

    fireEvent.click(tab("site"));
    fireEvent.change(document.getElementById("siteUrl"), { target: { value: "not a url" } });
    fireEvent.click(tab("identity"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(panel("site")).toBeVisible());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("jumps from a missing readiness item to its field", async () => {
    renderForm();
    await screen.findByRole("tablist");

    fireEvent.click(tab("identity"));
    fireEvent.click(screen.getByRole("button", { name: "forms.project.identity.readinessItems.siteUrl" }));
    await waitFor(() => expect(panel("site")).toBeVisible());
    await waitFor(() => expect(document.activeElement?.id).toBe("siteUrl"));
  });
});

describe("ProjectForm — new project", () => {
  function renderNew() {
    const onSubmit = vi.fn(async () => false);
    render(<ProjectForm onSubmit={onSubmit} isSubmitting={false} isDirty submitLabel="Create" />);
    return onSubmit;
  }

  it("uses the same tabs as the edit page, with the theme picker in General", async () => {
    renderNew();
    await screen.findByRole("tablist");

    expect(screen.getAllByRole("tab").map((element) => element.id)).toEqual([
      "project-tab-general",
      "project-tab-site",
      "project-tab-identity",
    ]);
    expect(document.getElementById("theme")).toBeVisible();
    expect(screen.queryByRole("button", { name: /moreSettings/ })).toBeNull();

    fireEvent.click(tab("identity"));
    expect(document.getElementById("identity-logo-file")).not.toBeNull();
    expect(screen.queryByTestId("image-input")).toBeNull();
  });

  it("sends the chosen logo file with the new project", async () => {
    const onSubmit = renderNew();
    await screen.findByRole("tablist");

    fireEvent.change(document.getElementById("name"), { target: { value: "Crumbly" } });
    fireEvent.change(document.getElementById("theme"), { target: { value: "arch" } });
    fireEvent.click(tab("identity"));
    const file = new File(["png"], "logo.png", { type: "image/png" });
    fireEvent.change(document.getElementById("identity-logo-file"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].logoFile).toBe(file);
  });

  it("creates a project whose title gives an empty folder name, leaving the fallback to the server", async () => {
    const onSubmit = renderNew();
    await screen.findByRole("tablist");

    fireEvent.change(document.getElementById("name"), { target: { value: "東京" } });
    fireEvent.change(document.getElementById("theme"), { target: { value: "arch" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: "東京", folderName: "" });
  });

  it("sends the site identity with the new project", async () => {
    const onSubmit = renderNew();
    await screen.findByRole("tablist");

    fireEvent.change(document.getElementById("name"), { target: { value: "Crumbly" } });
    fireEvent.change(document.getElementById("theme"), { target: { value: "arch" } });
    fireEvent.click(tab("identity"));
    fireEvent.change(document.getElementById("identity-publicName"), { target: { value: "Crumbly Bakery" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].siteIdentity).toEqual({ text: { publicName: "Crumbly Bakery" } });
  });
});

describe("site languages", () => {
  const defaultSelect = () => document.getElementById("defaultLanguage");

  it("offers the default language on the Site tab, with the list once the project exists", async () => {
    renderForm();
    await screen.findByRole("tablist");
    fireEvent.click(tab("site"));

    expect(defaultSelect()).toBeTruthy();
    expect(panel("site").textContent).toContain("forms.project.languages.title");
    expect(screen.getByLabelText("forms.project.languages.addLabel")).toBeTruthy();
  });

  it("keeps the list out of a new project, which has no content to copy yet", async () => {
    render(<ProjectForm onSubmit={vi.fn(async () => false)} isSubmitting={false} isDirty submitLabel="Create" />);
    await screen.findByRole("tablist");
    fireEvent.click(tab("site"));

    expect(defaultSelect()).toBeTruthy();
    expect(screen.queryByLabelText("forms.project.languages.addLabel")).toBeNull();
  });

  it("locks the default language once the site has another, and says why", async () => {
    renderForm({ defaultLanguage: "en", languages: ["el"] });
    await screen.findByRole("tablist");
    fireEvent.click(tab("site"));

    expect(defaultSelect().disabled).toBe(true);
    expect(panel("site").textContent).toContain("forms.project.languages.defaultLockedHelp");
  });

  it("leaves it editable while the site has one language", async () => {
    renderForm({ defaultLanguage: "en", languages: [] });
    await screen.findByRole("tablist");
    fireEvent.click(tab("site"));

    expect(defaultSelect().disabled).toBe(false);
    expect(panel("site").textContent).toContain("forms.project.languages.defaultHelp");
  });

  it("keeps a stored regional default selected rather than blank", async () => {
    renderForm({ defaultLanguage: "pt-br" });
    await screen.findByRole("tablist");
    fireEvent.click(tab("site"));

    expect(defaultSelect().value).toBe("pt-br");
    expect([...defaultSelect().options].some((option) => option.value === "pt-br")).toBe(true);
  });

  it("stops the language actions when the default is edited before saving", async () => {
    renderForm({ defaultLanguage: "en", languages: [] });
    await screen.findByRole("tablist");
    fireEvent.click(tab("site"));

    fireEvent.change(defaultSelect(), { target: { value: "el" } });
    expect(screen.getByLabelText("forms.project.languages.addLabel").disabled).toBe(true);
    expect(panel("site").textContent).toContain("forms.project.languages.saveDefaultFirst");
  });

  it("holds the default still while a language request is in flight", async () => {
    // The response decides whether the default is locked, and it answers about
    // the language the server holds — so a change made meanwhile must not stick.
    let release;
    languagesFetchJson = vi.fn(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ id: "project-1", languages: ["it"] });
        }),
    );
    renderForm({ defaultLanguage: "en", languages: [] });
    await screen.findByRole("tablist");
    fireEvent.click(tab("site"));

    fireEvent.change(screen.getByLabelText("forms.project.languages.addLabel"), { target: { value: "it" } });
    fireEvent.click(screen.getByRole("button", { name: /forms\.project\.languages\.addButton/ }));

    await waitFor(() => expect(defaultSelect().disabled).toBe(true));

    release();
    await waitFor(() => expect(defaultSelect().value).toBe("en"));
    expect(defaultSelect().disabled).toBe(true);
  });

  it("saves the default language with the rest of the form", async () => {
    const onSubmit = renderForm({ defaultLanguage: "en" });
    await screen.findByRole("tablist");
    fireEvent.click(tab("site"));
    fireEvent.change(defaultSelect(), { target: { value: "el" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ defaultLanguage: "el" });
    expect(onSubmit.mock.calls[0][0].languages).toBeUndefined();
  });
});

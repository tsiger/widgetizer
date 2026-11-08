// @vitest-environment jsdom
/**
 * A new project's presets: choosing a theme loads its presets and picks its
 * default one; another theme loads its own; a theme without a default, or
 * presets that can't be read, leave no preset chosen. Editing a project reads
 * no presets.
 */
import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

let projectState;
const showToast = vi.fn();

vi.mock("@widgetizer/editor-ui/stores/projectStore", () => {
  const hook = (selector) => (selector ? selector(projectState) : projectState);
  hook.getState = () => projectState;
  // The logo picker reaches MediaDrawer, which reads the site's languages.
  return {
    default: hook,
    useDefaultLanguage: () => projectState.activeProject?.defaultLanguage || "en",
    useExtraLanguages: () => projectState.activeProject?.languages || [],
    useIsMultilang: () => (projectState.activeProject?.languages?.length ?? 0) > 0,
  };
});
vi.mock("@widgetizer/editor-ui/stores/toastStore", () => {
  const state = { showToast: (...args) => showToast(...args) };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
let languagesFetchJson;
// One mock for the module: a second vi.mock of the same path replaces the first,
// which is how the theme-list stub below went missing and left the picker empty.
vi.mock("@widgetizer/editor-ui/lib/apiFetch", async (importOriginal) => ({
  ...(await importOriginal()),
  apiFetch: async () => ({
    ok: true,
    json: async () => [
      { id: "arch", name: "Arch", version: "0.9.10" },
      { id: "bedrock", name: "Bedrock", version: "1.0.0" },
    ],
  }),
  editorFetchJson: (...args) => languagesFetchJson(...args),
}));
vi.mock("@widgetizer/editor-ui/queries/projectManager", () => ({
  invalidateProjectsListCache: vi.fn(),
  getAllProjects: async () => [],
}));
const getThemePresets = vi.fn();
vi.mock("@widgetizer/editor-ui/queries/themeManager", () => ({
  getThemePresets: (...args) => getThemePresets(...args),
  getPresetScreenshotUrl: () => "",
  getThemeSettings: async () => ({}),
}));
vi.mock("@widgetizer/editor-ui/components/settings/inputs/ImageInput.jsx", () => ({
  default: () => <div data-testid="image-input" />,
}));
vi.mock("@widgetizer/editor-ui/hooks/useAppSettings", () => ({
  default: () => ({ settings: { media: { maxFileSizeMB: 5 } } }),
}));

const { default: ProjectForm } = await import("../ProjectForm.jsx");

const ARCH_PRESETS = {
  default: "brightside",
  presets: [
    { id: "brightside", name: "Brightside" },
    { id: "brewline", name: "Brewline" },
  ],
};
const BEDROCK_PRESETS = { default: null, presets: [{ id: "builder", name: "Builder" }] };

let pending;
beforeEach(() => {
  showToast.mockReset();
  Element.prototype.scrollIntoView = () => {};
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
  projectState = { activeProject: { id: "project-1" }, setActiveProject: vi.fn() };
  languagesFetchJson = vi.fn(async () => ({}));
  pending = [];
  getThemePresets.mockReset().mockImplementation((theme) => new Promise((resolve, reject) => pending.push({ theme, resolve, reject })));
});

function renderNew() {
  const onSubmit = vi.fn(async () => false);
  render(<ProjectForm onSubmit={onSubmit} isSubmitting={false} isDirty submitLabel="Create" />);
  return onSubmit;
}
const chooseTheme = (id) => fireEvent.change(document.getElementById("theme"), { target: { value: id } });
const answerLast = (data) => act(async () => pending[pending.length - 1].resolve(data));
const presetButton = (name) => screen.getByRole("img", { name }).closest("button");
const submitted = async (onSubmit) => {
  fireEvent.change(document.getElementById("name"), { target: { value: "Crumbly" } });
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  return onSubmit.mock.calls[0][0];
};

describe("ProjectForm — a new project's presets", () => {
  it("loads the chosen theme's presets, picks its default, and sends it with the project", async () => {
    const onSubmit = renderNew();
    await screen.findByRole("tablist");
    chooseTheme("arch");
    expect(pending[pending.length - 1].theme).toBe("arch");
    await answerLast(ARCH_PRESETS);
    expect(presetButton("Brightside").className).toContain("border-pink-500");
    expect((await submitted(onSubmit)).preset).toBe("brightside");
  });

  it("leaves no preset chosen for a theme without a default", async () => {
    const onSubmit = renderNew();
    await screen.findByRole("tablist");
    chooseTheme("bedrock");
    await answerLast(BEDROCK_PRESETS);
    expect(presetButton("Builder").className).not.toContain("border-pink-500");
    expect((await submitted(onSubmit)).preset).toBe("");
  });

  it("loads the other theme's presets when the theme changes", async () => {
    const onSubmit = renderNew();
    await screen.findByRole("tablist");
    chooseTheme("arch");
    await answerLast(ARCH_PRESETS);
    chooseTheme("bedrock");
    expect(pending[pending.length - 1].theme).toBe("bedrock");
    await answerLast(BEDROCK_PRESETS);
    expect(screen.queryByRole("img", { name: "Brightside" })).toBeNull();
    expect((await submitted(onSubmit)).preset).toBe("");
  });

  it("leaves no preset chosen when the presets can't be read", async () => {
    const onSubmit = renderNew();
    await screen.findByRole("tablist");
    chooseTheme("arch");
    await act(async () => pending[pending.length - 1].reject(new Error("offline")));
    expect((await submitted(onSubmit)).preset).toBe("");
  });

  it("lets the user pick another preset, or none", async () => {
    const onSubmit = renderNew();
    await screen.findByRole("tablist");
    chooseTheme("arch");
    await answerLast(ARCH_PRESETS);
    fireEvent.click(presetButton("Brewline"));
    expect(presetButton("Brewline").className).toContain("border-pink-500");
    expect(presetButton("Brightside").className).not.toContain("border-pink-500");
    fireEvent.click(presetButton("Brewline"));
    expect(presetButton("Brewline").className).not.toContain("border-pink-500");
    expect((await submitted(onSubmit)).preset).toBe("");
  });

  it("clears the presets once the project is created", async () => {
    const onSubmit = vi.fn(async () => true);
    render(<ProjectForm onSubmit={onSubmit} isSubmitting={false} isDirty submitLabel="Create" />);
    await screen.findByRole("tablist");
    chooseTheme("arch");
    await answerLast(ARCH_PRESETS);
    expect((await submitted(onSubmit)).preset).toBe("brightside");
    await waitFor(() => expect(screen.queryByRole("img", { name: "Brightside" })).toBeNull());
  });

  it("works the same under StrictMode", async () => {
    const onSubmit = vi.fn(async () => false);
    render(
      <StrictMode>
        <ProjectForm onSubmit={onSubmit} isSubmitting={false} isDirty submitLabel="Create" />
      </StrictMode>,
    );
    await screen.findByRole("tablist");
    chooseTheme("arch");
    await act(async () => pending.forEach((p) => p.resolve(ARCH_PRESETS)));
    expect(presetButton("Brightside").className).toContain("border-pink-500");
    expect((await submitted(onSubmit)).preset).toBe("brightside");
  });
});

describe("ProjectForm — editing a project", () => {
  it("reads no presets", async () => {
    render(
      <ProjectForm
        initialData={{ id: "project-1", name: "Crumbly", folderName: "crumbly", theme: "arch", siteIdentity: {} }}
        onSubmit={vi.fn(async () => false)}
        isSubmitting={false}
        isDirty
        submitLabel="Save"
      />,
    );
    await screen.findByRole("tablist");
    await act(async () => {});
    expect(getThemePresets).not.toHaveBeenCalled();
  });
});

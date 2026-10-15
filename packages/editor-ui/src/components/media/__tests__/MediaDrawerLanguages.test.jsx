// @vitest-environment jsdom
/**
 * The metadata drawer on a multilingual site (§6). The grid, the uploads and the
 * binaries are shared — only alt/title/caption are per language.
 *
 * Empty translated fields are omitted so they inherit the default language.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

let projectState;
vi.mock("../../../stores/projectStore", async () => {
  const hook = (selector) => (selector ? selector(projectState) : projectState);
  hook.getState = () => projectState;
  return {
    default: hook,
    useDefaultLanguage: () => projectState.activeProject?.defaultLanguage || "en",
    useExtraLanguages: () => projectState.activeProject?.languages || [],
    useIsMultilang: () => (projectState.activeProject?.languages?.length ?? 0) > 0,
  };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, opts) => (opts?.name ? `${key}:${opts.name}` : key) }),
}));

const { default: MediaDrawer } = await import("../MediaDrawer.jsx");

const FILE = {
  id: "file-1",
  type: "image/png",
  path: "/uploads/images/dog.png",
  filename: "dog.png",
  metadata: { alt: "A dog on a beach", title: "Our dog", caption: "Summer" },
  translations: { el: { alt: "Ένας σκύλος", title: null, caption: null } },
};

const onSave = vi.fn();
const renderDrawer = (selectedFile = FILE) =>
  render(
    <MediaDrawer
      visible
      onClose={vi.fn()}
      selectedFile={selectedFile}
      onSave={onSave}
      loading={false}
      activeProject={{ id: "p1" }}
    />,
  );

const selectLanguage = (code) => fireEvent.change(screen.getByRole("combobox", { name: "forms.media.languagesLabel" }), { target: { value: code } });
const save = () => fireEvent.click(screen.getByRole("button", { name: "forms.media.save" }));

beforeEach(() => {
  onSave.mockReset();
  projectState = { activeProject: { id: "p1", defaultLanguage: "en", languages: ["el"] } };
});
afterEach(cleanup);

describe("media metadata per language", () => {
  it("opens on the default language, showing the file's own metadata", () => {
    renderDrawer();
    expect(screen.getByLabelText("forms.media.altLabel").value).toBe("A dog on a beach");
  });

  it("shows what a language has translated, and what it inherits as a placeholder", () => {
    renderDrawer();
    selectLanguage("el");

    expect(screen.getByLabelText("forms.media.altTranslationLabel").value).toBe("Ένας σκύλος");
    const title = screen.getByLabelText("forms.media.titleLabel");
    expect(title.value).toBe("");
    expect(title.getAttribute("placeholder")).toBe("Our dog");
  });

  it("sends only what was written, so an empty field keeps inheriting", async () => {
    renderDrawer();
    selectLanguage("el");
    save();

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith("file-1", { alt: "Ένας σκύλος" }, "el");
  });

  it("clearing translated alt restores inheritance without a checkbox", async () => {
    renderDrawer();
    selectLanguage("el");
    fireEvent.change(screen.getByLabelText("forms.media.altTranslationLabel"), { target: { value: "" } });
    expect(screen.queryByRole("checkbox")).toBeNull();
    save();

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith("file-1", {}, "el");
  });

  it("does not require alt in a translated language", async () => {
    renderDrawer({ ...FILE, translations: {} });
    selectLanguage("el");
    save();

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("file-1", {}, "el"));
  });

  it("still requires alt in the default language, and sends no language with it", async () => {
    renderDrawer();
    fireEvent.change(screen.getByLabelText("forms.media.altLabel"), { target: { value: "" } });
    save();

    await waitFor(() => expect(screen.getByText("forms.media.altRequired")).toBeTruthy());
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("forms.media.altLabel"), { target: { value: "A dog" } });
    save();
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith("file-1", { alt: "A dog", title: "Our dog", caption: "Summer" }),
    );
  });

  it("shows no language selector while the site has one language", () => {
    projectState = { activeProject: { id: "p1", defaultLanguage: "en", languages: [] } };
    renderDrawer();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});

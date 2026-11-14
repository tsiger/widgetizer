// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../../stores/toastStore", () => {
  const state = { showToast: vi.fn() };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
let allPages = [{ uuid: "u-parent", slug: "services", name: "Services" }];
vi.mock("../../../queries/pageManager", () => ({
  getAllPages: async () => allPages,
}));
vi.mock("../../settings/inputs/ImageInput", () => ({ default: () => null }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }), Trans: () => null }));

import PageForm from "../PageForm.jsx";
import { PluginProvider } from "../../../extension/PluginProvider.jsx";
import useProjectStore from "../../../stores/projectStore";

const PAGE = { id: "about", uuid: "u-about", name: "About", slug: "about", parentPageUuid: "u-parent" };

describe("PageForm after a save", () => {
  it("keeps the parent page on the next save", async () => {
    const onSubmit = vi.fn(async () => false);
    const { rerender, container } = render(<PageForm initialData={PAGE} onSubmit={onSubmit} isDirty />);
    rerender(<PageForm initialData={{ ...PAGE, name: "About us" }} onSubmit={onSubmit} isDirty />);

    fireEvent.click(screen.getByRole("button", { name: /forms\.project\.moreSettings/ }));
    await waitFor(() => expect(container.querySelector("#parent-page").textContent).toContain("Services"));
    fireEvent.change(container.querySelector("#name"), { target: { value: "About us again" } });
    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].parentPageUuid).toBe("u-parent");
  });
});

// A language version keeps its source's parent, so a Greek page's parent is
// often the English page. Saving the Greek page's settings must keep it.
describe("PageForm parent on a multilingual site", () => {
  const GREEK = {
    id: "omada",
    uuid: "u-team-el",
    name: "Omada",
    slug: "omada",
    language: "el",
    parentPageUuid: "u-about-en",
  };

  const renderGreek = (onSubmit) => {
    useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages: ["el"] } });
    allPages = [
      { uuid: "u-about-en", slug: "about", name: "About", language: "en" },
      { uuid: "u-about-el", slug: "sxetika", name: "Sxetika", language: "el" },
      GREEK,
    ];
    const view = render(<PageForm initialData={GREEK} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /forms\.project\.moreSettings/ }));
    return view;
  };

  it("shows and keeps an inherited parent from another language", async () => {
    const onSubmit = vi.fn(async () => false);
    const { container } = renderGreek(onSubmit);
    await waitFor(() => expect(container.querySelector("#parent-page").textContent).toContain("About"));

    fireEvent.change(container.querySelector("#name"), { target: { value: "Omada mas" } });
    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].parentPageUuid).toBe("u-about-en");
  });

  it("does not offer the page's own translations as its parent", async () => {
    const onSubmit = vi.fn(async () => false);
    useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages: ["el"] } });
    allPages = [
      { uuid: "u-about-en", slug: "about", name: "About", language: "en" },
      { uuid: "u-team-en", slug: "team", name: "Team", language: "en" },
      GREEK,
    ];
    const { container } = render(
      <PageForm initialData={{ ...GREEK, translationGroupId: "u-team-en" }} onSubmit={onSubmit} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /forms\.project\.moreSettings/ }));
    await waitFor(() => expect(container.querySelector("#parent-page").textContent).toContain("About"));

    fireEvent.click(container.querySelector("#parent-page"));
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.queryByText("Team")).toBeNull();
    expect(screen.getAllByText("About").length).toBeGreaterThan(0);
  });

  it("saves a parent picked from the list", async () => {
    const onSubmit = vi.fn(async () => false);
    const { container } = renderGreek(onSubmit);
    await waitFor(() => expect(container.querySelector("#parent-page").textContent).toContain("About"));

    fireEvent.click(container.querySelector("#parent-page"));
    fireEvent.click(screen.getByRole("button", { name: "el" }));
    fireEvent.click(screen.getByText("Sxetika"));
    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].parentPageUuid).toBe("u-about-el");
  });
});

// A plugin adds its own field to the page settings form; its value is part of
// what the form submits, on create and on edit.
describe("PageForm with a plugin field", () => {
  const seen = [];
  function ExtraField({ value, onChange, page, isNew, language }) {
    seen.push({ value, page, isNew, language });
    return (
      <button type="button" data-value={value ?? ""} onClick={() => onChange("x")}>
        set extra
      </button>
    );
  }
  const plugins = [{ name: "extra", pageSettingsFields: [{ id: "extra", field: "extra", Component: ExtraField }] }];
  const withPlugins = (ui) => <PluginProvider plugins={plugins}>{ui}</PluginProvider>;

  it("submits the field's value when creating a page", async () => {
    seen.length = 0;
    const onSubmit = vi.fn(async () => false);
    const { container } = render(withPlugins(<PageForm onSubmit={onSubmit} isDirty language="el" />));

    expect(seen.at(-1)).toMatchObject({ isNew: true, language: "el" });
    fireEvent.change(container.querySelector("#name"), { target: { value: "Members" } });
    fireEvent.click(screen.getByRole("button", { name: "set extra" }));
    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: "Members", slug: "members", extra: "x" });
  });

  it("shows the stored value and submits the new one when editing a page", async () => {
    seen.length = 0;
    const onSubmit = vi.fn(async () => false);
    const page = { ...PAGE, extra: "old" };
    render(withPlugins(<PageForm initialData={page} onSubmit={onSubmit} isDirty />));

    const button = screen.getByRole("button", { name: "set extra" });
    expect(button.dataset.value).toBe("old");
    expect(seen.at(-1)).toMatchObject({ isNew: false, page });
    fireEvent.click(button);
    expect(button.dataset.value).toBe("x");
    fireEvent.submit(button.closest("form"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].extra).toBe("x");
  });

  it("keeps the stored value when the field is left alone", async () => {
    const onSubmit = vi.fn(async () => false);
    const { container } = render(withPlugins(<PageForm initialData={{ ...PAGE, extra: "old" }} onSubmit={onSubmit} isDirty />));

    fireEvent.change(container.querySelector("#name"), { target: { value: "About us" } });
    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].extra).toBe("old");
  });

  it("marks the form changed when the field changes", async () => {
    const onDirtyChange = vi.fn();
    render(withPlugins(<PageForm initialData={PAGE} onSubmit={vi.fn()} onDirtyChange={onDirtyChange} />));
    fireEvent.click(screen.getByRole("button", { name: "set extra" }));
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
  });
});

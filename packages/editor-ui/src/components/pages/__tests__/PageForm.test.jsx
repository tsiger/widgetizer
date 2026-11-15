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

// The not-found page's address is set when it is created and never changes, and
// it is always hidden from search engines, so the form shows both as fixed.
describe("PageForm on the not-found page", () => {
  const NOT_FOUND = { id: "404", uuid: "u-404", name: "Page not found", slug: "404" };

  it("an existing 404 page shows its address read-only, with the note", () => {
    const { container } = render(<PageForm initialData={NOT_FOUND} onSubmit={vi.fn()} />);
    expect(container.querySelector("#slug").readOnly).toBe(true);
    expect(screen.getByText("forms.page.notFoundNote")).toBeTruthy();
  });

  it("an existing 404 page shows the search-engine setting fixed", () => {
    const { container } = render(<PageForm initialData={NOT_FOUND} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /forms\.project\.moreSettings/ }));
    expect(container.querySelector("#seo-robots").disabled).toBe(true);
    expect(container.querySelector("#seo-canonical-url")).toBeNull();
  });

  it("the note shows once, in place of the filename help, with More settings open", () => {
    const { container } = render(<PageForm initialData={NOT_FOUND} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /forms\.project\.moreSettings/ }));
    expect(screen.getAllByText("forms.page.notFoundNote")).toHaveLength(1);
    const slugField = container.querySelector("#slug").closest(".form-field");
    expect(slugField.querySelectorAll(".form-description")).toHaveLength(1);
  });

  it("renaming an existing page to 404 shows notFoundSlugTaken", async () => {
    const onSubmit = vi.fn(async () => false);
    const { container } = render(<PageForm initialData={{ ...PAGE, parentPageUuid: undefined }} onSubmit={onSubmit} isDirty />);
    fireEvent.change(container.querySelector("#slug"), { target: { value: "404" } });
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => expect(screen.getByText("forms.page.notFoundSlugTaken")).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("a new page may be given the address 404", async () => {
    const onSubmit = vi.fn(async () => false);
    const { container } = render(<PageForm initialData={{}} onSubmit={onSubmit} isDirty />);
    fireEvent.change(container.querySelector("#name"), { target: { value: "Not found" } });
    fireEvent.change(container.querySelector("#slug"), { target: { value: "404" } });
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].slug).toBe("404");
  });

  it("the parent picker never offers a page at 404", async () => {
    useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages: ["el"] } });
    allPages = [
      { uuid: "u-services", slug: "services", name: "Services", language: "en" },
      { uuid: "u-404", slug: "404", name: "Page not found", language: "en" },
      { uuid: "u-about", slug: "about", name: "About", language: "en" },
    ];
    const { container } = render(<PageForm initialData={{ ...PAGE, parentPageUuid: "u-services" }} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /forms\.project\.moreSettings/ }));
    await waitFor(() => expect(container.querySelector("#parent-page").textContent).toContain("Services"));
    fireEvent.click(container.querySelector("#parent-page"));
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.queryByText("Page not found")).toBeNull();
  });
});

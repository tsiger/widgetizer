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
  function ExtraField({ value, onChange, page, slug, isNew, language }) {
    seen.push({ value, page, slug, isNew, language });
    return (
      <button type="button" data-value={value ?? ""} onClick={() => onChange("x")}>
        set extra
      </button>
    );
  }
  const plugins = [{ name: "extra", pageSettingsFields: [{ id: "extra", field: "extra", Component: ExtraField }] }];
  const withPlugins = (ui) => <PluginProvider plugins={plugins}>{ui}</PluginProvider>;

  it("tells the field the filename as it is typed", async () => {
    seen.length = 0;
    const { container } = render(withPlugins(<PageForm onSubmit={vi.fn()} />));
    fireEvent.change(container.querySelector("#slug"), { target: { value: "404" } });
    await waitFor(() => expect(seen.at(-1)).toMatchObject({ slug: "404" }));
  });

  it("a malformed language in the address doesn't break the form", () => {
    const { container } = render(<PageForm initialData={{}} language="not a code!" onSubmit={vi.fn()} />);
    expect(container.querySelector("#slug")).toBeTruthy();
  });

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



  it("saving a 404 page clears its parent and search settings", async () => {
    const onSubmit = vi.fn(async () => false);
    const stored = {
      ...NOT_FOUND,
      parentPageUuid: "u-parent",
      seo: { description: "Lost?", og_title: "Lost", og_image: "/uploads/images/x.png", canonical_url: "https://e.com/x", robots: "index,nofollow" },
    };
    const { container } = render(<PageForm initialData={stored} onSubmit={onSubmit} isDirty />);
    fireEvent.change(container.querySelector("#name"), { target: { value: "Lost? Try these" } });
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const sent = onSubmit.mock.calls[0][0];
    expect(sent.parentPageUuid).toBe("");
    expect(sent.seo).toEqual({
      description: "",
      og_title: "",
      og_image: "",
      og_type: "website",
      twitter_card: "summary",
      canonical_url: "",
      robots: "noindex,follow",
    });
  });

  it("a new page given a parent and then the filename 404 is created without them", async () => {
    allPages = [{ uuid: "u-parent", slug: "services", name: "Services" }];
    const onSubmit = vi.fn(async () => false);
    const { container } = render(<PageForm initialData={{}} onSubmit={onSubmit} isDirty />);
    fireEvent.change(container.querySelector("#name"), { target: { value: "Lost" } });
    fireEvent.click(screen.getByRole("button", { name: /forms\.project\.moreSettings/ }));
    fireEvent.change(container.querySelector("#seo-description"), { target: { value: "Find your way" } });
    fireEvent.change(container.querySelector("#slug"), { target: { value: "404" } });
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].seo.description).toBe("");
    expect(onSubmit.mock.calls[0][0].parentPageUuid).toBe("");
  });

  it("an existing 404 page has no More settings", () => {
    render(<PageForm initialData={NOT_FOUND} onSubmit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /forms\.project\.moreSettings/ })).toBeNull();
  });

  it("the note replaces the filename help", () => {
    const { container } = render(<PageForm initialData={NOT_FOUND} onSubmit={vi.fn()} />);
    const slugField = container.querySelector("#slug").closest(".form-field");
    expect(slugField.querySelectorAll(".form-description")).toHaveLength(1);
  });

  it("a new page shows the note as soon as its address becomes 404, and loses More settings", async () => {
    const { container } = render(<PageForm initialData={{}} onSubmit={vi.fn()} />);
    expect(screen.queryByText("forms.page.notFoundNoteNew")).toBeNull();
    fireEvent.change(container.querySelector("#slug"), { target: { value: "404" } });
    await waitFor(() => expect(screen.getByText("forms.page.notFoundNoteNew")).toBeTruthy());
    expect(screen.queryByRole("button", { name: /forms\.project\.moreSettings/ })).toBeNull();
    expect(container.querySelector("#slug").readOnly).toBe(false);
  });

  it("the read-only address looks read-only", () => {
    const { container } = render(<PageForm initialData={NOT_FOUND} onSubmit={vi.fn()} />);
    expect(container.querySelector("#slug").className).toMatch(/bg-slate-50/);
  });

  it("a new page at 404 in a language that already has one shows notFoundExists and doesn't submit", async () => {
    useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages: ["el"] } });
    allPages = [{ uuid: "u-404", slug: "404", name: "Page not found", language: "en" }];
    const onSubmit = vi.fn(async () => false);
    const { container } = render(<PageForm initialData={{}} onSubmit={onSubmit} isDirty />);
    await waitFor(() => expect(allPages.length).toBe(1));
    fireEvent.change(container.querySelector("#name"), { target: { value: "Oops" } });
    fireEvent.change(container.querySelector("#slug"), { target: { value: "404" } });
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => expect(screen.getByText("forms.page.notFoundExists")).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByText("forms.page.notFoundNoteNew")).toBeNull();
  });

  it("a new Greek page at 404 is fine when only the main language has one", async () => {
    useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages: ["el"] } });
    allPages = [{ uuid: "u-404", slug: "404", name: "Page not found", language: "en" }];
    const onSubmit = vi.fn(async () => false);
    const { container } = render(<PageForm initialData={{}} language="el" onSubmit={onSubmit} isDirty />);
    fireEvent.change(container.querySelector("#name"), { target: { value: "Den vrethike" } });
    fireEvent.change(container.querySelector("#slug"), { target: { value: "404" } });
    fireEvent.submit(container.querySelector("form"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
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

// The address field starts with the folder the page is written to.
describe("PageForm address prefix", () => {
  it("a page in the main language starts at /", () => {
    useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages: ["el"] } });
    const { container } = render(<PageForm initialData={{ ...PAGE, language: "en" }} onSubmit={vi.fn()} />);
    expect(container.querySelector("#slug").parentElement.textContent).toMatch(/^\/\.html$/);
  });

  it("a Greek page starts at /el/", () => {
    useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages: ["el"] } });
    const { container } = render(<PageForm initialData={{ ...PAGE, language: "el" }} onSubmit={vi.fn()} />);
    expect(container.querySelector("#slug").parentElement.textContent).toMatch(/^\/el\/\.html$/);
  });

  it("a new Greek page starts at /el/", () => {
    useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages: ["el"] } });
    const { container } = render(<PageForm initialData={{}} language="el" onSubmit={vi.fn()} />);
    expect(container.querySelector("#slug").parentElement.textContent).toMatch(/^\/el\/\.html$/);
  });
});


// @vitest-environment jsdom
/**
 * The link picker on a multilingual site (§4a): every language is offered, because
 * a page may exist in only one of them, but the list opens on the language being
 * edited. A target in another language is labelled, not hidden.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent, within } from "@testing-library/react";
import Combobox from "../Combobox.jsx";
import useProjectStore from "../../../stores/projectStore.js";
import { EditingLanguageProvider } from "../../../lib/editingLanguage.jsx";

const OPTIONS = [
  { value: "p1", label: "About", group: "Pages", language: "en" },
  { value: "n1", label: "Launch day", group: "News", language: "en" },
  { value: "p2", label: "Sxetika", group: "Pages", language: "el" },
  { value: "n2", label: "Kalimera", group: "News", language: "el" },
];

const setSiteLanguages = (languages) =>
  useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages } });

function renderOpen({ editing = "en", options = OPTIONS } = {}) {
  render(
    <EditingLanguageProvider language={editing}>
      <Combobox options={options} value="" onChange={vi.fn()} placeholder="Select…" />
    </EditingLanguageProvider>,
  );
  fireEvent.focus(screen.getByPlaceholderText("Select…"));
  return screen.getByRole("list");
}

const chip = (code) => screen.getByRole("button", { name: code });

beforeEach(() => setSiteLanguages(["el"]));
afterEach(cleanup);

describe("link picker language filter", () => {
  it("opens on the language being edited and leaves the others one click away", () => {
    renderOpen({ editing: "el" });

    expect(screen.getByText("Sxetika")).toBeTruthy();
    expect(screen.getByText("Kalimera")).toBeTruthy();
    expect(screen.queryByText("About")).toBeNull();

    fireEvent.click(chip("en"));
    expect(screen.getByText("About")).toBeTruthy();
    expect(screen.queryByText("Sxetika")).toBeNull();
  });

  it("offers every site language plus All, and All keeps the language in the headers", () => {
    const list = renderOpen({ editing: "en" });
    expect(within(list).getAllByRole("button").map((b) => b.textContent)).toEqual(["en", "el", "All"]);

    fireEvent.click(chip("All"));
    expect(screen.getByText("About")).toBeTruthy();
    expect(screen.getByText("Sxetika")).toBeTruthy();
    expect(screen.getByText("Pages · English")).toBeTruthy();
    expect(screen.getByText("Pages · Ελληνικά")).toBeTruthy();
  });

  it("tags a target that lives in another language", () => {
    const list = renderOpen({ editing: "en" });
    fireEvent.click(chip("All"));

    const greek = screen.getByText("Sxetika").closest("li");
    expect(within(greek).getByTitle("Ελληνικά").textContent).toBe("el");
    // The language being edited is the norm, so it carries no tag.
    expect(within(screen.getByText("About").closest("li")).queryByTitle("English")).toBeNull();
    expect(list).toBeTruthy();
  });

  it("selects the option rather than the filter when a row is clicked", () => {
    const onChange = vi.fn();
    render(
      <EditingLanguageProvider language="en">
        <Combobox options={OPTIONS} value="" onChange={onChange} placeholder="Select…" />
      </EditingLanguageProvider>,
    );
    fireEvent.focus(screen.getByPlaceholderText("Select…"));
    fireEvent.click(chip("el"));
    fireEvent.click(screen.getByText("Sxetika"));
    expect(onChange).toHaveBeenCalledWith("p2");
  });

  it("returns to the language being edited the next time it opens", () => {
    renderOpen({ editing: "en" });
    fireEvent.click(chip("el"));
    expect(screen.getByText("Sxetika")).toBeTruthy();

    // Closing unmounts the list; the filter is a detour, not a setting.
    fireEvent.mouseDown(document.body);
    fireEvent.focus(screen.getByPlaceholderText("Select…"));
    expect(screen.getByText("About")).toBeTruthy();
    expect(screen.queryByText("Sxetika")).toBeNull();
  });
});

describe("link picker on a single-language site", () => {
  it("shows no filter and no tags at all", () => {
    setSiteLanguages([]);
    renderOpen({ editing: "en", options: OPTIONS.filter((o) => o.language === "en") });

    expect(screen.queryByRole("button", { name: "All" })).toBeNull();
    expect(screen.getByText("About")).toBeTruthy();
    expect(screen.getByText("Pages")).toBeTruthy();
  });

  it("never hides an option that carries no language (a picker of something else)", () => {
    setSiteLanguages(["el"]);
    renderOpen({ editing: "el", options: [{ value: "x", label: "Anything", group: "Other" }] });
    expect(screen.getByText("Anything")).toBeTruthy();
  });
});

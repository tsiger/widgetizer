// @vitest-environment jsdom
/**
 * The parent-page field lists every language's pages, each with a language
 * badge, behind the link picker's language filter. A language version inherits
 * its source's parent, so a Greek page's parent is often an English page: the
 * field must still show that selection, closed and open.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

let extraLanguages = ["el"];
vi.mock("../../../stores/projectStore", () => ({
  useDefaultLanguage: () => "en",
  useExtraLanguages: () => extraLanguages,
  useIsMultilang: () => extraLanguages.length > 0,
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

const { default: ParentPagePicker } = await import("../ParentPagePicker.jsx");

const OPTIONS = [
  { value: "about-en", label: "About", language: "en" },
  { value: "about-el", label: "Sxetika", language: "el" },
  { value: "team-en", label: "Team", language: "en" },
];

let onChange;
const renderPicker = (props) =>
  render(<ParentPagePicker id="parent-page" options={OPTIONS} value="" onChange={onChange} {...props} />);
const open = () => fireEvent.click(document.getElementById("parent-page"));
const listed = () =>
  Array.from(document.querySelectorAll("ul li[aria-selected]")).map((li) => li.querySelector("span").textContent);

beforeEach(() => {
  extraLanguages = ["el"];
  onChange = vi.fn();
});
afterEach(cleanup);

describe("ParentPagePicker", () => {
  it("shows None when the page has no parent", () => {
    renderPicker();
    expect(document.getElementById("parent-page").textContent).toContain("forms.page.parentPageNone");
  });

  it("shows an inherited parent from another language, with its badge, while closed", () => {
    renderPicker({ value: "about-en", language: "el" });
    const button = document.getElementById("parent-page");
    expect(button.textContent).toContain("About");
    expect(button.textContent).toContain("en");
  });

  it("opens on the selected parent's language, so the selection is in view and marked", () => {
    renderPicker({ value: "about-en", language: "el" });
    open();
    expect(listed()).toEqual(["forms.page.parentPageNone", "About", "Team"]);
    expect(document.querySelector('li[aria-selected="true"]').textContent).toContain("About");
  });

  it("opens on the page's own language when there is no parent yet", () => {
    renderPicker({ language: "el" });
    open();
    expect(listed()).toEqual(["forms.page.parentPageNone", "Sxetika"]);
  });

  it("lists every language's pages under All, each with its language", () => {
    renderPicker({ language: "el" });
    open();
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(listed()).toEqual(["forms.page.parentPageNone", "About", "Sxetika", "Team"]);
  });

  it("selects a page, and clears with None", () => {
    renderPicker({ value: "about-en", language: "el" });
    open();
    fireEvent.click(screen.getByRole("button", { name: "el" }));
    fireEvent.click(screen.getByText("Sxetika"));
    expect(onChange).toHaveBeenLastCalledWith("about-el");

    open();
    fireEvent.click(within(document.querySelector("ul")).getByText("forms.page.parentPageNone"));
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("does not show None for a stored parent that is not among the pages", () => {
    renderPicker({ value: "gone" });
    expect(document.getElementById("parent-page").textContent).toContain("forms.page.parentPageMissing");
  });

  it("can be used from the keyboard: Tab to a page, Enter to pick it, Escape to close", () => {
    renderPicker({ value: "about-en", language: "el" });
    open();
    const team = Array.from(document.querySelectorAll('li[role="option"]')).find((li) => li.textContent.includes("Team"));
    expect(team.tabIndex).toBe(0);
    fireEvent.keyDown(team, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith("team-en");
    expect(document.querySelector('[role="listbox"]')).toBeNull();

    open();
    fireEvent.keyDown(document.querySelector('[role="listbox"]'), { key: "Escape" });
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(document.getElementById("parent-page"));
  });

  it("shows the selection once the pages arrive after the list was opened", () => {
    const { rerender } = render(
      <ParentPagePicker id="parent-page" options={[]} value="about-en" onChange={onChange} language="el" />,
    );
    open();
    rerender(<ParentPagePicker id="parent-page" options={OPTIONS} value="about-en" onChange={onChange} language="el" />);
    expect(document.querySelector('li[aria-selected="true"]')?.textContent).toContain("About");
  });

  it("has no language filter or badges on a single-language site", () => {
    extraLanguages = [];
    renderPicker({ value: "about-en" });
    open();
    expect(screen.queryByRole("button", { name: "All" })).toBeNull();
    expect(listed()).toEqual(["forms.page.parentPageNone", "About", "Sxetika", "Team"]);
  });
});

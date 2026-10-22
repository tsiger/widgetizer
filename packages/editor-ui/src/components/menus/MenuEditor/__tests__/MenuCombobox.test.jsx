// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import MenuCombobox from "../MenuCombobox.jsx";

// The menu link picker groups its options (a "Pages" group + one group per
// collection, via useLinkTargets' `group` field). MenuCombobox must render an
// uppercase header whenever the group changes between consecutive options — and
// those headers must not be selectable.

const OPTIONS = [
  { value: "p1", label: "About", group: "Pages" },
  { value: "i1", label: "Project Alpha", group: "Projects" },
  { value: "i2", label: "Project Beta", group: "Projects" },
];

function renderOpen(onChange = vi.fn()) {
  render(
    <MenuCombobox
      options={OPTIONS}
      value=""
      onChange={onChange}
      placeholder="Select…"
      isOpen
      onOpenChange={vi.fn()}
    />,
  );
  return { onChange };
}

afterEach(cleanup);

describe("MenuCombobox — grouped options", () => {
  it("renders a header when the group changes", () => {
    renderOpen();
    expect(screen.getByText("Pages")).toBeTruthy();
    expect(screen.getByText("Projects")).toBeTruthy();
  });

  it("does not repeat the header for consecutive same-group options", () => {
    renderOpen();
    // "Projects" precedes the first item of that group only, not every item.
    expect(screen.getAllByText("Projects")).toHaveLength(1);
  });

  it("selects an option on click", () => {
    const { onChange } = renderOpen();
    fireEvent.click(screen.getByText("Project Alpha"));
    expect(onChange).toHaveBeenCalledWith("i1");
  });

  it("does not treat a group header as a selectable option", () => {
    const { onChange } = renderOpen();
    fireEvent.click(screen.getByText("Pages"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("MenuCombobox — the closed field names the target's language", () => {
  // Two "About" pages in two languages read the same once the list is closed.
  const LANG_OPTIONS = [
    { value: "en-about", label: "About", group: "Pages", language: "en" },
    { value: "fr-about", label: "About", group: "Pages", language: "fr" },
  ];
  const renderClosed = (value) =>
    render(
      <MenuCombobox
        options={LANG_OPTIONS}
        value={value}
        onChange={vi.fn()}
        placeholder="Select…"
        isOpen={false}
        onOpenChange={vi.fn()}
      />,
    );

  it("badges the selected page with its language on a multilingual site", async () => {
    const { default: useProjectStore } = await import("../../../../stores/projectStore.js");
    useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages: ["fr"] } });
    renderClosed("fr-about");
    expect(screen.getByPlaceholderText("Select…").value).toBe("About");
    expect(screen.getByTitle("Français").textContent).toBe("fr");
  });

  it("shows no badge on a single-language site", async () => {
    const { default: useProjectStore } = await import("../../../../stores/projectStore.js");
    useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages: [] } });
    renderClosed("en-about");
    expect(screen.queryByTitle("English")).toBeNull();
  });
});

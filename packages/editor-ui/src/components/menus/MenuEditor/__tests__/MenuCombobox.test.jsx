// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import MenuCombobox from "../MenuCombobox.jsx";

// The menu link picker groups its options (a "Pages" group + one group per
// collection, via useLinkTargets' `group` field). MenuCombobox must render an
// uppercase header whenever the group changes between consecutive options — and
// those headers must not be selectable. (Lost in the package port; restored here.)

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

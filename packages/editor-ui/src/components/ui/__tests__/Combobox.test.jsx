// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import Combobox from "../Combobox.jsx";

// The link-picker options carry a `group` field (useLinkTargets seeds a "Pages"
// group + one per collection). The shared <Combobox> must render an uppercase
// section header whenever the group changes between consecutive options, and
// those headers must not be selectable. Ungrouped options (other consumers)
// render flat with no header.

const GROUPED = [
  { value: "p1", label: "About", group: "Pages" },
  { value: "i1", label: "Project Alpha", group: "Projects" },
  { value: "i2", label: "Project Beta", group: "Projects" },
];

// ui/Combobox owns its open state (no isOpen prop) — focus the input to open it.
function renderOpen(options, onChange = vi.fn()) {
  render(<Combobox options={options} value="" onChange={onChange} placeholder="Select…" />);
  fireEvent.focus(screen.getByPlaceholderText("Select…"));
  return { onChange };
}

afterEach(cleanup);

describe("Combobox — grouped options", () => {
  it("renders a header when the group changes", () => {
    renderOpen(GROUPED);
    expect(screen.getByText("Pages")).toBeTruthy();
    expect(screen.getByText("Projects")).toBeTruthy();
  });

  it("does not repeat the header for consecutive same-group options", () => {
    renderOpen(GROUPED);
    expect(screen.getAllByText("Projects")).toHaveLength(1);
  });

  it("renders one header per group above its first option (3 options + 2 headers)", () => {
    renderOpen(GROUPED);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("selects an option on click", () => {
    const { onChange } = renderOpen(GROUPED);
    fireEvent.click(screen.getByText("Project Alpha"));
    expect(onChange).toHaveBeenCalledWith("i1");
  });

  it("does not treat a group header as a selectable option", () => {
    const { onChange } = renderOpen(GROUPED);
    fireEvent.click(screen.getByText("Pages"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders ungrouped options flat with no header", () => {
    renderOpen([
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
    ]);
    // Two options, no headers -> exactly two list items.
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Alpha")).toBeTruthy();
  });
});

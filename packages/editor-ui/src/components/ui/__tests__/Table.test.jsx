// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Table from "../Table.jsx";

// The shared <Table> is used plain by Pages/Menus/Projects and in `sortable`
// mode by CollectionItems (drag-to-reorder). These tests pin the rendering
// contract of the `sortable` / `getRowId` / `rowClassName` props that the
// consumer already passes. The actual dnd-kit pointer/keyboard drag is exercised
// manually (it is not reliably reproducible in jsdom); here we assert the
// observable structure: the leading drag-handle column + per-row handles in
// sortable mode, and that plain mode is unchanged.

const HEADERS = ["A", "B", "C"];
const DATA = [
  { slug: "one", label: "One" },
  { slug: "two", label: "Two" },
];
const renderRow = (item) => (
  <td data-testid={`cell-${item.slug}`} className="py-3 px-4">
    {item.label}
  </td>
);

afterEach(cleanup);

describe("Table — plain (non-sortable) mode", () => {
  it("renders one header cell per header, with no drag-handle column", () => {
    render(<Table headers={HEADERS} data={DATA} renderRow={renderRow} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(HEADERS.length);
    expect(screen.queryByLabelText("Drag to reorder")).toBeNull();
  });

  it("applies rowClassName(item) to each rendered row", () => {
    render(
      <Table
        headers={HEADERS}
        data={DATA}
        renderRow={renderRow}
        rowClassName={(item) => (item.slug === "one" ? "is-selected" : "")}
      />,
    );
    const firstRow = screen.getByTestId("cell-one").closest("tr");
    const secondRow = screen.getByTestId("cell-two").closest("tr");
    expect(firstRow.className).toContain("is-selected");
    expect(secondRow.className).not.toContain("is-selected");
  });
});

describe("Table — sortable mode", () => {
  it("prepends a drag-handle column to the header row", () => {
    const { container } = render(
      <Table
        sortable
        getRowId={(item) => item.slug}
        headers={HEADERS}
        data={DATA}
        renderRow={renderRow}
      />,
    );
    // One extra leading <th> for the drag handle. It is aria-hidden (so it is
    // absent from the accessibility tree / role queries) but physically present.
    expect(container.querySelectorAll("thead th")).toHaveLength(HEADERS.length + 1);
    expect(container.querySelector('thead th[aria-hidden="true"]')).not.toBeNull();
  });

  it("renders a drag handle for every data row", () => {
    render(
      <Table
        sortable
        getRowId={(item) => item.slug}
        headers={HEADERS}
        data={DATA}
        renderRow={renderRow}
      />,
    );
    expect(screen.getAllByLabelText("Drag to reorder")).toHaveLength(DATA.length);
  });

  it("spans the empty-state cell across the handle column too", () => {
    render(
      <Table
        sortable
        getRowId={(item) => item.slug}
        headers={HEADERS}
        data={[]}
        renderRow={renderRow}
        emptyMessage="Nothing here"
      />,
    );
    const emptyCell = screen.getByText("Nothing here").closest("td");
    expect(emptyCell.getAttribute("colspan")).toBe(String(HEADERS.length + 1));
  });
});

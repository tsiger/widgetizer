// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MenuEditor from "../index.jsx";

vi.mock("../../../../hooks/useLinkTargets", () => ({ default: () => ({ options: [] }) }));

// The page decides from these reports whether Cancel must ask and what Save
// sends, so an edit has to reach it before the user can click either.
describe("MenuEditor change reporting", () => {
  it("reports a label edit straight away", () => {
    const onChange = vi.fn();
    render(<MenuEditor initialItems={[{ id: "home", label: "Home", link: "", items: [] }]} onChange={onChange} />);

    fireEvent.change(screen.getByDisplayValue("Home"), { target: { value: "Start" } });

    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: "home", label: "Start" })]);
  });
});

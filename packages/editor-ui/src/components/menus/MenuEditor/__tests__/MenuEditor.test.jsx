// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MenuEditor from "../index.jsx";

let linkTargets = { options: [], failed: false, retry: () => {} };
vi.mock("../../../../hooks/useLinkTargets", () => ({ default: () => linkTargets }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

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

describe("MenuEditor when pages and items couldn't be loaded", () => {
  it("says so above the items, and Try again asks again", () => {
    const retry = vi.fn();
    linkTargets = { options: [], failed: true, retry };
    render(<MenuEditor initialItems={[{ id: "home", label: "Home", link: "", items: [] }]} onChange={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("components.linkTargets.loadFailed");
    fireEvent.click(screen.getByRole("button", { name: "components.linkTargets.retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
    linkTargets = { options: [], failed: false, retry: () => {} };
  });
});

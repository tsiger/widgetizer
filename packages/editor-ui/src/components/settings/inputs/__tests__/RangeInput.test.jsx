// @vitest-environment jsdom
/**
 * The range field: a slider and a number box showing the same value. Typed
 * numbers are kept within min and max and stored at once; the shown value
 * follows the stored one when it changes from outside (undo, another widget).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RangeInput from "../RangeInput.jsx";

afterEach(cleanup);

const numberBox = () => screen.getByRole("spinbutton");
const handle = () => screen.getByRole("slider");

function renderRange(value = 40, props = {}) {
  const onChange = vi.fn();
  const all = { min: 0, max: 100, step: 1, ...props };
  const view = render(<RangeInput id="r" value={value} onChange={onChange} {...all} />);
  const rerender = (next) => view.rerender(<RangeInput id="r" value={next} onChange={onChange} {...all} />);
  return { onChange, rerender };
}

describe("RangeInput", () => {
  it("shows the stored value on the slider and in the number box, with its unit", () => {
    renderRange(40, { unit: "px" });
    expect(numberBox()).toHaveValue(40);
    expect(handle()).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("px")).toBeInTheDocument();
  });

  it("stores a typed number at once, kept within min and max, and an empty box as min", () => {
    const { onChange } = renderRange(40, { min: 10, max: 90 });
    fireEvent.change(numberBox(), { target: { value: "55" } });
    expect(onChange).toHaveBeenLastCalledWith(55);
    expect(numberBox()).toHaveValue(55);
    expect(handle()).toHaveAttribute("aria-valuenow", "55");

    fireEvent.change(numberBox(), { target: { value: "500" } });
    expect(onChange).toHaveBeenLastCalledWith(90);
    expect(numberBox()).toHaveValue(90);

    fireEvent.change(numberBox(), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(10);
    expect(numberBox()).toHaveValue(10);
  });

  it("stores the shown value again when the number box loses focus", () => {
    const { onChange } = renderRange(40);
    fireEvent.change(numberBox(), { target: { value: "60" } });
    onChange.mockClear();
    fireEvent.blur(numberBox());
    expect(onChange).toHaveBeenCalledWith(60);
  });

  it("follows the stored value when it changes from outside", () => {
    const { rerender } = renderRange(40);
    rerender(70);
    expect(numberBox()).toHaveValue(70);
    expect(handle()).toHaveAttribute("aria-valuenow", "70");
  });

  it("keeps a typed value showing when the page re-renders with the same stored value", () => {
    // The parent may hold the value elsewhere and re-render before it updates.
    const { rerender } = renderRange(40);
    fireEvent.change(numberBox(), { target: { value: "60" } });
    rerender(40);
    expect(numberBox()).toHaveValue(60);
  });

  it("stores a key press on the slider", () => {
    const { onChange } = renderRange(40);
    fireEvent.keyDown(handle(), { key: "ArrowRight", keyCode: 39, which: 39 });
    expect(onChange).toHaveBeenLastCalledWith(41);
    expect(numberBox()).toHaveValue(41);
  });
});

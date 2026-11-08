// @vitest-environment jsdom
/**
 * The color field shows the stored color, and follows it when it changes from
 * outside (undo, another widget selected). While the picker is dragged, the
 * swatch and hex box follow the pointer but the color is stored only once,
 * when the drag ends; a single click or key in the picker stores at once.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ColorInput from "../ColorInput.jsx";

afterEach(cleanup);

const hexBox = () => screen.getByRole("textbox");
const swatch = () => screen.getByRole("button", { name: "Open color picker" });
// react-colorful's saturation area, then its hue bar.
const saturation = () => screen.getAllByRole("slider")[0];
const pickerArea = () => saturation().closest(".react-colorful").parentElement;

function renderColor(value = "#112233", props = {}) {
  const onChange = vi.fn();
  const view = render(<ColorInput id="c" value={value} onChange={onChange} {...props} />);
  const rerender = (next) => view.rerender(<ColorInput id="c" value={next} onChange={onChange} {...props} />);
  return { onChange, rerender };
}

describe("ColorInput", () => {
  it("shows the stored color in the hex box and the swatch", () => {
    renderColor("#112233");
    expect(hexBox()).toHaveValue("112233");
    expect(swatch()).toHaveStyle({ backgroundColor: "#112233" });
  });

  it("stores what is typed, with or without the #, and shows what the setting then holds", () => {
    const { onChange, rerender } = renderColor("#112233");
    fireEvent.change(hexBox(), { target: { value: "abcdef" } });
    expect(onChange).toHaveBeenLastCalledWith("#abcdef");
    // Until the setting changes, the box keeps showing the stored color.
    expect(hexBox()).toHaveValue("112233");
    rerender("#abcdef");
    expect(hexBox()).toHaveValue("abcdef");

    fireEvent.change(hexBox(), { target: { value: "#fff" } });
    expect(onChange).toHaveBeenLastCalledWith("#fff");
  });

  it("follows the stored color when it changes from outside", () => {
    const { rerender } = renderColor("#112233");
    rerender("#445566");
    expect(hexBox()).toHaveValue("445566");
    expect(swatch()).toHaveStyle({ backgroundColor: "#445566" });
  });

  it("stores a key press in the picker at once", () => {
    const { onChange } = renderColor("#808080");
    fireEvent.click(swatch());
    fireEvent.keyDown(saturation(), { key: "ArrowRight", keyCode: 39, which: 39 });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(hexBox()).toHaveValue(onChange.mock.calls[0][0].slice(1));
  });

  it("while dragging, shows the color but stores it only when the drag ends", () => {
    const { onChange } = renderColor("#808080");
    fireEvent.click(swatch());
    fireEvent.mouseDown(pickerArea());
    fireEvent.keyDown(saturation(), { key: "ArrowRight", keyCode: 39, which: 39 });
    const shown = hexBox().value;
    expect(shown).not.toBe("808080");
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.mouseUp(document);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(`#${shown}`);
  });

  it("keeps a dragged color showing when the page re-renders with the same stored color", () => {
    const { onChange, rerender } = renderColor("#808080");
    fireEvent.click(swatch());
    fireEvent.mouseDown(pickerArea());
    fireEvent.keyDown(saturation(), { key: "ArrowRight", keyCode: 39, which: 39 });
    const shown = hexBox().value;
    rerender("#808080");
    expect(hexBox()).toHaveValue(shown);
    fireEvent.mouseUp(document);
    expect(onChange).toHaveBeenCalledWith(`#${shown}`);
  });

  it("drops a drag in progress for a color changed from outside, and stores that color when the drag ends", () => {
    const { onChange, rerender } = renderColor("#808080");
    fireEvent.click(swatch());
    fireEvent.mouseDown(pickerArea());
    fireEvent.keyDown(saturation(), { key: "ArrowRight", keyCode: 39, which: 39 });
    rerender("#445566");
    expect(hexBox()).toHaveValue("445566");
    fireEvent.mouseUp(document);
    expect(onChange).toHaveBeenLastCalledWith("#445566");
  });
});

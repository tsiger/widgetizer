// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import TextInput from "../TextInput.jsx";

const renderNumber = (value, onChange) =>
  render(<TextInput id="count" type="number" value={value} onChange={onChange} min={0} max={10} step={2} />);

describe("TextInput number limits", () => {
  it("snaps a value above max to max when the field is left", () => {
    const onChange = vi.fn();
    renderNumber(99, onChange);
    fireEvent.blur(screen.getByRole("spinbutton"));
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("snaps a value below min to min when the field is left", () => {
    const onChange = vi.fn();
    renderNumber(-4, onChange);
    fireEvent.blur(screen.getByRole("spinbutton"));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("does not cut a value short while it is being typed", () => {
    const onChange = vi.fn();
    renderNumber(1, onChange);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "99" } });
    expect(onChange).toHaveBeenLastCalledWith(99);
  });

  it("leaves a value within limits, and an empty field, alone", () => {
    const onChange = vi.fn();
    const { unmount } = renderNumber(4, onChange);
    fireEvent.blur(screen.getByRole("spinbutton"));
    unmount();
    renderNumber("", onChange);
    fireEvent.blur(screen.getByRole("spinbutton"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

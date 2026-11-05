// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FontPickerInput from "../FontPickerInput.jsx";

beforeEach(() => {
  delete window.__fontPickerPreviewFonts;
  document.head.querySelectorAll('link[href*="fonts.bunny.net"]').forEach((link) => link.remove());
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback) { this.callback = callback; }
    observe(target) { this.callback([{ target, isIntersecting: true }], this); }
    unobserve() {}
    disconnect() {}
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FontPickerInput font loading", () => {
  it("requests selected preview weights with Bunny syntax and preserves other pickers' families", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FontPickerInput id="heading" value={{ stack: '"Sofia Sans", sans-serif', weight: 700 }} onChange={onChange} />,
    );
    rerender(<FontPickerInput id="heading" value={{ stack: '"Sofia Sans", sans-serif', weight: 400 }} onChange={onChange} />);
    render(<FontPickerInput id="body" value={{ stack: '"Brygada 1918", serif', weight: 500 }} onChange={onChange} />);
    const link = document.getElementById("font-picker-preview-fonts");
    expect(new URL(link.href).searchParams.get("family")).toBe("Sofia Sans:400,700|Brygada 1918:500");
    expect(link.href).not.toContain("wght@");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("offers all nine additions in the Greek filter and uses Bunny syntax for list samples", () => {
    render(<FontPickerInput id="font" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "System UI" }));
    fireEvent.change(screen.getByLabelText("Filter fonts by language"), { target: { value: "greek" } });
    for (const name of ["Sofia Sans", "Sofia Sans Condensed", "Sofia Sans Extra Condensed", "Roboto Flex", "Noto Serif Display", "Brygada 1918", "Geologica", "Google Sans", "Commissioner"]) {
      expect(screen.getByRole("option", { name })).toBeTruthy();
    }
    const families = [...document.head.querySelectorAll('link[href*="fonts.bunny.net"]')]
      .map((link) => new URL(link.href).searchParams.get("family"));
    expect(families).toContain("Sofia Sans:400");
    expect(families.every((family) => !family.includes("wght@"))).toBe(true);
  });
});

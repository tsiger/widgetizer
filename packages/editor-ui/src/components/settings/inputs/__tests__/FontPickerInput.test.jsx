// @vitest-environment jsdom
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import FontPickerInput from "../FontPickerInput.jsx";

beforeEach(() => {
  delete window.__fontPickerPreviewFonts;
  // List sample links share the module's lifetime with its loaded-font cache.
  document.getElementById("font-picker-preview-fonts")?.remove();
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

afterAll(() => {
  delete window.__fontPickerPreviewFonts;
  document.head.querySelectorAll('link[href*="fonts.bunny.net"]').forEach((link) => link.remove());
});

describe("FontPickerInput font loading", () => {
  it.each([
    ["armenian", "Noto Sans Armenian"],
    ["ethiopic", "Noto Sans Ethiopic"],
    ["georgian", "Noto Sans Georgian"],
    ["gujarati", "Noto Sans Gujarati"],
    ["gurmukhi", "Noto Sans Gurmukhi"],
    ["khmer", "Noto Sans Khmer"],
    ["lao", "Noto Sans Lao"],
    ["myanmar", "Noto Sans Myanmar"],
    ["sinhala", "Noto Sans Sinhala"],
    ["telugu", "Noto Sans Telugu"],
    ["japanese", "Noto Serif JP"],
    ["korean", "Noto Serif KR"],
    ["chinese-simplified", "Noto Serif SC"],
    ["chinese-traditional", "Noto Serif TC"],
  ])("finds %s fonts without changing the selection", (script, family) => {
    const onChange = vi.fn();
    render(<FontPickerInput id="font" value={{ stack: '"Inter", sans-serif', weight: 700 }} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Inter" }));
    fireEvent.change(screen.getByLabelText("Filter fonts by language"), { target: { value: script } });
    expect(screen.getByRole("option", { name: family })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Inter" })).toBeNull();
    for (const otherRegion of ["Noto Serif JP", "Noto Serif SC", "Noto Serif TC", "Noto Serif KR"]) {
      if (otherRegion !== family) expect(screen.queryByRole("option", { name: otherRegion })).toBeNull();
    }
    expect(screen.getByRole("button", { name: "Inter" })).toBeTruthy();
    expect(screen.getByLabelText("Font weight").value).toBe("700");
    expect(onChange).not.toHaveBeenCalled();
  });

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

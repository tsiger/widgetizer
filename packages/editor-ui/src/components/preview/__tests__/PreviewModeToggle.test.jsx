// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PreviewModeToggle from "../PreviewModeToggle.jsx";

// Shared desktop/mobile switcher used by the standalone site preview (and a
// candidate for the editor top bar). Presentational: it reflects `mode` in the
// active button's styling and reports the chosen mode via onChange. i18n has no
// provider in tests, so titles come back as raw keys.
describe("PreviewModeToggle", () => {
  it("marks the active mode's button and leaves the other inactive", () => {
    render(<PreviewModeToggle mode="desktop" onChange={() => {}} />);
    const desktop = screen.getByTitle("pageEditor.toolbar.desktopView");
    const mobile = screen.getByTitle("pageEditor.toolbar.mobileView");
    expect(desktop.className).toContain("bg-white");
    expect(mobile.className).not.toContain("bg-white");
  });

  it("reports the chosen mode on click", () => {
    const onChange = vi.fn();
    render(<PreviewModeToggle mode="desktop" onChange={onChange} />);
    fireEvent.click(screen.getByTitle("pageEditor.toolbar.mobileView"));
    expect(onChange).toHaveBeenCalledWith("mobile");
  });
});

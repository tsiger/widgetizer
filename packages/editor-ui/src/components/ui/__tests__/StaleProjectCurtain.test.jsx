// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StaleProjectCurtain from "../StaleProjectCurtain.jsx";
import useStaleProjectStore from "../../../stores/staleProjectStore.js";
import useProjectStore from "../../../stores/projectStore.js";

beforeEach(() => {
  useStaleProjectStore.getState().clearStale();
  useProjectStore.setState({ activeProject: null });
});

describe("StaleProjectCurtain", () => {
  it("renders nothing when not stale", () => {
    const { container } = render(<StaleProjectCurtain />);
    expect(container.firstChild).toBe(null);
  });

  it("shows the incoming project name and a Reload button when stale", () => {
    useStaleProjectStore.getState().markStale("Marketing Site");
    render(<StaleProjectCurtain />);
    expect(screen.getByText(/out of date/i)).toBeInTheDocument();
    expect(screen.getByText(/Marketing Site/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument();
  });

  it("names this tab's own (now-stale) project in the recovery hint", () => {
    useProjectStore.setState({ activeProject: { id: "local", name: "Home Site" } });
    useStaleProjectStore.getState().markStale("Marketing Site");
    render(<StaleProjectCurtain />);
    expect(screen.getByText(/Home Site/)).toBeInTheDocument();
  });

  it("explains a removed language in its own words, not the switched-project ones", () => {
    useStaleProjectStore.getState().markLanguageRemoved("el");
    render(<StaleProjectCurtain />);

    expect(screen.getByText(/was removed/i)).toBeInTheDocument();
    // The project-switch copy would be actively misleading here: there is no other
    // tab that caused this, and nothing clears it by itself.
    expect(screen.queryByText(/Another tab switched/i)).not.toBeInTheDocument();
  });

  it("names the language the way a person would, not by its code", () => {
    // "el" is an internal detail nobody chose, and it is the one word in this
    // message the reader most needs to recognise.
    useStaleProjectStore.getState().markLanguageRemoved("el");
    render(<StaleProjectCurtain />);

    expect(screen.getByText(/Greek was removed/i)).toBeInTheDocument();
    expect(screen.queryByText(/\bel\b/)).not.toBeInTheDocument();
  });

  it("labels the exit with what it does and where it goes", () => {
    // The OSS shell already sends this button to the Pages list; the label has to
    // say so, and say that the draft is discarded on the way.
    useStaleProjectStore.getState().markLanguageRemoved("el");
    render(<StaleProjectCurtain />);

    expect(
      screen.getByRole("button", { name: /discard changes and return to pages/i }),
    ).toBeInTheDocument();
  });

  it("says plainly that reloading discards the unsaved work", () => {
    // For a switched project a reload is recovery; here it is destruction, and the
    // button has to admit that rather than say "Reload to continue".
    useStaleProjectStore.getState().markLanguageRemoved("el");
    render(<StaleProjectCurtain />);

    expect(screen.getByText(/Reloading discards them/i)).toBeInTheDocument();
  });

  it("does not block the editor, because copying the draft out is the only recovery", () => {
    // The work cannot be saved anywhere and reloading loses it, so the editor
    // underneath is the last place it exists. A modal over it would make the one
    // available recovery impossible while appearing to help.
    useStaleProjectStore.getState().markLanguageRemoved("el");
    render(<StaleProjectCurtain />);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    const banner = screen.getByRole("alert");
    expect(banner).toBeInTheDocument();
    expect(banner.getAttribute("aria-modal")).toBe(null);
    expect(banner.className).not.toMatch(/inset-0/);
  });

  it("offers no recovery it cannot deliver", () => {
    // Re-adding the language does not restore the pages deleted with it, and the
    // draft cannot be saved afterwards — so that advice must not be given.
    useStaleProjectStore.getState().markLanguageRemoved("el");
    render(<StaleProjectCurtain />);

    expect(screen.queryByText(/add the language back/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/save as usual/i)).not.toBeInTheDocument();
  });

  it("invokes onReload when Reload is clicked", () => {
    useStaleProjectStore.getState().markStale();
    const onReload = vi.fn();
    render(<StaleProjectCurtain onReload={onReload} />);
    screen.getByRole("button", { name: /reload/i }).click();
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});

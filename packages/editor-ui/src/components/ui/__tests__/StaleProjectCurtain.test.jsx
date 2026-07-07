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

  it("invokes onReload when Reload is clicked", () => {
    useStaleProjectStore.getState().markStale();
    const onReload = vi.fn();
    render(<StaleProjectCurtain onReload={onReload} />);
    screen.getByRole("button", { name: /reload/i }).click();
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});

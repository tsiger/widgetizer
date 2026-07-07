// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkspaceLoadFailed from "../WorkspaceLoadFailed.jsx";

describe("WorkspaceLoadFailed", () => {
  it("renders the failure message and a Retry action", () => {
    render(<WorkspaceLoadFailed onRetry={() => {}} />);
    expect(screen.getByText(/couldn.t load your workspace/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("calls onRetry when Retry is clicked", () => {
    const onRetry = vi.fn();
    render(<WorkspaceLoadFailed onRetry={onRetry} />);
    screen.getByRole("button", { name: /retry/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

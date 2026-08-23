// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "../EmptyState.jsx";

describe("EmptyState", () => {
  it("renders title, description, and action", () => {
    render(
      <EmptyState
        title="Nothing here"
        description="Add something to get started."
        action={<button>Add</button>}
      />,
    );
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
    expect(screen.getByText("Add something to get started.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("is styled with real utility classes, not dead semantic class names", () => {
    // The historical `empty-state*` class names had no matching CSS anywhere
    // in the repo, so the component rendered unstyled bare markup.
    const { container } = render(<EmptyState title="T" />);
    expect(container.firstChild.className).not.toMatch(/empty-state/);
    expect(container.firstChild.className).toContain("flex");
  });

  it("appends a caller-provided className", () => {
    const { container } = render(<EmptyState title="T" className="mt-8" />);
    expect(container.firstChild.className).toContain("mt-8");
  });
});

// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireActiveProject from "../RequireActiveProject.jsx";
import useProjectStore from "../../../stores/projectStore";

function renderGate() {
  return render(
    <MemoryRouter initialEntries={["/editor"]}>
      <Routes>
        <Route path="/editor" element={<RequireActiveProject />}>
          <Route index element={<div>EDITOR OUTLET</div>} />
        </Route>
        <Route path="/projects" element={<div>PICKER</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useProjectStore.setState({ activeProject: null, scope: null, loading: false, error: null });
});

describe("RequireActiveProject", () => {
  it("shows the error screen (not the picker) when the probe failed", () => {
    useProjectStore.setState({ loading: false, error: "Failed to get active project", activeProject: null });
    renderGate();
    expect(screen.getByText(/couldn.t load your workspace/i)).toBeInTheDocument();
    expect(screen.queryByText("PICKER")).not.toBeInTheDocument();
  });

  it("redirects to the picker when there is genuinely no project (no error)", () => {
    useProjectStore.setState({ loading: false, error: null, activeProject: null });
    renderGate();
    expect(screen.getByText("PICKER")).toBeInTheDocument();
  });

  it("renders the editor outlet when a project is active", () => {
    useProjectStore.setState({ loading: false, error: null, activeProject: { id: "p1" } });
    renderGate();
    expect(screen.getByText("EDITOR OUTLET")).toBeInTheDocument();
  });
});

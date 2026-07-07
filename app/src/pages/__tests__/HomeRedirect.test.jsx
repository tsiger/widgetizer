// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import HomeRedirect from "../HomeRedirect.jsx";
import useProjectStore from "@widgetizer/editor-ui/stores/projectStore";

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/pages" element={<div>PAGES</div>} />
        <Route path="/projects" element={<div>PICKER</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useProjectStore.setState({ activeProject: null, scope: null, loading: false, error: null });
});

describe("HomeRedirect", () => {
  it("shows the error screen (not the picker) when the probe failed", () => {
    useProjectStore.setState({ error: "boom", activeProject: null, loading: false });
    renderHome();
    expect(screen.getByText(/couldn.t load your workspace/i)).toBeInTheDocument();
    expect(screen.queryByText("PICKER")).not.toBeInTheDocument();
  });

  it("redirects to /pages when a project is active", () => {
    useProjectStore.setState({ activeProject: { id: "p1" }, loading: false, error: null });
    renderHome();
    expect(screen.getByText("PAGES")).toBeInTheDocument();
  });

  it("redirects to /projects when there is genuinely no project", () => {
    useProjectStore.setState({ activeProject: null, loading: false, error: null });
    renderHome();
    expect(screen.getByText("PICKER")).toBeInTheDocument();
  });
});

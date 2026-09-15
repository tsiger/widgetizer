// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const exportProjectAPI = vi.fn();
const getExportHistory = vi.fn();
let projectState;

vi.mock("../../stores/projectStore", () => {
  const hook = (selector) => (selector ? selector(projectState) : projectState);
  hook.getState = () => projectState;
  return { default: hook };
});
vi.mock("../../stores/toastStore", () => {
  const state = { showToast: () => {} };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("../../queries/exportManager", () => ({
  exportProjectAPI: (...args) => exportProjectAPI(...args),
  getExportHistory: (...args) => getExportHistory(...args),
}));
vi.mock("../../components/export/ExportHistoryTable", () => ({
  default: () => <div data-testid="export-history" />,
}));
vi.mock("../../components/layout/PageLayout", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

import ExportSite from "../ExportSite.jsx";

const RECORD = { version: 1, timestamp: "2026-09-15T10:00:00.000Z" };

beforeEach(() => {
  exportProjectAPI.mockReset();
  getExportHistory.mockReset();
  projectState = { activeProject: { id: "project-1", name: "Crumbly" } };
});

describe("ExportSite — search-engine note", () => {
  it("keeps the note after the first export switches the page to its history view", async () => {
    getExportHistory.mockResolvedValueOnce({ exports: [] }).mockResolvedValue({ exports: [RECORD] });
    exportProjectAPI.mockResolvedValue({
      success: true,
      exportRecord: RECORD,
      structuredData: { readiness: [{ item: "logo", ok: false }], warnings: [] },
    });

    render(<ExportSite />);
    fireEvent.click(await screen.findByRole("button", { name: "exportSite.creator.exportButton" }));

    await waitFor(() => expect(screen.getByTestId("export-history")).toBeInTheDocument());
    expect(screen.getByText("exportSite.structuredData.title")).toBeInTheDocument();
    expect(screen.getByText("exportSite.creator.successTitle")).toBeInTheDocument();
  });

  it("shows no note when nothing is missing", async () => {
    getExportHistory.mockResolvedValueOnce({ exports: [] }).mockResolvedValue({ exports: [RECORD] });
    exportProjectAPI.mockResolvedValue({
      success: true,
      exportRecord: RECORD,
      structuredData: { readiness: [{ item: "logo", ok: true }], warnings: [] },
    });

    render(<ExportSite />);
    fireEvent.click(await screen.findByRole("button", { name: "exportSite.creator.exportButton" }));

    await waitFor(() => expect(screen.getByTestId("export-history")).toBeInTheDocument());
    expect(screen.queryByText("exportSite.structuredData.title")).toBeNull();
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const exportProjectAPI = vi.fn();
const getExportHistory = vi.fn();
let projectState;

vi.mock("../../stores/projectStore", () => {
  const hook = (selector) => (selector ? selector(projectState) : projectState);
  hook.getState = () => projectState;
  return { default: hook, useIsMultilang: () => (projectState.activeProject?.languages || []).length > 0 };
});
vi.mock("../../hooks/useThemeLocale", () => ({
  useThemeLocale: () => ({ tTheme: (str) => (str?.startsWith("tTheme:") ? str.slice(7) : str) }),
}));
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

  // The warning names a language the visitor will never see published, so it
  // must outlive the remount that the first export triggers.
  it("keeps the skipped-language warning through that same switch", async () => {
    getExportHistory.mockResolvedValueOnce({ exports: [] }).mockResolvedValue({ exports: [RECORD] });
    exportProjectAPI.mockResolvedValue({
      success: true,
      exportRecord: RECORD,
      structuredData: { readiness: [{ item: "logo", ok: true }], warnings: [] },
      warnings: [{ code: "LANGUAGE_SKIPPED", language: "de" }],
    });

    render(<ExportSite />);
    fireEvent.click(await screen.findByRole("button", { name: "exportSite.creator.exportButton" }));

    await waitFor(() => expect(screen.getByTestId("export-history")).toBeInTheDocument());
    expect(screen.getByText("exportSite.languages.skippedTitle")).toBeInTheDocument();
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

describe("ExportSite — items that stop an export", () => {
  const refusal = (invalidItems) =>
    Object.assign(new Error("Export blocked: collection item(s) have validation errors."), {
      data: { error: "Export failed: invalid collection items", invalidItems },
    });
  const item = (slug, language = "el") => ({
    collection: "news",
    collectionName: "News",
    slug,
    title: slug === "nea" ? "Νέα ανακοίνωση" : slug,
    language,
    errors: [{ fieldId: "title", reason: "required field is empty", fieldLabel: "tTheme:news.title" }],
  });

  it("lists each item with its language and field, linked to its editor", async () => {
    projectState = { activeProject: { id: "project-1", name: "Crumbly", languages: ["el"] } };
    getExportHistory.mockResolvedValue({ exports: [] });
    exportProjectAPI.mockRejectedValue(refusal([item("nea")]));

    render(
      <MemoryRouter>
        <ExportSite />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "exportSite.creator.exportButton" }));

    const link = await screen.findByRole("link", { name: "News: Νέα ανακοίνωση" });
    expect(link.getAttribute("href")).toBe("/collections/news/nea/edit?language=el");
    expect(screen.getByText("exportSite.invalidItems.title")).toBeInTheDocument();
    expect(link.closest("li").textContent).toContain("(Greek)");
    expect(link.closest("li").textContent).toContain("exportSite.invalidItems.field");
  });

  it("names the first five and counts the rest", async () => {
    getExportHistory.mockResolvedValue({ exports: [] });
    exportProjectAPI.mockRejectedValue(refusal(["a", "b", "c", "d", "e", "f", "g"].map((slug) => item(slug, "en"))));

    render(
      <MemoryRouter>
        <ExportSite />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "exportSite.creator.exportButton" }));

    await screen.findByText("exportSite.invalidItems.title");
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("exportSite.invalidItems.more")).toBeInTheDocument();
    // A single-language site does not name the language.
    expect(screen.getAllByRole("listitem")[0].textContent).not.toContain("(");
  });
});

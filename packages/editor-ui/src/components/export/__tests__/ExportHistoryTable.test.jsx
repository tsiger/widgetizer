// @vitest-environment jsdom
/**
 * An exported site runs its own scripts (theme code, pasted embeds), so the
 * window it opens in must not be able to reach back and navigate the editor.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../../queries/exportManager", () => ({
  getExportEntryFile: vi.fn().mockResolvedValue({ entryFile: "index.html" }),
  downloadExportZip: vi.fn(),
  deleteExportAPI: vi.fn(),
  getExportViewUrl: (dir, file) => `/api/export/view/${dir}/${file}`,
}));
vi.mock("../../../stores/toastStore", () => ({ default: (selector) => selector({ showToast: vi.fn() }) }));
vi.mock("../../../hooks/useConfirmationAction", () => ({
  default: () => ({ confirm: vi.fn(), confirmationModal: null }),
}));
vi.mock("../../../hooks/useFormatDate", () => ({ default: () => ({ formatDate: () => "today" }) }));

import ExportHistoryTable from "../ExportHistoryTable.jsx";

const EXPORT = {
  version: 1,
  status: "success",
  outputDir: "/data/publish/site-v1",
  sizeBytes: 1024,
  createdAt: "2026-10-19T08:00:00.000Z",
  hasIssuesReport: true,
};

function renderTable() {
  render(
    <ExportHistoryTable
      exportHistory={[EXPORT]}
      loadingHistory={false}
      maxVersionsToKeep={10}
      developerMode
      activeProject={{ id: "p1" }}
      setExportHistory={vi.fn()}
    />,
  );
}

beforeEach(() => {
  window.open = vi.fn();
});

describe("ExportHistoryTable — opening an export", () => {
  it("opens View site without a link back to the editor", async () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: /export actions/i }));
    fireEvent.click(screen.getByText("exportSite.history.tooltips.view"));

    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith("/api/export/view/site-v1/index.html", "_blank", "noopener,noreferrer"),
    );
  });

  it("opens the issues report without a link back to the editor", () => {
    renderTable();
    fireEvent.click(screen.getByText("exportSite.history.issues.found"));

    expect(window.open).toHaveBeenCalledWith(
      "/api/export/view/site-v1/__export__issues.html",
      "_blank",
      "noopener,noreferrer",
    );
  });
});

// @vitest-environment jsdom
/**
 * The import dialog asks whether a chosen backup's theme is installed
 * before uploading: a missing theme is named and nothing is sent, and when the
 * check can't tell, the import goes ahead and the server decides.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const importProject = vi.fn();
const isThemeInstalled = vi.fn();
const readBackupTheme = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, options) => (options?.theme ? `${key}:${options.theme}` : key) }),
}));
vi.mock("@widgetizer/editor-ui/queries/projectManager", () => ({
  importProject: (...args) => importProject(...args),
}));
vi.mock("@widgetizer/editor-ui/queries/themeManager", () => ({
  isThemeInstalled: (...args) => isThemeInstalled(...args),
}));
vi.mock("../../../lib/backupManifest", () => ({ readBackupTheme: (...args) => readBackupTheme(...args) }));
vi.mock("@widgetizer/editor-ui/hooks/useAppSettings", () => ({ default: () => ({ settings: {} }) }));
vi.mock("@widgetizer/editor-ui/stores/toastStore", () => {
  const state = { showToast: vi.fn() };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook };
});
vi.mock("@widgetizer/editor-ui/components/ui/FileUploader.jsx", () => ({
  default: ({ onUpload }) => (
    <button type="button" onClick={() => onUpload([new File(["zip"], "backup.zip", { type: "application/zip" })])}>
      choose backup
    </button>
  ),
}));

const { default: ProjectImportModal } = await import("../ProjectImportModal.jsx");

const onSuccess = vi.fn();
let view;
const chooseBackup = () => act(async () => fireEvent.click(screen.getByText("choose backup")));
const importButton = () => screen.getByRole("button", { name: "projects.importModal.importButton" });

beforeEach(() => {
  importProject.mockReset().mockResolvedValue({ id: "new", name: "Brightside" });
  isThemeInstalled.mockReset().mockImplementation(async (theme) => theme === "arch");
  readBackupTheme.mockReset().mockResolvedValue("arch");
  onSuccess.mockReset();
  view = render(<ProjectImportModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />);
});
afterEach(cleanup);

describe("the import dialog's theme check", () => {
  it("names a theme that isn't installed and uploads nothing", async () => {
    readBackupTheme.mockResolvedValue("meridian");
    await chooseBackup();
    expect(screen.getByText("projects.importModal.themeNotInstalled:meridian")).toBeTruthy();
    expect(screen.queryByText("backup.zip")).toBeNull();
    expect(importButton().disabled).toBe(true);
    expect(importProject).not.toHaveBeenCalled();
  });

  it("imports a backup whose theme is installed", async () => {
    await chooseBackup();
    expect(screen.getByText("backup.zip")).toBeTruthy();
    await act(async () => fireEvent.click(importButton()));
    expect(importProject).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith({ id: "new", name: "Brightside" });
  });

  it("holds the Import button while the check is running", async () => {
    let answer;
    readBackupTheme.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await chooseBackup();
    expect(importButton().disabled).toBe(true);
    await act(async () => answer("arch"));
    expect(importButton().disabled).toBe(false);
  });

  it("drops a late answer for a backup that was replaced by another", async () => {
    const answers = [];
    readBackupTheme.mockImplementation(() => new Promise((resolve) => answers.push(resolve)));
    await chooseBackup();
    await chooseBackup();
    await act(async () => answers[1]("arch"));
    expect(importButton().disabled).toBe(false);
    await act(async () => answers[0]("meridian"));
    expect(screen.queryByText("projects.importModal.themeNotInstalled:meridian")).toBeNull();
    expect(screen.getByText("backup.zip")).toBeTruthy();
    expect(importButton().disabled).toBe(false);
  });

  it("drops a late answer for a backup chosen before the dialog was closed and reopened", async () => {
    let answer;
    readBackupTheme.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    await chooseBackup();
    await act(async () => fireEvent.click(screen.getByText("common.cancel")));
    view.rerender(<ProjectImportModal isOpen={false} onClose={vi.fn()} onSuccess={onSuccess} />);
    view.rerender(<ProjectImportModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />);
    await act(async () => answer("meridian"));
    expect(screen.queryByText("projects.importModal.themeNotInstalled:meridian")).toBeNull();
    await chooseBackup();
    expect(screen.getByText("backup.zip")).toBeTruthy();
    expect(importButton().disabled).toBe(false);
  });

  it("lets the import go ahead when the backup can't be read here", async () => {
    readBackupTheme.mockResolvedValue(null);
    await chooseBackup();
    await act(async () => fireEvent.click(importButton()));
    expect(importProject).toHaveBeenCalledTimes(1);
  });

  it("lets the import go ahead when the server's answer doesn't settle it", async () => {
    readBackupTheme.mockResolvedValue("meridian");
    isThemeInstalled.mockResolvedValue(null);
    await chooseBackup();
    await act(async () => fireEvent.click(importButton()));
    expect(importProject).toHaveBeenCalledTimes(1);
  });
});

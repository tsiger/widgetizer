// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// The metadata drawer's hook: saving through saveMediaMetadata (which owns the
// route and the media cache) and opening files.

vi.mock("../../queries/mediaManager", () => ({
  saveMediaMetadata: vi.fn(),
}));

vi.mock("../../lib/config", () => ({
  API_URL: (path) => path,
}));

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));

import { createElement } from "react";
import useMediaMetadata from "../useMediaMetadata.js";
import { PluginProvider } from "../../extension/PluginProvider.jsx";
import { saveMediaMetadata } from "../../queries/mediaManager";

const ACTIVE_PROJECT = { id: "proj-1" };
const FILE_URL = "/api/media/projects/proj-1/media/file-1";

function renderMetadata({ plugins = [], showToast = vi.fn() } = {}) {
  const wrapper = ({ children }) => createElement(PluginProvider, { plugins }, children);
  return renderHook(() => useMediaMetadata({ activeProject: ACTIVE_PROJECT, showToast, setFiles: vi.fn() }), {
    wrapper,
  });
}

/**
 * A blank tab as window.open("") returns it, recording what happens to it.
 * `navigated` holds the link the tab followed, if any.
 */
function fakeTab() {
  const tab = {
    opener: {},
    closed: false,
    navigated: null,
    close: vi.fn(() => {
      tab.closed = true;
    }),
  };
  tab.document = {
    createElement: () => {
      const link = { click: () => (tab.navigated = link) };
      return link;
    },
    body: { appendChild: vi.fn() },
  };
  return tab;
}

function withHook(beforeOpenMediaFile) {
  return [{ name: "host", hooks: { beforeOpenMediaFile } }];
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useMediaMetadata", () => {
  // The save itself (route, cache invalidation) is saveMediaMetadata's, tested
  // in the query suite; the hook passes the language and keeps the list current.
  it("saves through saveMediaMetadata and updates the file in the list", async () => {
    saveMediaMetadata.mockResolvedValue({ file: { metadata: { alt: "new" }, translations: {} } });
    const setFiles = vi.fn();
    const wrapper = ({ children }) => createElement(PluginProvider, null, children);
    const { result } = renderHook(
      () => useMediaMetadata({ activeProject: ACTIVE_PROJECT, showToast: vi.fn(), setFiles }),
      { wrapper },
    );

    await act(async () => {
      await result.current.handleSaveMetadata("file-1", { alt: "new" }, "el");
    });

    expect(saveMediaMetadata).toHaveBeenCalledWith("proj-1", "file-1", { alt: "new" }, "el");
    const [[update]] = setFiles.mock.calls;
    expect(update([{ id: "file-1", metadata: { alt: "old" } }])[0].metadata.alt).toBe("new");
  });

  it("opens a file without a link back to the editor", () => {
    window.open = vi.fn();
    const { result } = renderMetadata();

    result.current.handleFileView({ id: "file-1" });

    expect(window.open).toHaveBeenCalledWith(FILE_URL, "_blank", "noopener,noreferrer");
  });

  describe("when a host gets ready first (beforeOpenMediaFile)", () => {
    it("opens a blank tab at once, cuts its link to the editor, then sends it to the file", async () => {
      const tab = fakeTab();
      window.open = vi.fn(() => tab);
      let release;
      const hook = vi.fn(() => new Promise((resolve) => (release = resolve)));
      const { result } = renderMetadata({ plugins: withHook(hook) });

      const opening = result.current.handleFileView({ id: "file-1" });

      expect(window.open).toHaveBeenCalledWith("", "_blank");
      expect(tab.opener).toBeNull();
      expect(hook).toHaveBeenCalledWith({ projectId: "proj-1", fileId: "file-1", url: FILE_URL });
      expect(tab.navigated).toBeNull();

      release();
      await opening;
      expect(tab.navigated).toMatchObject({
        href: new URL(FILE_URL, window.location.href).href,
        rel: "noreferrer",
        referrerPolicy: "no-referrer",
      });
    });

    it("closes the tab and shows the host's message when the host refuses", async () => {
      const tab = fakeTab();
      window.open = vi.fn(() => tab);
      const showToast = vi.fn();
      const { result } = renderMetadata({
        plugins: withHook(async () => ({ proceed: false, message: "Sign in again to view the file." })),
        showToast,
      });

      await result.current.handleFileView({ id: "file-1" });

      expect(tab.close).toHaveBeenCalled();
      expect(tab.navigated).toBeNull();
      expect(showToast).toHaveBeenCalledWith("Sign in again to view the file.", "error");
    });

    it("closes the tab and says so when the host's hook fails", async () => {
      const tab = fakeTab();
      window.open = vi.fn(() => tab);
      const showToast = vi.fn();
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { result } = renderMetadata({
        plugins: withHook(async () => {
          throw new Error("network");
        }),
        showToast,
      });

      await result.current.handleFileView({ id: "file-1" });

      expect(tab.close).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith("media.viewFailed", "error");
    });

    it("says the tab was blocked when the browser doesn't open one", async () => {
      window.open = vi.fn(() => null);
      const hook = vi.fn();
      const showToast = vi.fn();
      const { result } = renderMetadata({ plugins: withHook(hook), showToast });

      await result.current.handleFileView({ id: "file-1" });

      expect(hook).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith("media.viewBlocked", "error");
    });

    it("leaves the tab alone if the user closed it while waiting", async () => {
      const tab = fakeTab();
      window.open = vi.fn(() => tab);
      const { result } = renderMetadata({
        plugins: withHook(async () => {
          tab.closed = true;
        }),
      });

      await result.current.handleFileView({ id: "file-1" });

      expect(tab.navigated).toBeNull();
    });

    it("closes the tab without asking the host when its link to the editor can't be cut", async () => {
      const tab = fakeTab();
      Object.defineProperty(tab, "opener", { get: () => ({}), set: () => {} });
      window.open = vi.fn(() => tab);
      const hook = vi.fn();
      const showToast = vi.fn();
      const { result } = renderMetadata({ plugins: withHook(hook), showToast });

      await result.current.handleFileView({ id: "file-1" });

      expect(hook).not.toHaveBeenCalled();
      expect(tab.close).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith("media.viewFailed", "error");
    });

    it("closes the tab and says so when sending it to the file fails", async () => {
      const tab = fakeTab();
      tab.document.createElement = () => {
        throw new Error("tab gone");
      };
      window.open = vi.fn(() => tab);
      const showToast = vi.fn();
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { result } = renderMetadata({ plugins: withHook(async () => {}), showToast });

      await result.current.handleFileView({ id: "file-1" });

      expect(tab.close).toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith("media.viewFailed", "error");
    });
  });
});

// @vitest-environment jsdom
/**
 * The Media page's drop zone words the project's upload limit (not the media
 * setting), and the shell's `mediaHeader` and `mediaToolbarTop` slots sit above the upload area and between it and the toolbar.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

let uploaderProps;
let limits;
let files = [];

vi.mock("../../hooks/useProjectLimits", () => ({
  default: () => limits,
  formatLimitMB: (bytes) => `${bytes / 1024 / 1024}MB`,
}));
vi.mock("../../hooks/useMediaState", () => ({
  default: () => ({
    loading: false,
    get files() {
      return files;
    },
    filteredFiles: [],
    activeProject: { id: "p1" },
    showToast: vi.fn(),
    setFiles: vi.fn(),
    viewMode: "grid",
  }),
}));
vi.mock("../../hooks/useMediaUpload", () => ({
  default: () => ({ uploading: false, uploadProgress: {}, handleUpload: vi.fn() }),
}));
vi.mock("../../hooks/useMediaSelection", () => ({
  default: () => ({ selectedFiles: [], modalState: { isOpen: false } }),
}));
vi.mock("../../hooks/useMediaMetadata", () => ({ default: () => ({ drawerVisible: false }) }));
vi.mock("../../hooks/useMediaUsageTitles", () => ({ default: () => ({}) }));
vi.mock("../../stores/projectStore", () => ({
  useDefaultLanguage: () => "en",
  useExtraLanguages: () => [],
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("../../components/layout/PageLayout", () => ({ default: ({ children }) => <div data-testid="page">{children}</div> }));
vi.mock("../../components/ui/FileUploader", () => ({
  default: (props) => {
    uploaderProps = props;
    return <div data-testid="uploader" />;
  },
}));
vi.mock("../../components/media/MediaToolbar", () => ({ default: () => <div data-testid="toolbar" /> }));
vi.mock("../../components/media/MediaGrid", () => ({ default: () => null }));
vi.mock("../../components/media/MediaList", () => ({ default: () => null }));
vi.mock("../../components/media/MediaDrawer", () => ({ default: () => null }));
vi.mock("../../components/ui/ConfirmationModal", () => ({ default: () => null }));
vi.mock("../../components/ui/Lightbox", () => ({ default: () => null }));

const { default: Media } = await import("../Media.jsx");
const { PluginProvider } = await import("../../extension/PluginProvider.jsx");

const renderMedia = () =>
  render(
    <PluginProvider>
      <Media />
    </PluginProvider>,
  );

beforeEach(() => {
  uploaderProps = undefined;
  files = [];
  limits = { maxUploadBytes: 50 * 1024 * 1024, maxSizeMB: 50, loaded: true };
});
afterEach(cleanup);

describe("Media page upload limit", () => {
  it("shows the project's upload limit on the drop zone", () => {
    limits = { maxUploadBytes: 7 * 1024 * 1024, maxSizeMB: 7, loaded: true };
    renderMedia();

    expect(uploaderProps.maxSize).toBe(7 * 1024 * 1024);
    expect(uploaderProps.maxSizeText).toContain("7MB max");
  });

  it("shows the default 50MB limit the local app reports", () => {
    renderMedia();

    expect(uploaderProps.maxSize).toBe(50 * 1024 * 1024);
    expect(uploaderProps.maxSizeText).toContain("50MB max");
  });

  it("checks no size and names no limit when there is none", () => {
    limits = { maxUploadBytes: null, maxSizeMB: null, loaded: true };
    renderMedia();

    expect(uploaderProps.maxSize).toBeUndefined();
    expect(uploaderProps.maxSizeText).not.toMatch(/MB/);
  });

  it("renders the mediaHeader slot above the upload area", () => {
    render(
      <PluginProvider slots={{ mediaHeader: <div data-testid="media-header">usage</div> }}>
        <Media />
      </PluginProvider>,
    );

    const header = screen.getByTestId("media-header");
    const uploader = screen.getByTestId("uploader");
    expect(header.compareDocumentPosition(uploader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders the mediaToolbarTop slot after the upload area and before the toolbar", () => {
    files = [{ id: "f1" }];
    render(
      <PluginProvider slots={{ mediaToolbarTop: <div data-testid="toolbar-top">notice</div> }}>
        <Media />
      </PluginProvider>,
    );

    const uploader = screen.getByTestId("uploader");
    const slot = screen.getByTestId("toolbar-top");
    const toolbar = screen.getByTestId("toolbar");
    expect(uploader.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(slot.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders nothing between the upload area and the toolbar when the slot is empty", () => {
    files = [{ id: "f1" }];
    renderMedia();

    expect(screen.getByTestId("uploader").nextElementSibling).toBe(screen.getByTestId("toolbar"));
  });
});

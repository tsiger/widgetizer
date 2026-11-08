// @vitest-environment jsdom
/**
 * The image field shows a preview of the stored image once the media library
 * has it, and the upload box when nothing is stored (or the library lacks the
 * file). The preview follows the stored image as it changes: removed, put
 * back by undo, or replaced from the library.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const HERO = { id: "h", type: "image/jpeg", path: "/uploads/images/hero.jpg", metadata: { alt: "Hero alt" } };
const TEAM = { id: "t", type: "image/jpeg", path: "/uploads/images/team.jpg", metadata: { alt: "Team alt" } };
// Its name ends with hero.jpg's whole name.
const SUPERHERO = { id: "s", type: "image/jpeg", path: "/uploads/images/superhero.jpg", metadata: { alt: "Superhero alt" } };

const getProjectMedia = vi.fn();
const saveMediaMetadata = vi.fn();

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key) => key }) }));
vi.mock("../../../../lib/config", () => ({ API_URL: (path) => path }));
vi.mock("../../../../queries/mediaManager", () => ({
  getProjectMedia: (...args) => getProjectMedia(...args),
  uploadProjectMedia: vi.fn(),
  saveMediaMetadata: (...args) => saveMediaMetadata(...args),
}));
// The store hands out the same project object until the project changes.
const PROJECT_STATE = { activeProject: { id: "p1" } };
vi.mock("../../../../stores/projectStore", () => ({ default: (selector) => selector(PROJECT_STATE) }));
vi.mock("../../../../stores/toastStore", () => ({ default: (selector) => selector({ showToast: () => {} }) }));
vi.mock("../../../../hooks/useAppSettings", () => ({ default: () => ({ settings: { media: { maxFileSizeMB: 5 } } }) }));
vi.mock("../../../../components/media/MediaSelectorDrawer", () => ({
  default: (props) => (
    <button type="button" onClick={() => props.onSelect(TEAM)}>
      pick team
    </button>
  ),
}));
vi.mock("../../../../components/media/MediaDrawer", () => ({
  default: (props) => (
    <div>
      editing {props.selectedFile.path}
      <button type="button" onClick={() => props.onSave(props.selectedFile.id, { alt: "New alt" }, "en")}>
        save metadata
      </button>
    </div>
  ),
}));

const { default: ImageInput } = await import("../ImageInput.jsx");

beforeEach(() => {
  getProjectMedia.mockReset().mockResolvedValue({ files: [HERO, TEAM] });
  saveMediaMetadata.mockReset();
});
afterEach(cleanup);

const preview = () => screen.queryByRole("img");
const uploadBox = () => screen.queryByText("components.mediaSelector.importNew");

function renderImage(value) {
  const onChange = vi.fn();
  const view = render(<ImageInput id="i" value={value} onChange={onChange} />);
  const rerender = async (next) => {
    await act(async () => view.rerender(<ImageInput id="i" value={next} onChange={onChange} />));
  };
  return { onChange, rerender };
}

describe("ImageInput", () => {
  it("shows the upload box while the stored image is looked up, then its preview", async () => {
    renderImage(HERO.path);
    expect(uploadBox()).toBeInTheDocument();
    expect(await screen.findByRole("img")).toHaveAttribute("src", "/api/media/projects/p1/uploads/images/hero.jpg");
    expect(preview()).toHaveAttribute("alt", "Hero alt");
    expect(uploadBox()).toBeNull();
  });

  it("shows the upload box when nothing is stored, without asking the library", () => {
    renderImage("");
    expect(uploadBox()).toBeInTheDocument();
    expect(getProjectMedia).not.toHaveBeenCalled();
  });

  it("shows the upload box for an image the library doesn't have", async () => {
    renderImage("/uploads/images/gone.jpg");
    await act(async () => {});
    expect(getProjectMedia).toHaveBeenCalled();
    expect(preview()).toBeNull();
    expect(uploadBox()).toBeInTheDocument();
  });

  it("drops the preview when the image is removed, and shows it again when it is put back", async () => {
    const { onChange, rerender } = renderImage(HERO.path);
    await screen.findByRole("img");
    fireEvent.click(screen.getByTitle("Remove image"));
    expect(onChange).toHaveBeenCalledWith("");

    await rerender("");
    expect(preview()).toBeNull();
    expect(uploadBox()).toBeInTheDocument();

    await rerender(HERO.path);
    expect(await screen.findByRole("img")).toHaveAttribute("alt", "Hero alt");
  });

  it("keeps the previous preview up while a replacement is looked up, then shows the replacement", async () => {
    const { rerender } = renderImage(HERO.path);
    await screen.findByRole("img");

    let resolve;
    getProjectMedia.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    await rerender(TEAM.path);
    expect(preview()).toHaveAttribute("alt", "Hero alt");

    await act(async () => resolve({ files: [HERO, TEAM] }));
    expect(preview()).toHaveAttribute("alt", "Team alt");
  });

  it("stores an image chosen from the library", async () => {
    const { onChange } = renderImage("");
    fireEvent.click(screen.getByText("components.mediaSelector.browseLibrary"));
    fireEvent.click(screen.getByText("pick team"));
    expect(onChange).toHaveBeenCalledWith(TEAM.path);
  });

  it("shows saved alt text on the preview", async () => {
    saveMediaMetadata.mockResolvedValue({ file: { metadata: { alt: "New alt" }, translations: {} } });
    renderImage(HERO.path);
    await screen.findByRole("img");
    fireEvent.click(screen.getByTitle("Edit metadata"));
    expect(screen.getByText(`editing ${HERO.path}`)).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByText("save metadata")));
    expect(preview()).toHaveAttribute("alt", "New alt");
  });

  it("shows the stored image, not another whose name ends with the same name", async () => {
    getProjectMedia.mockResolvedValue({ files: [SUPERHERO, HERO] });
    renderImage(HERO.path);
    expect(await screen.findByRole("img")).toHaveAttribute("src", "/api/media/projects/p1/uploads/images/hero.jpg");
    expect(preview()).toHaveAttribute("alt", "Hero alt");
    fireEvent.click(screen.getByTitle("Edit metadata"));
    expect(screen.getByText(`editing ${HERO.path}`)).toBeInTheDocument();
  });

  it("shows the newest image when an earlier lookup answers last", async () => {
    let answerHero, answerTeam;
    getProjectMedia
      .mockReturnValueOnce(new Promise((r) => (answerHero = r)))
      .mockReturnValueOnce(new Promise((r) => (answerTeam = r)));
    const { rerender } = renderImage(HERO.path);
    await rerender(TEAM.path);
    await act(async () => answerTeam({ files: [HERO, TEAM] }));
    await act(async () => answerHero({ files: [HERO, TEAM] }));
    expect(preview()).toHaveAttribute("alt", "Team alt");
  });
});

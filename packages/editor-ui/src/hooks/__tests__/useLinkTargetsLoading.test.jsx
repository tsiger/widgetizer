// @vitest-environment jsdom
/**
 * The link pickers' targets while they load: nothing to load without a project;
 * loading until the targets arrive; another project loads its own.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";

const getAllPages = vi.fn();
const getCollectionSchemas = vi.fn();
const getCollectionItems = vi.fn();

vi.mock("../../queries/pageManager", () => ({ getAllPages: (...args) => getAllPages(...args) }));
vi.mock("../../queries/collectionManager", () => ({
  getCollectionSchemas: (...args) => getCollectionSchemas(...args),
  getCollectionItems: (...args) => getCollectionItems(...args),
}));

const { default: useLinkTargets, invalidateLinkTargetsCache } = await import("../useLinkTargets");
const { default: useProjectStore } = await import("../../stores/projectStore");

function Probe() {
  const { options, loading, failed, retry } = useLinkTargets();
  if (loading) return <div>loading</div>;
  return (
    <>
      <div data-testid="targets">{options.map((o) => `${o.label}:${o.language}`).join("|")}</div>
      {failed && (
        <button type="button" onClick={retry}>
          failed
        </button>
      )}
    </>
  );
}

const targets = () => screen.getByTestId("targets").textContent.split("|");

const setSiteLanguages = (languages) =>
  useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages } });

beforeEach(() => {
  invalidateLinkTargetsCache();
  getAllPages.mockReset().mockResolvedValue([
    { uuid: "u-about", name: "About", slug: "about", language: "en" },
    { uuid: "u-sxetika", name: "Sxetika", slug: "sxetika", language: "el" },
  ]);
  getCollectionSchemas.mockReset().mockResolvedValue([
    { type: "news", slugPrefix: "news", displayNamePlural: "News", hasItemPages: true },
  ]);
  getCollectionItems.mockReset().mockImplementation(async (type, params) =>
    params?.language === "el"
      ? [{ uuid: "i-el", title: "Kalimera", slug: "kalimera" }]
      : [{ uuid: "i-en", title: "Launch day", slug: "launch-day" }],
  );
});

afterEach(cleanup);

describe("useLinkTargets while it loads", () => {
  it("has nothing to load without a project", async () => {
    useProjectStore.setState({ activeProject: null });
    render(<Probe />);
    await act(async () => {});
    expect(screen.getByTestId("targets").textContent).toBe("");
    expect(getAllPages).not.toHaveBeenCalled();
  });

  it("loads until the targets arrive", async () => {
    setSiteLanguages([]);
    let answer;
    getAllPages.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    render(<Probe />);
    expect(screen.getByText("loading")).toBeTruthy();
    await act(async () => answer([{ uuid: "u-about", name: "About", slug: "about", language: "en" }]));
    await waitFor(() => expect(targets()).toEqual(["About:en", "Launch day:en"]));
  });

  it("loads another project's targets when the project changes", async () => {
    setSiteLanguages([]);
    render(<Probe />);
    await waitFor(() => expect(targets()).toContain("About:en"));
    getAllPages.mockResolvedValue([{ uuid: "u-home", name: "Home", slug: "index", language: "en" }]);
    act(() => useProjectStore.setState({ activeProject: { id: "p2", defaultLanguage: "en", languages: [] } }));
    await waitFor(() => expect(targets()).toEqual(["Home:en", "Launch day:en"]));
  });

  it("offers nothing once the project goes away", async () => {
    setSiteLanguages([]);
    render(<Probe />);
    await waitFor(() => expect(targets()).toContain("About:en"));
    act(() => useProjectStore.setState({ activeProject: null }));
    await act(async () => {});
    expect(screen.getByTestId("targets").textContent).toBe("");
  });

  it("drops a failure notice once the project goes away", async () => {
    setSiteLanguages([]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    getAllPages.mockRejectedValue(new Error("offline"));
    render(<Probe />);
    expect(await screen.findByRole("button", { name: "failed" })).toBeTruthy();
    act(() => useProjectStore.setState({ activeProject: null }));
    await act(async () => {});
    expect(screen.queryByRole("button", { name: "failed" })).toBeNull();
    vi.restoreAllMocks();
  });
});

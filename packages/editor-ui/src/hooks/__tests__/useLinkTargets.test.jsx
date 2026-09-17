// @vitest-environment jsdom
/**
 * Link targets cover every language (§4a): a page that exists only in Greek must
 * still be linkable from English. Pages arrive in one response; the collection
 * listing is per language, so it is asked once per language.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

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
  const { options, loading } = useLinkTargets();
  if (loading) return <div>loading</div>;
  return <div data-testid="targets">{options.map((o) => `${o.label}:${o.language}`).join("|")}</div>;
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

describe("useLinkTargets across languages", () => {
  it("offers every language's pages and items, stamped and grouped language-major", async () => {
    setSiteLanguages(["el"]);
    render(<Probe />);

    await waitFor(() => expect(screen.queryByTestId("targets")).toBeTruthy());
    expect(targets()).toEqual(["About:en", "Launch day:en", "Sxetika:el", "Kalimera:el"]);
  });

  it("asks the collection listing once per language, naming only the non-default ones", async () => {
    setSiteLanguages(["el"]);
    render(<Probe />);

    await waitFor(() => expect(screen.queryByTestId("targets")).toBeTruthy());
    expect(getCollectionItems.mock.calls).toEqual([
      ["news", { language: undefined }],
      ["news", { language: "el" }],
    ]);
  });

  it("asks exactly once, with no language, while the site has one", async () => {
    setSiteLanguages([]);
    getAllPages.mockResolvedValue([{ uuid: "u-about", name: "About", slug: "about", language: "en" }]);
    render(<Probe />);

    await waitFor(() => expect(screen.queryByTestId("targets")).toBeTruthy());
    expect(getCollectionItems.mock.calls).toEqual([["news", { language: undefined }]]);
    expect(targets()).toEqual(["About:en", "Launch day:en"]);
  });

  // The project id stays the same when a language is added or removed, so a cache
  // keyed by it alone would keep answering with the old set of languages.
  it("reloads when a language is added, inside the cache window", async () => {
    setSiteLanguages([]);
    getAllPages.mockResolvedValue([
      { uuid: "u-about", name: "About", slug: "about", language: "en" },
      { uuid: "u-sxetika", name: "Sxetika", slug: "sxetika", language: "el" },
    ]);
    const { rerender } = render(<Probe />);
    await waitFor(() => expect(targets()).toEqual(["About:en", "Launch day:en"]));

    setSiteLanguages(["el"]);
    rerender(<Probe />);
    await waitFor(() => expect(targets()).toContain("Sxetika:el"));
  });

  it("reloads when a language is removed, rather than keeping its targets selectable", async () => {
    setSiteLanguages(["el"]);
    render(<Probe />);
    await waitFor(() => expect(targets()).toContain("Sxetika:el"));

    cleanup();
    setSiteLanguages([]);
    render(<Probe />);
    await waitFor(() => expect(screen.queryByTestId("targets")).toBeTruthy());
    expect(targets()).toEqual(["About:en", "Launch day:en"]);
  });

  it("still serves one project's cache across a remount", async () => {
    setSiteLanguages(["el"]);
    render(<Probe />);
    await waitFor(() => expect(screen.queryByTestId("targets")).toBeTruthy());
    const firstLoad = getAllPages.mock.calls.length;

    cleanup();
    render(<Probe />);
    await waitFor(() => expect(screen.queryByTestId("targets")).toBeTruthy());
    expect(getAllPages.mock.calls.length).toBe(firstLoad);
  });

  it("clears every language's entry for a project when it is invalidated", async () => {
    setSiteLanguages(["el"]);
    render(<Probe />);
    await waitFor(() => expect(screen.queryByTestId("targets")).toBeTruthy());

    cleanup();
    invalidateLinkTargetsCache("p1");
    render(<Probe />);
    await waitFor(() => expect(screen.queryByTestId("targets")).toBeTruthy());
    expect(getAllPages.mock.calls.length).toBe(2);
  });

  it("keeps the other languages when one language's items cannot be read", async () => {
    setSiteLanguages(["el"]);
    getCollectionItems.mockImplementation(async (type, params) => {
      if (params?.language === "el") throw new Error("boom");
      return [{ uuid: "i-en", title: "Launch day", slug: "launch-day" }];
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Probe />);

    await waitFor(() => expect(screen.queryByTestId("targets")).toBeTruthy());
    expect(targets()).toEqual(["About:en", "Launch day:en", "Sxetika:el"]);
    consoleErrorSpy.mockRestore();
  });
});

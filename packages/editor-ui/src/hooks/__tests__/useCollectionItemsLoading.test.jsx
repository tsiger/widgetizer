// @vitest-environment jsdom
/**
 * A collection's items for the active project: nothing to load without a
 * project or a collection; on a multilingual site every language is asked for
 * and the lists joined in language order; refetch loads again behind the
 * spinner; another project loads its own.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

const getCollectionItems = vi.fn();
vi.mock("../../queries/collectionManager", () => ({
  getCollectionItems: (...args) => getCollectionItems(...args),
}));

const { default: useCollectionItems } = await import("../useCollectionItems");
const { default: useProjectStore } = await import("../../stores/projectStore");

let lastRefetch;
function Probe({ type }) {
  const { items, loading, error, refetch } = useCollectionItems(type);
  lastRefetch = refetch;
  if (loading) return <div>loading</div>;
  if (error) return <div>error: {error.message}</div>;
  return <div data-testid="items">{items.map((item) => item.slug).join("|")}</div>;
}

/** A reply the test settles by hand, per collection type. */
function deferredReplies() {
  const pending = new Map();
  getCollectionItems.mockImplementation(
    (type) =>
      new Promise((resolve, reject) => {
        pending.set(type, { resolve, reject });
      }),
  );
  return {
    settle: async (type, items) => {
      await act(async () => pending.get(type).resolve(items));
    },
    fail: async (type, message) => {
      await act(async () => pending.get(type).reject(new Error(message)));
    },
  };
}

beforeEach(() => {
  getCollectionItems.mockReset();
  useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages: [] } });
});
afterEach(cleanup);

describe("useCollectionItems loading", () => {
  it("has nothing to load without a project", async () => {
    act(() => useProjectStore.setState({ activeProject: null }));
    render(<Probe type="news" />);
    await act(async () => {});
    expect(screen.getByTestId("items").textContent).toBe("");
    expect(getCollectionItems).not.toHaveBeenCalled();
  });

  it("has nothing to load without a collection", async () => {
    render(<Probe type="" />);
    await act(async () => {});
    expect(screen.getByTestId("items").textContent).toBe("");
    expect(getCollectionItems).not.toHaveBeenCalled();
  });

  it("asks every language and joins the lists in language order", async () => {
    act(() => useProjectStore.setState({ activeProject: { id: "p1", defaultLanguage: "en", languages: ["el", "de"] } }));
    getCollectionItems.mockImplementation(async (type, opts) => [{ slug: `${type}-${opts?.language ?? "en"}` }]);
    render(<Probe type="news" />);
    expect(screen.getByText("loading")).toBeTruthy();
    await act(async () => {});
    expect(getCollectionItems.mock.calls.map((c) => c[1]?.language ?? "default")).toEqual(["default", "el", "de"]);
    expect(screen.getByTestId("items").textContent).toBe("news-en|news-el|news-de");
  });

  it("loads again behind the spinner on refetch", async () => {
    const replies = deferredReplies();
    render(<Probe type="news" />);
    await replies.settle("news", [{ slug: "launch-day" }]);
    act(() => {
      lastRefetch();
    });
    expect(screen.getByText("loading")).toBeTruthy();
    await replies.settle("news", [{ slug: "launch-day" }, { slug: "open-day" }]);
    expect(screen.getByTestId("items").textContent).toBe("launch-day|open-day");
  });

  it("loads the other project's items when the project changes", async () => {
    const replies = deferredReplies();
    render(<Probe type="news" />);
    await replies.settle("news", [{ slug: "launch-day" }]);
    act(() => useProjectStore.setState({ activeProject: { id: "p2", defaultLanguage: "en", languages: [] } }));
    expect(screen.getByText("loading")).toBeTruthy();
    await replies.settle("news", [{ slug: "p2-news" }]);
    expect(screen.getByTestId("items").textContent).toBe("p2-news");
  });

  it("shows nothing and stops loading when the project goes away", async () => {
    const replies = deferredReplies();
    render(<Probe type="news" />);
    await replies.settle("news", [{ slug: "launch-day" }]);
    act(() => useProjectStore.setState({ activeProject: null }));
    await act(async () => {});
    expect(screen.getByTestId("items").textContent).toBe("");
  });

});

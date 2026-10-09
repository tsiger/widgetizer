// @vitest-environment jsdom
/**
 * The collection list screen stays mounted when the user switches collection,
 * so a slower load for the previous collection can finish after the new one's.
 * Only the newest load may decide what the list shows: otherwise the new
 * collection's screen lists the old collection's items, and its Delete,
 * Duplicate and Reorder act on the new collection by the old items' slugs.
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

describe("useCollectionItems when replies arrive out of order", () => {
  it("keeps the newer collection's items when the previous collection's reply lands last", async () => {
    const replies = deferredReplies();
    const { rerender } = render(<Probe type="news" />);
    rerender(<Probe type="services" />);

    await replies.settle("services", [{ slug: "consulting" }]);
    await replies.settle("news", [{ slug: "launch-day" }, { slug: "consulting" }]);

    expect(screen.getByTestId("items").textContent).toBe("consulting");
  });

  it("stays loading while the newest load is still running, whatever the older one does", async () => {
    const replies = deferredReplies();
    const { rerender } = render(<Probe type="news" />);
    rerender(<Probe type="services" />);

    await replies.settle("news", [{ slug: "launch-day" }]);
    expect(screen.getByText("loading")).toBeTruthy();

    await replies.settle("services", [{ slug: "consulting" }]);
    expect(screen.getByTestId("items").textContent).toBe("consulting");
  });

  it("does not show an error from a load that was replaced", async () => {
    const replies = deferredReplies();
    const { rerender } = render(<Probe type="news" />);
    rerender(<Probe type="services" />);

    await replies.settle("services", [{ slug: "consulting" }]);
    await replies.fail("news", "network down");

    expect(screen.getByTestId("items").textContent).toBe("consulting");
  });

  // An edit started on one collection calls refetch when it finishes, which can
  // be after the user has moved to another.
  it("loads the current collection when a refetch held from an earlier render runs", async () => {
    const replies = deferredReplies();
    const { rerender } = render(<Probe type="news" />);
    await replies.settle("news", [{ slug: "launch-day" }]);
    const heldFromNews = lastRefetch;

    rerender(<Probe type="services" />);
    await act(async () => {
      heldFromNews();
    });
    expect(getCollectionItems.mock.calls.at(-1)[0]).toBe("services");
    await replies.settle("services", [{ slug: "consulting" }]);
    expect(screen.getByTestId("items").textContent).toBe("consulting");
  });

  it("does nothing when refetch runs after the screen is gone", async () => {
    const replies = deferredReplies();
    const { unmount } = render(<Probe type="news" />);
    await replies.settle("news", [{ slug: "launch-day" }]);
    const held = lastRefetch;
    unmount();

    const callsBefore = getCollectionItems.mock.calls.length;
    await act(async () => {
      await held();
    });
    expect(getCollectionItems.mock.calls.length).toBe(callsBefore);
  });

  it("still shows a single collection's items, and its own errors", async () => {
    const replies = deferredReplies();
    render(<Probe type="news" />);
    await replies.settle("news", [{ slug: "launch-day" }]);
    expect(screen.getByTestId("items").textContent).toBe("launch-day");

    cleanup();
    const again = deferredReplies();
    render(<Probe type="news" />);
    await again.fail("news", "network down");
    expect(screen.getByText("error: network down")).toBeTruthy();
  });
});

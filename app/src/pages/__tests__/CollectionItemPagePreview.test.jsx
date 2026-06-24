// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";

// CollectionItemPagePreview is a headless child of SitePreviewLayout: it resolves
// the URL slugPrefix to a collection type (only hasItemPages collections qualify),
// loads the saved item, requests a render token via previewCollectionItem, and
// reports { src, loading, notFound } up to the layout. All chrome lives in the
// layout — the page itself renders nothing.

const getCollectionItem = vi.fn();
const previewCollectionItem = vi.fn();
let collectionsState;

vi.mock("@widgetizer/editor-ui/hooks/useCollections", () => ({
  default: () => collectionsState,
}));
vi.mock("@widgetizer/editor-ui/queries/collectionManager", () => ({
  getCollectionItem: (...a) => getCollectionItem(...a),
  previewCollectionItem: (...a) => previewCollectionItem(...a),
}));

import CollectionItemPagePreview from "../CollectionItemPagePreview.jsx";

let reports;
function CaptureLayout() {
  return <Outlet context={{ setPreview: (s) => reports.push(s) }} />;
}

function renderAt(prefix, slug) {
  return render(
    <MemoryRouter initialEntries={[`/preview/collection/${prefix}/${slug}`]}>
      <Routes>
        <Route path="/preview" element={<CaptureLayout />}>
          <Route path="collection/:prefix/:slug" element={<CollectionItemPagePreview />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getCollectionItem.mockReset();
  previewCollectionItem.mockReset();
  reports = [];
  collectionsState = { schemas: [], loading: false };
});

describe("CollectionItemPagePreview", () => {
  it("reports loading while collection schemas are still loading", () => {
    collectionsState = { schemas: [], loading: true };
    renderAt("rooms", "deluxe");
    expect(reports.at(-1)).toEqual({ src: null, loading: true, notFound: false });
  });

  it("reports notFound when the slug prefix matches no item-page collection", () => {
    collectionsState = { schemas: [{ slugPrefix: "news", hasItemPages: true, type: "news" }], loading: false };
    renderAt("rooms", "deluxe");
    expect(reports.at(-1)).toEqual({ src: null, loading: false, notFound: true });
  });

  it("resolves the item to a render token and reports its src", async () => {
    collectionsState = {
      schemas: [{ slugPrefix: "rooms", hasItemPages: true, type: "accommodation" }],
      loading: false,
    };
    getCollectionItem.mockResolvedValue({ slug: "deluxe", settings: { title: "Deluxe" } });
    previewCollectionItem.mockResolvedValue({ token: "itok" });

    renderAt("rooms", "deluxe");

    await waitFor(() => expect(previewCollectionItem).toHaveBeenCalled());
    expect(getCollectionItem).toHaveBeenCalledWith("accommodation", "deluxe");
    expect(previewCollectionItem).toHaveBeenCalledWith({
      collectionType: "accommodation",
      slug: "deluxe",
      settings: { title: "Deluxe" },
    });
    await waitFor(() => {
      const last = reports.at(-1);
      expect(last.notFound).toBe(false);
      expect(last.src).toContain("/render/itok");
    });
  });

  it("reports notFound when item resolution fails", async () => {
    collectionsState = {
      schemas: [{ slugPrefix: "rooms", hasItemPages: true, type: "accommodation" }],
      loading: false,
    };
    getCollectionItem.mockRejectedValue(new Error("missing"));

    renderAt("rooms", "deluxe");

    await waitFor(() => expect(reports.at(-1)).toEqual({ src: null, loading: false, notFound: true }));
  });
});

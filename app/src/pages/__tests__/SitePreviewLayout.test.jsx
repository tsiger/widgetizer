// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect } from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useOutletContext, useParams } from "react-router-dom";

// SitePreviewLayout is the persistent shell for the standalone site preview: it
// owns the toolbar + iframe stage and the NAVIGATE_PREVIEW listener, and exposes
// setPreview() to its child routes via the outlet context. Because the chrome
// lives here, navigating page<->item never remounts the toolbar/iframe (the flash
// the unified layout eliminates). These tests drive it through the real nested
// route shape with fake children that report a render src up to the layout.

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
vi.mock("../../components/dev/DebugStatePanel", () => ({ default: () => null }));

import SitePreviewLayout from "../SitePreviewLayout.jsx";

// A headless child mirroring the real PagePreview: param-driven, it reports a
// render src derived from the route's :pageId up to the layout (effect re-runs
// when pageId changes, exactly as PagePreview re-resolves on navigation).
function FakeChild() {
  const { setPreview } = useOutletContext();
  const { pageId } = useParams();
  useEffect(() => {
    setPreview({ src: `/render/${pageId}`, loading: false, notFound: false });
  }, [pageId, setPreview]);
  return null;
}

function renderAt(initial) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/preview" element={<SitePreviewLayout />}>
          <Route path=":pageId" element={<FakeChild />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("SitePreviewLayout", () => {
  it("renders the iframe with the src its child reports via setPreview", () => {
    const { container } = renderAt("/preview/home");
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute("src")).toBe("/render/home");
  });

  it("renders the desktop/mobile toggle once (shared chrome)", () => {
    renderAt("/preview/home");
    expect(screen.getByTitle("pageEditor.toolbar.desktopView")).toBeInTheDocument();
    expect(screen.getByTitle("pageEditor.toolbar.mobileView")).toBeInTheDocument();
  });

  it("follows an in-iframe NAVIGATE_PREVIEW message to the next route", async () => {
    const { container } = renderAt("/preview/home");
    expect(container.querySelector("iframe").getAttribute("src")).toBe("/render/home");

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", { data: { type: "NAVIGATE_PREVIEW", payload: { url: "/preview/about" } } }),
      );
    });

    // The layout drops to a loading state on the path change, then the new
    // child resolves and reports its src up — wait for that to settle.
    await waitFor(() => expect(container.querySelector("iframe")?.getAttribute("src")).toBe("/render/about"));
  });

  it("ignores NAVIGATE_PREVIEW messages carrying a non-preview URL", async () => {
    const { container } = renderAt("/preview/home");
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", { data: { type: "NAVIGATE_PREVIEW", payload: { url: "https://evil.example" } } }),
      );
    });
    // Still on the original route — the guard rejected the external URL.
    expect(container.querySelector("iframe").getAttribute("src")).toBe("/render/home");
  });
});

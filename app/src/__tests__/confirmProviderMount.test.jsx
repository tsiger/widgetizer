// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Tree-level proof that the OSS shell provides the confirm surface: the REAL
// <App/> is rendered (providers, ErrorBoundary, i18n and all) with only the
// router swapped for a single probe route that calls useConfirm(). Remove the
// <ConfirmProvider> mount from App.jsx and the probe throws, so the marker
// never renders — unlike a text search, a mount in a comment or dead branch
// cannot satisfy this.
vi.mock("react-router-dom", async (importOriginal) => {
  const rr = await importOriginal();
  const { useConfirm } = await import("../../../packages/editor-ui/src/components/ui/ConfirmProvider.jsx");
  function Probe() {
    useConfirm();
    return <div data-testid="confirm-probe">ok</div>;
  }
  return {
    ...rr,
    createBrowserRouter: () => rr.createMemoryRouter([{ path: "*", element: <Probe /> }]),
  };
});

// App chrome that talks to the outside world; irrelevant to the provider tree.
vi.mock("../components/layout/UpdateBanner", () => ({ default: () => null }));
vi.mock("../components/layout/LanguageInitializer", () => ({ default: () => null }));
vi.mock("../components/dev/DebugStatePanel", () => ({ default: () => null }));

describe("OSS shell provides the confirm surface (tree-level)", () => {
  it("a route rendered through the real <App/> can call useConfirm()", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
    );
    const { default: App } = await import("../App.jsx");
    render(<App />);
    expect(await screen.findByTestId("confirm-probe")).toBeInTheDocument();
    vi.unstubAllGlobals();
  }, 30_000);
});

// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IconInput from "../IconInput.jsx";
import useProjectStore from "../../../../stores/projectStore";
import useIconsStore from "../../../../stores/iconsStore";

// An icon's `body` is raw SVG markup read verbatim from the project's
// assets/icons.json, which is tenant-authored (notably via project ZIP import,
// which copies icons.json without content validation). IconInput injects it via
// dangerouslySetInnerHTML at two sites — the selected-icon button and each grid
// cell — after passing it through an internal sanitizeIconBody() that runs
// DOMPurify with the SVG profile. These tests prove that a malicious body cannot
// land an active script / event-handler in the editor's DOM.
//
// sanitizeIconBody is not exported, so this exercises the contract at the
// component level: we seed the real Zustand stores so getIcons(projectId)
// returns a malicious icon and the active project is set, then assert the
// rendered DOM contains none of the payload's dangerous bits.

const PROJECT_ID = "proj-xss";

// Two classic stored-XSS payloads smuggled inside an icon `body`:
//  - breaks out of <svg> with </svg> then injects an <img onerror=...>
//  - an inline <script> plus an onload handler on a nested element
const IMG_PAYLOAD = '<path d="M0 0"/></svg><img src=x onerror="window.__xss=1">';
const SCRIPT_PAYLOAD =
  '<g onload="window.__xss=1"><path d="M0 0"/></g><script>window.__xss=1</script>';

function seedStores(iconsData) {
  useProjectStore.setState({
    activeProject: { id: PROJECT_ID, folderName: "xss" },
    scope: { actor: null, projectId: PROJECT_ID, folderName: "xss" },
    loading: false,
    error: null,
  });
  useIconsStore.setState({
    iconsCache: { [PROJECT_ID]: { ...iconsData, prefix: "test", fetchedAt: Date.now() } },
    loading: {},
    error: {},
  });
}

describe("IconInput SVG XSS sanitization", () => {
  afterEach(() => {
    delete window.__xss;
    useProjectStore.setState({ activeProject: null, scope: null, loading: true, error: null });
    useIconsStore.setState({ iconsCache: {}, loading: {}, error: {} });
  });

  it("strips an onerror <img> breakout from the selected-icon button", () => {
    seedStores({ icons: { evil: { body: IMG_PAYLOAD } } });

    const { container } = render(<IconInput value="evil" onChange={() => {}} />);

    // The selected-icon button renders the chosen icon's sanitized body. The
    // injected <img onerror> breakout must be gone — DOMPurify's SVG profile
    // drops the </svg> breakout and everything after it.
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(container.innerHTML).not.toContain("onerror");
    expect(container.innerHTML).not.toContain("<img");
    expect(window.__xss).toBeUndefined();
  });

  it("strips <script> and onload handlers from icons rendered in the grid", () => {
    seedStores({ icons: { evil: { body: SCRIPT_PAYLOAD }, safe: { body: '<path d="M1 1"/>' } } });

    const { container } = render(<IconInput value="" onChange={() => {}} />);

    // Open the picker so the grid (the second injection site) renders.
    fireEvent.click(screen.getByText("Choose icon"));

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("[onload]")).toBeNull();
    expect(container.innerHTML).not.toContain("onload");
    expect(container.innerHTML).not.toContain("<script");
    expect(window.__xss).toBeUndefined();
    // The malicious icon's button still renders (the picker is open), proving
    // the payload was sanitized in place rather than crashing the render.
    expect(screen.getByTitle("evil")).toBeInTheDocument();
  });

  it("preserves a benign icon's shapes (the sanitizer must not blank icons)", () => {
    // Regression guard: a bare SVG fragment run through DOMPurify's svg profile
    // WITHOUT the <svg> wrapper is dropped to "" — which would blank every icon.
    // sanitizeIconBody wraps before sanitizing, so legitimate shapes survive.
    seedStores({ icons: { home: { body: '<path d="M3 9l9-7 9 7v11z"/><circle cx="12" cy="12" r="3"/>' } } });

    const { container } = render(<IconInput value="home" onChange={() => {}} />);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg.querySelector("path")?.getAttribute("d")).toContain("M3 9");
    expect(svg.querySelector("circle")).not.toBeNull();
  });
});

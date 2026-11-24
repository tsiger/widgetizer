// @vitest-environment jsdom
/**
 * The rich text field shows its internal links at their targets' current
 * addresses, and tidies the stored HTML into the editor's own form, for display
 * only. Neither is an edit: opening a widget must not report a change, or the
 * page is marked as changed when nothing was touched.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

let linkTargets = [];

vi.mock("../../../../stores/projectStore", () => {
  const state = { activeProject: { id: "p1" } };
  const hook = (selector) => (selector ? selector(state) : state);
  hook.getState = () => state;
  return { default: hook, useIsMultilang: () => false };
});
vi.mock("../../../../hooks/useLinkTargets", () => ({
  default: () => ({ options: linkTargets, loading: false, failed: false, retry: () => {} }),
}));
vi.mock("../../../../lib/editingLanguage.jsx", () => ({ useEditingLanguage: () => "en" }));
vi.mock("../../../media/MediaSelectorDrawer", () => ({ default: () => null }));
vi.mock("../LinkTargetsNotice", () => ({ default: () => null }));
vi.mock("../RichTextInput.css", () => ({}));

const { default: RichTextInput } = await import("../RichTextInput.jsx");

// ProseMirror measures the page for scrolling and selection; jsdom has no layout.
beforeEach(() => {
  linkTargets = [];
  const rect = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} });
  Range.prototype.getBoundingClientRect = () => rect;
  Element.prototype.scrollIntoView = () => {};
  document.elementFromPoint = () => null;
});
afterEach(cleanup);

const STORED = '<p>See <a data-page-uuid="page-1" href="old-about.html">About</a></p>';

async function mount(props) {
  const onChange = vi.fn();
  const view = render(<RichTextInput id="body" onChange={onChange} {...props} />);
  await act(async () => {});
  return { onChange, ...view };
}

describe("showing a rich text value is not an edit", () => {
  it("shows a link at its page's current address without reporting a change", async () => {
    linkTargets = [{ value: "page-1", isPage: true, slug: "about-us", label: "About" }];

    const { onChange, container } = await mount({ value: STORED, allowInternalLinkTargets: true });

    expect(container.querySelector(".richtext-editor-content a").getAttribute("href")).toBe("about-us.html");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not report a change for stored HTML the editor writes differently", async () => {
    const { onChange, container } = await mount({ value: "<p>Hello   <b>there</b></p>\n\n" });

    expect(container.querySelector(".richtext-editor-content").textContent).toContain("there");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not report a change when the value is replaced from outside", async () => {
    const { onChange, rerender, container } = await mount({ value: "<p>One</p>" });

    rerender(<RichTextInput id="body" onChange={onChange} value="<p>Two</p>" />);
    await act(async () => {});

    expect(container.querySelector(".richtext-editor-content").textContent).toBe("Two");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("an edit made in HTML source is reported once, as typed", () => {
  it("on switching back to the rich text view", async () => {
    const { onChange, container } = await mount({ value: "<p>One</p>", allowSource: true });

    fireEvent.click(screen.getByTitle("HTML Source"));
    fireEvent.change(container.querySelector("textarea"), { target: { value: "<p>Two</p>" } });
    fireEvent.click(screen.getByTitle("Rich Text View"));
    await act(async () => {});

    expect(onChange.mock.calls).toEqual([["<p>Two</p>"]]);
  });
});

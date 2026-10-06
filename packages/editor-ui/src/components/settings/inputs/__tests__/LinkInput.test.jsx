// @vitest-environment jsdom
/**
 * Choosing a target in the link picker. The stored value names one target only,
 * and the refs it drops are removed rather than set to undefined: the editor's
 * saved copy cannot carry an undefined key, so one would leave the page reading
 * "unsaved" after every save.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";

const OPTIONS = [
  { value: "p-about", label: "About", slug: "about", isPage: true, group: "Pages", language: "en" },
  {
    value: "i-launch",
    label: "Launch day",
    isCollectionItem: true,
    collectionType: "news",
    slugPrefix: "news",
    slug: "launch-day",
    group: "News",
    language: "en",
  },
];

vi.mock("../../../../hooks/useLinkTargets", () => ({
  default: () => ({ options: OPTIONS, loading: false }),
}));
// The picker itself is not under test: one button per choice it can report.
vi.mock("../../../ui/Combobox", () => ({
  default: ({ onChange }) => (
    <div>
      <button onClick={() => onChange("p-about")}>page</button>
      <button onClick={() => onChange("i-launch")}>item</button>
      <button onClick={() => onChange("https://example.com")}>custom</button>
    </div>
  ),
}));

const { default: LinkInput } = await import("../LinkInput.jsx");

afterEach(cleanup);

function choose(value, button) {
  const onChange = vi.fn();
  render(<LinkInput id="link" value={value} onChange={onChange} setting={{}} />);
  fireEvent.click(screen.getByText(button));
  expect(onChange).toHaveBeenCalledTimes(1);
  return onChange.mock.calls[0][0];
}

describe("LinkInput target choice", () => {
  it("stores only the page ref when a page is chosen over an item", () => {
    const stored = choose(
      { collectionType: "news", collectionItemUuid: "i-launch", href: "news/launch-day.html", text: "Go" },
      "page",
    );
    expect(stored).toEqual({ pageUuid: "p-about", href: "about.html", text: "Go", target: "_self" });
    expect("collectionType" in stored).toBe(false);
    expect("collectionItemUuid" in stored).toBe(false);
  });

  it("stores only the item refs when an item is chosen over a page", () => {
    const stored = choose({ pageUuid: "p-about", href: "about.html", text: "Go" }, "item");
    expect(stored).toEqual({
      collectionType: "news",
      collectionItemUuid: "i-launch",
      href: "news/launch-day.html",
      text: "Go",
      target: "_self",
    });
    expect("pageUuid" in stored).toBe(false);
  });

  it("stores no ref for a custom URL", () => {
    const stored = choose({ pageUuid: "p-about", href: "about.html", text: "Go" }, "custom");
    expect(stored).toEqual({ href: "https://example.com", text: "Go", target: "_self" });
  });
});

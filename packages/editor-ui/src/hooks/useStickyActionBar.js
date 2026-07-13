import { useEffect, useRef, useState } from "react";

/**
 * Detects when a `position: sticky; bottom: 0` action bar is floating over
 * scrollable content, so the caller can show a drop shadow only while it floats.
 *
 * Pair the returned `sentinelRef` with a 1px element placed *immediately after*
 * the sticky bar in the DOM: it is only visible once the form is scrolled to the
 * very bottom (or is too short to scroll at all), so when it leaves the viewport
 * the bar is covering content and `isStuck` flips true.
 *
 * The observer roots on the actual scrolling ancestor (the app shell's
 * `overflow-y-auto` container), not the window, since the page scrolls inside an
 * inner container.
 *
 * @param {Array} [deps=[]] - Re-establish the observer when these change (e.g. a
 *   collapsible section that alters the form's scroll height, or async content
 *   that loads in after mount).
 * @returns {{ sentinelRef: import("react").RefObject<HTMLElement>, isStuck: boolean }}
 */
export default function useStickyActionBar(deps = []) {
  const sentinelRef = useRef(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    const findScrollParent = (node) => {
      let current = node?.parentElement || null;
      while (current && current !== document.body) {
        const { overflowY } = window.getComputedStyle(current);
        if ((overflowY === "auto" || overflowY === "scroll") && current.scrollHeight > current.clientHeight) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    };

    const observer = new IntersectionObserver(([entry]) => setIsStuck(!entry.isIntersecting), {
      root: findScrollParent(sentinel),
      threshold: 1,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { sentinelRef, isStuck };
}

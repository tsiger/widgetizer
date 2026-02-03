# Performance improvement ideas for Arch theme

Suggestions for improving performance of the Arch theme (`themes/arch/`), based on Lighthouse/Core Web Vitals and common bottlenecks.

---

## 1. Script loading (critical path)

**Current:** In `layout.liquid`, `scripts.js` is loaded via `{% asset "scripts.js" %}` and enqueued scripts (e.g. `reveal.js`) are output without `defer`. Scripts at the end of `<body>` still block parsing until they finish loading and executing.

**Change:**

- In **layout.liquid**, load the main script with defer so it doesn’t block parsing: use `{% asset "scripts.js", { "defer": true } %}` if the asset tag supports an options hash.
- For `reveal.js`, pass `defer: true` in the enqueue options so the emitted `<script>` has `defer`.
- If the platform controls script rendering (e.g. `renderFooterAssets.js`), consider defaulting footer scripts to `defer: true` so themes get non-blocking behavior without changing every enqueue call.

**Why:** Deferred scripts run after DOM is ready and don’t block HTML parsing, which improves FCP and TTI.

---

## 2. LCP image priority and decoding

**Current:** The shared `image` filter (in `src/core/filters/imageFilter.js`) supports a `lazy` argument and outputs `loading="lazy"` when true, but does not support `fetchpriority="high"` or `decoding="async"`. Hero/slideshow images above the fold don’t get an explicit high-priority hint.

**Change:**

- **Platform (image filter):** Extend the filter to accept an optional “priority” flag (e.g. a 5th/6th parameter or a named option). When set for the LCP image (e.g. first slide, hero, first image widget), output `fetchpriority="high"`, `loading="eager"` (or omit lazy), and optionally `decoding="async"`.
- **Theme:** In widgets that render the main hero/LCP image (e.g. first slide of slideshow, split-hero, banner, first image widget), call the filter with that option so the LCP image is marked high priority.

**Why:** LCP is often an image; `fetchpriority="high"` and non-lazy loading help the browser prioritize it and can improve LCP.

---

## 3. Slideshow: preload first slide image

**Current:** The slideshow widget uses `background-image` per slide. The first slide’s image is only discovered when the browser parses that block; there’s no preload.

**Change:** In `layout.liquid` (or a shared head partial), when the first widget is a slideshow, output a preload for the first slide’s image, e.g. `<link rel="preload" href="…" as="image">`. If the first slide URL is only known in the slideshow widget, the platform could support a “preload” slot or a layout variable set by the first widget so the layout can emit this tag. Alternatively, the first slide’s image could be rendered as an `<img>` with `fetchpriority="high"` and `loading="eager"` and the slide styled to overlay it (same visual, better priority).

**Why:** Preloading (or high-priority `<img>`) makes the hero image load earlier and can improve LCP when the slideshow is above the fold.

---

## 4. Debounce resize in scripts.js

**Current:** `themes/arch/assets/scripts.js` registers two `window.addEventListener("resize", ...)` handlers (around lines 243 and 323). Resize fires frequently during window drag; both run on every event.

**Change:** Debounce both handlers (e.g. 100–150 ms) so they run once per “burst” of resize events:

```javascript
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
// Use: window.addEventListener("resize", debounce(handler, 100));
```

**Why:** Reduces main-thread work during resize and improves INP/runtime performance.

---

## 5. Below-the-fold content: content-visibility

**Current:** No use of `content-visibility` or `contain-intrinsic-size` in `themes/arch/assets/base.css`.

**Change:** For sections that are typically below the fold (e.g. main content area, repeated widget wrappers), add something like:

```css
.main-content > * {
  content-visibility: auto;
  contain-intrinsic-size: 0 400px; /* approximate block size */
}
```

Tune the selector so it doesn’t apply to the first one or two widgets (above-the-fold). If the theme has a clear “section” or “widget” wrapper, target that instead of all children.

**Why:** `content-visibility: auto` lets the browser skip layout/paint for off-screen content, which can improve LCP and TBT when there are many widgets.

---

## 6. Reveal.js MutationObserver scope

**Current:** `reveal.js` uses a `MutationObserver` on `document.body` with `subtree: true` and checks every mutation for added `.reveal` nodes.

**Change:** Restrict the observer to the container that actually gets dynamic content (e.g. `main` or `.main-content`), if possible, so fewer mutations are processed. In the callback, bail early if the mutation doesn’t add nodes (e.g. `mutation.addedNodes.length === 0`). Optionally throttle or batch calls to `observeRevealElements()` so you don’t run it on every single DOM change when many nodes are added at once.

**Why:** Less work per mutation and a smaller observed tree improve main-thread cost during dynamic updates.

---

## 7. Slideshow autoplay: setInterval vs requestAnimationFrame

**Current:** `slideshow.js` uses `setInterval(nextSlide, autoplaySpeed)` for autoplay.

**Assessment:** For discrete slide changes every few seconds, `setInterval` is acceptable. Switching to `requestAnimationFrame` would only be useful if you had smooth, frame-by-frame animations (e.g. CSS transitions) that you want to start on a frame boundary. So this is **low priority** unless you add such animations.

**Optional:** If you later drive slide transitions with JS (e.g. changing `transform` every frame), use `requestAnimationFrame` for that loop and keep a separate timer for “when to advance to next slide.”

---

## 8. Inline widget styles and CSS size

**Current:** Many widgets (e.g. image, slideshow, split-hero) include a per-widget `<style>` block (e.g. `.widget-{{ widget.id }} { ... }`). That’s flexible but can add up. `base.css` is a single render-blocking stylesheet.

**Options:** Keep per-widget styles if the total CSS is small and you need the flexibility. If `base.css` grows large, consider splitting: critical above-the-fold styles in a small file (or inlined in `<head>`), rest in a second file loaded with `media="print"` and `onload` swap to avoid render blocking. Ensure the layout only includes one link to `base.css` (single request, cacheable).

**Why:** Fewer or smaller render-blocking stylesheets help FCP; deferred non-critical CSS helps TTI.

---

## 9. Fonts

**Current:** Layout uses `{% fonts %}`; exact implementation wasn’t inspected.

**Recommendations (from performance skill):** Use `font-display: swap` (or `optional`) so text isn’t invisible while fonts load. Preload only one or two critical font files (e.g. main heading + body) with `<link rel="preload" ... as="font" type="font/woff2" crossorigin>`. Preconnect to the font origin if fonts are on a different domain.

**Why:** Faster first text paint and less layout shift (CLS) when fonts load.

---

## 10. Images in theme: lazy and dimensions

**Current:** The theme uses the shared `image` filter; the filter already outputs `width` and `height` when available, and supports `lazy`. Only video-embed and map use explicit `loading="lazy"` in Liquid.

**Recommendations:** For any **above-the-fold** image that is the LCP candidate, pass the “priority” option (once the filter supports it) and avoid forcing lazy there. For **below-the-fold** images, keep using the filter’s default lazy behavior (or pass `lazy: true` explicitly where needed). Ensure the image pipeline (or media model) always provides dimensions for raster images so the filter can output `width`/`height` and avoid CLS.

**Why:** Correct loading and dimensions improve LCP and CLS.

---

## Summary (by impact)

| Priority | Area              | Action |
|----------|-------------------|--------|
| **High** | Script loading    | Load `scripts.js` and footer scripts with `defer`. |
| **High** | LCP image         | Add `fetchpriority="high"` (and optional `decoding="async"`) for hero/first-slide images via filter + theme. |
| **High** | First slide       | Preload first slideshow slide image or render it as high-priority `<img>`. |
| **Medium** | Resize          | Debounce both resize handlers in `scripts.js`. |
| **Medium** | Below-fold       | Use `content-visibility: auto` (and optional `contain-intrinsic-size`) on main content children. |
| **Medium** | Fonts            | Preload critical fonts, use `font-display: swap`, preconnect to font origin. |
| **Low**  | Reveal.js         | Restrict MutationObserver scope and avoid redundant work. |
| **Low**  | CSS              | Consider splitting critical vs non-critical CSS if `base.css` is large. |

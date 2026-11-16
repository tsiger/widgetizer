/**
 * The server's sanitizers share ONE jsdom window for the life of the process
 * (isomorphic-dompurify creates it at import). Anything that adds an event
 * listener to that window on every call leaks: each listener pins the parsed
 * document it came from, and jsdom's duplicate scan makes the Nth registration
 * cost N, so every preview/export render gets slower and the heap grows until a
 * restart. jsdom before 29 did exactly this — each parsed document eagerly built
 * its CSS-selector engine, which registers 9 listeners (focus, keydown, click…)
 * on the window. jsdom 29+ builds the engine only when a document runs
 * querySelector*, so the sanitizers stay clean only while nothing on their path
 * does (DOMPurify's SAFE_FOR_TEMPLATES option, for one, runs querySelectorAll on
 * its DOM-returning paths, such as RETURN_DOM_FRAGMENT in stripHtmlToText).
 *
 * This counts listeners added to any jsdom Window while the real sanitizers run.
 * It hooks a jsdom internal (EventTarget-impl), resolved from isomorphic-dompurify's
 * own jsdom so it watches the copy the sanitizers use; if a jsdom upgrade moves
 * that file, the require below throws and this suite fails loudly rather than
 * passing on a counter that sees nothing.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  sanitizeRichText,
  stripHtmlToText,
  sanitizeWidgetData,
  sanitizeSvg,
} from "../services/sanitizationService.js";

// Resolved the way the sanitizers' own `import` resolves it, then jsdom from there,
// so the hook lands on the jsdom copy those imports actually load.
const sanitizerRequire = createRequire(fileURLToPath(import.meta.resolve("isomorphic-dompurify")));
const jsdomApiPath = sanitizerRequire.resolve("jsdom");
const { JSDOM } = sanitizerRequire(jsdomApiPath);
const EventTargetImpl = sanitizerRequire(path.join(path.dirname(jsdomApiPath), "jsdom/living/events/EventTarget-impl.js"))
  .implementation.prototype;

// A Window's impl is a bare EventTargetImpl (documents, nodes etc. are subclasses).
// A standalone `new EventTarget()` counts too; nothing on the sanitizer path makes one.
let windowListeners = 0;
let originalAddEventListener;

before(() => {
  originalAddEventListener = EventTargetImpl.addEventListener;
  EventTargetImpl.addEventListener = function (...args) {
    if (this.constructor?.name === "EventTargetImpl") windowListeners++;
    return originalAddEventListener.apply(this, args);
  };
});

after(() => {
  EventTargetImpl.addEventListener = originalAddEventListener;
});

function listenersAddedBy(fn) {
  const start = windowListeners;
  fn();
  return windowListeners - start;
}

const RICH = '<h2>Title</h2><p>Hello <strong>bold</strong> <a href="https://example.com" target="_blank">link</a></p><img src="/uploads/images/a.png" alt="x"><ul><li>one</li></ul>';

describe("sanitizers leave the shared jsdom window without listeners", () => {
  it("the counter sees a listener added to a window", () => {
    const { window } = new JSDOM("<!DOCTYPE html>");
    assert.equal(
      listenersAddedBy(() => window.addEventListener("focus", () => {})),
      1,
    );
  });

  // Ties the counter to the actual leak mechanism on today's jsdom. If a jsdom
  // upgrade stops selectors from listening on the window, this fails: re-check the
  // premise above, then drop this check — the one before it still proves the hook.
  it("the counter sees the selector engine's listeners on a parsed document that runs querySelector", () => {
    const { window } = new JSDOM("<!DOCTYPE html>");
    const added = listenersAddedBy(() => {
      new window.DOMParser().parseFromString("<p>a</p>", "text/html").querySelector("p");
    });
    assert.ok(added > 0);
  });

  it("sanitizeRichText adds none", () => {
    const added = listenersAddedBy(() => {
      for (let i = 0; i < 50; i++) {
        sanitizeRichText(RICH);
        sanitizeRichText(RICH, { allowHeadings: true, allowImages: true });
      }
    });
    assert.equal(added, 0);
  });

  it("stripHtmlToText adds none", () => {
    const added = listenersAddedBy(() => {
      for (let i = 0; i < 50; i++) stripHtmlToText("Use <<b>name</b>> here & <i>there</i>");
    });
    assert.equal(added, 0);
  });

  it("sanitizeWidgetData on richtext settings and blocks adds none", () => {
    const schema = {
      settings: [{ id: "body", type: "richtext" }],
      blocks: [{ type: "item", settings: [{ id: "text", type: "richtext" }] }],
    };
    const added = listenersAddedBy(() => {
      for (let i = 0; i < 50; i++) {
        sanitizeWidgetData(
          { settings: { body: RICH }, blocks: { b1: { type: "item", settings: { text: RICH } } } },
          schema,
        );
      }
    });
    assert.equal(added, 0);
  });

  it("sanitizeSvg (SVG uploads) adds none", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>x()</script><circle cx="5" cy="5" r="4"/></svg>';
    const added = listenersAddedBy(() => {
      for (let i = 0; i < 50; i++) sanitizeSvg(svg);
    });
    assert.equal(added, 0);
  });
});

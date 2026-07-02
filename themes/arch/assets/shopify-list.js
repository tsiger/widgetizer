/**
 * Shopify product list pagination.
 *
 * Wires Previous/Next buttons to a <shopify-list-context> and keeps their
 * enabled state in sync with the component's live `pageInfo` property. Each
 * product-grid widget wraps its list + buttons in a [data-shopify-list]
 * element.
 *
 * Why read `pageInfo` instead of trusting the "shopify-list-context-update"
 * event alone: when the list is nested inside a collection context, the
 * component re-clones the list element on every page change and can dispatch
 * that event from a node outside this widget's subtree — so a listener here
 * never hears it and the buttons go stale (Previous stayed disabled forever).
 * The live clone's `pageInfo` is authoritative (it is what nextPage()/
 * previousPage() themselves consult), so we re-read it after the update event,
 * after any Shopify render, and after any DOM change under the wrapper.
 *
 * Loaded by the product-grid widget only when pagination is enabled.
 */
(function () {
  "use strict";

  function wire(root) {
    var prev = root.querySelector("[data-shopify-list-prev]");
    var next = root.querySelector("[data-shopify-list-next]");

    function list() {
      return root.querySelector("shopify-list-context");
    }

    // Re-read paging state from the live list element. Bail (keeping the
    // current button state) while the component hasn't loaded pageInfo yet.
    function sync() {
      var el = list();
      if (!el) return;
      var info = el.pageInfo;
      if (!info) return;
      if (next) next.disabled = !info.hasNextPage;
      if (prev) prev.disabled = !info.hasPreviousPage;
    }

    // Renders and mutations arrive in bursts; coalesce to one sync per frame.
    var queued = false;
    function queueSync() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        sync();
      });
    }

    if (prev) {
      prev.addEventListener("click", function () {
        var el = list();
        if (el && typeof el.previousPage === "function") el.previousPage();
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        var el = list();
        if (el && typeof el.nextPage === "function") el.nextPage();
      });
    }

    // Un-nested lists dispatch the update event on the attached element, where
    // it bubbles to us; nested (collection) lists may not — the render event
    // and the MutationObserver cover those re-clones.
    root.addEventListener("shopify-list-context-update", queueSync);
    root.addEventListener("shopify-render", queueSync);
    new MutationObserver(queueSync).observe(root, { childList: true, subtree: true });

    sync();
  }

  function init() {
    var roots = document.querySelectorAll("[data-shopify-list]");
    for (var i = 0; i < roots.length; i++) wire(roots[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

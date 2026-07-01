/**
 * Shopify product list pagination.
 *
 * Wires Previous/Next buttons to a <shopify-list-context> and enables/disables
 * them from the component's "shopify-list-context-update" event. Each
 * product-grid widget wraps its list + buttons in a [data-shopify-list] element.
 *
 * The list-context is resolved lazily on click: in the collection case it is
 * cloned into the DOM only after the parent collection context resolves, so it
 * is not present at page load. The update event bubbles to the wrapper whenever
 * it fires, so that listener can be attached up front.
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

    // The update event bubbles from the list context carrying paging state.
    root.addEventListener("shopify-list-context-update", function (event) {
      var detail = event.detail || {};
      if (next) next.disabled = detail.hasNextPage === false;
      if (prev) prev.disabled = detail.hasPreviousPage === false;
    });
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

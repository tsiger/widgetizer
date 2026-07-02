/**
 * Shopify product quick-view wiring.
 *
 * Opens the global <dialog> product modal (rendered by layout.liquid) from a
 * product card's "view" trigger. Each trigger lives inside a <shopify-context>
 * (or a list-context item), so context.update(event) copies that product's
 * handle into the modal's own context; then the dialog opens as a modal.
 *
 * The modal body is the shared product-detail snippet: its gallery is wired in
 * assets/shopify-gallery.js and its buttons in assets/shopify-cart.js. The
 * template is re-cloned on every open, so the gallery starts fresh each time.
 *
 * Enqueued by the product-card / product-grid widgets only when Quick view is
 * enabled. Closing is handled by the close button, a backdrop click, or Escape
 * (native <dialog> behaviour).
 */
(function () {
  "use strict";

  var MODAL_ID = "widgetizer-product-modal";
  var CONTEXT_ID = "widgetizer-product-modal-context";

  function getModal() {
    return document.getElementById(MODAL_ID);
  }

  document.addEventListener("click", function (event) {
    var dialog = getModal();
    if (!dialog) return;

    // Open: copy the clicked product into the modal context, then show it.
    var trigger = event.target.closest("[data-shopify-view]");
    if (trigger) {
      var context = document.getElementById(CONTEXT_ID);
      if (!context || typeof context.update !== "function") return;
      event.preventDefault();
      context.update(event);
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      document.body.style.overflow = "hidden";
      return;
    }

    if (!dialog.open) return;

    // Close: the close button, or a click on the dialog backdrop (the click
    // target is the <dialog> element itself, not its inner content).
    if (event.target.closest("[data-shopify-modal-close]") || event.target === dialog) {
      dialog.close();
      return;
    }

    // Adding to cart from inside the modal hands off to the cart (its own
    // dialog), so close the product modal to keep the flow clean.
    var addToCart = event.target.closest("[data-shopify-add-to-cart]");
    if (addToCart && dialog.contains(addToCart)) dialog.close();
  });

  // Restore body scroll whenever the dialog closes (button, backdrop, Escape).
  function init() {
    var dialog = getModal();
    if (!dialog) return;
    dialog.addEventListener("close", function () {
      document.body.style.overflow = "";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

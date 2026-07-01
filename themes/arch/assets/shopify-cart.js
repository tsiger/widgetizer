/**
 * Shopify add-to-cart wiring.
 *
 * Bridges Arch "Add to cart" buttons to the single global <shopify-cart>
 * element rendered by layout.liquid. Buttons opt in with the
 * [data-shopify-add-to-cart] attribute and live inside a <shopify-context>,
 * so the delegated click carries the product context the cart needs.
 *
 * Loaded from layout.liquid only when a Shopify store is configured.
 */
(function () {
  "use strict";

  var CART_ID = "widgetizer-cart";

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest("[data-shopify-add-to-cart]");
    if (!trigger) return;

    var cart = document.getElementById(CART_ID);
    if (!cart || typeof cart.addLine !== "function") return;

    event.preventDefault();

    // addLine() reads the enclosing <shopify-context> from the event to know
    // which variant to add, and returns the cart element for chaining.
    var result = cart.addLine(event);
    var target = result && typeof result.showModal === "function" ? result : cart;
    if (typeof target.showModal === "function") target.showModal();
  });
})();

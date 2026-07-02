/**
 * Shopify cart & checkout wiring.
 *
 * Bridges Arch commerce controls to the global Shopify elements rendered by
 * layout.liquid:
 *   - [data-shopify-add-to-cart]  adds the enclosing product context's variant
 *     (the button must live inside a <shopify-context>), then opens the cart.
 *   - [data-shopify-cart-open]    just opens the cart (e.g. the header button).
 *   - [data-shopify-buy-now]      straight to checkout with the enclosing
 *     product context's variant, via the <shopify-store> element.
 *
 * Loaded from layout.liquid only when a Shopify store is configured.
 */
(function () {
  "use strict";

  var CART_ID = "widgetizer-cart";

  document.addEventListener("click", function (event) {
    var buyNow = event.target.closest("[data-shopify-buy-now]");
    if (buyNow) {
      var store = document.querySelector("shopify-store");
      if (store && typeof store.buyNow === "function") {
        event.preventDefault();
        store.buyNow(event);
      }
      return;
    }

    var cart = document.getElementById(CART_ID);
    if (!cart) return;

    var opener = event.target.closest("[data-shopify-cart-open]");
    if (opener) {
      event.preventDefault();
      if (typeof cart.showModal === "function") cart.showModal();
      return;
    }

    var trigger = event.target.closest("[data-shopify-add-to-cart]");
    if (!trigger || typeof cart.addLine !== "function") return;

    event.preventDefault();

    // addLine() reads the enclosing <shopify-context> from the event to know
    // which variant to add, and returns the cart element for chaining.
    var result = cart.addLine(event);
    var target = result && typeof result.showModal === "function" ? result : cart;
    if (typeof target.showModal === "function") target.showModal();
  });

  // Header cart badge: mirror the rendered count into data-count so CSS can
  // hide the badge when the cart is empty (see .header-cart-count). The badge
  // is re-cloned whenever its cart context re-renders, so re-sync on any DOM
  // change, coalesced to one pass per frame. (A shopify-attr binding can't do
  // this: attr expressions evaluate as JS and throw while no cart exists.)
  var badgeSyncQueued = false;

  function syncCartBadges() {
    badgeSyncQueued = false;
    var badges = document.querySelectorAll(".header-cart-count");
    for (var i = 0; i < badges.length; i++) {
      var count = parseInt(badges[i].textContent, 10);
      badges[i].setAttribute("data-count", isNaN(count) ? "0" : String(count));
    }
  }

  function queueBadgeSync() {
    if (badgeSyncQueued) return;
    badgeSyncQueued = true;
    requestAnimationFrame(syncCartBadges);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", queueBadgeSync);
  } else {
    queueBadgeSync();
  }

  // Attribute writes aren't observed (childList/characterData only), so the
  // sync itself can't re-trigger the observer.
  new MutationObserver(queueBadgeSync).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();

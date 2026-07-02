/**
 * Shopify product gallery wiring.
 *
 * Delegated controls for the product-detail gallery
 * (snippets/product-detail.liquid), shared by the quick-view modal and the
 * Product widget:
 *   - thumbnails slide the track; slide 0 is the variant-bound image, so
 *     thumbnail N maps to slide N + 1
 *   - interacting with the variant selector slides back to slide 0, so the
 *     photo visibly follows the chosen variant (clicks inside the selector's
 *     shadow DOM retarget to the element itself, so closest works)
 *
 * Enqueued by any widget that renders the product-detail snippet.
 */
(function () {
  "use strict";

  document.addEventListener("click", function (event) {
    var thumb = event.target.closest("[data-shopify-gallery-thumb]");
    if (thumb) {
      var gallery = thumb.closest("[data-shopify-gallery]");
      var track = gallery && gallery.querySelector("[data-shopify-gallery-track]");
      var thumbs = gallery ? Array.prototype.slice.call(gallery.querySelectorAll("[data-shopify-gallery-thumb]")) : [];
      var index = thumbs.indexOf(thumb);
      if (track && index > -1) {
        track.style.transform = "translateX(" + (index + 1) * -100 + "%)";
        thumbs.forEach(function (t) {
          t.classList.toggle("is-selected", t === thumb);
        });
      }
      return;
    }

    var options = event.target.closest(".product-detail-options");
    if (options) {
      var detail = options.closest(".product-detail");
      var optGallery = detail && detail.querySelector("[data-shopify-gallery]");
      if (optGallery) {
        var optTrack = optGallery.querySelector("[data-shopify-gallery-track]");
        if (optTrack) optTrack.style.transform = "";
        optGallery.querySelectorAll("[data-shopify-gallery-thumb].is-selected").forEach(function (t) {
          t.classList.remove("is-selected");
        });
      }
    }
  });
})();

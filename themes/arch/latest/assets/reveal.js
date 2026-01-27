/**
 * Scroll Reveal Animation System
 *
 * Uses Intersection Observer to detect when elements with the .reveal class
 * enter the viewport, then adds the .revealed class to trigger CSS animations.
 *
 * Features:
 * - One-time animation (elements don't re-animate on scroll up)
 * - Respects prefers-reduced-motion
 * - Configurable threshold (15% visibility triggers animation)
 * - Stagger support via --reveal-delay CSS variable
 */
(function () {
  // Respect reduced motion preference
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    // Immediately reveal all elements without animation
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("revealed");
    });
    return;
  }

  // Configuration
  var threshold = 0.15; // 15% of element must be visible

  // Create the Intersection Observer
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // Add revealed class to trigger animation
          entry.target.classList.add("revealed");
          // Stop observing this element (one-time animation)
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: threshold,
      rootMargin: "0px 0px -50px 0px", // Trigger slightly before element is fully in view
    }
  );

  // Observe all elements with the reveal class
  function observeRevealElements() {
    document.querySelectorAll(".reveal:not(.revealed)").forEach(function (el) {
      observer.observe(el);
    });
  }

  // Initial observation
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeRevealElements);
  } else {
    observeRevealElements();
  }

  // Re-observe when new content is added (for dynamic content)
  // This is useful if widgets are loaded asynchronously
  var mutationObserver = new MutationObserver(function (mutations) {
    var hasNewRevealElements = mutations.some(function (mutation) {
      return Array.from(mutation.addedNodes).some(function (node) {
        return (
          node.nodeType === 1 &&
          (node.classList.contains("reveal") || node.querySelector(".reveal"))
        );
      });
    });

    if (hasNewRevealElements) {
      observeRevealElements();
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();

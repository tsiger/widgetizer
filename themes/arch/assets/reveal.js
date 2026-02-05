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
 * - Optimized MutationObserver (scoped, debounced, early exit)
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

  // Debounce utility
  function debounce(fn, delay) {
    var timer = null;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
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
    },
  );

  // Observe all elements with the reveal class
  function observeRevealElements() {
    document.querySelectorAll(".reveal:not(.revealed)").forEach(function (el) {
      observer.observe(el);
    });
  }

  // Debounced version for MutationObserver calls
  var debouncedObserve = debounce(observeRevealElements, 50);

  // Check if a node or its descendants contain .reveal elements
  function hasRevealElements(node) {
    if (node.nodeType !== 1) return false;
    if (node.classList && node.classList.contains("reveal")) return true;
    if (node.querySelector && node.querySelector(".reveal")) return true;
    return false;
  }

  // Set up MutationObserver for dynamic content
  function initMutationObserver() {
    // Scope to main content area if available, fallback to body
    var targetNode = document.getElementById("main-content") || document.querySelector("main") || document.body;

    var mutationObserver = new MutationObserver(function (mutations) {
      // Early exit: check if any nodes were added
      var hasAddedNodes = mutations.some(function (m) {
        return m.addedNodes.length > 0;
      });
      if (!hasAddedNodes) return;

      // Check if any added nodes contain .reveal elements
      var hasNewRevealElements = mutations.some(function (m) {
        return Array.prototype.some.call(m.addedNodes, hasRevealElements);
      });
      if (!hasNewRevealElements) return;

      // Debounced call to avoid multiple triggers per batch
      debouncedObserve();
    });

    mutationObserver.observe(targetNode, {
      childList: true,
      subtree: true,
    });
  }

  // Initial observation
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      observeRevealElements();
      initMutationObserver();
    });
  } else {
    observeRevealElements();
    initMutationObserver();
  }
})();

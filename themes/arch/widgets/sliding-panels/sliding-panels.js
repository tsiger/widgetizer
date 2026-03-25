/**
 * Sliding Panels Widget JavaScript
 * Click to expand a panel, collapsing the others.
 */
(function () {
  "use strict";

  function initSlidingPanels(widget) {
    if (widget.dataset.initialized) return;
    widget.dataset.initialized = "true";

    const panels = widget.querySelectorAll(".sliding-panel");
    if (panels.length === 0) return;

    panels.forEach((panel) => {
      panel.addEventListener("click", (e) => {
        // Don't toggle if clicking the button link inside the panel
        if (e.target.closest("a")) return;

        panels.forEach((p) => p.classList.remove("is-active"));
        panel.classList.add("is-active");
      });
    });

    // Editor design mode support
    if (window.Widgetizer?.designMode) {
      widget.addEventListener("widget:block-select", (e) => {
        const { blockId } = e.detail;
        const target = widget.querySelector(
          `.sliding-panel[data-block-id="${blockId}"]`,
        );
        if (target) {
          panels.forEach((p) => p.classList.remove("is-active"));
          target.classList.add("is-active");
        }
      });
    }
  }

  // Initialize all instances
  document
    .querySelectorAll('[data-widget-type="sliding-panels"]')
    .forEach(initSlidingPanels);

  // Re-initialize on partial DOM updates
  document.addEventListener("widget:updated", (e) => {
    const widget = e.target.closest(
      '[data-widget-type="sliding-panels"]',
    );
    if (widget) {
      widget.removeAttribute("data-initialized");
      initSlidingPanels(widget);
    }
  });
})();

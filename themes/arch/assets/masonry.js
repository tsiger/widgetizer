/**
 * Masonry Layout System
 * Auto-initializes any [data-widget-type="masonry-gallery"] found in the page.
 * Uses absolute positioning with shortest-column algorithm for true masonry layout.
 */
(function () {
  function initMasonry(section) {
    if (section.dataset.masonryInitialized) return;
    section.dataset.masonryInitialized = 'true';

    const grid = section.querySelector('.masonry-grid');
    if (!grid) return;

    const items = Array.from(grid.querySelectorAll('.widget-card'));
    const colsSetting = parseInt(section.dataset.masonryCols) || 3;
    const gapSetting = section.dataset.masonryGap || 'medium';

    const GAP_MAP = { small: 8, medium: 16, large: 24 };
    const gap = GAP_MAP[gapSetting] || 16;

    function getCols() {
      const w = grid.offsetWidth;
      if (w < 750) return 1;
      if (w < 990) return Math.min(2, colsSetting);
      return colsSetting;
    }

    function layout() {
      const cols = getCols();
      const totalWidth = grid.offsetWidth;
      const colWidth = (totalWidth - gap * (cols - 1)) / cols;
      const colHeights = new Array(cols).fill(0);

      items.forEach(function (item) {
        item.style.width = colWidth + 'px';
        item.style.position = 'absolute';

        let shortestCol = 0;
        for (let i = 1; i < cols; i++) {
          if (colHeights[i] < colHeights[shortestCol]) shortestCol = i;
        }

        item.style.left = shortestCol * (colWidth + gap) + 'px';
        item.style.top = colHeights[shortestCol] + 'px';

        colHeights[shortestCol] += item.offsetHeight + gap;
        item.classList.add('is-positioned');
      });

      grid.style.height = Math.max.apply(null, colHeights) - gap + 'px';
    }

    const images = Array.from(grid.querySelectorAll('img'));
    const ready = images.map(function (img) {
      if (img.complete && img.naturalHeight > 0) return Promise.resolve();
      return new Promise(function (resolve) {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    });

    Promise.all(ready).then(layout);

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(layout).observe(grid);
    }
  }

  function initAll() {
    document
      .querySelectorAll('[data-widget-type="masonry-gallery"]:not([data-masonry-initialized])')
      .forEach(initMasonry);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  const target = document.getElementById('main-content') || document.body;
  new MutationObserver(function (mutations) {
    if (mutations.some(function (m) { return m.addedNodes.length > 0; })) initAll();
  }).observe(target, { childList: true, subtree: true });
})();

/**
 * Carousel System
 * Auto-initializes any .carousel-container found in the page.
 * Uses scroll-snap for native feel, with prev/next button navigation.
 * Supports dynamic content via MutationObserver.
 */
(function () {
  function initCarousel(container) {
    if (container.dataset.carouselInit) return;
    container.dataset.carouselInit = 'true';

    const track = container.querySelector('.carousel-track');
    const prevBtn = container.querySelector('.carousel-btn-prev');
    const nextBtn = container.querySelector('.carousel-btn-next');
    if (!track || !prevBtn || !nextBtn) return;

    const updateButtons = () => {
      const { scrollLeft, scrollWidth, clientWidth } = track;
      prevBtn.disabled = scrollLeft <= 1;
      nextBtn.disabled = scrollLeft + clientWidth >= scrollWidth - 1;
    };

    const getScrollAmount = () => {
      const item = track.querySelector('.carousel-item');
      if (!item) return track.clientWidth;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      return item.offsetWidth + gap;
    };

    prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
    });

    track.addEventListener('scroll', updateButtons, { passive: true });
    updateButtons();

    const ro = new ResizeObserver(updateButtons);
    ro.observe(track);
  }

  function initAll() {
    document.querySelectorAll('.carousel-container:not([data-carousel-init])').forEach(initCarousel);
  }

  // Initial run
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Watch for dynamically added carousels
  const target = document.getElementById('main-content') || document.body;
  const mo = new MutationObserver((mutations) => {
    const hasAdded = mutations.some((m) => m.addedNodes.length > 0);
    if (!hasAdded) return;
    initAll();
  });
  mo.observe(target, { childList: true, subtree: true });
})();

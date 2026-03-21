/**
 * Lightbox System
 * One shared modal on <body>, reused by all lightbox-enabled widgets on the page.
 * Supports prev/next navigation, keyboard (Escape, ArrowLeft, ArrowRight), and focus trap.
 */
(function () {
  // --- Shared modal (created once) ---
  function getOrCreateModal() {
    let modal = document.getElementById('lightbox-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'lightbox-modal';
    modal.className = 'gallery-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('aria-label', 'Image preview');
    modal.innerHTML = `
      <div class="gallery-modal-content">
        <button class="gallery-modal-nav is-prev" aria-label="Previous image" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button type="button" class="gallery-modal-close" aria-label="Close lightbox">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="gallery-modal-nav is-next" aria-label="Next image" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <img class="gallery-modal-image" src="" alt="">
        <p class="gallery-modal-caption"></p>
      </div>
    `;
    document.body.appendChild(modal);

    const modalImage = modal.querySelector('.gallery-modal-image');
    const modalCaption = modal.querySelector('.gallery-modal-caption');
    const closeBtn = modal.querySelector('.gallery-modal-close');
    const prevBtn = modal.querySelector('.gallery-modal-nav.is-prev');
    const nextBtn = modal.querySelector('.gallery-modal-nav.is-next');

    // Active state — set by whichever widget opens the modal
    modal._state = { items: [], currentIndex: 0, lastFocused: null };

    function renderImage(index) {
      const state = modal._state;
      const item = state.items[index];
      if (!item) return;
      const img = item.querySelector('.widget-card-image');
      if (!img) return;
      modalImage.src = img.getAttribute('src');
      modalImage.alt = img.getAttribute('alt') || '';
      modalCaption.textContent = item.dataset.caption || '';
      state.currentIndex = index;
      prevBtn.disabled = state.items.length < 2;
      nextBtn.disabled = state.items.length < 2;
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      const { lastFocused } = modal._state;
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    closeBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeModal(); });

    prevBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const { items, currentIndex } = modal._state;
      if (items.length < 2) return;
      renderImage((currentIndex - 1 + items.length) % items.length);
    });

    nextBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const { items, currentIndex } = modal._state;
      if (items.length < 2) return;
      renderImage((currentIndex + 1) % items.length);
    });

    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('is-open')) return;
      const { items, currentIndex } = modal._state;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (items.length < 2) return;
        renderImage((currentIndex - 1 + items.length) % items.length);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (items.length < 2) return;
        renderImage((currentIndex + 1) % items.length);
      }
    });

    modal.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('is-open') || e.key !== 'Tab') return;
      const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    modal._open = function (items, index) {
      modal._state.items = items;
      modal._state.lastFocused = document.activeElement;
      renderImage(index);
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    };

    return modal;
  }

  // --- Per-widget init ---
  function initLightbox(widget) {
    if (widget.dataset.lightboxInit) return;
    widget.dataset.lightboxInit = 'true';

    const items = Array.from(widget.querySelectorAll('.widget-card'));
    if (!items.length) return;

    const modal = getOrCreateModal();

    items.forEach((item, index) => {
      const img = item.querySelector('.widget-card-image');
      if (!img) return;
      item.style.cursor = 'pointer';
      item.addEventListener('click', (e) => {
        e.preventDefault();
        modal._open(items, index);
      });
    });
  }

  // --- Auto-init ---
  function initAll() {
    document
      .querySelectorAll('[data-widget-type="gallery"]:not([data-lightbox-init]), [data-widget-type="masonry-gallery"]:not([data-lightbox-init])')
      .forEach(initLightbox);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  const target = document.getElementById('main-content') || document.body;
  new MutationObserver((mutations) => {
    if (mutations.some((m) => m.addedNodes.length > 0)) initAll();
  }).observe(target, { childList: true, subtree: true });
})();

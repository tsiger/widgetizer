/**
 * Video Modal System
 * One shared modal on <body>, reused by all video-popup widgets on the page.
 * Opens a YouTube/Vimeo iframe with autoplay, closes on Escape or backdrop click.
 */
(function () {
  function getOrCreateModal() {
    let modal = document.getElementById('video-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'video-modal';
    modal.className = 'video-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('aria-label', 'Video player');
    modal.innerHTML = `
      <div class="video-modal-content">
        <button type="button" class="video-modal-close" aria-label="Close video">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="video-modal-frame">
          <iframe
            class="video-modal-iframe"
            src=""
            title=""
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.video-modal-close');
    const iframe = modal.querySelector('.video-modal-iframe');

    modal._lastFocused = null;

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      iframe.src = '';
      iframe.title = '';
      document.body.style.overflow = '';
      if (modal._lastFocused && typeof modal._lastFocused.focus === 'function') {
        modal._lastFocused.focus();
      }
    }

    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeModal();
    });

    modal.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('is-open') || e.key !== 'Tab') return;
      const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    modal._open = function (embedUrl, title) {
      modal._lastFocused = document.activeElement;
      const separator = embedUrl.includes('?') ? '&' : '?';
      iframe.src = embedUrl + separator + 'autoplay=1';
      iframe.title = title || 'Video';
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      closeBtn.focus();
    };

    return modal;
  }

  function initVideoPopup(widget) {
    if (widget.dataset.videoPopupInit) return;
    widget.dataset.videoPopupInit = 'true';

    const embedUrl = widget.dataset.videoUrl;
    if (!embedUrl) return;

    const title = widget.dataset.videoTitle || 'Video';
    const modal = getOrCreateModal();

    function openVideo(e) {
      e.preventDefault();
      modal._open(embedUrl, title);
    }

    widget.addEventListener('click', openVideo);
    widget.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        modal._open(embedUrl, title);
      }
    });
  }

  function initAll() {
    document
      .querySelectorAll('[data-widget-type="video-popup"]:not([data-video-popup-init])')
      .forEach(initVideoPopup);
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

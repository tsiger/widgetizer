/*
 * Site-wide behaviour, loaded on every page from layout.liquid.
 *
 * Handlers are delegated from `document`, so they keep working when the editor
 * replaces the header's markup.
 */
(function () {
  function closeNav(toggle) {
    var header = toggle.closest('[data-widget-type="header"]');
    var nav = header && header.querySelector('[data-nav]');
    toggle.setAttribute('aria-expanded', 'false');
    if (nav) nav.classList.remove('is-open');
  }

  document.addEventListener('click', function (event) {
    var toggle = event.target.closest('[data-nav-toggle]');
    if (!toggle) return;
    var header = toggle.closest('[data-widget-type="header"]');
    var nav = header && header.querySelector('[data-nav]');
    if (!nav) return;
    var open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('is-open', !open);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('[data-nav-toggle][aria-expanded="true"]').forEach(function (toggle) {
      closeNav(toggle);
      toggle.focus();
    });
  });
})();

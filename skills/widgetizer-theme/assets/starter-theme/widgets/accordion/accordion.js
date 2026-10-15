/*
 * Accordion behaviour.
 *
 * This file is enqueued once per page and stays loaded while the editor adds,
 * duplicates and replaces accordion widgets. So it never assumes one instance
 * or one page load:
 *   - `init` takes a widget element and sets up only that element.
 *   - A WeakSet remembers which elements are done. When the editor replaces a
 *     widget, the id stays the same but the element is new, so it is set up
 *     again. (Do not use `data-initialized` for this; the editor owns it.)
 *   - `widget:updated` is the editor's signal that a widget's markup changed.
 */
(function () {
  var SELECTOR = '[data-widget-type="accordion"]';
  var ready = new WeakSet();

  function setOpen(item, open) {
    var trigger = item.querySelector('.accordion__trigger');
    var panel = item.querySelector('.accordion__panel');
    if (!trigger || !panel) return;
    trigger.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  }

  function openOnly(widget, item) {
    if (widget.dataset.allowMultiple !== 'true') {
      widget.querySelectorAll('.accordion__item').forEach(function (other) {
        if (other !== item) setOpen(other, false);
      });
    }
    setOpen(item, true);
  }

  function init(widget) {
    if (ready.has(widget)) return;
    ready.add(widget);

    widget.addEventListener('click', function (event) {
      var trigger = event.target.closest('.accordion__trigger');
      if (!trigger) return;
      var item = trigger.closest('.accordion__item');
      if (trigger.getAttribute('aria-expanded') === 'true') {
        setOpen(item, false);
      } else {
        openOnly(widget, item);
      }
    });

    // Editor only: selecting a block in the sidebar reveals it in the preview.
    if (window.Widgetizer && window.Widgetizer.designMode) {
      widget.addEventListener('widget:block-select', function (event) {
        var item = widget.querySelector('.accordion__item[data-block-id="' + event.detail.blockId + '"]');
        if (item) openOnly(widget, item);
      });
    }
  }

  function scan() {
    document.querySelectorAll(SELECTOR).forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  document.addEventListener('widget:updated', function (event) {
    if (event.target.matches && event.target.matches(SELECTOR)) init(event.target);
  });
})();

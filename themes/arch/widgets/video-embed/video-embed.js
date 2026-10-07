/**
 * Video Embed widget — reveals the page's playback message when the browser
 * cannot play an uploaded video (unsupported codec, corrupt or missing file).
 * Fallback content inside <video> only shows in browsers without <video> at all,
 * so a decoding failure needs the element's error event.
 * - Re-initializes on partial DOM updates via the widget:updated event.
 */
(function () {
  "use strict";

  if (window.archVideoEmbedReady) return;
  window.archVideoEmbedReady = true;

  function watch(video) {
    if (video.dataset.errorWatched) return;
    video.dataset.errorWatched = "true";

    const message = video.closest(".widget-content")?.querySelector(".video-embed-error");
    if (!message) return;

    video.addEventListener("error", () => {
      message.hidden = false;
    });
    video.addEventListener("loadedmetadata", () => {
      message.hidden = true;
    });
    // A deferred script can arrive after a fast failure has already fired.
    if (video.error) message.hidden = false;
  }

  function init(root) {
    root.querySelectorAll(".video-embed-player").forEach(watch);
  }

  init(document);

  document.addEventListener("widget:updated", (e) => {
    const widget = e.target.closest('[data-widget-type="video-embed"]');
    if (widget) init(widget);
  });
})();

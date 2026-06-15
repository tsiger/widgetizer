/**
 * Audio Player widget.
 * - Supports multiple instances (querySelectorAll + per-widget scoping).
 * - Progressive enhancement: hides the native <audio controls> and drives a custom
 *   transport (play/pause, seek, time, prev/next, volume, speed, download).
 * - Re-initializes on partial DOM updates via the widget:updated event.
 * - In the editor (designMode), selecting a track block loads that track.
 */
(function () {
  "use strict";

  const formatTime = (seconds) => {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  function initAudioPlayer(widget) {
    if (widget.dataset.initialized) return;
    widget.dataset.initialized = "true";

    const ap = widget.querySelector(".ap");
    const audio = widget.querySelector(".ap-audio");
    if (!ap || !audio) return;

    const tracks = Array.from(widget.querySelectorAll(".ap-track"));
    if (tracks.length === 0) return;

    // Switch from the native fallback to the custom UI.
    audio.removeAttribute("controls");
    ap.classList.add("is-enhanced");

    const coverImg = widget.querySelector(".ap-cover-img");
    const coverFallback = widget.querySelector(".ap-cover-fallback");
    const nowTitle = widget.querySelector(".ap-now-title");
    const nowArtist = widget.querySelector(".ap-now-artist");
    const seek = widget.querySelector(".ap-seek");
    const timeCurrent = widget.querySelector(".ap-time-current");
    const timeDuration = widget.querySelector(".ap-time-duration");
    const playBtn = widget.querySelector(".ap-play");
    const prevBtn = widget.querySelector(".ap-prev");
    const nextBtn = widget.querySelector(".ap-next");
    const speedBtn = widget.querySelector(".ap-speed");
    const muteBtn = widget.querySelector(".ap-mute");
    const volume = widget.querySelector(".ap-volume");
    const download = widget.querySelector(".ap-download");

    let currentIndex = tracks.findIndex((t) => t.classList.contains("is-active"));
    if (currentIndex < 0) currentIndex = 0;
    let isSeeking = false;

    const updateNav = () => {
      if (prevBtn) prevBtn.disabled = currentIndex <= 0;
      if (nextBtn) nextBtn.disabled = currentIndex >= tracks.length - 1;
    };

    // Paint the elapsed portion of a range input (WebKit/Blink gradient fill via
    // --ap-fill; Firefox uses native ::-moz-range-progress and ignores it).
    const setFill = (el) => {
      if (!el) return;
      const max = parseFloat(el.max) || 0;
      const pct = max > 0 ? (parseFloat(el.value) / max) * 100 : 0;
      el.style.setProperty("--ap-fill", `${pct}%`);
    };
    const updateSeekFill = () => setFill(seek);
    const updateVolumeFill = () => setFill(volume);

    const loadTrack = (index, autoplay) => {
      if (index < 0 || index >= tracks.length) return;
      currentIndex = index;
      const track = tracks[index];
      const src = track.getAttribute("data-src") || "";
      const cover = track.getAttribute("data-cover") || "";

      tracks.forEach((t) => t.classList.remove("is-active"));
      track.classList.add("is-active");

      if (nowTitle) nowTitle.textContent = track.getAttribute("data-title") || "";
      if (nowArtist) nowArtist.textContent = track.getAttribute("data-artist") || "";

      if (coverImg && coverFallback) {
        if (cover) {
          coverImg.src = cover;
          coverImg.hidden = false;
          coverFallback.hidden = true;
        } else {
          coverImg.removeAttribute("src");
          coverImg.hidden = true;
          coverFallback.hidden = false;
        }
      }

      if (download) {
        if (src) download.href = src;
        else download.removeAttribute("href");
      }

      if (seek) {
        seek.value = 0;
        seek.max = 0;
        seek.disabled = true;
        updateSeekFill();
      }
      if (timeCurrent) timeCurrent.textContent = "0:00";
      if (timeDuration) timeDuration.textContent = "0:00";

      if (src) {
        audio.src = src;
        audio.load();
        if (autoplay) {
          const p = audio.play();
          if (p && p.catch) p.catch(() => {});
        }
      } else {
        audio.removeAttribute("src");
      }

      updateNav();
    };

    if (playBtn) {
      playBtn.addEventListener("click", () => {
        if (!audio.getAttribute("src")) {
          loadTrack(currentIndex, true);
          return;
        }
        if (audio.paused) {
          const p = audio.play();
          if (p && p.catch) p.catch(() => {});
        } else {
          audio.pause();
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (currentIndex > 0) loadTrack(currentIndex - 1, true);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (currentIndex < tracks.length - 1) loadTrack(currentIndex + 1, true);
      });
    }

    tracks.forEach((track, index) => {
      track.addEventListener("click", () => loadTrack(index, true));
    });

    audio.addEventListener("play", () => {
      ap.classList.add("is-playing");
      if (playBtn) {
        playBtn.setAttribute("aria-pressed", "true");
        playBtn.setAttribute("aria-label", "Pause");
      }
    });
    audio.addEventListener("pause", () => {
      ap.classList.remove("is-playing");
      if (playBtn) {
        playBtn.setAttribute("aria-pressed", "false");
        playBtn.setAttribute("aria-label", "Play");
      }
    });

    audio.addEventListener("loadedmetadata", () => {
      if (seek && isFinite(audio.duration)) {
        seek.max = audio.duration;
        seek.disabled = false;
        updateSeekFill();
      }
      if (timeDuration) timeDuration.textContent = formatTime(audio.duration);
    });
    audio.addEventListener("timeupdate", () => {
      if (!isSeeking && seek) {
        seek.value = audio.currentTime;
        updateSeekFill();
      }
      if (timeCurrent) timeCurrent.textContent = formatTime(audio.currentTime);
    });
    if (seek) {
      seek.addEventListener("input", () => {
        isSeeking = true;
        updateSeekFill();
        if (timeCurrent) timeCurrent.textContent = formatTime(parseFloat(seek.value));
      });
      seek.addEventListener("change", () => {
        audio.currentTime = parseFloat(seek.value);
        isSeeking = false;
      });
    }

    // Auto-advance to the next track (no repeat past the last one).
    audio.addEventListener("ended", () => {
      if (currentIndex < tracks.length - 1) loadTrack(currentIndex + 1, true);
    });

    if (volume) {
      audio.volume = parseFloat(volume.value);
      updateVolumeFill();
      volume.addEventListener("input", () => {
        audio.volume = parseFloat(volume.value);
        audio.muted = audio.volume === 0;
        ap.classList.toggle("is-muted", audio.muted);
        updateVolumeFill();
      });
    }
    if (muteBtn) {
      muteBtn.addEventListener("click", () => {
        audio.muted = !audio.muted;
        ap.classList.toggle("is-muted", audio.muted);
        muteBtn.setAttribute("aria-pressed", audio.muted ? "true" : "false");
        muteBtn.setAttribute("aria-label", audio.muted ? "Unmute" : "Mute");
      });
    }

    if (speedBtn) {
      const rates = [1, 1.25, 1.5, 2];
      let rateIndex = 0;
      speedBtn.addEventListener("click", () => {
        rateIndex = (rateIndex + 1) % rates.length;
        const rate = rates[rateIndex];
        audio.playbackRate = rate;
        speedBtn.textContent = `${rate}×`;
        speedBtn.setAttribute("aria-label", `Playback speed ${rate}x`);
      });
    }

    updateNav();

    if (window.Widgetizer && window.Widgetizer.designMode) {
      widget.addEventListener("widget:block-select", (e) => {
        const blockId = e.detail && e.detail.blockId;
        if (!blockId) return;
        const idx = tracks.findIndex((t) => {
          const li = t.closest(".ap-track-item");
          return li && li.getAttribute("data-block-id") === blockId;
        });
        if (idx !== -1 && idx !== currentIndex) loadTrack(idx, false);
      });
    }
  }

  document.querySelectorAll('[data-widget-type="audio-player"]').forEach(initAudioPlayer);

  document.addEventListener("widget:updated", (e) => {
    const widget = e.target.closest('[data-widget-type="audio-player"]');
    if (widget) {
      widget.removeAttribute("data-initialized");
      initAudioPlayer(widget);
    }
  });
})();

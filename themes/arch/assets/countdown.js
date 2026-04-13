/**
 * Shared Countdown Timer
 * Initializes all .countdown-timer elements on the page.
 * Works for both the countdown widget and countdown blocks in other widgets (e.g. banner).
 */
(function () {
  "use strict";

  function initCountdown(timer) {
    if (timer.dataset.countdownInitialized) return;
    timer.dataset.countdownInitialized = "true";

    const targetDate = new Date(timer.dataset.target).getTime();
    const expiredMessage = timer.dataset.expiredMessage;

    function update() {
      const now = Date.now();
      const distance = targetDate - now;

      if (distance < 0) {
        timer.innerHTML =
          '<div class="countdown-expired w-body t-2xl t-accent">' +
          expiredMessage +
          "</div>";
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor(
        (distance % (1000 * 60 * 60)) / (1000 * 60)
      );
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const daysEl = timer.querySelector('[data-unit="days"]');
      const hoursEl = timer.querySelector('[data-unit="hours"]');
      const minutesEl = timer.querySelector('[data-unit="minutes"]');
      const secondsEl = timer.querySelector('[data-unit="seconds"]');

      if (daysEl) daysEl.textContent = String(days).padStart(2, "0");
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, "0");
      if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, "0");
      if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, "0");
    }

    update();
    setInterval(update, 1000);
  }

  // Initialize all countdown timers on page load
  document.querySelectorAll(".countdown-timer").forEach(initCountdown);

  // Re-initialize on editor morph
  document.addEventListener("widget:updated", function (e) {
    var timers = e.target.querySelectorAll(".countdown-timer");
    timers.forEach(function (t) {
      t.removeAttribute("data-countdown-initialized");
      initCountdown(t);
    });
  });
})();

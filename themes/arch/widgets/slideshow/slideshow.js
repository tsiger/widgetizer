/**
 * Slideshow Widget JavaScript
 * Uses querySelectorAll to support multiple instances
 */
(function () {
  "use strict";

  document.querySelectorAll('[data-widget-type="slideshow"]').forEach((widget) => {
    if (widget.dataset.initialized) return;
    widget.dataset.initialized = "true";

    const slides = widget.querySelectorAll(".slideshow-slide");
    const dots = widget.querySelectorAll(".slideshow-dot");
    const prevBtn = widget.querySelector(".slideshow-prev");
    const nextBtn = widget.querySelector(".slideshow-next");
    const toggleBtn = widget.querySelector(".slideshow-toggle");

    if (slides.length === 0) return;

    let currentIndex = 0;
    let autoplayInterval;

    // Read settings from data attributes
    const autoplay = widget.dataset.autoplay === "true";
    const autoplaySpeed = parseInt(widget.dataset.autoplaySpeed) || 5000;

    const goToSlide = (index) => {
      slides[currentIndex]?.classList.remove("is-active");
      slides[currentIndex]?.setAttribute("aria-hidden", "true");
      dots[currentIndex]?.classList.remove("is-active");
      currentIndex = (index + slides.length) % slides.length;
      slides[currentIndex]?.classList.add("is-active");
      slides[currentIndex]?.setAttribute("aria-hidden", "false");
      dots[currentIndex]?.classList.add("is-active");
    };

    const nextSlide = () => goToSlide(currentIndex + 1);
    const prevSlide = () => goToSlide(currentIndex - 1);

    let isAutoplaying = false;
    const startAutoplay = () => {
      if (autoplay) {
        autoplayInterval = setInterval(nextSlide, autoplaySpeed);
        isAutoplaying = true;
        toggleBtn?.setAttribute("aria-pressed", "false");
        toggleBtn?.setAttribute("aria-label", "Pause autoplay");
        if (toggleBtn) toggleBtn.textContent = "Pause";
      }
    };

    const stopAutoplay = () => {
      clearInterval(autoplayInterval);
      isAutoplaying = false;
      toggleBtn?.setAttribute("aria-pressed", "true");
      toggleBtn?.setAttribute("aria-label", "Start autoplay");
      if (toggleBtn) toggleBtn.textContent = "Play";
    };

    prevBtn?.addEventListener("click", () => {
      stopAutoplay();
      prevSlide();
      startAutoplay();
    });

    nextBtn?.addEventListener("click", () => {
      stopAutoplay();
      nextSlide();
      startAutoplay();
    });

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        stopAutoplay();
        goToSlide(index);
        startAutoplay();
      });
    });

    toggleBtn?.addEventListener("click", () => {
      if (!autoplay) return;
      if (isAutoplaying) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });

    // Initialize aria-hidden states
    slides.forEach((slide, idx) => {
      slide.setAttribute("aria-hidden", idx === currentIndex ? "false" : "true");
    });

    // ============================================================================
    // Touch/Swipe Support for Mobile
    // ============================================================================
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const minSwipeDistance = 50; // Minimum distance in pixels to trigger a swipe
    const maxVerticalSwipe = 100; // Maximum vertical swipe to prevent scroll interference

    const slideshowTrack = widget.querySelector(".slideshow-track");
    if (slideshowTrack) {
      slideshowTrack.addEventListener("touchstart", (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      slideshowTrack.addEventListener("touchmove", (e) => {
        // Allow default scrolling behavior while tracking touch position
        touchEndX = e.touches[0].clientX;
        touchEndY = e.touches[0].clientY;
      }, { passive: true });

      slideshowTrack.addEventListener("touchend", (e) => {
        if (!touchStartX || !touchEndX) return;

        const deltaX = touchStartX - touchEndX;
        const deltaY = touchStartY - touchEndY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Only trigger swipe if horizontal movement is greater than vertical
        // and meets minimum distance threshold
        if (absDeltaX > absDeltaY && absDeltaX > minSwipeDistance && absDeltaY < maxVerticalSwipe) {
          e.preventDefault();
          
          // Stop autoplay when user interacts with swipe
          stopAutoplay();

          // Swipe left (next slide)
          if (deltaX < 0) {
            nextSlide();
          }
          // Swipe right (previous slide)
          else {
            prevSlide();
          }

          // Restart autoplay after swipe
          startAutoplay();
        }

        // Reset touch coordinates
        touchStartX = 0;
        touchEndX = 0;
        touchStartY = 0;
        touchEndY = 0;
      });
    }

    startAutoplay();
  });
})();

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

    startAutoplay();
  });
})();

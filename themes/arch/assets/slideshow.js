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

    if (slides.length === 0) return;

    let currentIndex = 0;
    let autoplayInterval;

    // Read settings from data attributes
    const autoplay = widget.dataset.autoplay === "true";
    const autoplaySpeed = parseInt(widget.dataset.autoplaySpeed) || 5000;

    const goToSlide = (index) => {
      slides[currentIndex]?.classList.remove("is-active");
      dots[currentIndex]?.classList.remove("is-active");
      currentIndex = (index + slides.length) % slides.length;
      slides[currentIndex]?.classList.add("is-active");
      dots[currentIndex]?.classList.add("is-active");
    };

    const nextSlide = () => goToSlide(currentIndex + 1);
    const prevSlide = () => goToSlide(currentIndex - 1);

    const startAutoplay = () => {
      if (autoplay) {
        autoplayInterval = setInterval(nextSlide, autoplaySpeed);
      }
    };

    const stopAutoplay = () => {
      clearInterval(autoplayInterval);
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

    startAutoplay();
  });
})();

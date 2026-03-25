/**
 * Testimonial Slider Widget JavaScript
 * Single-slide fade transition with dot pagination, autoplay, and swipe support.
 * Follows the same patterns as slideshow.js.
 */
(function () {
  "use strict";

  function initTestimonialSlider(widget) {
    if (widget.dataset.initialized) return;
    widget.dataset.initialized = "true";

    const slides = widget.querySelectorAll(".testimonial-slider-slide");
    const dots = widget.querySelectorAll(".testimonial-slider-dot");

    if (slides.length <= 1) return;

    let currentIndex = 0;
    let autoplayInterval;

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
      }
    };

    const stopAutoplay = () => {
      clearInterval(autoplayInterval);
      isAutoplaying = false;
    };

    // Dot navigation
    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        stopAutoplay();
        goToSlide(index);
        startAutoplay();
      });
    });

    // Touch/Swipe support
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const minSwipeDistance = 50;
    const maxVerticalSwipe = 100;

    const track = widget.querySelector(".testimonial-slider-track");
    if (track) {
      track.addEventListener(
        "touchstart",
        (e) => {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        },
        { passive: true },
      );

      track.addEventListener(
        "touchmove",
        (e) => {
          touchEndX = e.touches[0].clientX;
          touchEndY = e.touches[0].clientY;
        },
        { passive: true },
      );

      track.addEventListener("touchend", () => {
        if (!touchStartX || !touchEndX) return;

        const deltaX = touchStartX - touchEndX;
        const deltaY = touchStartY - touchEndY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        if (
          absDeltaX > absDeltaY &&
          absDeltaX > minSwipeDistance &&
          absDeltaY < maxVerticalSwipe
        ) {
          stopAutoplay();
          if (deltaX > 0) {
            nextSlide();
          } else {
            prevSlide();
          }
          startAutoplay();
        }

        touchStartX = 0;
        touchEndX = 0;
        touchStartY = 0;
        touchEndY = 0;
      });
    }

    // Editor design mode support
    if (window.Widgetizer?.designMode) {
      widget.addEventListener("widget:block-select", (e) => {
        const { blockId } = e.detail;
        const slideBlocks = widget.querySelectorAll(
          ".testimonial-slider-slide[data-block-id]",
        );
        let targetIndex = -1;
        slideBlocks.forEach((slide, idx) => {
          if (slide.getAttribute("data-block-id") === blockId) {
            targetIndex = idx;
          }
        });
        if (targetIndex !== -1 && targetIndex !== currentIndex) {
          stopAutoplay();
          goToSlide(targetIndex);
        }
      });

      widget.addEventListener("widget:select", () => {
        stopAutoplay();
      });

      widget.addEventListener("widget:deselect", () => {
        startAutoplay();
      });
    }

    startAutoplay();
  }

  // Initialize all instances
  document
    .querySelectorAll('[data-widget-type="testimonial-slider"]')
    .forEach(initTestimonialSlider);

  // Re-initialize on partial DOM updates
  document.addEventListener("widget:updated", (e) => {
    const widget = e.target.closest(
      '[data-widget-type="testimonial-slider"]',
    );
    if (widget) {
      widget.removeAttribute("data-initialized");
      initTestimonialSlider(widget);
    }
  });
})();

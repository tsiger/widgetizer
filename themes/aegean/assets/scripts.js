/* =============================================================================
   AEGEAN — scripts.js
   Header scroll state, mobile navigation, scroll-reveal, gallery lightbox.
   ============================================================================= */
(function () {
  "use strict";

  /* ----- Sticky / transparent header --------------------------------------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 10);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ----- Mobile navigation -------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  if (toggle && nav) {
    var setOpen = function (open) {
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    };
    toggle.addEventListener("click", function () {
      setOpen(!document.body.classList.contains("nav-open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a") && !e.target.closest(".has-submenu > a")) {
        setOpen(false);
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* ----- Scroll reveal ------------------------------------------------------ */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealEls.forEach(function (el) {
        el.classList.add("is-revealed");
      });
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      revealEls.forEach(function (el) {
        io.observe(el);
      });
    }
  }

  /* ----- Gallery lightbox --------------------------------------------------- */
  var triggers = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
  if (triggers.length) {
    var box = document.createElement("div");
    box.className = "lightbox";
    box.innerHTML =
      '<button class="lightbox__close" aria-label="Close">&times;</button>' +
      '<button class="lightbox__nav lightbox__nav--prev" aria-label="Previous">&#8249;</button>' +
      '<img alt="" />' +
      '<button class="lightbox__nav lightbox__nav--next" aria-label="Next">&#8250;</button>';
    document.body.appendChild(box);

    var imgEl = box.querySelector("img");
    var group = [];
    var index = 0;

    var show = function (i) {
      index = (i + group.length) % group.length;
      imgEl.src = group[index];
    };
    var open = function (src, groupName) {
      group = triggers
        .filter(function (t) {
          return t.getAttribute("data-lightbox") === groupName;
        })
        .map(function (t) {
          return t.getAttribute("data-lightbox-src") || t.getAttribute("href") || (t.querySelector("img") || {}).src;
        });
      index = group.indexOf(src);
      if (index < 0) index = 0;
      show(index);
      box.classList.add("is-open");
      document.body.style.overflow = "hidden";
    };
    var close = function () {
      box.classList.remove("is-open");
      document.body.style.overflow = "";
    };

    triggers.forEach(function (t) {
      t.addEventListener("click", function (e) {
        e.preventDefault();
        var src = t.getAttribute("data-lightbox-src") || t.getAttribute("href") || (t.querySelector("img") || {}).src;
        open(src, t.getAttribute("data-lightbox"));
      });
    });
    box.querySelector(".lightbox__close").addEventListener("click", close);
    box.querySelector(".lightbox__nav--prev").addEventListener("click", function () {
      show(index - 1);
    });
    box.querySelector(".lightbox__nav--next").addEventListener("click", function () {
      show(index + 1);
    });
    box.addEventListener("click", function (e) {
      if (e.target === box) close();
    });
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
  }
})();

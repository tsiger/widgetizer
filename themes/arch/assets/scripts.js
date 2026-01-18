/**
 * Global Scripts for Arch Theme
 * Contains JavaScript functionality shared across widgets
 */

// ============================================================================
// Header Navigation
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  const widgetElement = document.querySelector('[data-widget-type="header"]');
  if (!widgetElement) return;

  // Prevent duplicate initialization
  if (widgetElement.dataset.initialized === "true") return;
  widgetElement.dataset.initialized = "true";

  const menuToggle = widgetElement.querySelector(".menu-toggle");
  const navCloseBtn = widgetElement.querySelector(".nav-close-btn");
  const headerNav = widgetElement.querySelector(".header-nav");
  // Select links within has-submenu items as toggles
  const submenuItems = widgetElement.querySelectorAll(".has-submenu");

  // Function to open mobile menu
  const openMobileMenu = () => {
    menuToggle.setAttribute("aria-expanded", "true");
    headerNav.classList.add("nav-open");
    document.body.style.overflow = "hidden";

    // Focus the close button when menu opens
    setTimeout(() => {
      if (navCloseBtn) {
        navCloseBtn.focus();
      }
    }, 100);
  };

  // Function to close mobile menu
  const closeMobileMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    headerNav.classList.remove("nav-open");
    document.body.style.overflow = "";
  };

  // Focus trap for mobile menu
  const trapFocus = (e) => {
    if (window.innerWidth >= 990) return;
    if (!headerNav.classList.contains("nav-open")) return;

    const focusableElements = headerNav.querySelectorAll(
      'button:not([disabled]), a[href]:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.key === "Tab") {
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  document.addEventListener("keydown", trapFocus);

  // Mobile menu toggle
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      if (isExpanded) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  // Close button in mobile menu
  if (navCloseBtn) {
    navCloseBtn.addEventListener("click", closeMobileMenu);
  }

  // Function to open a submenu
  const openSubmenu = (item) => {
    const submenu = item.querySelector(":scope > ul");
    const link = item.querySelector(":scope > a");
    if (link) link.setAttribute("aria-expanded", "true");
    if (submenu) {
      submenu.classList.add("submenu-open");
      item.classList.add("submenu-open");
    }
  };

  // Function to close a submenu
  const closeSubmenu = (item) => {
    const submenu = item.querySelector(":scope > ul");
    const link = item.querySelector(":scope > a");
    if (link) link.setAttribute("aria-expanded", "false");
    if (submenu) {
      submenu.classList.remove("submenu-open");
      item.classList.remove("submenu-open");
    }
  };

  // Function to close sibling submenus
  const closeSiblingSubmenus = (item) => {
    const parentList = item.parentElement;
    const siblingItems = parentList.querySelectorAll(":scope > .has-submenu");

    siblingItems.forEach((sibling) => {
      if (sibling !== item) {
        closeSubmenu(sibling);
      }
    });
  };

  // Create toggle buttons for submenu items and set up click handlers
  submenuItems.forEach((item) => {
    const link = item.querySelector(":scope > a");
    if (!link) return;

    if (!link.hasAttribute("aria-expanded")) {
      link.setAttribute("aria-expanded", "false");
    }
    link.setAttribute("aria-haspopup", "true");

    // Create the toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "submenu-toggle";
    toggleBtn.setAttribute("aria-label", "Toggle submenu");
    toggleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6l-6 6"/></svg>`;

    // Insert toggle button after the link
    link.after(toggleBtn);

    // Check if link has a real URL (not # or empty)
    const hasRealLink = link.href && !link.href.endsWith("#") && link.getAttribute("href") !== "#";

    // Toggle button click handler - always toggles submenu
    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Only handle on mobile
      if (window.innerWidth >= 990) return;

      const isExpanded = link.getAttribute("aria-expanded") === "true";

      // Close other submenus at the same level
      closeSiblingSubmenus(item);

      // Toggle current submenu
      if (isExpanded) {
        closeSubmenu(item);
      } else {
        openSubmenu(item);
      }
    });

    // Link click handler
    link.addEventListener("click", (e) => {
      // Only handle on mobile
      if (window.innerWidth >= 990) return;

      if (hasRealLink) {
        // Let the link navigate normally
        return;
      } else {
        // Toggle submenu for # links
        e.preventDefault();
        const isExpanded = link.getAttribute("aria-expanded") === "true";

        // Close other submenus at the same level
        closeSiblingSubmenus(item);

        // Toggle current submenu
        if (isExpanded) {
          closeSubmenu(item);
        } else {
          openSubmenu(item);
        }
      }
    });
  });

  // Close submenu when focus leaves the entire submenu branch
  const navItems = widgetElement.querySelectorAll(".nav-item");
  navItems.forEach((item) => {
    item.addEventListener("focusout", () => {
      if (window.innerWidth < 990) {
        // Check if the new focus target is outside this nav item
        setTimeout(() => {
          if (!item.contains(document.activeElement)) {
            if (item.classList.contains("has-submenu")) {
              closeSubmenu(item);
            }
          }
        }, 0);
      }
    });
  });

  // Keyboard navigation
  widgetElement.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // Close mobile menu
      if (headerNav.classList.contains("nav-open")) {
        closeMobileMenu();
        menuToggle.focus();
      }

      // Close open submenus
      submenuItems.forEach((item) => {
        const submenu = item.querySelector(":scope > ul");
        if (submenu && submenu.classList.contains("submenu-open")) {
          closeSubmenu(item);
          const link = item.querySelector(":scope > a");
          if (link) link.focus();
        }
      });
    }
  });

  // Close mobile menu when clicking outside (on desktop breakpoint)
  document.addEventListener("click", (e) => {
    if (window.innerWidth >= 990) return;

    if (!widgetElement.contains(e.target) && headerNav.classList.contains("nav-open")) {
      closeMobileMenu();
    }
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 990) {
      // Reset mobile menu state on desktop
      closeMobileMenu();

      // Reset submenu states
      submenuItems.forEach((item) => {
        closeSubmenu(item);
      });
    }
  });

  // ============================================================================
  // Desktop Submenu Viewport Detection
  // Flips nested submenus to open left when they would overflow the viewport
  // ============================================================================

  const checkSubmenuPosition = (submenu) => {
    if (window.innerWidth < 990) return;

    // Remove any existing flip class first
    submenu.classList.remove("submenu-flip");

    // Get submenu dimensions
    const rect = submenu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // Check if submenu would overflow the right edge
    if (rect.right > viewportWidth) {
      submenu.classList.add("submenu-flip");
    }
  };

  // Add hover listeners for desktop submenu positioning
  const allSubmenuItems = widgetElement.querySelectorAll(".has-submenu");
  allSubmenuItems.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      if (window.innerWidth < 990) return;

      const submenu = item.querySelector(":scope > .nav-submenu");
      if (submenu) {
        // Use requestAnimationFrame to ensure the submenu is rendered
        requestAnimationFrame(() => {
          checkSubmenuPosition(submenu);
        });
      }
    });
  });

  // Initialize submenu positions on page load to prevent horizontal scrollbar
  const initializeSubmenuPositions = () => {
    if (window.innerWidth < 990) return;

    // Check all nested submenus (submenus within submenus)
    const nestedSubmenus = widgetElement.querySelectorAll(".nav-submenu .nav-submenu");
    nestedSubmenus.forEach((submenu) => {
      const parentItem = submenu.closest(".nav-item");
      if (!parentItem) return;

      // Get parent item's position to predict if submenu would overflow
      const parentRect = parentItem.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const submenuMinWidth = 220; // 22rem = ~220px

      // If parent is close to right edge, flip the submenu preemptively
      if (parentRect.right + submenuMinWidth > viewportWidth) {
        submenu.classList.add("submenu-flip");
      }
    });
  };

  // Run initialization after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSubmenuPositions);
  } else {
    // DOM is already loaded
    requestAnimationFrame(initializeSubmenuPositions);
  }

  // Reset flipped submenus on resize; re-evaluated on next hover
  window.addEventListener("resize", () => {
    if (window.innerWidth < 990) return;
    widgetElement
      .querySelectorAll(".nav-submenu.submenu-flip")
      .forEach((submenu) => submenu.classList.remove("submenu-flip"));
    // Re-check positions after resize
    requestAnimationFrame(initializeSubmenuPositions);
  });
});

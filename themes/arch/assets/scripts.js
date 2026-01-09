/**
 * Global Scripts for Arch Theme
 * Contains JavaScript functionality shared across widgets
 */

// ============================================================================
// Header Navigation
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const widgetElement = document.querySelector('[data-widget-type="header"]');
  if (!widgetElement) return;

  // Prevent duplicate initialization
  if (widgetElement.dataset.initialized === 'true') return;
  widgetElement.dataset.initialized = 'true';

  const menuToggle = widgetElement.querySelector('.menu-toggle');
  const navCloseBtn = widgetElement.querySelector('.nav-close-btn');
  const headerNav = widgetElement.querySelector('.header-nav');
  // Select links within has-submenu items as toggles
  const submenuItems = widgetElement.querySelectorAll('.has-submenu');

  // Function to open mobile menu
  const openMobileMenu = () => {
    menuToggle.setAttribute('aria-expanded', 'true');
    headerNav.classList.add('nav-open');
    document.body.style.overflow = 'hidden';

    // Focus the close button when menu opens
    setTimeout(() => {
      if (navCloseBtn) {
        navCloseBtn.focus();
      }
    }, 100);
  };

  // Function to close mobile menu
  const closeMobileMenu = () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    headerNav.classList.remove('nav-open');
    document.body.style.overflow = '';
  };

  // Focus trap for mobile menu
  const trapFocus = (e) => {
    if (window.innerWidth >= 990) return;
    if (!headerNav.classList.contains('nav-open')) return;

    const focusableElements = headerNav.querySelectorAll(
      'button:not([disabled]), a[href]:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.key === 'Tab') {
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

  document.addEventListener('keydown', trapFocus);

  // Mobile menu toggle
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });
  }

  // Close button in mobile menu
  if (navCloseBtn) {
    navCloseBtn.addEventListener('click', closeMobileMenu);
  }

  // Function to open a submenu
  const openSubmenu = (item) => {
    const submenu = item.querySelector(':scope > ul');
    const link = item.querySelector(':scope > a');
    if (link) link.setAttribute('aria-expanded', 'true');
    if (submenu) {
      submenu.classList.add('submenu-open');
    }
  };

  // Function to close a submenu
  const closeSubmenu = (item) => {
    const submenu = item.querySelector(':scope > ul');
    const link = item.querySelector(':scope > a');
    if (link) link.setAttribute('aria-expanded', 'false');
    if (submenu) {
      submenu.classList.remove('submenu-open');
    }
  };

  // Function to close sibling submenus
  const closeSiblingSubmenus = (item) => {
    const parentList = item.parentElement;
    const siblingItems = parentList.querySelectorAll(':scope > .has-submenu');

    siblingItems.forEach((sibling) => {
      if (sibling !== item) {
        closeSubmenu(sibling);
      }
    });
  };

  // Submenu toggles (mobile) - Click handler
  submenuItems.forEach((item) => {
    const link = item.querySelector(':scope > a');
    if (!link) return;

    link.addEventListener('click', (e) => {
      // Only handle on mobile
      if (window.innerWidth >= 990) return;

      e.preventDefault();
      const isExpanded = link.getAttribute('aria-expanded') === 'true';

      // Close other submenus at the same level
      closeSiblingSubmenus(item);

      // Toggle current submenu
      if (isExpanded) {
        closeSubmenu(item);
      } else {
        openSubmenu(item);
      }
    });

    // Keyboard navigation - Focus handler for mobile menu
    link.addEventListener('focus', () => {
      if (window.innerWidth < 990) {
        // Close sibling submenus
        closeSiblingSubmenus(item);
        // Open current submenu
        openSubmenu(item);
      }
    });
  });

  // Close submenu when focus leaves the entire submenu branch
  const navItems = widgetElement.querySelectorAll('.nav-item');
  navItems.forEach((item) => {
    item.addEventListener('focusout', () => {
      if (window.innerWidth < 990) {
        // Check if the new focus target is outside this nav item
        setTimeout(() => {
          if (!item.contains(document.activeElement)) {
            if (item.classList.contains('has-submenu')) {
              closeSubmenu(item);
            }
          }
        }, 0);
      }
    });
  });

  // Keyboard navigation
  widgetElement.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Close mobile menu
      if (headerNav.classList.contains('nav-open')) {
        closeMobileMenu();
        menuToggle.focus();
      }

      // Close open submenus
      submenuItems.forEach((item) => {
        const submenu = item.querySelector(':scope > ul');
        if (submenu && submenu.classList.contains('submenu-open')) {
          closeSubmenu(item);
          const link = item.querySelector(':scope > a');
          if (link) link.focus();
        }
      });
    }
  });

  // Close mobile menu when clicking outside (on desktop breakpoint)
  document.addEventListener('click', (e) => {
    if (window.innerWidth >= 990) return;

    if (!widgetElement.contains(e.target) && headerNav.classList.contains('nav-open')) {
      closeMobileMenu();
    }
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 990) {
      // Reset mobile menu state on desktop
      closeMobileMenu();

      // Reset submenu states
      submenuItems.forEach((item) => {
        closeSubmenu(item);
      });
    }
  });
});

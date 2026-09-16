/**
 * Abdullah Alajlan Endowment - Common UI & Layout Logic
 * Handles mobile drawer, sticky header, theme switching, and global UI components
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initMobileDrawer();
  initTheme();
  highlightActiveNav();
});

/**
 * Header scroll styling
 */
function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
}

/**
 * Mobile Drawer Menu toggle
 */
function initMobileDrawer() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const closeBtn = document.getElementById('drawer-close-btn');
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('mobile-overlay');

  if (!hamburgerBtn || !drawer || !overlay) return;

  hamburgerBtn.setAttribute('aria-controls', 'mobile-drawer');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
  drawer.setAttribute('aria-hidden', 'true');

  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    if (closeBtn) closeBtn.focus();
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    hamburgerBtn.focus();
  }

  hamburgerBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Close on pressing Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });

  // Close on clicking any drawer link
  const drawerLinks = drawer.querySelectorAll('.drawer-nav-link');
  drawerLinks.forEach((link) => {
    link.addEventListener('click', closeDrawer);
  });
}

/**
 * Theme initialization
 * The site runs on the default serene Ivory, Cream, and Forest Green palette.
 */
function initTheme() {
  document.documentElement.removeAttribute('data-theme');
}

/**
 * Highlights active navigation link based on current path
 */
function highlightActiveNav() {
  const currentPath = window.location.pathname.toLowerCase();
  const navLinks = document.querySelectorAll('.nav-link, .drawer-nav-link');

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;

    const hrefClean = href.replace('./', '').replace('/', '').toLowerCase();
    const pathClean = currentPath.replace('/', '').toLowerCase();

    if (
      (pathClean === '' && (hrefClean === 'index.html' || hrefClean === '')) ||
      (pathClean !== '' && pathClean.includes(hrefClean) && hrefClean !== 'index.html' && hrefClean !== '')
    ) {
      link.classList.add('active');
    } else if (pathClean === 'index.html' && (hrefClean === 'index.html' || hrefClean === '')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Global Toast message utility
 */
window.showToast = function (message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a861" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2800);
};

/**
 * Abdullah Alajlan Endowment - Common UI & Layout Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initMobileDrawer();
  initTheme();
  highlightActiveNav();
  initDonationPresets();
  initSiteUpdates();
});

function initDonationPresets() {
  const amountInput = document.getElementById('donation-amount');
  const presetButtons = document.querySelectorAll('.donation-preset');
  if (!amountInput || !presetButtons.length) return;

  presetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      amountInput.value = button.dataset.amount || '';
      presetButtons.forEach((preset) => {
        preset.setAttribute('aria-pressed', String(preset === button));
      });
      amountInput.focus();
    });
  });
}

function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

function initMobileDrawer() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const closeBtn = document.getElementById('drawer-close-btn');
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('mobile-overlay');
  if (!hamburgerBtn || !drawer || !overlay) return;

  hamburgerBtn.setAttribute('aria-controls', 'mobile-drawer');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
  drawer.setAttribute('aria-hidden', 'true');

  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    hamburgerBtn.focus();
  }

  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    if (closeBtn) closeBtn.focus();
  }

  hamburgerBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
  });
  drawer.querySelectorAll('.drawer-nav-link').forEach((link) => {
    link.addEventListener('click', closeDrawer);
  });
}

function initTheme() {
  document.documentElement.removeAttribute('data-theme');
}

function highlightActiveNav() {
  const currentPath = window.location.pathname.toLowerCase();
  document.querySelectorAll('.nav-link, .drawer-nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    const hrefClean = href.replace('./', '').replace('/', '').toLowerCase();
    const pathClean = currentPath.replace('/', '').toLowerCase();
    const isHome = (pathClean === '' || pathClean === 'index.html') && hrefClean === 'index.html';
    const isCurrentPage = pathClean !== '' && pathClean !== 'index.html' && hrefClean !== 'index.html' && pathClean.includes(hrefClean);
    link.classList.toggle('active', isHome || isCurrentPage);
  });
}

/** Canonical hosted URL and legacy link rewriting. */
function initSiteUpdates() {
  const hostedUrl = 'https://abdullahalajlanendowment.vercel.app/';

  // Keep the canonical and social URL pointed at the actual Vercel deployment.
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = hostedUrl;

  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement('meta');
    ogUrl.setAttribute('property', 'og:url');
    document.head.appendChild(ogUrl);
  }
  ogUrl.content = hostedUrl;

  document.querySelectorAll('a[href="https://abdullah-alajlan-endowment-website.vercel.app/"]').forEach((link) => {
    link.href = hostedUrl;
  });
}

window.showToast = function (message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a861" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2800);
};

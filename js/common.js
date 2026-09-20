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

/** Home portrait, footer pattern removal, and canonical hosted URL. */
function initSiteUpdates() {
  const hostedUrl = 'https://abdullahalajlanendowment.vercel.app/';

  // Remove only decorative footer patterns; preserve footer colors, text, and logos.
  const style = document.createElement('style');
  style.textContent = '.site-footer, .site-footer::before, .site-footer::after { background-image: none !important; }';
  document.head.appendChild(style);

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

  // Add the existing father portrait before the hero at the beginning of Home.
  const isHomePage = window.location.pathname === '/' || /index\.html?$/i.test(window.location.pathname);
  const hero = document.querySelector('.hero-section');
  if (!isHomePage || !hero || document.querySelector('.memorial-portrait-section')) return;

  const portraitStyle = document.createElement('style');
  portraitStyle.textContent = `
    .memorial-portrait-section { padding: 2.75rem 0 1.5rem; background-color: var(--bg-primary); }
    .memorial-portrait-card { max-width: 520px; margin: 0 auto; padding: 1rem; text-align: center; background-color: var(--bg-card); border: 2px solid var(--warm-gold); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); }
    .memorial-portrait-image { display: block; width: 100%; max-height: 420px; object-fit: cover; object-position: center; border-radius: var(--radius-md); }
    .memorial-portrait-caption { margin-top: .9rem; color: var(--primary-forest); font-family: var(--font-quran); font-size: 1.35rem; font-weight: 700; }
  `;
  document.head.appendChild(portraitStyle);

  const section = document.createElement('section');
  section.className = 'memorial-portrait-section';
  section.setAttribute('aria-label', 'Memorial portrait');
  section.innerHTML = `
    <div class="container">
      <div class="memorial-portrait-card">
        <img class="memorial-portrait-image" src="./assets/alajlan_portrait.jpg" alt="عبدالله محمد العجلان رحمه الله">
        <div class="memorial-portrait-caption" data-i18n-ar="عبدالله محمد العجلان رحمه الله" data-i18n-en="Abdullah Mohammed Alajlan, may Allah have mercy on him">عبدالله محمد العجلان رحمه الله</div>
      </div>
    </div>`;
  hero.before(section);

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

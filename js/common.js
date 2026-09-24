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

  // Add a photo-free memorial quote card before the hero at the beginning of Home
  // (replaces the earlier real-photo section; no likeness of the deceased is used).
  const isHomePage = window.location.pathname === '/' || /index\.html?$/i.test(window.location.pathname);
  const hero = document.querySelector('.hero-section');
  if (!isHomePage || !hero || document.querySelector('.memorial-quote-section')) return;

  const quoteStyle = document.createElement('style');
  quoteStyle.textContent = `
    .memorial-quote-section { padding: 2.5rem 0 1.25rem; background-color: var(--bg-primary); }
    .memorial-quote-card { position: relative; max-width: 640px; margin: 0 auto; padding: 2.25rem 2rem 2rem; text-align: center; background-color: var(--bg-card); border: 1px solid var(--border-gold-subtle); border-radius: var(--radius-lg); box-shadow: var(--shadow-md); }
    .memorial-quote-mark { display: block; margin: 0 auto .5rem; width: 2.5rem; height: 2.5rem; color: var(--warm-gold); opacity: .85; }
    .memorial-quote-text { color: var(--text-primary); font-family: var(--font-quran); font-size: 1.3rem; line-height: 1.9; }
    .memorial-quote-caption { margin-top: 1rem; color: var(--gold-dark); font-size: .95rem; font-weight: 600; }
  `;
  document.head.appendChild(quoteStyle);

  const section = document.createElement('section');
  section.className = 'memorial-quote-section';
  section.setAttribute('aria-label', 'Memorial remembrance');
  section.innerHTML = `
    <div class="container">
      <div class="memorial-quote-card">
        <svg class="memorial-quote-mark" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
          <path d="M9.5 8C5.9 9.7 3.5 12.8 3.5 17.2c0 3.9 2.6 6.8 6 6.8 3 0 5.3-2.2 5.3-5.1 0-2.7-1.9-4.7-4.4-4.7-.5 0-1 .1-1.4.3.4-2.6 2.6-4.8 5.2-5.9L9.5 8Zm14 0c-3.6 1.7-6 4.8-6 9.2 0 3.9 2.6 6.8 6 6.8 3 0 5.3-2.2 5.3-5.1 0-2.7-1.9-4.7-4.4-4.7-.5 0-1 .1-1.4.3.4-2.6 2.6-4.8 5.2-5.9L23.5 8Z"/>
        </svg>
        <p class="memorial-quote-text" data-i18n-ar="كان محباً للخير، سبّاقاً إلى تفريج كرب المحتاجين، وبقي أثره الطيب في قلوب من عرفه." data-i18n-en="He loved doing good, was quick to relieve the burden of those in need, and his kindness remains in the hearts of all who knew him.">كان محباً للخير، سبّاقاً إلى تفريج كرب المحتاجين، وبقي أثره الطيب في قلوب من عرفه.</p>
        <div class="memorial-quote-caption" data-i18n-ar="عبدالله محمد العجلان رحمه الله" data-i18n-en="Abdullah Mohammed Alajlan, may Allah have mercy on him">عبدالله محمد العجلان رحمه الله</div>
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

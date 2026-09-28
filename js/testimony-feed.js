/**
 * Recent testimonies feed (js/testimony-feed.js)
 *
 * Fetches the 15 most recent prayers that include a message from
 * /api/prayers?feed=1&limit=15 (the API strips name server-side for this
 * mode, so no name ever reaches this script) and renders them as an
 * autoscrolling row: verse reference + message only, never a name.
 */
(function () {
  'use strict';

  const FEED_LIMIT = 15;
  const SECONDS_PER_CARD = 4.5; // count-based, not measured - see renderFeed() for why
  const MIN_DURATION_SECONDS = 16;
  const CARD_STEP_PX = 320; // 300px card + 20px gap (keep in sync with css/main.css)
  let cachedFeed = null;

  function isArabicNow() {
    return (window.i18n ? window.i18n.getLang() : (localStorage.getItem('preferred_lang') || 'ar')) === 'ar';
  }

  function verseLabel(verseKey, isArabic) {
    const verse = verseKey && window.QURAN_VERSES_BY_KEY ? window.QURAN_VERSES_BY_KEY[verseKey] : null;
    if (!verse) return isArabic ? 'آية قرآنية' : 'A Quran verse';
    return isArabic ? verse.refAr : verse.refEn;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function buildCardHtml(entry, isArabic) {
    return `<article class="testimony-card">
      <span class="testimony-card-verse-ref">${escapeHtml(verseLabel(entry.verse, isArabic))}</span>
      <p class="testimony-card-message">${escapeHtml(entry.message)}</p>
    </article>`;
  }

  function renderFeed() {
    const track = document.getElementById('testimony-feed-track');
    const wrap = document.getElementById('testimony-feed-wrap');
    if (!track || !wrap) return;
    const isArabic = isArabicNow();
    track.style.animation = ''; // clear any previous empty-state override before deciding what to render

    if (!cachedFeed || cachedFeed.length === 0) {
      track.style.animation = 'none';
      track.innerHTML = `<p class="testimony-feed-empty">${
        isArabic ? 'لا توجد دعوات مُشاركة بعد. كن أول من يدعو له.' : 'No shared prayers yet. Be the first to pray for him.'
      }</p>`;
      return;
    }

    // Seamless loop: the track shows the same block of cards twice and
    // translates by exactly half, so one block must be at least as wide as
    // the visible area. With only a few testimonies a single block is
    // narrower than the screen, which leaves an empty gap that snaps back
    // at the loop point. So the base set is repeated until one block is
    // wider than the viewport. Card width and gap are fixed in CSS, so
    // this is pure arithmetic and needs no layout measurement.
    const cardsPerBlock = Math.max(
      cachedFeed.length,
      Math.ceil((window.innerWidth + CARD_STEP_PX) / CARD_STEP_PX)
    );
    let blockHtml = '';
    for (let i = 0; i < cardsPerBlock; i++) {
      blockHtml += buildCardHtml(cachedFeed[i % cachedFeed.length], isArabic);
    }
    track.innerHTML = blockHtml + blockHtml;

    // Speed stays constant regardless of how many cards there are.
    const duration = Math.max(cardsPerBlock * SECONDS_PER_CARD, MIN_DURATION_SECONDS);
    track.style.setProperty('--marquee-duration', `${duration}s`);
  }

  // Start the loop as soon as the section's edge enters the viewport (plus a
  // small head start), instead of waiting for it to be centered on screen.
  function watchVisibility() {
    const track = document.getElementById('testimony-feed-track');
    const wrap = document.getElementById('testimony-feed-wrap');
    if (!track || !wrap) return;
    if (!('IntersectionObserver' in window)) {
      track.classList.add('is-running');
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        track.classList.toggle('is-running', entry.isIntersecting);
      });
    }, { threshold: 0, rootMargin: '0px 0px 150px 0px' });
    observer.observe(wrap);
  }

  async function loadFeed() {
    try {
      const res = await fetch(`/api/prayers?feed=1&limit=${FEED_LIMIT}`);
      if (!res.ok) throw new Error(`Feed request failed: ${res.status}`);
      const data = await res.json();
      cachedFeed = Array.isArray(data.prayers) ? data.prayers : [];
    } catch (err) {
      console.warn('Could not load the testimony feed.', err);
      cachedFeed = [];
    }
    renderFeed();
  }

  document.addEventListener('DOMContentLoaded', () => {
    watchVisibility();
    loadFeed();
  });
  window.addEventListener('languageChanged', renderFeed);

  // Re-fill the row when the window width changes enough to need more cards.
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - lastWidth) < 100) return;
    lastWidth = window.innerWidth;
    renderFeed();
  });
})();

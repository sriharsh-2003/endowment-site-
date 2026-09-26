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
  const PIXELS_PER_SECOND = 40; // consistent scroll speed regardless of how many cards there are
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

    if (!cachedFeed || cachedFeed.length === 0) {
      track.style.animation = 'none';
      track.innerHTML = `<p class="testimony-feed-empty">${
        isArabic ? 'لا توجد دعوات مُشاركة بعد. كن أول من يدعو له.' : 'No shared prayers yet. Be the first to pray for him.'
      }</p>`;
      return;
    }

    // Render the set twice back-to-back so translateX(-50%) loops seamlessly.
    const cardsHtml = cachedFeed.map((entry) => buildCardHtml(entry, isArabic)).join('');
    track.innerHTML = cardsHtml + cardsHtml;

    // Speed should feel the same whether there are 3 cards or 15, so base
    // the animation duration on the actual rendered width of one set.
    requestAnimationFrame(() => {
      const oneSetWidth = track.scrollWidth / 2;
      const duration = Math.max(oneSetWidth / PIXELS_PER_SECOND, 10);
      track.style.setProperty('--marquee-duration', `${duration}s`);
      track.style.animation = '';
    });
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

  document.addEventListener('DOMContentLoaded', loadFeed);
  window.addEventListener('languageChanged', renderFeed);
})();

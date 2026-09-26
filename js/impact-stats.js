/**
 * Impact stats (js/impact-stats.js)
 *
 * The "Prayers for Him" counter (#impact-prayers) is wired to the real
 * count from /api/prayers - the same storage the pray page writes to.
 *
 * The other three stat cards ("Shares & Community Visits", "Water & Basic
 * Needs", "Ongoing charity") have no feature behind them anywhere in this
 * codebase (no share button exists, and the other two are project-level
 * figures nobody's code can compute - they'd need to come from the
 * family's own project reports). They're intentionally left showing
 * "Not available" rather than a fabricated number. If a real source for
 * any of them shows up later (e.g. a share button gets built), wire it in
 * here the same way.
 */
(function () {
  'use strict';

  function isArabicNow() {
    return (window.i18n ? window.i18n.getLang() : (localStorage.getItem('preferred_lang') || 'ar')) === 'ar';
  }

  function formatCount(n, isArabic) {
    try {
      return new Intl.NumberFormat(isArabic ? 'ar-SA' : 'en-US').format(n);
    } catch (err) {
      return String(n);
    }
  }

  async function loadPrayerCount() {
    const el = document.getElementById('impact-prayers');
    if (!el) return;

    try {
      const res = await fetch('/api/prayers');
      if (!res.ok) throw new Error(`Prayers count request failed: ${res.status}`);
      const data = await res.json();
      const count = typeof data.count === 'number' ? data.count : 0;
      el.textContent = formatCount(count, isArabicNow());
      el.dataset.loaded = 'true';
    } catch (err) {
      console.warn('Could not load the prayer count; leaving the placeholder as-is.', err);
      // Leave the existing "Not available" text in place - no fake number.
    }
  }

  document.addEventListener('DOMContentLoaded', loadPrayerCount);
  window.addEventListener('languageChanged', () => {
    const el = document.getElementById('impact-prayers');
    if (el && el.dataset.loaded === 'true') {
      loadPrayerCount();
    }
  });
})();

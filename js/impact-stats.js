/**
 * Impact stats (js/impact-stats.js)
 *
 * Both stats shown here are wired to real data from /api/prayers - the
 * same storage the pray page writes to:
 *   - "Prayers for Him" (#impact-prayers): total entries (every click of
 *     the pray button, whether or not a message was written).
 *   - "Written Prayers Shared" (#impact-testimonies): messageCount, i.e.
 *     how many of those also included a written testimony. This is a
 *     genuinely different number from the first one, not a duplicate.
 *
 * The other stats this section used to show ("Shares & Community
 * Visits", "Water & Basic Needs", "Ongoing charity projects") were
 * removed rather than left as fabricated placeholders: no share button
 * exists anywhere in this codebase, and the other two are project-level
 * figures nobody's code can compute - they'd need to come from the
 * family's own project reports. If a real source for any of them shows up
 * later, add a stat here the same way rather than guessing a number.
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

  async function loadImpactStats() {
    const prayersEl = document.getElementById('impact-prayers');
    const testimoniesEl = document.getElementById('impact-testimonies');
    if (!prayersEl && !testimoniesEl) return;

    try {
      const res = await fetch('/api/prayers');
      if (!res.ok) throw new Error(`Prayers count request failed: ${res.status}`);
      const data = await res.json();
      const isArabic = isArabicNow();

      if (prayersEl) {
        const count = typeof data.count === 'number' ? data.count : 0;
        prayersEl.textContent = formatCount(count, isArabic);
        prayersEl.dataset.loaded = 'true';
      }
      if (testimoniesEl) {
        const messageCount = typeof data.messageCount === 'number' ? data.messageCount : 0;
        testimoniesEl.textContent = formatCount(messageCount, isArabic);
        testimoniesEl.dataset.loaded = 'true';
      }
    } catch (err) {
      console.warn('Could not load impact stats; leaving the placeholders as-is.', err);
      // Leave the existing "Not available" text in place - no fake numbers.
    }
  }

  document.addEventListener('DOMContentLoaded', loadImpactStats);
  window.addEventListener('languageChanged', () => {
    const el = document.getElementById('impact-prayers');
    if (el && el.dataset.loaded === 'true') {
      loadImpactStats();
    }
  });
})();

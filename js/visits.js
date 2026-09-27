/**
 * Dynamic visiting dates (js/visits.js)
 *
 * Fetches /api/visits (public GET, no auth needed) and renders the
 * upcoming ones as cards in the "Suggested Visiting Times" section,
 * replacing what used to be 3 hand-edited cards in index.html. Dates are
 * stored as a plain "YYYY-MM-DD" string and formatted here per the current
 * language, so nobody has to keep two hand-written date strings in sync.
 *
 * Adding/removing dates happens on admin-visits.html, not here.
 */
(function () {
  'use strict';

  let cachedVisits = null;

  function isArabicNow() {
    return (window.i18n ? window.i18n.getLang() : (localStorage.getItem('preferred_lang') || 'ar')) === 'ar';
  }

  function formatDateBadge(dateStr, isArabic) {
    // Parse as a plain calendar date (no time/timezone drift).
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));

    if (isArabic) {
      const day = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { day: '2-digit', timeZone: 'UTC' }).format(date);
      const monthYear = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
      return { day, monthYear };
    }
    const day = new Intl.DateTimeFormat('en-US', { day: '2-digit', timeZone: 'UTC' }).format(date);
    const monthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date).toUpperCase();
    return { day, monthYear };
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function todayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function buildCardHtml(visit, isArabic) {
    const { day, monthYear } = formatDateBadge(visit.date, isArabic);
    const title = isArabic ? (visit.titleAr || visit.titleEn) : (visit.titleEn || visit.titleAr);
    const desc = isArabic ? (visit.descAr || visit.descEn) : (visit.descEn || visit.descAr);
    return `<div class="visitation-card">
      <div class="visitation-date-badge">
        <div class="date-day">${escapeHtml(day)}</div>
        <div class="date-month">${escapeHtml(monthYear)}</div>
      </div>
      <div class="visitation-info">
        <h4>${escapeHtml(title || '')}</h4>
        ${desc ? `<p style="font-size: 0.92rem;">${escapeHtml(desc)}</p>` : ''}
      </div>
    </div>`;
  }

  function renderVisits() {
    const container = document.getElementById('visitation-cards');
    if (!container) return;
    const isArabic = isArabicNow();

    if (!cachedVisits) {
      container.innerHTML = `<p class="visitation-loading">${isArabic ? 'جارِ تحميل المواعيد...' : 'Loading visiting times...'}</p>`;
      return;
    }

    const today = todayStr();
    const upcoming = cachedVisits.filter((v) => v.date >= today);

    if (upcoming.length === 0) {
      container.innerHTML = `<p class="visitation-empty">${
        isArabic
          ? 'لا توجد مواعيد زيارة مجدولة حالياً. سيتم تحديث المواعيد والتنسيق مع المقبرة باستمرار.'
          : 'No visiting times are scheduled right now. Visiting times and cemetery updates will be shared here regularly.'
      }</p>`;
      return;
    }

    container.innerHTML = upcoming.map((v) => buildCardHtml(v, isArabic)).join('');
  }

  async function loadVisits() {
    try {
      const res = await fetch('/api/visits');
      if (!res.ok) throw new Error(`Visits request failed: ${res.status}`);
      const data = await res.json();
      cachedVisits = Array.isArray(data.visits) ? data.visits : [];
    } catch (err) {
      console.warn('Could not load visiting dates.', err);
      cachedVisits = [];
    }
    renderVisits();
  }

  document.addEventListener('DOMContentLoaded', loadVisits);
  window.addEventListener('languageChanged', renderVisits);
})();

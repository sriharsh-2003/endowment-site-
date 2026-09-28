/**
 * Admin: manage visiting dates, testimonies, and donation requests
 * (js/admin-visits.js)
 *
 * A simple, unlisted admin page (not linked from the site nav) for the
 * family to add/remove entries in /api/visits, edit/remove written prayers
 * (testimonies) in /api/prayers, and view/edit/remove donation requests in
 * /api/donations, without touching code. Donation data appears ONLY here,
 * never on the public site. The ADMIN_TOKEN is asked for once and kept in
 * sessionStorage only (cleared when the browser tab closes) - it is sent as
 * an X-Admin-Token header on every request, which the API checks against
 * the real ADMIN_TOKEN env var. This page does no authorization on its own;
 * a wrong or missing token just makes the API calls fail with 401, which is
 * enforced server-side.
 *
 * Bilingual (Arabic / English): static text is translated by js/i18n.js via
 * data-i18n-* attributes; everything this script generates (statuses, list
 * rows, alerts) goes through t() below and is re-rendered when the language
 * toggles.
 */
(function () {
  'use strict';

  const TOKEN_KEY = 'admin_token_session';

  // ---------------------------------------------------------------------
  // Translations
  // ---------------------------------------------------------------------
  const STRINGS = {
    gateEnterToken: { ar: 'يرجى إدخال رمز الإدارة.', en: 'Please enter the admin token.' },
    gateVerifying: { ar: 'جارِ التحقق...', en: 'Verifying...' },
    gateWrongToken: { ar: 'رمز الإدارة غير صحيح.', en: 'The admin token is incorrect.' },

    addPickDate: { ar: 'يرجى اختيار تاريخ.', en: 'Please choose a date.' },
    addNeedTitle: { ar: 'يرجى إدخال عنوان بلغة واحدة على الأقل.', en: 'Please enter a title in at least one language.' },
    addAdding: { ar: 'جارِ الإضافة...', en: 'Adding...' },
    addSuccess: { ar: 'تمت الإضافة بنجاح.', en: 'Added successfully.' },
    addErrorWith: { ar: 'خطأ: {error}', en: 'Error: {error}' },
    addFailedToken: { ar: 'تعذّرت الإضافة. تحقق من رمز الإدارة.', en: 'Could not add. Check the admin token.' },

    visitsEmpty: { ar: 'لا توجد مواعيد مضافة بعد.', en: 'No visiting dates added yet.' },
    visitsLoadFail: { ar: 'تعذّر تحميل المواعيد.', en: 'Could not load visiting dates.' },
    testimoniesEmpty: { ar: 'لا توجد دعوات مكتوبة بعد.', en: 'No written prayers yet.' },
    testimoniesLoadFail: { ar: 'تعذّر تحميل الدعوات.', en: 'Could not load prayers.' },
    donationsEmpty: { ar: 'لا توجد طلبات تبرع بعد.', en: 'No donation requests yet.' },
    donationsLoadFail: { ar: 'تعذّر تحميل طلبات التبرع.', en: 'Could not load donation requests.' },
    donationsTotal: {
      ar: 'إجمالي المبالغ المسجلة (نوايا فقط): {total} ريال · عدد الطلبات: {count}',
      en: 'Total amount recorded (intent only): SAR {total} · Requests: {count}',
    },

    btnDelete: { ar: 'حذف', en: 'Delete' },
    btnEdit: { ar: 'تعديل', en: 'Edit' },
    btnSave: { ar: 'حفظ', en: 'Save' },
    btnCancel: { ar: 'إلغاء', en: 'Cancel' },

    noName: { ar: 'بدون اسم', en: 'No name' },
    noEmail: { ar: 'بدون بريد', en: 'No email' },
    noVerse: { ar: 'بدون آية محددة', en: 'No verse selected' },
    editedF: { ar: '(مُعدَّلة)', en: '(edited)' },
    editedM: { ar: '(مُعدَّل)', en: '(edited)' },

    phAmount: { ar: 'المبلغ', en: 'Amount' },
    phName: { ar: 'الاسم (اختياري)', en: 'Name (optional)' },
    phEmail: { ar: 'البريد الإلكتروني (اختياري)', en: 'Email (optional)' },

    alertEmptyMessage: {
      ar: 'لا يمكن حفظ دعوة برسالة فارغة. احذفها بدلاً من ذلك إذا أردت إزالتها.',
      en: 'A prayer cannot be saved with an empty message. Delete it instead if you want to remove it.',
    },
    alertBadAmount: { ar: 'يرجى إدخال مبلغ صحيح أكبر من صفر.', en: 'Please enter a valid amount greater than zero.' },
    alertSaveFailed: { ar: 'تعذّر الحفظ: {error}', en: 'Could not save: {error}' },
    alertDeleteFailed: { ar: 'تعذّر الحذف: {error}', en: 'Could not delete: {error}' },
    unknownError: { ar: 'خطأ غير معروف', en: 'Unknown error' },

    confirmDeleteTestimony: {
      ar: 'هل تريد حذف هذه الدعوة؟ لا يمكن التراجع عن هذا الإجراء.',
      en: 'Delete this prayer? This cannot be undone.',
    },
    confirmDeleteDonation: {
      ar: 'هل تريد حذف طلب التبرع هذا؟ لا يمكن التراجع عن هذا الإجراء.',
      en: 'Delete this donation request? This cannot be undone.',
    },
    confirmDeleteVisit: { ar: 'هل تريد حذف هذا الموعد؟', en: 'Delete this visiting date?' },
  };

  function lang() {
    try {
      return window.i18n ? window.i18n.getLang() : (localStorage.getItem('preferred_lang') || 'ar');
    } catch (err) {
      return 'ar';
    }
  }

  function t(key, vars) {
    const entry = STRINGS[key];
    let text = entry ? entry[lang()] : key;
    if (vars) {
      Object.keys(vars).forEach((name) => {
        text = text.replace(`{${name}}`, vars[name]);
      });
    }
    return text;
  }

  // Mirrors js/pray.js's QURAN_VERSES keys/labels (kept small and
  // duplicated here deliberately - this admin tool doesn't load the full
  // pray.js, and this list changes rarely).
  const VERSE_OPTIONS = [
    { key: '2:201', ar: 'سورة البقرة: ٢٠١', en: 'Surah Al-Baqarah: 201' },
    { key: '3:8', ar: 'سورة آل عمران: ٨', en: 'Surah Ali ‘Imran: 8' },
    { key: '3:16', ar: 'سورة آل عمران: ١٦', en: 'Surah Ali ‘Imran: 16' },
    { key: '3:194', ar: 'سورة آل عمران: ١٩٤', en: 'Surah Ali ‘Imran: 194' },
    { key: '7:56', ar: 'سورة الأعراف: ٥٦', en: 'Surah Al-A’raf: 56' },
    { key: '14:40', ar: 'سورة إبراهيم: ٤٠', en: 'Surah Ibrahim: 40' },
    { key: '14:41', ar: 'سورة إبراهيم: ٤١', en: 'Surah Ibrahim: 41' },
    { key: '17:24', ar: 'سورة الإسراء: ٢٤', en: 'Surah Al-Isra: 24' },
    { key: '23:118', ar: 'سورة المؤمنون: ١١٨', en: 'Surah Al-Mu’minun: 118' },
    { key: '46:15', ar: 'سورة الأحقاف: ١٥', en: 'Surah Al-Ahqaf: 15' },
    { key: '59:10', ar: 'سورة الحشر: ١٠', en: 'Surah Al-Hashr: 10' },
    { key: '71:28', ar: 'سورة نوح: ٢٨', en: 'Surah Nuh: 28' },
  ];

  function verseLabel(key) {
    const match = VERSE_OPTIONS.find((v) => v.key === key);
    return match ? match[lang()] : (key || t('noVerse'));
  }

  function verseSelectHtml(selectedKey) {
    const l = lang();
    return `<select class="testimony-verse-select">
      ${VERSE_OPTIONS.map((v) => `<option value="${v.key}"${v.key === selectedKey ? ' selected' : ''}>${v[l]}</option>`).join('')}
    </select>`;
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function formatDateTime(iso) {
    const locale = lang() === 'ar' ? 'ar-SA-u-ca-gregory-nu-arab' : 'en-US';
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
    } catch {
      return iso || '';
    }
  }

  function formatAmount(n) {
    const locale = lang() === 'ar' ? 'ar-SA-u-nu-arab' : 'en-US';
    try {
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(n);
    } catch {
      return String(n);
    }
  }

  function currencyLabel(code) {
    const c = code || 'SAR';
    return c === 'SAR' && lang() === 'ar' ? 'ريال' : c;
  }

  // Arabic and English versions of a bilingual field, primary language first.
  function bilingualPair(ar, en) {
    const ordered = lang() === 'ar' ? [ar, en] : [en, ar];
    return ordered.filter(Boolean).map(escapeHtml).join(' / ');
  }

  async function apiRequest(method, path, body) {
    const res = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': getToken(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  // Status lines remember their message key so they can be re-translated
  // when the language changes.
  const statuses = {};
  const STATUS_COLORS = { error: '#c0392b', success: '#10b981', neutral: 'var(--text-secondary)' };

  function setStatus(elId, key, tone, vars) {
    statuses[elId] = { key, tone, vars };
    renderStatus(elId);
  }

  function renderStatus(elId) {
    const el = document.getElementById(elId);
    const s = statuses[elId];
    if (!el || !s) return;
    el.textContent = t(s.key, s.vars);
    el.style.color = STATUS_COLORS[s.tone] || STATUS_COLORS.neutral;
  }

  // ---------------------------------------------------------------------
  // State (kept so lists can re-render on language change without refetching)
  // ---------------------------------------------------------------------
  const state = {
    visits: { status: 'idle', data: [] },
    testimonies: { status: 'idle', data: [] },
    donations: { status: 'idle', data: [], total: 0 },
  };

  function hasOpenEditor(containerId) {
    const container = document.getElementById(containerId);
    return Boolean(container && container.querySelector('.admin-save-btn'));
  }

  function renderMessage(containerId, key, isError) {
    document.getElementById(containerId).innerHTML =
      `<p style="color: ${isError ? '#c0392b' : 'var(--text-muted)'};">${escapeHtml(t(key))}</p>`;
  }

  // ---------------------------------------------------------------------
  // Visiting dates
  // ---------------------------------------------------------------------
  function renderVisitsList() {
    const s = state.visits;
    if (s.status === 'idle') return;
    if (s.status === 'error') return renderMessage('visits-list', 'visitsLoadFail', true);
    const container = document.getElementById('visits-list');
    if (!s.data.length) return renderMessage('visits-list', 'visitsEmpty', false);

    container.innerHTML = s.data.map((v) => `
      <div class="admin-list-item" data-id="${escapeHtml(v.id)}">
        <div>
          <div class="admin-list-item-date">${escapeHtml(v.date)}</div>
          <div class="admin-list-item-title">${bilingualPair(v.titleAr, v.titleEn)}</div>
          ${v.descAr || v.descEn ? `<div class="admin-list-item-desc">${bilingualPair(v.descAr, v.descEn)}</div>` : ''}
        </div>
        <button class="admin-delete-btn" data-id="${escapeHtml(v.id)}" type="button">${escapeHtml(t('btnDelete'))}</button>
      </div>
    `).join('');

    container.querySelectorAll('.admin-delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => deleteVisit(btn.dataset.id));
    });
  }

  async function loadVisitsList() {
    const { ok, data } = await apiRequest('GET', '/api/visits');
    if (ok && Array.isArray(data.visits)) {
      state.visits = { status: 'ok', data: data.visits };
    } else {
      state.visits = { status: 'error', data: [] };
    }
    renderVisitsList();
  }

  async function deleteVisit(id) {
    if (!confirm(t('confirmDeleteVisit'))) return;
    const { ok, data } = await apiRequest('DELETE', `/api/visits?id=${encodeURIComponent(id)}`);
    if (ok) {
      loadVisitsList();
    } else {
      alert(t('alertDeleteFailed', { error: data.error || t('unknownError') }));
    }
  }

  async function addVisit() {
    const date = document.getElementById('new-date').value;
    const titleAr = document.getElementById('new-title-ar').value.trim();
    const titleEn = document.getElementById('new-title-en').value.trim();
    const descAr = document.getElementById('new-desc-ar').value.trim();
    const descEn = document.getElementById('new-desc-en').value.trim();

    if (!date) return setStatus('add-status', 'addPickDate', 'error');
    if (!titleAr && !titleEn) return setStatus('add-status', 'addNeedTitle', 'error');

    setStatus('add-status', 'addAdding', 'neutral');
    const { ok, data } = await apiRequest('POST', '/api/visits', { date, titleAr, titleEn, descAr, descEn });

    if (ok) {
      setStatus('add-status', 'addSuccess', 'success');
      ['new-date', 'new-title-ar', 'new-title-en', 'new-desc-ar', 'new-desc-en'].forEach((id) => {
        document.getElementById(id).value = '';
      });
      loadVisitsList();
    } else if (data.error) {
      setStatus('add-status', 'addErrorWith', 'error', { error: data.error });
    } else {
      setStatus('add-status', 'addFailedToken', 'error');
    }
  }

  // ---------------------------------------------------------------------
  // Testimonies (written prayers)
  // ---------------------------------------------------------------------
  function renderTestimoniesList() {
    const s = state.testimonies;
    if (s.status === 'idle') return;
    if (s.status === 'error') return renderMessage('testimonies-list', 'testimoniesLoadFail', true);
    const container = document.getElementById('testimonies-list');
    if (!s.data.length) return renderMessage('testimonies-list', 'testimoniesEmpty', false);

    container.innerHTML = s.data.map((item) => `
      <div class="admin-list-item" data-id="${escapeHtml(item.id)}" style="flex-direction: column; align-items: stretch;">
        <div class="testimony-view" data-id="${escapeHtml(item.id)}">
          <div class="testimony-item-meta">
            ${escapeHtml(formatDateTime(item.createdAt))} &middot;
            ${item.name ? escapeHtml(item.name) : escapeHtml(t('noName'))} &middot;
            ${escapeHtml(verseLabel(item.verse))}
            ${item.editedAt ? ` &middot; ${escapeHtml(t('editedF'))}` : ''}
          </div>
          <div class="testimony-item-message">${escapeHtml(item.message)}</div>
          <div class="testimony-actions">
            <button class="admin-edit-btn" data-id="${escapeHtml(item.id)}" type="button">${escapeHtml(t('btnEdit'))}</button>
            <button class="admin-delete-btn" data-id="${escapeHtml(item.id)}" data-kind="testimony" type="button">${escapeHtml(t('btnDelete'))}</button>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.admin-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => enterEditMode(btn.dataset.id));
    });
    container.querySelectorAll('.admin-delete-btn[data-kind="testimony"]').forEach((btn) => {
      btn.addEventListener('click', () => deleteTestimony(btn.dataset.id));
    });
  }

  function enterEditMode(id) {
    const entry = state.testimonies.data.find((item) => item.id === id);
    if (!entry) return;
    const viewEl = document.querySelector(`.testimony-view[data-id="${CSS.escape(id)}"]`);
    if (!viewEl) return;

    viewEl.innerHTML = `
      <div class="testimony-edit-fields">
        ${verseSelectHtml(entry.verse)}
        <textarea>${escapeHtml(entry.message)}</textarea>
      </div>
      <div class="testimony-actions">
        <button class="admin-save-btn" type="button">${escapeHtml(t('btnSave'))}</button>
        <button class="admin-cancel-btn" type="button">${escapeHtml(t('btnCancel'))}</button>
      </div>
    `;

    viewEl.querySelector('.admin-save-btn').addEventListener('click', () => saveTestimony(id));
    viewEl.querySelector('.admin-cancel-btn').addEventListener('click', () => renderTestimoniesList());
  }

  async function saveTestimony(id) {
    const viewEl = document.querySelector(`.testimony-view[data-id="${CSS.escape(id)}"]`);
    if (!viewEl) return;
    const message = viewEl.querySelector('textarea').value.trim();
    const verse = viewEl.querySelector('.testimony-verse-select').value;

    if (!message) {
      alert(t('alertEmptyMessage'));
      return;
    }

    const { ok, data } = await apiRequest('PATCH', `/api/prayers?id=${encodeURIComponent(id)}`, { message, verse });
    if (ok) {
      loadTestimoniesList();
    } else {
      alert(t('alertSaveFailed', { error: data.error || t('unknownError') }));
    }
  }

  async function deleteTestimony(id) {
    if (!confirm(t('confirmDeleteTestimony'))) return;
    const { ok, data } = await apiRequest('DELETE', `/api/prayers?id=${encodeURIComponent(id)}`);
    if (ok) {
      loadTestimoniesList();
    } else {
      alert(t('alertDeleteFailed', { error: data.error || t('unknownError') }));
    }
  }

  async function loadTestimoniesList() {
    const { ok, data } = await apiRequest('GET', '/api/prayers');
    if (ok && Array.isArray(data.prayers)) {
      const testimonies = data.prayers
        .filter((p) => typeof p.message === 'string' && p.message.length > 0)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      state.testimonies = { status: 'ok', data: testimonies };
    } else {
      state.testimonies = { status: 'error', data: [] };
    }
    renderTestimoniesList();
  }

  // ---------------------------------------------------------------------
  // Donation requests (admin-only view; never shown on the public site)
  // ---------------------------------------------------------------------
  function renderDonationsList() {
    const s = state.donations;
    if (s.status === 'idle') return;
    const totalEl = document.getElementById('donations-total');
    if (s.status === 'error') {
      if (totalEl) totalEl.textContent = '';
      return renderMessage('donations-list', 'donationsLoadFail', true);
    }
    const container = document.getElementById('donations-list');
    if (totalEl) {
      totalEl.textContent = s.data.length
        ? t('donationsTotal', { total: formatAmount(s.total), count: formatAmount(s.data.length) })
        : '';
    }
    if (!s.data.length) return renderMessage('donations-list', 'donationsEmpty', false);

    container.innerHTML = s.data.map((d) => `
      <div class="admin-list-item" data-id="${escapeHtml(d.id)}" style="flex-direction: column; align-items: stretch;">
        <div class="donation-view" data-id="${escapeHtml(d.id)}">
          <div class="testimony-item-meta">
            ${escapeHtml(formatDateTime(d.createdAt))}
            ${d.editedAt ? ` &middot; ${escapeHtml(t('editedM'))}` : ''}
          </div>
          <div class="testimony-item-message">
            <strong>${escapeHtml(formatAmount(d.amount))} ${escapeHtml(currencyLabel(d.currency))}</strong>
            &middot; ${d.name ? escapeHtml(d.name) : escapeHtml(t('noName'))}
            &middot; ${d.email ? escapeHtml(d.email) : escapeHtml(t('noEmail'))}
          </div>
          <div class="testimony-actions">
            <button class="admin-edit-btn" data-id="${escapeHtml(d.id)}" type="button">${escapeHtml(t('btnEdit'))}</button>
            <button class="admin-delete-btn" data-id="${escapeHtml(d.id)}" data-kind="donation" type="button">${escapeHtml(t('btnDelete'))}</button>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.admin-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => enterDonationEditMode(btn.dataset.id));
    });
    container.querySelectorAll('.admin-delete-btn[data-kind="donation"]').forEach((btn) => {
      btn.addEventListener('click', () => deleteDonation(btn.dataset.id));
    });
  }

  function enterDonationEditMode(id) {
    const entry = state.donations.data.find((d) => d.id === id);
    if (!entry) return;
    const viewEl = document.querySelector(`.donation-view[data-id="${CSS.escape(id)}"]`);
    if (!viewEl) return;

    viewEl.innerHTML = `
      <div class="testimony-edit-fields">
        <input class="donation-edit-amount" min="1" placeholder="${escapeHtml(t('phAmount'))}" step="any" type="number" value="${escapeHtml(String(entry.amount))}"/>
        <input class="donation-edit-name" placeholder="${escapeHtml(t('phName'))}" type="text" value="${escapeHtml(entry.name || '')}"/>
        <input class="donation-edit-email" placeholder="${escapeHtml(t('phEmail'))}" type="email" value="${escapeHtml(entry.email || '')}"/>
      </div>
      <div class="testimony-actions">
        <button class="admin-save-btn" type="button">${escapeHtml(t('btnSave'))}</button>
        <button class="admin-cancel-btn" type="button">${escapeHtml(t('btnCancel'))}</button>
      </div>
    `;

    viewEl.querySelector('.admin-save-btn').addEventListener('click', () => saveDonation(id));
    viewEl.querySelector('.admin-cancel-btn').addEventListener('click', () => renderDonationsList());
  }

  async function saveDonation(id) {
    const viewEl = document.querySelector(`.donation-view[data-id="${CSS.escape(id)}"]`);
    if (!viewEl) return;
    const amount = parseFloat(viewEl.querySelector('.donation-edit-amount').value);
    const name = viewEl.querySelector('.donation-edit-name').value.trim();
    const email = viewEl.querySelector('.donation-edit-email').value.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      alert(t('alertBadAmount'));
      return;
    }

    const { ok, data } = await apiRequest('PATCH', `/api/donations?id=${encodeURIComponent(id)}`, { amount, name, email });
    if (ok) {
      loadDonationsList();
    } else {
      alert(t('alertSaveFailed', { error: data.error || t('unknownError') }));
    }
  }

  async function deleteDonation(id) {
    if (!confirm(t('confirmDeleteDonation'))) return;
    const { ok, data } = await apiRequest('DELETE', `/api/donations?id=${encodeURIComponent(id)}`);
    if (ok) {
      loadDonationsList();
    } else {
      alert(t('alertDeleteFailed', { error: data.error || t('unknownError') }));
    }
  }

  async function loadDonationsList() {
    const { ok, data } = await apiRequest('GET', '/api/donations');
    if (ok && Array.isArray(data.donations)) {
      const donations = data.donations.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const total = typeof data.total === 'number' ? data.total : donations.reduce((sum, d) => sum + (d.amount || 0), 0);
      state.donations = { status: 'ok', data: donations, total };
    } else {
      state.donations = { status: 'error', data: [], total: 0 };
    }
    renderDonationsList();
  }

  // ---------------------------------------------------------------------
  // Unlock / init
  // ---------------------------------------------------------------------
  async function unlock() {
    const token = document.getElementById('admin-token-input').value.trim();
    if (!token) return setStatus('gate-status', 'gateEnterToken', 'error');
    sessionStorage.setItem(TOKEN_KEY, token);

    setStatus('gate-status', 'gateVerifying', 'neutral');
    // GET needs no token for visits, so verify with a harmless probe: delete
    // a bogus id. 401 means the token itself is wrong; 404 means the token
    // was accepted (the request was authorized, the fake id just doesn't exist).
    const probe = await apiRequest('DELETE', '/api/visits?id=__token_check__');
    if (probe.status === 401) {
      setStatus('gate-status', 'gateWrongToken', 'error');
      sessionStorage.removeItem(TOKEN_KEY);
      return;
    }

    document.getElementById('token-gate').classList.add('admin-hidden');
    document.getElementById('admin-main').classList.remove('admin-hidden');
    loadVisitsList();
    loadTestimoniesList();
    loadDonationsList();
  }

  // Re-render anything this script generated when the language toggles.
  // A list with an open edit form is left alone so typed text isn't lost;
  // it re-renders in the current language as soon as the edit is saved or
  // cancelled.
  window.addEventListener('languageChanged', () => {
    Object.keys(statuses).forEach(renderStatus);
    if (!hasOpenEditor('visits-list')) renderVisitsList();
    if (!hasOpenEditor('testimonies-list')) renderTestimoniesList();
    if (!hasOpenEditor('donations-list')) renderDonationsList();
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('unlock-btn').addEventListener('click', unlock);
    document.getElementById('admin-token-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') unlock();
    });
    document.getElementById('add-visit-btn').addEventListener('click', addVisit);

    // If a token is already stashed in this tab's session, skip the gate.
    if (getToken()) {
      unlock();
    }
  });
})();

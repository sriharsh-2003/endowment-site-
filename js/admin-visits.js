/**
 * Admin: manage visiting dates, testimonies, and donation requests
 * (js/admin-visits.js)
 *
 * A simple, unlisted admin page (not linked from the site nav) for the
 * family to add/remove entries in /api/visits, edit/remove written prayers
 * (testimonies) in /api/prayers, and view/edit/remove donation requests in
 * /api/donations, without touching code. Donation data appears ONLY here,
 * never on the public site. The
 * ADMIN_TOKEN is asked for once and kept in sessionStorage only (cleared
 * when the browser tab closes) - it is sent as an X-Admin-Token header on
 * every write, which the API checks against the real ADMIN_TOKEN env var.
 * This page itself does no authorization on its own; a wrong or missing
 * token just makes every API call fail with 401, which is enforced
 * server-side, not by this page pretending to gate anything.
 */
(function () {
  'use strict';

  const TOKEN_KEY = 'admin_token_session';

  // Mirrors js/pray.js's QURAN_VERSES keys/labels (kept small and
  // duplicated here deliberately - this admin tool doesn't load the full
  // pray.js, and this list changes rarely).
  const VERSE_OPTIONS = [
    { key: '2:201', label: 'سورة البقرة: ٢٠١' },
    { key: '3:8', label: 'سورة آل عمران: ٨' },
    { key: '3:16', label: 'سورة آل عمران: ١٦' },
    { key: '3:194', label: 'سورة آل عمران: ١٩٤' },
    { key: '7:56', label: 'سورة الأعراف: ٥٦' },
    { key: '14:40', label: 'سورة إبراهيم: ٤٠' },
    { key: '14:41', label: 'سورة إبراهيم: ٤١' },
    { key: '17:24', label: 'سورة الإسراء: ٢٤' },
    { key: '23:118', label: 'سورة المؤمنون: ١١٨' },
    { key: '46:15', label: 'سورة الأحقاف: ١٥' },
    { key: '59:10', label: 'سورة الحشر: ١٠' },
    { key: '71:28', label: 'سورة نوح: ٢٨' },
  ];

  function verseLabel(key) {
    const match = VERSE_OPTIONS.find((v) => v.key === key);
    return match ? match.label : (key || 'بدون آية محددة');
  }

  function verseSelectHtml(selectedKey) {
    return `<select class="testimony-verse-select">
      ${VERSE_OPTIONS.map((v) => `<option value="${v.key}"${v.key === selectedKey ? ' selected' : ''}>${v.label}</option>`).join('')}
    </select>`;
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
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

  function showGateStatus(message, isError) {
    const el = document.getElementById('gate-status');
    el.textContent = message;
    el.style.color = isError ? '#c0392b' : 'var(--text-secondary)';
  }

  function showAddStatus(message, isError) {
    const el = document.getElementById('add-status');
    el.textContent = message;
    el.style.color = isError ? '#c0392b' : '#10b981';
  }

  function renderVisitsList(visits) {
    const container = document.getElementById('visits-list');
    if (!visits.length) {
      container.innerHTML = '<p style="color: var(--text-muted);">لا توجد مواعيد مضافة بعد.</p>';
      return;
    }
    container.innerHTML = visits.map((v) => `
      <div class="admin-list-item" data-id="${escapeHtml(v.id)}">
        <div>
          <div class="admin-list-item-date">${escapeHtml(v.date)}</div>
          <div class="admin-list-item-title">${escapeHtml(v.titleAr)} ${v.titleEn ? '/ ' + escapeHtml(v.titleEn) : ''}</div>
          ${v.descAr || v.descEn ? `<div class="admin-list-item-desc">${escapeHtml(v.descAr)} ${v.descEn ? '/ ' + escapeHtml(v.descEn) : ''}</div>` : ''}
        </div>
        <button class="admin-delete-btn" data-id="${escapeHtml(v.id)}" type="button">حذف</button>
      </div>
    `).join('');

    container.querySelectorAll('.admin-delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => deleteVisit(btn.dataset.id));
    });
  }

  async function loadVisitsList() {
    const { ok, data } = await apiRequest('GET', '/api/visits');
    if (ok && Array.isArray(data.visits)) {
      renderVisitsList(data.visits);
    } else {
      document.getElementById('visits-list').innerHTML = '<p style="color: #c0392b;">تعذّر تحميل المواعيد.</p>';
    }
  }

  function formatDateTime(iso) {
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
    } catch {
      return iso || '';
    }
  }

  function renderTestimoniesList(testimonies) {
    const container = document.getElementById('testimonies-list');
    if (!testimonies.length) {
      container.innerHTML = '<p style="color: var(--text-muted);">لا توجد دعوات مكتوبة بعد.</p>';
      return;
    }
    container.innerHTML = testimonies.map((t) => `
      <div class="admin-list-item" data-id="${escapeHtml(t.id)}" style="flex-direction: column; align-items: stretch;">
        <div class="testimony-view" data-id="${escapeHtml(t.id)}">
          <div class="testimony-item-meta">
            ${escapeHtml(formatDateTime(t.createdAt))} &middot;
            ${t.name ? escapeHtml(t.name) : 'بدون اسم'} &middot;
            ${escapeHtml(verseLabel(t.verse))}
            ${t.editedAt ? ' &middot; (مُعدَّلة)' : ''}
          </div>
          <div class="testimony-item-message">${escapeHtml(t.message)}</div>
          <div class="testimony-actions">
            <button class="admin-edit-btn" data-id="${escapeHtml(t.id)}" type="button">تعديل</button>
            <button class="admin-delete-btn" data-id="${escapeHtml(t.id)}" data-kind="testimony" type="button">حذف</button>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.admin-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => enterEditMode(btn.dataset.id, testimonies));
    });
    container.querySelectorAll('.admin-delete-btn[data-kind="testimony"]').forEach((btn) => {
      btn.addEventListener('click', () => deleteTestimony(btn.dataset.id));
    });
  }

  function enterEditMode(id, testimonies) {
    const entry = testimonies.find((t) => t.id === id);
    if (!entry) return;
    const viewEl = document.querySelector(`.testimony-view[data-id="${CSS.escape(id)}"]`);
    if (!viewEl) return;

    viewEl.innerHTML = `
      <div class="testimony-edit-fields">
        ${verseSelectHtml(entry.verse)}
        <textarea>${escapeHtml(entry.message)}</textarea>
      </div>
      <div class="testimony-actions">
        <button class="admin-save-btn" type="button">حفظ</button>
        <button class="admin-cancel-btn" type="button">إلغاء</button>
      </div>
    `;

    viewEl.querySelector('.admin-save-btn').addEventListener('click', () => saveTestimony(id));
    viewEl.querySelector('.admin-cancel-btn').addEventListener('click', () => loadTestimoniesList());
  }

  async function saveTestimony(id) {
    const viewEl = document.querySelector(`.testimony-view[data-id="${CSS.escape(id)}"]`);
    if (!viewEl) return;
    const message = viewEl.querySelector('textarea').value.trim();
    const verse = viewEl.querySelector('.testimony-verse-select').value;

    if (!message) {
      alert('لا يمكن حفظ دعوة برسالة فارغة. احذفها بدلاً من ذلك إذا أردت إزالتها.');
      return;
    }

    const { ok, data } = await apiRequest('PATCH', `/api/prayers?id=${encodeURIComponent(id)}`, { message, verse });
    if (ok) {
      loadTestimoniesList();
    } else {
      alert('تعذّر الحفظ: ' + (data.error || 'خطأ غير معروف'));
    }
  }

  async function deleteTestimony(id) {
    if (!confirm('هل تريد حذف هذه الدعوة؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    const { ok, data } = await apiRequest('DELETE', `/api/prayers?id=${encodeURIComponent(id)}`);
    if (ok) {
      loadTestimoniesList();
    } else {
      alert('تعذّر الحذف: ' + (data.error || 'خطأ غير معروف'));
    }
  }

  async function loadTestimoniesList() {
    const { ok, data } = await apiRequest('GET', '/api/prayers');
    if (ok && Array.isArray(data.prayers)) {
      const testimonies = data.prayers
        .filter((p) => typeof p.message === 'string' && p.message.length > 0)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      renderTestimoniesList(testimonies);
    } else {
      document.getElementById('testimonies-list').innerHTML = '<p style="color: #c0392b;">تعذّر تحميل الدعوات.</p>';
    }
  }

  // ---- Donation requests (admin-only view; never shown on the public site) ----

  function formatAmount(n) {
    try {
      return new Intl.NumberFormat('ar-SA-u-nu-arab', { maximumFractionDigits: 2 }).format(n);
    } catch {
      return String(n);
    }
  }

  function renderDonationsList(donations, total) {
    const container = document.getElementById('donations-list');
    const totalEl = document.getElementById('donations-total');
    if (totalEl) {
      totalEl.textContent = donations.length
        ? `إجمالي المبالغ المسجلة (نوايا فقط): ${formatAmount(total)} ريال، من ${formatAmount(donations.length)} طلب`
        : '';
    }
    if (!donations.length) {
      container.innerHTML = '<p style="color: var(--text-muted);">لا توجد طلبات تبرع بعد.</p>';
      return;
    }
    container.innerHTML = donations.map((d) => `
      <div class="admin-list-item" data-id="${escapeHtml(d.id)}" style="flex-direction: column; align-items: stretch;">
        <div class="donation-view" data-id="${escapeHtml(d.id)}">
          <div class="testimony-item-meta">
            ${escapeHtml(formatDateTime(d.createdAt))}
            ${d.editedAt ? ' &middot; (مُعدَّل)' : ''}
          </div>
          <div class="testimony-item-message">
            <strong>${escapeHtml(formatAmount(d.amount))} ${escapeHtml(d.currency || 'SAR')}</strong>
            &middot; ${d.name ? escapeHtml(d.name) : 'بدون اسم'}
            &middot; ${d.email ? escapeHtml(d.email) : 'بدون بريد'}
          </div>
          <div class="testimony-actions">
            <button class="admin-edit-btn" data-id="${escapeHtml(d.id)}" type="button">تعديل</button>
            <button class="admin-delete-btn" data-id="${escapeHtml(d.id)}" data-kind="donation" type="button">حذف</button>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.admin-edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => enterDonationEditMode(btn.dataset.id, donations, total));
    });
    container.querySelectorAll('.admin-delete-btn[data-kind="donation"]').forEach((btn) => {
      btn.addEventListener('click', () => deleteDonation(btn.dataset.id));
    });
  }

  function enterDonationEditMode(id, donations) {
    const entry = donations.find((d) => d.id === id);
    if (!entry) return;
    const viewEl = document.querySelector(`.donation-view[data-id="${CSS.escape(id)}"]`);
    if (!viewEl) return;

    viewEl.innerHTML = `
      <div class="testimony-edit-fields">
        <input class="donation-edit-amount" min="1" placeholder="المبلغ" step="any" type="number" value="${escapeHtml(String(entry.amount))}"/>
        <input class="donation-edit-name" placeholder="الاسم (اختياري)" type="text" value="${escapeHtml(entry.name || '')}"/>
        <input class="donation-edit-email" placeholder="البريد الإلكتروني (اختياري)" type="email" value="${escapeHtml(entry.email || '')}"/>
      </div>
      <div class="testimony-actions">
        <button class="admin-save-btn" type="button">حفظ</button>
        <button class="admin-cancel-btn" type="button">إلغاء</button>
      </div>
    `;

    viewEl.querySelector('.admin-save-btn').addEventListener('click', () => saveDonation(id));
    viewEl.querySelector('.admin-cancel-btn').addEventListener('click', () => loadDonationsList());
  }

  async function saveDonation(id) {
    const viewEl = document.querySelector(`.donation-view[data-id="${CSS.escape(id)}"]`);
    if (!viewEl) return;
    const amount = parseFloat(viewEl.querySelector('.donation-edit-amount').value);
    const name = viewEl.querySelector('.donation-edit-name').value.trim();
    const email = viewEl.querySelector('.donation-edit-email').value.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من صفر.');
      return;
    }

    const { ok, data } = await apiRequest('PATCH', `/api/donations?id=${encodeURIComponent(id)}`, { amount, name, email });
    if (ok) {
      loadDonationsList();
    } else {
      alert('تعذّر الحفظ: ' + (data.error || 'خطأ غير معروف'));
    }
  }

  async function deleteDonation(id) {
    if (!confirm('هل تريد حذف طلب التبرع هذا؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    const { ok, data } = await apiRequest('DELETE', `/api/donations?id=${encodeURIComponent(id)}`);
    if (ok) {
      loadDonationsList();
    } else {
      alert('تعذّر الحذف: ' + (data.error || 'خطأ غير معروف'));
    }
  }

  async function loadDonationsList() {
    const { ok, data } = await apiRequest('GET', '/api/donations');
    if (ok && Array.isArray(data.donations)) {
      const donations = data.donations.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const total = typeof data.total === 'number' ? data.total : donations.reduce((s, d) => s + (d.amount || 0), 0);
      renderDonationsList(donations, total);
    } else {
      document.getElementById('donations-list').innerHTML = '<p style="color: #c0392b;">تعذّر تحميل طلبات التبرع.</p>';
    }
  }

  async function deleteVisit(id) {
    if (!confirm('هل تريد حذف هذا الموعد؟')) return;
    const { ok, data } = await apiRequest('DELETE', `/api/visits?id=${encodeURIComponent(id)}`);
    if (ok) {
      loadVisitsList();
    } else {
      alert('تعذّر الحذف: ' + (data.error || 'خطأ غير معروف'));
    }
  }

  async function addVisit() {
    const date = document.getElementById('new-date').value;
    const titleAr = document.getElementById('new-title-ar').value.trim();
    const titleEn = document.getElementById('new-title-en').value.trim();
    const descAr = document.getElementById('new-desc-ar').value.trim();
    const descEn = document.getElementById('new-desc-en').value.trim();

    if (!date) {
      showAddStatus('يرجى اختيار تاريخ.', true);
      return;
    }
    if (!titleAr && !titleEn) {
      showAddStatus('يرجى إدخال عنوان بلغة واحدة على الأقل.', true);
      return;
    }

    showAddStatus('جارِ الإضافة...', false);
    const { ok, data } = await apiRequest('POST', '/api/visits', { date, titleAr, titleEn, descAr, descEn });

    if (ok) {
      showAddStatus('تمت الإضافة بنجاح.', false);
      document.getElementById('new-date').value = '';
      document.getElementById('new-title-ar').value = '';
      document.getElementById('new-title-en').value = '';
      document.getElementById('new-desc-ar').value = '';
      document.getElementById('new-desc-en').value = '';
      loadVisitsList();
    } else if (data.error) {
      showAddStatus('خطأ: ' + data.error, true);
    } else {
      showAddStatus('تعذّرت الإضافة. تحقق من رمز الإدارة.', true);
    }
  }

  async function unlock() {
    const tokenInput = document.getElementById('admin-token-input');
    const token = tokenInput.value.trim();
    if (!token) {
      showGateStatus('يرجى إدخال رمز الإدارة.', true);
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, token);

    showGateStatus('جارِ التحقق...', false);
    // GET needs no token, so verify with a harmless probe instead: delete a
    // bogus id. 401 means the token itself is wrong; 404 means the token
    // was accepted (request was authorized, the fake id just doesn't exist).
    const probe = await apiRequest('DELETE', '/api/visits?id=__token_check__');
    if (probe.status === 401) {
      showGateStatus('رمز الإدارة غير صحيح.', true);
      sessionStorage.removeItem(TOKEN_KEY);
      return;
    }

    document.getElementById('token-gate').classList.add('admin-hidden');
    document.getElementById('admin-main').classList.remove('admin-hidden');
    loadVisitsList();
    loadTestimoniesList();
    loadDonationsList();
  }

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

/**
 * Admin: manage visiting dates (js/admin-visits.js)
 *
 * A simple, unlisted admin page (not linked from the site nav) for the
 * family to add/remove entries in /api/visits without touching code. The
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

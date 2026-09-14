(function () {
  const tokenKey = 'client_session_token';
  const login = document.getElementById('client-login');
  const dashboard = document.getElementById('client-dashboard');
  const loginForm = document.getElementById('client-login-form');
  const loginError = document.getElementById('client-login-error');
  const directApiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://' + window.location.hostname + ':3001'
    : '';

  async function request(url, options = {}) {
    const token = sessionStorage.getItem(tokenKey);
    const headers = {'Content-Type': 'application/json', ...(options.headers || {})};
    if (token) headers.Authorization = `Bearer ${token}`;
    let response;
    try {
      response = await fetch(url, {...options, headers});
      if (!response.ok && directApiBase && [404, 502, 503].includes(response.status)) {
        response = await fetch(directApiBase + url, {...options, headers});
      }
    } catch (error) {
      if (!directApiBase) throw new Error('The client service is unavailable.');
      try {
        response = await fetch(directApiBase + url, {...options, headers});
      } catch (directError) {
        throw new Error('Start the app with "npm run dev" to enable the client dashboard.');
      }
    }
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Request failed');
    return response.status === 204 ? null : response.json();
  }

  function showError(message) {
    if (loginError) loginError.textContent = message;
  }

  function setDefaultCredentials() {
    const email = document.getElementById('client-email');
    const password = document.getElementById('client-password');
    if (email) email.value = 'test@gmail.com';
    if (password) password.value = 'test@123';
  }

  async function loginWithFormCredentials() {
    setDefaultCredentials();
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('client-email').value,
        password: document.getElementById('client-password').value
      })
    });
    sessionStorage.setItem(tokenKey, data.token);
    await loadDashboard();
  }

  function isArabic() {
    return (window.i18n ? window.i18n.getLang() : 'ar') === 'ar';
  }

  async function loadDashboard() {
    const data = await request('/api/client/summary');
    login.hidden = true;
    dashboard.hidden = false;
    document.getElementById('client-total-count').textContent = data.totals.count;
    document.getElementById('client-total-amount').textContent = `${Number(data.totals.amount).toLocaleString()} SAR`;
    document.getElementById('client-bank-name').value = data.bank.bank_name;
    document.getElementById('client-beneficiary-name').value = data.bank.beneficiary_name;
    document.getElementById('client-iban').value = data.bank.iban;
    document.getElementById('client-account-number').value = data.bank.account_number;
    document.getElementById('donations-body').innerHTML = data.donations.map((donation) => `
      <tr><td>${escapeHtml(donation.donor_name)}</td><td>${escapeHtml(donation.donor_email)}</td>
      <td>${Number(donation.amount).toLocaleString()} ${escapeHtml(donation.currency)}</td>
      <td>${escapeHtml(isArabic() ? ({pending: 'قيد المراجعة', completed: 'مكتمل', cancelled: 'ملغى'}[donation.status] || donation.status) : donation.status)}</td>
      <td>${new Date(donation.created_at).toLocaleString()}</td></tr>
    `).join('') || `<tr><td colspan="5">${isArabic() ? 'لا توجد تبرعات مسجلة بعد.' : 'No donations recorded yet.'}</td></tr>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'}[character]));
  }

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await loginWithFormCredentials();
    } catch (error) {
      showError(error.message);
    }
  });

  document.getElementById('client-logout')?.addEventListener('click', async () => {
    try { await request('/api/auth/logout', {method: 'POST'}); } finally {
      sessionStorage.removeItem(tokenKey);
      window.location.reload();
    }
  });

  document.getElementById('bank-details-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('bank-details-status');
    try {
      await request('/api/client/bank-details', {
        method: 'PUT',
        body: JSON.stringify({
          bankName: document.getElementById('client-bank-name').value,
          beneficiaryName: document.getElementById('client-beneficiary-name').value,
          iban: document.getElementById('client-iban').value,
          accountNumber: document.getElementById('client-account-number').value
        })
      });
      status.textContent = isArabic()
        ? 'تم حفظ بيانات الدفع وستظهر في قسم البيانات البنكية.'
        : 'Payment details saved and now shown in the public bank-details section.';
      await loadDashboard();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  setDefaultCredentials();
  if (sessionStorage.getItem(tokenKey)) {
    loadDashboard().catch(() => sessionStorage.removeItem(tokenKey));
  } else if (new URLSearchParams(window.location.search).get('autologin') === '1') {
    loginWithFormCredentials().catch((error) => showError(error.message));
  }
  window.addEventListener('languageChanged', () => {
    if (!dashboard.hidden && sessionStorage.getItem(tokenKey)) loadDashboard().catch(() => {});
  });
})();

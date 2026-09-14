(function () {
  const login = document.getElementById('client-login');
  const dashboard = document.getElementById('client-dashboard');
  const loginForm = document.getElementById('client-login-form');
  const loginError = document.getElementById('client-login-error');
  const SESSION_DURATION_MS = 2 * 60 * 1000;
  let expiryTimer;
  const isAuthenticated = () => sessionStorage.getItem('client_authenticated') === 'true'
    && Number(sessionStorage.getItem('client_auth_expires_at')) > Date.now();

  function isArabic() {
    return (window.i18n ? window.i18n.getLang() : 'ar') === 'ar';
  }

  function setDefaultCredentials() {
    document.getElementById('client-email').value = 'test@gmail.com';
    document.getElementById('client-password').value = 'test@123';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));
  }

  async function loadDashboard() {
    const [bank, donations] = await Promise.all([
      window.endowmentStore.getBankDetails(),
      window.endowmentStore.getDonations()
    ]);
    login.hidden = true;
    dashboard.hidden = false;
    document.getElementById('client-total-count').textContent = donations.length;
    document.getElementById('client-total-amount').textContent =
      `${donations.filter((item) => item.status !== 'cancelled').reduce((total, item) => total + Number(item.amount), 0).toLocaleString()} SAR`;
    document.getElementById('client-bank-name').value = bank.bank_name;
    document.getElementById('client-beneficiary-name').value = bank.beneficiary_name;
    document.getElementById('client-iban').value = bank.iban;
    document.getElementById('client-account-number').value = bank.account_number;
    document.getElementById('donations-body').innerHTML = donations.map((donation) => `
      <tr><td>${escapeHtml(donation.donor_name)}</td><td>${escapeHtml(donation.donor_email)}</td>
      <td>${Number(donation.amount).toLocaleString()} ${escapeHtml(donation.currency)}</td>
      <td>${escapeHtml(isArabic() ? ({pending: 'قيد المراجعة', completed: 'مكتمل', cancelled: 'ملغى'}[donation.status] || donation.status) : donation.status)}</td>
      <td>${new Date(donation.created_at).toLocaleString()}</td></tr>
    `).join('') || `<tr><td colspan="5">${isArabic() ? 'لا توجد تبرعات مسجلة بعد.' : 'No donations recorded yet.'}</td></tr>`;
  }

  function authenticate() {
    setDefaultCredentials();
    sessionStorage.setItem('client_authenticated', 'true');
    sessionStorage.setItem('client_auth_expires_at', String(Date.now() + SESSION_DURATION_MS));
    scheduleExpiry();
    return loadDashboard();
  }

  function expireSession() {
    window.clearTimeout(expiryTimer);
    sessionStorage.removeItem('client_authenticated');
    sessionStorage.removeItem('client_auth_expires_at');
    dashboard.hidden = true;
    login.hidden = false;
    loginError.textContent = isArabic()
      ? 'انتهت الجلسة بعد دقيقتين. يرجى تسجيل الدخول مرة أخرى.'
      : 'Your session expired after two minutes. Please log in again.';
  }

  function scheduleExpiry() {
    window.clearTimeout(expiryTimer);
    const expiresAt = Number(sessionStorage.getItem('client_auth_expires_at'));
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      expireSession();
      return;
    }
    expiryTimer = window.setTimeout(expireSession, remaining);
  }

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await authenticate();
    } catch (error) {
      loginError.textContent = error.message;
    }
  });

  document.getElementById('client-logout')?.addEventListener('click', () => {
    sessionStorage.removeItem('client_authenticated');
    sessionStorage.removeItem('client_auth_expires_at');
    window.clearTimeout(expiryTimer);
    window.location.reload();
  });

  document.getElementById('bank-details-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('bank-details-status');
    try {
      await window.endowmentStore.saveBankDetails({
        bank_name: document.getElementById('client-bank-name').value,
        beneficiary_name: document.getElementById('client-beneficiary-name').value,
        iban: document.getElementById('client-iban').value,
        account_number: document.getElementById('client-account-number').value
      });
      status.textContent = window.endowmentStore.isShared
        ? (isArabic() ? 'تم حفظ بيانات الدفع ومشاركتها مع الموقع.' : 'Payment details saved and shared with the website.')
        : (isArabic() ? 'تم حفظ بيانات الدفع محلياً على هذا الجهاز.' : 'Payment details saved locally on this device.');
      await loadDashboard();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  setDefaultCredentials();
  if (isAuthenticated() || new URLSearchParams(window.location.search).get('autologin') === '1') {
    authenticate().catch((error) => { loginError.textContent = error.message; });
  } else if (sessionStorage.getItem('client_authenticated') === 'true') {
    expireSession();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sessionStorage.getItem('client_authenticated') === 'true') {
      if (isAuthenticated()) scheduleExpiry();
      else expireSession();
    }
  });
  window.addEventListener('languageChanged', () => {
    if (!dashboard.hidden && isAuthenticated()) loadDashboard().catch(() => {});
  });
})();

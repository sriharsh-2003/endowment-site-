(function () {
  const login = document.getElementById('client-login');
  const dashboard = document.getElementById('client-dashboard');
  const loginForm = document.getElementById('client-login-form');
  const loginError = document.getElementById('client-login-error');
  const isAuthenticated = () => sessionStorage.getItem('client_authenticated') === 'true';

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
    return loadDashboard();
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
      status.textContent = isArabic()
        ? 'تم حفظ بيانات الدفع محلياً وستظهر في قسم البيانات البنكية على هذا الجهاز.'
        : 'Payment details saved locally and shown in the public bank-details section on this device.';
      await loadDashboard();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  setDefaultCredentials();
  if (isAuthenticated() || new URLSearchParams(window.location.search).get('autologin') === '1') {
    authenticate().catch((error) => { loginError.textContent = error.message; });
  }
  window.addEventListener('languageChanged', () => {
    if (!dashboard.hidden && isAuthenticated()) loadDashboard().catch(() => {});
  });
})();

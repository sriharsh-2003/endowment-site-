/**
 * Donation data collection (js/donate.js)
 *
 * There is no payment gateway on this site yet (see the "Bank details"
 * card on this page, still marked pending approval). This file does NOT
 * process a payment and must never tell a visitor their payment
 * succeeded. What it does: validate the amount, POST the donor's amount
 * and optional name/email to /api/donations so the family has a record of
 * who intends to give what, and show an honest confirmation that the
 * *request* was recorded, not that money moved.
 */
(function () {
  'use strict';

  function isArabicNow() {
    return (window.i18n ? window.i18n.getLang() : (localStorage.getItem('preferred_lang') || 'ar')) === 'ar';
  }

  function showStatus(message, tone) {
    const statusEl = document.getElementById('donation-status-message');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.style.display = 'block';
    statusEl.style.color = tone === 'error' ? '#c0392b' : (tone === 'muted' ? 'var(--text-secondary)' : '#10b981');
  }

  function initDonationSubmit() {
    const submitBtn = document.getElementById('donation-submit-btn');
    const amountInput = document.getElementById('donation-amount');
    const nameInput = document.getElementById('donation-name');
    const emailInput = document.getElementById('donation-email');
    if (!submitBtn || !amountInput) return;

    submitBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const isArabic = isArabicNow();

      const amount = parseFloat(amountInput.value);
      if (!Number.isFinite(amount) || amount <= 0) {
        showStatus(
          isArabic ? 'يرجى إدخال مبلغ صحيح أكبر من صفر.' : 'Please enter a valid amount greater than zero.',
          'error'
        );
        amountInput.focus();
        return;
      }

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showStatus(
          isArabic ? 'يرجى إدخال بريد إلكتروني صحيح، أو ترك الحقل فارغاً.' : 'Please enter a valid email, or leave it blank.',
          'error'
        );
        emailInput.focus();
        return;
      }

      submitBtn.disabled = true;
      showStatus(isArabic ? 'جارِ تسجيل رغبتك في التبرع...' : 'Recording your donation request...', 'muted');

      try {
        const res = await fetch('/api/donations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, name, email })
        });

        if (res.status === 429) {
          showStatus(
            isArabic
              ? 'محاولات كثيرة خلال وقت قصير. يرجى الانتظار قليلاً ثم إعادة المحاولة.'
              : 'Too many attempts in a short time. Please wait a moment and try again.',
            'error'
          );
          submitBtn.disabled = false;
          return;
        }

        if (!res.ok && res.status !== 409) {
          showStatus(
            isArabic
              ? 'تعذّر تسجيل الطلب الآن. يرجى المحاولة لاحقاً أو التواصل معنا مباشرة.'
              : 'Could not record your request right now. Please try again later or contact us directly.',
            'error'
          );
          submitBtn.disabled = false;
          return;
        }

        // Success, or a duplicate double-submit (409) which we still treat
        // as recorded from the visitor's point of view.
        showStatus(
          isArabic
            ? 'تم تسجيل رغبتكم في التبرع، جزاكم الله خيراً. لم تتم أي عملية دفع بعد؛ سيتم نشر بيانات التحويل البنكي بعد اعتمادها وسنتواصل معكم لإتمام العملية.'
            : 'Your donation request has been recorded, may Allah reward you. No payment has been taken yet; bank transfer details will be published once approved, and we will follow up to complete the process.',
          'success'
        );
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
      } catch (err) {
        console.warn('Could not reach donation storage.', err);
        showStatus(
          isArabic
            ? 'تعذّر الاتصال بالخادم. يرجى المحاولة لاحقاً أو التواصل معنا مباشرة.'
            : 'Could not reach the server. Please try again later or contact us directly.',
          'error'
        );
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initDonationSubmit);
})();

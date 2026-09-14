/**
 * Abdullah Alajlan Endowment - Donation Functionality
 * Handles progress bar, tier buttons, payment UI modal, and copyable bank info
 */

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    initProgress();
    initTierButtons();
    initPaymentModal();
    initCopyButtons();
    loadBankDetails();
  });

  async function loadBankDetails() {
    try {
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.hostname}:3001/api/bank-details`
        : '/api/bank-details';
      let response;
      try {
        response = await fetch('/api/bank-details', {cache: 'no-store'});
        if (!response.ok && apiUrl !== '/api/bank-details' && [404, 502, 503].includes(response.status)) {
          response = await fetch(apiUrl, {cache: 'no-store'});
        }
      } catch (error) {
        if (apiUrl === '/api/bank-details') throw error;
        response = await fetch(apiUrl, {cache: 'no-store'});
      }
      if (!response.ok) throw new Error(`Bank details request failed: ${response.status}`);
      const details = await response.json();
      const values = {
        'bank-name-val': details.bank_name,
        'bank-beneficiary-val': details.beneficiary_name,
        'bank-iban-val': details.iban,
        'bank-account-val': details.account_number
      };
      Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (!element) return;
        if (element.tagName === 'INPUT') element.value = value;
        else element.textContent = value;
      });
    } catch (error) {
      console.warn('Using embedded bank details because the API is unavailable.', error);
    }
  }

  function initProgress() {
    // Requirements: Progress Bar: Show Raised, Target, and Percentage (default to 0)
    const raisedEl = document.getElementById('raised-amount');
    const targetEl = document.getElementById('target-amount');
    const percentEl = document.getElementById('progress-percentage');
    const barFill = document.getElementById('progress-bar-fill');

    const raised = 0;
    const target = 200000;
    const percentage = 0;

    if (raisedEl) raisedEl.textContent = raised.toLocaleString();
    if (targetEl) targetEl.textContent = target.toLocaleString();
    if (percentEl) percentEl.textContent = `${percentage}%`;
    if (barFill) barFill.style.width = `${percentage}%`;
  }

  function initTierButtons() {
    const tierButtons = document.querySelectorAll('.tier-btn');
    const amountInput = document.getElementById('donate-amount-input');

    tierButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        tierButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.getAttribute('data-amount');
        if (amountInput && val) {
          amountInput.value = val;
        }
      });
    });

    if (amountInput) {
      amountInput.addEventListener('input', () => {
        tierButtons.forEach((b) => {
          if (b.getAttribute('data-amount') === amountInput.value) {
            b.classList.add('active');
          } else {
            b.classList.remove('active');
          }
        });
      });
    }
  }

  function initPaymentModal() {
    const payBtn = document.getElementById('continue-payment-btn');
    const modal = document.getElementById('payment-preview-modal');
    const closeBtn = document.getElementById('close-payment-modal-btn');
    const amountInput = document.getElementById('donate-amount-input');
    const modalAmountEl = document.getElementById('modal-amount-display');

    if (!payBtn || !modal) return;

    payBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const amount = amountInput ? (amountInput.value || '100') : '100';
      if (modalAmountEl) {
        modalAmountEl.textContent = `${amount} SAR`;
      }
      const name = document.getElementById('donate-name-input')?.value.trim();
      const email = document.getElementById('donate-email-input')?.value.trim();
      if (!name || !email) {
        window.showToast?.('Please enter your name and email before continuing.');
        return;
      }
      fetch('/api/donations', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, email, amount})
      }).catch((error) => console.error('Donation could not be recorded', error));
      modal.classList.add('active');
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }

  function initCopyButtons() {
    const copyButtons = document.querySelectorAll('.copy-btn');

    copyButtons.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('data-copy-target');
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;

        let textToCopy = targetEl.tagName === 'INPUT' ? targetEl.value : targetEl.textContent.trim();

        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(textToCopy);
          } else {
            // Fallback for iframe contexts
            const tempInput = document.createElement('textarea');
            tempInput.value = textToCopy;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
          }

          const isArabic = (window.i18n ? window.i18n.getLang() : 'ar') === 'ar';
          const originalHTML = btn.innerHTML;
          btn.classList.add('copied');
          btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>${isArabic ? 'تم النسخ!' : 'Copied!'}</span>
          `;

          if (window.showToast) {
            window.showToast(isArabic ? 'تم نسخ البيانات للحافظة' : 'Copied to clipboard');
          }

          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = originalHTML;
          }, 2000);
        } catch (err) {
          console.error('Failed to copy', err);
        }
      });
    });
  }
})();

/**
 * Abdullah Alajlan Endowment - Internationalization (i18n) Engine
 * Handles bilingual (Arabic / English) toggling with LocalStorage persistence
 */

(function () {
  const STORAGE_KEY = 'preferred_lang';
  const DEFAULT_LANG = 'ar';

  /**
   * Retrieves the current stored language preference or defaults to Arabic
   * @returns {'ar' | 'en'}
   */
  function getCurrentLang() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      // Storage can be unavailable when the page is opened directly from disk.
    }
    if (saved === 'ar' || saved === 'en') {
      return saved;
    }
    return DEFAULT_LANG;
  }

  /**
   * Applies the selected language to the entire document
   * @param {'ar' | 'en'} lang 
   */
  function applyLanguage(lang) {
    const isArabic = lang === 'ar';
    const htmlEl = document.documentElement;

    // Toggle html attributes
    htmlEl.setAttribute('lang', lang);
    htmlEl.setAttribute('dir', isArabic ? 'rtl' : 'ltr');

    // Update all elements with data-i18n-ar and data-i18n-en
    const translatableElements = document.querySelectorAll('[data-i18n-ar], [data-i18n-en]');
    translatableElements.forEach((el) => {
      const textAr = el.getAttribute('data-i18n-ar');
      const textEn = el.getAttribute('data-i18n-en');
      const text = isArabic ? textAr : textEn;

      if (text !== null) {
        // If element contains HTML tags or icons, keep inner structure or update text
        if (el.hasAttribute('data-i18n-html')) {
          el.innerHTML = text;
        } else {
          el.textContent = text;
        }
      }
    });

    // Update form input placeholders
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder-ar], [data-i18n-placeholder-en]');
    placeholderElements.forEach((el) => {
      const phAr = el.getAttribute('data-i18n-placeholder-ar');
      const phEn = el.getAttribute('data-i18n-placeholder-en');
      const ph = isArabic ? phAr : phEn;
      if (ph !== null) {
        el.setAttribute('placeholder', ph);
      }
    });

    // Update Page Title if specified
    const pageTitleEl = document.querySelector('title[data-i18n-ar]');
    if (pageTitleEl) {
      const titleAr = pageTitleEl.getAttribute('data-i18n-ar');
      const titleEn = pageTitleEl.getAttribute('data-i18n-en');
      document.title = isArabic ? titleAr : titleEn;
    }

    // Update Language Toggle Button text / label
    const langBtn = document.getElementById('lang-toggle-btn');
    const langBtnText = document.getElementById('lang-toggle-text');
    if (langBtnText) {
      // In Arabic mode, the button shows "English" or "EN" to allow switching to English.
      // In English mode, it shows "عربي" to allow switching to Arabic.
      langBtnText.textContent = isArabic ? 'English' : 'عربي';
    }
    if (langBtn) {
      langBtn.setAttribute('aria-label', isArabic ? 'Switch language to English' : 'التبديل إلى اللغة العربية');
    }

    // Also update mobile drawer language button if exists
    const mobileLangBtnText = document.getElementById('mobile-lang-toggle-text');
    if (mobileLangBtnText) {
      mobileLangBtnText.textContent = isArabic ? 'English' : 'عربي';
    }

    // Save to LocalStorage
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (error) {
      // The language still applies for the current page when storage is unavailable.
    }

    // Dispatch global event for page-specific listeners (e.g. Leaflet map or Prayer logic)
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang, isArabic } }));
  }

  /**
   * Toggles between Arabic and English
   */
  function toggleLanguage() {
    const current = getCurrentLang();
    const next = current === 'ar' ? 'en' : 'ar';
    applyLanguage(next);
  }

  // Expose globally
  window.i18n = {
    getLang: getCurrentLang,
    setLang: applyLanguage,
    toggleLang: toggleLanguage,
  };

  // Run immediately on script load or DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyLanguage(getCurrentLang());
      initButtons();
    });
  } else {
    applyLanguage(getCurrentLang());
    initButtons();
  }

  function initButtons() {
    document.addEventListener('click', (e) => {
      const button = e.target.closest('#lang-toggle-btn, #mobile-lang-toggle-btn');
      if (!button) return;
        e.preventDefault();
        toggleLanguage();
    });
  }
})();

/**
 * Abdullah Alajlan Endowment - Prayer Logic
 * Handles Quran verse selection, prayer submission, and LocalStorage state
 */

(function () {
  const PRAYED_KEY = 'has_prayed';
  const PRAYER_NOTE_KEY = 'alajlan_prayer_note';

  const QURAN_VERSES = [
    {
      ar: 'رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
      en: 'Our Lord, forgive me and my parents and the believers the Day the account is established.',
      refAr: 'سورة إبراهيم: ٤١',
      refEn: 'Surah Ibrahim: 41'
    },
    {
      ar: 'رَبِّ اغْفِرْ وَارْحَمْ وَأَنتَ خَيْرُ الرَّاحِمِينَ',
      en: 'My Lord, forgive and have mercy, and You are the best of the merciful.',
      refAr: 'سورة المؤمنون: ١١٨',
      refEn: 'Surah Al-Mu’minun: 118'
    },
    {
      ar: 'وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
      en: 'And say, "My Lord, have mercy upon them as they brought me up [when I was] small."',
      refAr: 'سورة الإسراء: ٢٤',
      refEn: 'Surah Al-Isra: 24'
    },
    {
      ar: 'وَالَّذِينَ جَاءُوا مِن بَعْدِهِمْ يَقُولُونَ رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالإِيمَانِ',
      en: 'And those who came after them say, "Our Lord, forgive us and our brothers who preceded us in faith."',
      refAr: 'سورة الحشر: ١٠',
      refEn: 'Surah Al-Hashr: 10'
    },
    {
      ar: 'إِنَّ رَحْمَتَ اللَّهِ قَرِيبٌ مِّنَ الْمُحْسِنِينَ',
      en: 'Indeed, the mercy of Allah is near to the doers of good.',
      refAr: 'سورة الأعراف: ٥٦',
      refEn: 'Surah Al-A’raf: 56'
    },
    {
      ar: 'رَبَّنَا وَآتِنَا مَا وَعَدتَّنَا عَلَىٰ رُسُلِكَ وَلَا تُخْزِنَا يَوْمَ الْقِيَامَةِ ۗ إِنَّكَ لَا تُخْلِفُ الْمِيعَادَ',
      en: 'Our Lord, and grant us what You promised us through Your messengers and do not disgrace us on the Day of Resurrection.',
      refAr: 'سورة آل عمران: ١٩٤',
      refEn: 'Surah Ali ‘Imran: 194'
    }
  ];

  let currentVerseIndex = 0;

  document.addEventListener('DOMContentLoaded', () => {
    initVerseSelector();
    initPrayerButton();
    renderCurrentVerse();

    // Re-render verse translation if language changes
    window.addEventListener('languageChanged', () => {
      renderCurrentVerse();
      updatePrayerButtonUI();
    });
  });

  function initVerseSelector() {
    const randomBtn = document.getElementById('random-verse-btn');
    if (randomBtn) {
      randomBtn.addEventListener('click', (e) => {
        e.preventDefault();
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * QURAN_VERSES.length);
        } while (nextIndex === currentVerseIndex && QURAN_VERSES.length > 1);
        currentVerseIndex = nextIndex;
        renderCurrentVerse();
      });
    }
  }

  function renderCurrentVerse() {
    const verse = QURAN_VERSES[currentVerseIndex];
    const verseArEl = document.getElementById('quran-verse-arabic');
    const verseEnEl = document.getElementById('quran-verse-translation');
    const verseRefEl = document.getElementById('quran-verse-ref');

    const currentLang = window.i18n ? window.i18n.getLang() : (localStorage.getItem('preferred_lang') || 'ar');
    const isArabic = currentLang === 'ar';

    if (verseArEl) verseArEl.textContent = verse.ar;
    if (verseEnEl) verseEnEl.textContent = `"${verse.en}"`;
    if (verseRefEl) verseRefEl.textContent = isArabic ? verse.refAr : verse.refEn;
  }

  function initPrayerButton() {
    const prayBtn = document.getElementById('core-pray-btn');
    if (!prayBtn) return;

    updatePrayerButtonUI();

    prayBtn.addEventListener('click', (e) => {
      e.preventDefault();

      // Check if already prayed
      const alreadyPrayed = localStorage.getItem(PRAYED_KEY) === 'true';

      if (!alreadyPrayed) {
        // Save state strictly to LocalStorage - NO backend/API call
        localStorage.setItem(PRAYED_KEY, 'true');

        // Optional inputs
        const nameInput = document.getElementById('pray-name-input');
        const messageInput = document.getElementById('pray-message-input');
        if (nameInput || messageInput) {
          const note = {
            name: nameInput ? nameInput.value.trim() : '',
            message: messageInput ? messageInput.value.trim() : '',
            timestamp: new Date().toISOString()
          };
          localStorage.setItem(PRAYER_NOTE_KEY, JSON.stringify(note));
        }

        const isArabic = (window.i18n ? window.i18n.getLang() : 'ar') === 'ar';
        if (window.showToast) {
          window.showToast(isArabic ? 'تقبّل الله دعاءكم وكتب أجركم' : 'May Allah accept your prayer and reward you');
        }
      }

      updatePrayerButtonUI();
    });
  }

  function updatePrayerButtonUI() {
    const prayBtn = document.getElementById('core-pray-btn');
    const prayStatusEl = document.getElementById('pray-status-message');
    if (!prayBtn) return;

    const hasPrayed = localStorage.getItem(PRAYED_KEY) === 'true';
    const isArabic = (window.i18n ? window.i18n.getLang() : 'ar') === 'ar';

    if (hasPrayed) {
      prayBtn.classList.add('prayed-state');
      prayBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>${isArabic ? 'تقبّل الله — شكراً لدعائك' : 'Thank you — Your prayer has been recorded'}</span>
      `;
      if (prayStatusEl) {
        prayStatusEl.style.display = 'block';
        prayStatusEl.textContent = isArabic
          ? 'تم حفظ تأكيد دعائك على جهازك. تقبّل الله منكم وجعله في ميزان حسناته.'
          : 'Your prayer was saved on your device. May Allah accept your prayer and reward you.';
      }
    } else {
      prayBtn.classList.remove('prayed-state');
      prayBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        </svg>
        <span>${isArabic ? 'دعوتُ له' : 'I prayed for him'}</span>
      `;
      if (prayStatusEl) {
        prayStatusEl.style.display = 'none';
      }
    }
  }
})();

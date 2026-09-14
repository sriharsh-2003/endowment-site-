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
      refEn: 'Surah Ibrahim: 41',
      key: '14:41'
    },
    {
      ar: 'رَبِّ اغْفِرْ وَارْحَمْ وَأَنتَ خَيْرُ الرَّاحِمِينَ',
      en: 'My Lord, forgive and have mercy, and You are the best of the merciful.',
      refAr: 'سورة المؤمنون: ١١٨',
      refEn: 'Surah Al-Mu’minun: 118',
      key: '23:118'
    },
    {
      ar: 'وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
      en: 'And say, "My Lord, have mercy upon them as they brought me up [when I was] small."',
      refAr: 'سورة الإسراء: ٢٤',
      refEn: 'Surah Al-Isra: 24',
      key: '17:24'
    },
    {
      ar: 'وَالَّذِينَ جَاءُوا مِن بَعْدِهِمْ يَقُولُونَ رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالإِيمَانِ',
      en: 'And those who came after them say, "Our Lord, forgive us and our brothers who preceded us in faith."',
      refAr: 'سورة الحشر: ١٠',
      refEn: 'Surah Al-Hashr: 10',
      key: '59:10'
    },
    {
      ar: 'إِنَّ رَحْمَتَ اللَّهِ قَرِيبٌ مِّنَ الْمُحْسِنِينَ',
      en: 'Indeed, the mercy of Allah is near to the doers of good.',
      refAr: 'سورة الأعراف: ٥٦',
      refEn: 'Surah Al-A’raf: 56',
      key: '7:56'
    },
    {
      ar: 'رَبَّنَا وَآتِنَا مَا وَعَدتَّنَا عَلَىٰ رُسُلِكَ وَلَا تُخْزِنَا يَوْمَ الْقِيَامَةِ ۗ إِنَّكَ لَا تُخْلِفُ الْمِيعَادَ',
      en: 'Our Lord, and grant us what You promised us through Your messengers and do not disgrace us on the Day of Resurrection.',
      refAr: 'سورة آل عمران: ١٩٤',
      refEn: 'Surah Ali ‘Imran: 194',
      key: '3:194'
    }
  ];

  let currentVerseIndex = 0;
  let verseRequestId = 0;

  document.addEventListener('DOMContentLoaded', () => {
    initVerseSelector();
    initQuranAudio();
    initPrayerButton();
    renderCurrentVerse();

    // Re-render verse translation if language changes
    window.addEventListener('languageChanged', () => {
      renderCurrentVerse();
      updateAudioButtonUI(false);
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
        playSelectedVerse();
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

    const sourceLink = document.getElementById('quran-source-link');
    if (sourceLink) sourceLink.href = `https://quran.com/${verse.key.replace(':', '/')}`;
    loadVerseFromQuran(verse);
  }

  async function loadVerseFromQuran(verse) {
    const requestId = ++verseRequestId;
    const arabicEndpoint = `https://api.quran.com/api/v4/verses/by_key/${verse.key}?language=en&fields=text_uthmani&translations=131`;

    try {
      const response = await fetch(arabicEndpoint);
      if (!response.ok) throw new Error(`Quran.com request failed: ${response.status}`);
      const payload = await response.json();
      if (requestId !== verseRequestId || !payload.verse) return;

      const verseArEl = document.getElementById('quran-verse-arabic');
      const verseEnEl = document.getElementById('quran-verse-translation');
      if (verseArEl && payload.verse.text_uthmani) verseArEl.textContent = payload.verse.text_uthmani;
      if (verseEnEl && payload.verse.translations && payload.verse.translations[0]) {
        verseEnEl.textContent = `"${payload.verse.translations[0].text.replace(/<[^>]+>/g, '')}"`;
      }
    } catch (error) {
      // The local verified verse remains visible if Quran.com is unavailable.
      console.warn('Quran.com verse unavailable; using local fallback.', error);
    }
  }

  function playSelectedVerse() {
    const audio = document.getElementById('quran-audio');
    if (!audio) return;
    const verse = QURAN_VERSES[currentVerseIndex];
    const [chapter, verseNumber] = verse.key.split(':');
    const audioUrl = `https://verses.quran.com/Alafasy/mp3/${chapter.padStart(3, '0')}${verseNumber.padStart(3, '0')}.mp3`;
    if (audio.src !== audioUrl) {
      audio.src = audioUrl;
      audio.load();
    }
    audio.play().then(() => {
      updateAudioButtonUI(true);
    }).catch(() => {
      const isArabic = (window.i18n ? window.i18n.getLang() : 'ar') === 'ar';
      updateAudioButtonUI(false);
      if (window.showToast) {
        window.showToast(isArabic ? 'تعذّر تشغيل التلاوة. اضغط مرة أخرى أو تحقق من اتصال الإنترنت.' : 'The recitation could not start. Press again or check your internet connection.');
      }
    });
  }

  function initQuranAudio() {
    const audioButton = document.getElementById('quran-audio-btn');
    const audio = document.getElementById('quran-audio');
    if (audioButton) {
      audioButton.addEventListener('click', () => {
        if (audio && !audio.paused) {
          audio.pause();
          updateAudioButtonUI(false);
        } else {
          playSelectedVerse();
        }
      });
    }
    if (audio) {
      audio.addEventListener('ended', () => updateAudioButtonUI(false));
      audio.addEventListener('error', () => {
        updateAudioButtonUI(false);
        const isArabic = (window.i18n ? window.i18n.getLang() : 'ar') === 'ar';
        if (window.showToast) {
          window.showToast(isArabic ? 'تعذّر تحميل التلاوة من المصدر.' : 'The recitation source could not be loaded.');
        }
      });
    }
    updateAudioButtonUI(false);
  }

  function updateAudioButtonUI(isPlaying) {
    const audioButton = document.getElementById('quran-audio-btn');
    if (!audioButton) return;
    const isArabic = (window.i18n ? window.i18n.getLang() : 'ar') === 'ar';
    audioButton.setAttribute('aria-label', isPlaying
      ? (isArabic ? 'إيقاف التلاوة' : 'Pause recitation')
      : (isArabic ? 'تشغيل التلاوة' : 'Play recitation'));
    const label = audioButton.querySelector('[data-i18n-ar], [data-i18n-en]');
    if (label) {
      label.textContent = isPlaying
        ? (isArabic ? 'إيقاف التلاوة' : 'Pause recitation')
        : (isArabic ? 'استماع إلى التلاوة' : 'Play recitation');
    }
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

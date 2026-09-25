/**
 * Abdullah Alajlan Endowment - Prayer Logic
 * Handles Quran verse selection, prayer submission, and LocalStorage state
 */

(function () {
  const PRAYED_KEY = 'has_prayed';
  const PRAYER_NOTE_KEY = 'alajlan_prayer_note';

  const QURAN_VERSES = [
    {
      ar: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
      en: 'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.',
      refAr: 'سورة البقرة: ٢٠١',
      refEn: 'Surah Al-Baqarah: 201',
      key: '2:201'
    },
    {
      ar: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً ۚ إِنَّكَ أَنتَ الْوَهَّابُ',
      en: 'Our Lord, let not our hearts deviate after You have guided us, and grant us mercy from Yourself. Indeed, You are the Bestower.',
      refAr: 'سورة آل عمران: ٨',
      refEn: 'Surah Ali ‘Imran: 8',
      key: '3:8'
    },
    {
      ar: 'رَبَّنَا إِنَّنَا آمَنَّا فَاغْفِرْ لَنَا ذُنُوبَنَا وَقِنَا عَذَابَ النَّارِ',
      en: 'Our Lord, indeed we have believed, so forgive us our sins and protect us from the punishment of the Fire.',
      refAr: 'سورة آل عمران: ١٦',
      refEn: 'Surah Ali ‘Imran: 16',
      key: '3:16'
    },
    {
      ar: 'رَبَّنَا وَآتِنَا مَا وَعَدتَّنَا عَلَىٰ رُسُلِكَ وَلَا تُخْزِنَا يَوْمَ الْقِيَامَةِ ۗ إِنَّكَ لَا تُخْلِفُ الْمِيعَادَ',
      en: 'Our Lord, and grant us what You promised us through Your messengers and do not disgrace us on the Day of Resurrection.',
      refAr: 'سورة آل عمران: ١٩٤',
      refEn: 'Surah Ali ‘Imran: 194',
      key: '3:194'
    },
    {
      ar: 'إِنَّ رَحْمَتَ اللَّهِ قَرِيبٌ مِّنَ الْمُحْسِنِينَ',
      en: 'Indeed, the mercy of Allah is near to the doers of good.',
      refAr: 'سورة الأعراف: ٥٦',
      refEn: 'Surah Al-A’raf: 56',
      key: '7:56'
    },
    {
      ar: 'رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي ۚ رَبَّنَا وَتَقَبَّلْ دُعَاءِ',
      en: 'My Lord, make me an establisher of prayer, and from my descendants. Our Lord, and accept my supplication.',
      refAr: 'سورة إبراهيم: ٤٠',
      refEn: 'Surah Ibrahim: 40',
      key: '14:40'
    },
    {
      ar: 'رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
      en: 'Our Lord, forgive me and my parents and the believers the Day the account is established.',
      refAr: 'سورة إبراهيم: ٤١',
      refEn: 'Surah Ibrahim: 41',
      key: '14:41'
    },
    {
      ar: 'وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
      en: 'And say, "My Lord, have mercy upon them as they brought me up [when I was] small."',
      refAr: 'سورة الإسراء: ٢٤',
      refEn: 'Surah Al-Isra: 24',
      key: '17:24'
    },
    {
      ar: 'رَبِّ اغْفِرْ وَارْحَمْ وَأَنتَ خَيْرُ الرَّاحِمِينَ',
      en: 'My Lord, forgive and have mercy, and You are the best of the merciful.',
      refAr: 'سورة المؤمنون: ١١٨',
      refEn: 'Surah Al-Mu’minun: 118',
      key: '23:118'
    },
    {
      ar: 'رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَىٰ وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ وَأَصْلِحْ لِي فِي ذُرِّيَّتِي ۖ إِنِّي تُبْتُ إِلَيْكَ وَإِنِّي مِنَ الْمُسْلِمِينَ',
      en: 'My Lord, enable me to be grateful for Your favor which You have bestowed upon me and upon my parents, and to do righteousness of which You approve, and make righteous for me my descendants. Indeed, I have turned to You, and indeed, I am of the Muslims.',
      refAr: 'سورة الأحقاف: ١٥',
      refEn: 'Surah Al-Ahqaf: 15',
      key: '46:15'
    },
    {
      ar: 'وَالَّذِينَ جَاءُوا مِن بَعْدِهِمْ يَقُولُونَ رَبَّنَا اغْفِرْ لَنَا وَلِإِخْوَانِنَا الَّذِينَ سَبَقُونَا بِالإِيمَانِ',
      en: 'And those who came after them say, "Our Lord, forgive us and our brothers who preceded us in faith."',
      refAr: 'سورة الحشر: ١٠',
      refEn: 'Surah Al-Hashr: 10',
      key: '59:10'
    },
    {
      ar: 'رَّبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِمَن دَخَلَ بَيْتِيَ مُؤْمِنًا وَلِلْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ',
      en: 'My Lord, forgive me and my parents and whoever enters my house a believer, and the believing men and believing women.',
      refAr: 'سورة نوح: ٢٨',
      refEn: 'Surah Nuh: 28',
      key: '71:28'
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
      populateVerseSelect();
      renderCurrentVerse();
      updateAudioButtonUI(false);
      updatePrayerButtonUI();
    });
  });

  function initVerseSelector() {
    const select = document.getElementById('verse-select');
    if (!select) return;

    populateVerseSelect();

    select.addEventListener('change', () => {
      const nextIndex = parseInt(select.value, 10);
      if (Number.isNaN(nextIndex) || nextIndex === currentVerseIndex) return;
      currentVerseIndex = nextIndex;
      stopAudio();
      renderCurrentVerse();
      // Intentionally no playSelectedVerse() call here: selecting a verse
      // must never auto-start audio. Playback only ever starts from an
      // explicit click on the "Play recitation" button.
    });
  }

  function populateVerseSelect() {
    const select = document.getElementById('verse-select');
    if (!select) return;
    const currentLang = window.i18n ? window.i18n.getLang() : (localStorage.getItem('preferred_lang') || 'ar');
    const isArabic = currentLang === 'ar';

    select.innerHTML = QURAN_VERSES.map((verse, index) => {
      const label = isArabic ? verse.refAr : verse.refEn;
      return `<option value="${index}">${label}</option>`;
    }).join('');
    select.value = String(currentVerseIndex);
  }

  function stopAudio() {
    const audio = document.getElementById('quran-audio');
    if (audio && !audio.paused) {
      audio.pause();
    }
    updateAudioButtonUI(false);
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

    prayBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      const alreadyPrayed = localStorage.getItem(PRAYED_KEY) === 'true';
      if (alreadyPrayed) return;

      const nameInput = document.getElementById('pray-name-input');
      const messageInput = document.getElementById('pray-message-input');
      const name = nameInput ? nameInput.value.trim() : '';
      const message = messageInput ? messageInput.value.trim() : '';
      const verse = QURAN_VERSES[currentVerseIndex];
      const isArabic = (window.i18n ? window.i18n.getLang() : 'ar') === 'ar';

      prayBtn.disabled = true;
      let toastMessage = isArabic ? 'تقبّل الله دعاءكم وكتب أجركم' : 'May Allah accept your prayer and reward you';

      try {
        const res = await fetch('/api/prayers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, message, verse: verse.key })
        });

        if (res.status === 429) {
          // Rate-limited: let them retry shortly, don't mark as prayed yet.
          prayBtn.disabled = false;
          if (window.showToast) {
            window.showToast(isArabic
              ? 'محاولات كثيرة خلال وقت قصير. يرجى الانتظار قليلاً ثم إعادة المحاولة.'
              : 'Too many attempts in a short time. Please wait a moment and try again.');
          }
          return;
        }
        // Any other outcome (success, or a duplicate/server hiccup) still
        // proceeds to the local "prayed" state below: this button's job is
        // to acknowledge the visitor's own act of prayer, which shouldn't
        // hinge on a backend blip. The cloud copy is a bonus, not the
        // source of truth for this person's own confirmation.
      } catch (err) {
        console.warn('Could not reach prayer storage; recorded locally only.', err);
      }

      localStorage.setItem(PRAYED_KEY, 'true');
      if (name || message) {
        localStorage.setItem(PRAYER_NOTE_KEY, JSON.stringify({
          name,
          message,
          verse: verse.key,
          timestamp: new Date().toISOString()
        }));
      }

      if (window.showToast) {
        window.showToast(toastMessage);
      }

      prayBtn.disabled = false;
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
        <span>${isArabic ? 'تقبّل الله، شكراً لدعائك' : 'Thank you. Your prayer has been recorded.'}</span>
      `;
      if (prayStatusEl) {
        prayStatusEl.style.display = 'block';
        prayStatusEl.textContent = isArabic
          ? 'تم تسجيل دعائك. تقبّل الله منكم وجعله في ميزان حسناته.'
          : 'Your prayer has been recorded. May Allah accept your prayer and reward you.';
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

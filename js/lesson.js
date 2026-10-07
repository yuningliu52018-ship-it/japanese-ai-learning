function plainText(value = '') {
  const container = document.createElement('div');
  container.innerHTML = String(value);
  if (typeof container.querySelectorAll === 'function') {
    container.querySelectorAll('rt, rp').forEach((node) => node.remove());
  }
  return (container.textContent || String(value)).replace(/\s+/g, ' ').trim();
}

function lessonToken(value = '') {
  return plainText(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function escapeAttribute(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function answerLabel(item) {
  const core = window.LessonClassroomCore;
  return core ? core.labels[core.status(item)] : '待核對';
}

function evidenceHtml(item) {
  const evidence = item.answerEvidence;
  if (!evidence) return '';
  return `<details class="classroom-evidence"><summary>答案來源與核對紀錄</summary><p>${answerLabel(item)}</p>${(evidence.sources || []).map(source => `<p><a href="${escapeAttribute(source.href)}" target="_blank" rel="noopener">${source.kind === 'answer-book' ? '解答本' : source.kind === 'textbook' ? '課本' : '教師紀錄'} ${escapeAttribute(source.page)}頁｜${escapeAttribute(source.locator || '')}</a></p>`).join('') || '<p>尚缺逐題來源，不能標成已核對。</p>'}${evidence.review ? `<p>核對：${escapeAttribute(evidence.review.by)}｜${escapeAttribute(evidence.review.date)}<br>${escapeAttribute(evidence.review.method || '')}</p>` : ''}</details>`;
}

function resolveLessonId(data = {}) {
  if (data.id) return lessonToken(data.id);
  if (Number.isInteger(data.catalog?.order)) return `k${data.catalog.order}`;
  const folder = decodeURIComponent(location.pathname.split('/').filter(Boolean).at(-2) || 'lesson');
  return lessonToken(folder);
}

function resolvePageKey(section = {}) {
  if (section.pageKey != null && String(section.pageKey).trim()) return String(section.pageKey).trim();
  if (Number.isFinite(section.pageOrder) && section.pageOrder >= 10) return String(Math.trunc(section.pageOrder));
  const match = plainText(section.title || '').match(/(?:^|\D)(\d{2,3})(?:[–-]\d{2,3})?頁/);
  return match ? match[1] : null;
}

function prepareLessonLocations(data, lessonId) {
  let chapterId = 'lesson';
  const counts = new Map();
  const usedSectionIds = new Set();

  for (const section of data.sections || []) {
    if (section.type === 'chapter_heading') {
      chapterId = lessonToken(section.id || 'lesson');
      section.__lessonLocation = {
        key: `chapter-${chapterId}`,
        href: `#chapter-${chapterId}`,
        label: plainText(section.title || chapterId),
        chapterId,
        sectionId: `chapter-${chapterId}`,
        pageKey: null,
        kind: 'chapter'
      };
      continue;
    }

    const pageKey = resolvePageKey(section);
    const explicit = section.id ? lessonToken(section.id) : '';
    const base = explicit || `${lessonToken(section.type || 'section')}${pageKey ? `-page-${lessonToken(pageKey)}` : ''}`;
    const countKey = `${chapterId}-${base}`;
    const count = (counts.get(countKey) || 0) + 1;
    counts.set(countKey, count);
    let sectionId = `${chapterId}-${base}${count > 1 ? `-${count}` : ''}`;
    let duplicate = 2;
    while (usedSectionIds.has(sectionId)) sectionId = `${chapterId}-${base}-${duplicate++}`;
    usedSectionIds.add(sectionId);
    section.__lessonLocation = {
      key: `section-${sectionId}`,
      href: `#section-${lessonId}-${sectionId}`,
      label: plainText(section.title || sectionId),
      chapterId,
      sectionId,
      pageKey,
      kind: 'section'
    };
  }
}

function createJapaneseLessonApi() {
  let context = null;
  let navigation = null;
  let readyResolved = false;
  let resolveReady;
  let lastLocationSignature = '';
  const ready = new Promise((resolve) => { resolveReady = resolve; });

  const dispatch = (name, detail) => {
    if (!context?.root || typeof CustomEvent !== 'function') return;
    context.root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  };

  const api = {
    ready,
    _setContext(nextContext) {
      context = nextContext;
      context.root.lessonContext = context;
    },
    _hasNavigation() {
      return Boolean(navigation);
    },
    _registerNavigation(nextNavigation) {
      if (!context?.root || !nextNavigation) return false;
      navigation = nextNavigation;
      context.root.lessonNavigation = navigation;
      context.root.dataset.navigationKind = navigation.kind || 'sections';
      const detail = {
        lessonId: context.lessonId,
        navigationKind: navigation.kind || 'sections',
        locations: api.getLocations()
      };
      dispatch('lesson:navigation-ready', detail);
      if (!readyResolved) {
        readyResolved = true;
        resolveReady(api);
      }
      return true;
    },
    _notifyLocation(location, source = 'api') {
      if (!context || !location) return;
      const state = {
        lessonId: context.lessonId,
        navigationKind: navigation?.kind || 'sections',
        ...location
      };
      const signature = JSON.stringify([state.lessonId, state.key, state.chapterId, state.sectionId, state.pageKey]);
      if (signature === lastLocationSignature) return;
      lastLocationSignature = signature;
      dispatch('lesson:location-change', { ...state, source });
    },
    getState() {
      const location = navigation?.getCurrent?.() || null;
      return location ? {
        lessonId: context?.lessonId || null,
        navigationKind: navigation?.kind || 'sections',
        ...location
      } : null;
    },
    getLocations() {
      const locations = navigation?.getLocations?.() || context?.locations || [];
      return locations.map((location) => ({ ...location }));
    },
    navigate(target, options = {}) {
      return navigation?.goTo?.(target, options) || false;
    },
    reveal(target, options = {}) {
      return navigation?.reveal?.(target, options) || false;
    }
  };
  return api;
}

const japaneseLessonApi = typeof window !== 'undefined'
  ? (window.JapaneseLesson || (window.JapaneseLesson = createJapaneseLessonApi()))
  : createJapaneseLessonApi();

function speechButton(text, label = '播放') {
  const cleanText = plainText(text);
  if (!cleanText) return '';
  const encoded = encodeURIComponent(cleanText);
  const escaped = cleanText.replace(/"/g, '&quot;');
  const canShadow = label === '播放' || label === '朗讀本段';
  return `<span class="speech-actions"><button class="speech-button" type="button" data-speak="${encoded}" aria-label="播放日文：${escaped}"><span aria-hidden="true">▶</span> AI ${label}</button>${canShadow ? `<button class="shadow-button" type="button" data-shadow="${encoded}" aria-label="跟讀練習：${escaped}"><span aria-hidden="true">🎙</span> 跟讀</button>` : ''}</span>`;
}

function normalizeJapanese(text = '') {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s、。！？!?,.「」『』（）()・ー]/g, '');
}

function levenshteinDistance(a, b) {
  const rows = Array.from({ length: b.length + 1 }, (_, index) => [index]);
  rows[0] = Array.from({ length: a.length + 1 }, (_, index) => index);
  for (let row = 1; row <= b.length; row += 1) {
    for (let column = 1; column <= a.length; column += 1) {
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + (a[column - 1] === b[row - 1] ? 0 : 1)
      );
    }
  }
  return rows[b.length][a.length];
}

function pronunciationScore(target, transcript) {
  const expected = normalizeJapanese(target);
  const actual = normalizeJapanese(transcript);
  if (!expected || !actual) return 0;
  return Math.max(0, Math.round((1 - levenshteinDistance(expected, actual) / Math.max(expected.length, actual.length)) * 100));
}

function itemSpeechText(item = {}) {
  return item.speechReading || item.jpPlain || item.plainText || item.japanese || item.jpRuby || '';
}

function sectionSpeechText(section = {}) {
  const parts = [];
  if (section.type === 'long_reading') return (section.paragraphs || []).join('');
  for (const item of section.items || []) {
    if (section.type === 'grammar_notes') {
      for (const example of item.examples || []) {
        if (example.fromLang !== 'zh') parts.push(example.from);
        if (example.toLang !== 'zh') parts.push(example.to);
      }
    } else if (section.type === 'quiz_questions') {
      if (item.questionLanguage !== 'zh') parts.push(itemSpeechText(item) || item.question);
      if (item.optionsLanguage !== 'zh') parts.push(...(item.options || []));
    } else {
      parts.push(itemSpeechText(item));
    }
  }
  return parts.filter(Boolean).map(plainText).join('。');
}

function splitJapaneseSentences(text = '') {
  const clean = plainText(text);
  if (!clean) return [];
  if (Array.from(clean).length <= 120) return [clean];

  const hardSlice = (str, maxLen = 120) => {
    const cpChars = Array.from(str);
    const slices = [];
    for (let i = 0; i < cpChars.length; i += maxLen) {
      slices.push(cpChars.slice(i, i + maxLen).join(''));
    }
    return slices;
  };

  const primary = clean.match(/[^。！？\n]+[。！？\n]*|[。！？\n]+/gu) || [clean];
  const pieces = [];

  for (const seg of primary) {
    if (Array.from(seg).length <= 120) {
      pieces.push(seg);
    } else {
      const secondary = seg.match(/[^、；]+[、；]*|[、；]+/gu) || [seg];
      for (const sub of secondary) {
        if (Array.from(sub).length <= 120) {
          pieces.push(sub);
        } else {
          pieces.push(...hardSlice(sub, 120));
        }
      }
    }
  }

  const chunks = [];
  let current = '';
  let currentLen = 0;
  for (const piece of pieces) {
    const pLen = Array.from(piece).length;
    if (currentLen + pLen <= 120) {
      current += piece;
      currentLen += pLen;
    } else {
      if (current) chunks.push(current);
      current = piece;
      currentLen = pLen;
    }
  }
  if (current) chunks.push(current);

  return chunks.length ? chunks : [clean];
}

function renderSpeechToolbar() {
  return `
    <aside class="speech-toolbar" id="speech-toolbar" aria-label="日文 AI 發音導讀">
      <div class="speech-toolbar-info">
        <span class="toolbar-tag">AUDIO</span>
        <strong>教材隨身有聲伴讀</strong>
        <span id="speech-status" class="speech-status" aria-live="polite">點選 ▶ 即可播放</span>
      </div>
      <div class="speech-controls">
        <label for="speech-voice">語音</label>
        <select id="speech-voice" disabled aria-describedby="speech-voice-help"><option>正在載入日語語音…</option></select>
        <button class="speech-button" type="button" data-speak="${encodeURIComponent('明日は図書館で日本語を勉強します。')}" data-rate="0.95" disabled>▶ 試聽</button>
        <label for="speech-rate">速度</label>
        <select id="speech-rate">
          <option value="0.82">慢速 0.82×</option>
          <option value="0.95" selected>正常 0.95×</option>
          <option value="1.25">快速 1.25×</option>
        </select>
        <button class="speech-button shadow-toggle-btn" type="button" data-shadow-mode-toggle>🎙 開啟跟讀</button>
        <button class="speech-stop" type="button" data-speech-stop>■ 停止</button>
      </div>
      <small id="speech-voice-help">選擇語音後按試聽；選項僅儲存在此裝置、此瀏覽器的本站，不會同步至手機或其他網址。</small>
    </aside>
    <aside class="shadowing-panel" id="shadowing-panel" hidden aria-live="polite">
      <div class="shadowing-heading">
        <div><strong>跟讀練習</strong><span>先聽示範，再按下錄音說一次</span></div>
        <button type="button" class="shadow-close" data-shadow-close aria-label="關閉跟讀練習">×</button>
      </div>
      <p class="shadow-target" id="shadow-target" lang="ja"></p>
      <div class="shadowing-controls">
        <button type="button" class="speech-button" data-shadow-listen data-rate="0.95">▶ 正常示範</button>
        <button type="button" class="speech-button" data-shadow-listen data-rate="0.82">🐢 慢速示範</button>
        <button type="button" class="shadow-record" data-shadow-record>🎙 開始跟讀</button>
      </div>
      <p class="shadow-status" id="shadow-status">選擇一句日文開始練習。</p>
      <div class="shadow-result" id="shadow-result" hidden>
        <p><strong>辨識結果</strong><span id="shadow-transcript" lang="ja"></span></p>
        <p><strong>句子辨識度</strong><span id="shadow-score"></span></p>
        <p class="shadow-candidates" id="shadow-candidates" hidden></p>
        <p id="shadow-feedback"></p>
        <div class="shadow-playback" id="shadow-playback" hidden>
          <strong>我的錄音</strong>
          <audio id="shadow-audio" controls preload="metadata"></audio>
        </div>
      </div>
      <small>「句子辨識度」只檢查瀏覽器聽到的文字，不代表音高、重音或語調評分；請用錄音回放與示範自行比較。</small>
    </aside>`;
}

const speechRootCleanups = new WeakMap();
let activeSpeechPagehideHandler = null;

function setupSpeech(root) {
  if (!root) return;
  if (typeof root === 'object' && speechRootCleanups.has(root)) {
    try {
      speechRootCleanups.get(root)();
    } catch {}
    speechRootCleanups.delete(root);
  }

  let isCleanedUp = false;
  const status = root.querySelector('#speech-status');
  const synthesis = window.speechSynthesis;
  let japaneseVoice = null;
  const voiceSelect = root.querySelector('#speech-voice');
  const voiceStorageKey = 'japanese-ai-learning.speech-voice.v1';
  const voiceKey = (voice) => JSON.stringify([voice.voiceURI, voice.name, voice.lang, voice.localService]);
  let savedVoiceKey = null;
  try { savedVoiceKey = localStorage.getItem(voiceStorageKey); } catch { /* Storage may be blocked in private mode. */ }
  let japaneseVoices = [];
  let shadowTarget = '';
  let recognition = null;
  let recognitionActive = false;
  let recognitionTimer = null;
  let mediaRecorder = null;
  let microphoneStream = null;
  let recordedChunks = [];
  let recordingUrl = '';
  let recordGeneration = 0;
  let requestingMicrophone = false;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const panel = root.querySelector('#shadowing-panel');
  const targetElement = root.querySelector('#shadow-target');
  const shadowStatus = root.querySelector('#shadow-status');
  const shadowResult = root.querySelector('#shadow-result');
  const transcriptElement = root.querySelector('#shadow-transcript');
  const scoreElement = root.querySelector('#shadow-score');
  const candidatesElement = root.querySelector('#shadow-candidates');
  const feedbackElement = root.querySelector('#shadow-feedback');
  const playbackElement = root.querySelector('#shadow-playback');
  const recordedAudio = root.querySelector('#shadow-audio');

  const revokeRecordingUrl = () => {
    if (recordingUrl) {
      try { URL.revokeObjectURL(recordingUrl); } catch {}
      recordingUrl = '';
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    } catch {}
    try {
      microphoneStream?.getTracks().forEach((track) => track.stop());
    } catch {}
    microphoneStream = null;
    mediaRecorder = null;
  };

  const GOOGLE_VOICE_KEY = 'google-online';
  const GOOGLE_VOICE_LABEL = 'Google 線上日語（自然語音）';
  let useGoogleOnline = savedVoiceKey === null || savedVoiceKey === GOOGLE_VOICE_KEY;
  let speechReady = false;
  let currentPlaySession = 0;
  let activeAudio = null;
  let activeAudioCleanup = null;

  const ensureNoReferrerMeta = () => {
    if (typeof document === 'undefined' || !document.head) return;
    if (!document.querySelector('meta[name="referrer"]')) {
      const meta = document.createElement('meta');
      meta.name = 'referrer';
      meta.content = 'no-referrer';
      document.head.appendChild(meta);
    }
  };
  ensureNoReferrerMeta();

  const stopPlayback = () => {
    currentPlaySession++;
    if (typeof activeAudioCleanup === 'function') {
      try {
        activeAudioCleanup();
      } catch {}
      activeAudioCleanup = null;
    }
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
        activeAudio.src = '';
        if (typeof activeAudio.removeAttribute === 'function') {
          activeAudio.removeAttribute('src');
        }
      } catch {}
      activeAudio = null;
    }
    try {
      synthesis?.cancel();
    } catch {}
    root.querySelectorAll('.speech-button.is-playing, .shadow-button.is-playing').forEach((button) => {
      button.classList.remove('is-playing');
    });
  };

  const handlePageHide = () => {
    if (isCleanedUp) return;
    recordGeneration++;
    requestingMicrophone = false;
    try { recognition?.abort(); } catch {}
    recognitionActive = false;
    clearTimeout(recognitionTimer);
    stopPlayback();
    stopRecording();
    revokeRecordingUrl();
    if (recordedAudio) {
      try {
        recordedAudio.pause();
        recordedAudio.src = '';
        if (typeof recordedAudio.removeAttribute === 'function') {
          recordedAudio.removeAttribute('src');
        }
        if (typeof recordedAudio.load === 'function') {
          recordedAudio.load();
        }
      } catch {}
    }
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    const prevHandler = activeSpeechPagehideHandler || window.__speechPagehideHandler;
    if (typeof window.removeEventListener === 'function' && prevHandler) {
      try { window.removeEventListener('pagehide', prevHandler); } catch {}
    }
    activeSpeechPagehideHandler = handlePageHide;
    window.__speechPagehideHandler = handlePageHide;
    window.addEventListener('pagehide', handlePageHide);
  }

  const speakText = (text, rate = 0.95, options = {}) => {
    const { onStart, onEnd, onError, playButton } = options;
    stopPlayback();
    root.querySelectorAll('audio').forEach(audio => audio.pause());
    const session = currentPlaySession;

    let fallbackTriggered = false;
    let currentChunkIndex = 0;
    let currentChunkToken = 0;
    let chunks = [];

    if (!text) {
      onEnd?.();
      return;
    }

    const startIndicator = () => {
      if (session !== currentPlaySession) return;
      root.querySelectorAll('.speech-button.is-playing, .shadow-button.is-playing').forEach((b) => b.classList.remove('is-playing'));
      if (playButton) playButton.classList.add('is-playing');
      if (status) status.textContent = `播放中：${text.slice(0, 34)}${text.length > 34 ? '…' : ''}`;
      onStart?.();
    };

    const endIndicator = () => {
      if (session !== currentPlaySession) return;
      if (playButton) playButton.classList.remove('is-playing');
      if (status) status.textContent = '播放完成';
      onEnd?.();
    };

    const errorIndicator = (msg) => {
      if (session !== currentPlaySession) return;
      if (playButton) playButton.classList.remove('is-playing');
      if (status) status.textContent = msg || '播放失敗';
      onError?.();
    };

    const speakWithSynthesis = (targetText = text) => {
      if (session !== currentPlaySession) return;
      if (!synthesis || typeof window.SpeechSynthesisUtterance !== 'function') {
        errorIndicator('此瀏覽器不支援語音播放');
        return;
      }
      try {
        synthesis.cancel();
      } catch {}
      const utterance = new SpeechSynthesisUtterance(targetText);
      utterance.lang = 'ja-JP';
      utterance.rate = rate;
      utterance.pitch = 1;
      if (japaneseVoice) utterance.voice = japaneseVoice;

      utterance.onstart = () => {
        if (session !== currentPlaySession) return;
        startIndicator();
        if (fallbackTriggered && status) {
          status.textContent = `自動改用本機語音播放中：${targetText.slice(0, 26)}${targetText.length > 26 ? '…' : ''}`;
        }
      };
      utterance.onend = () => {
        if (session !== currentPlaySession) return;
        endIndicator();
      };
      utterance.onerror = () => {
        if (session !== currentPlaySession) return;
        errorIndicator('播放失敗，請確認裝置已安裝日文語音');
      };
      synthesis.speak(utterance);
      return utterance;
    };

    if (!useGoogleOnline || typeof Audio === 'undefined') {
      return speakWithSynthesis(text);
    }

    chunks = splitJapaneseSentences(text);
    if (!chunks.length) {
      endIndicator();
      return;
    }

    const playNextChunk = () => {
      if (session !== currentPlaySession) return;
      if (currentChunkIndex >= chunks.length) {
        endIndicator();
        return;
      }

      const chunk = chunks[currentChunkIndex];
      const chunkToken = ++currentChunkToken;
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodeURIComponent(chunk)}`;
      let audio;
      try {
        audio = new Audio();
      } catch {
        triggerFallback();
        return;
      }
      audio.preload = 'auto';
      activeAudio = audio;

      let loadTimer = null;
      let watchdogTimer = null;

      const cleanup = () => {
        if (loadTimer) {
          clearTimeout(loadTimer);
          loadTimer = null;
        }
        if (watchdogTimer) {
          clearTimeout(watchdogTimer);
          watchdogTimer = null;
        }
        audio.removeEventListener('loadedmetadata', onMeta);
        audio.removeEventListener('playing', onPlaying);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onErrorEvent);
        if (activeAudioCleanup === cleanupHandler) {
          activeAudioCleanup = null;
        }
      };

      const cleanupHandler = () => {
        cleanup();
        try {
          audio.pause();
          audio.currentTime = 0;
          audio.src = '';
          if (typeof audio.removeAttribute === 'function') {
            audio.removeAttribute('src');
          }
        } catch {}
      };
      activeAudioCleanup = cleanupHandler;

      function triggerFallback() {
        if (fallbackTriggered || session !== currentPlaySession || chunkToken !== currentChunkToken || activeAudio !== audio) return;
        fallbackTriggered = true;
        cleanupHandler();
        if (activeAudio === audio) activeAudio = null;
        if (status) status.textContent = '線上語音無法載入，自動改用本機語音播放';
        const remainingText = chunks.slice(currentChunkIndex).join('');
        if (!remainingText) {
          endIndicator();
          return;
        }
        speakWithSynthesis(remainingText);
      }

      loadTimer = setTimeout(() => {
        if (session !== currentPlaySession || chunkToken !== currentChunkToken || activeAudio !== audio) return;
        triggerFallback();
      }, 6000);

      function onMeta() {
        if (session !== currentPlaySession || chunkToken !== currentChunkToken || activeAudio !== audio) return;
        audio.playbackRate = rate;
      }

      function onPlaying() {
        if (loadTimer) {
          clearTimeout(loadTimer);
          loadTimer = null;
        }
        if (session !== currentPlaySession || chunkToken !== currentChunkToken || activeAudio !== audio) return;
        if (currentChunkIndex === 0) {
          startIndicator();
        }
        const expectedSec = Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration / (rate || 1)
          : Math.max(3, (Array.from(chunk).length / 3) / (rate || 1));
        const watchdogMs = Math.max(6000, Math.ceil((expectedSec + 4) * 1000));
        watchdogTimer = setTimeout(() => {
          if (session !== currentPlaySession || chunkToken !== currentChunkToken || activeAudio !== audio) return;
          triggerFallback();
        }, watchdogMs);
      }

      function onEnded() {
        cleanup();
        if (activeAudio === audio) activeAudio = null;
        if (session !== currentPlaySession || chunkToken !== currentChunkToken) return;
        currentChunkIndex++;
        playNextChunk();
      }

      function onErrorEvent() {
        if (session !== currentPlaySession || chunkToken !== currentChunkToken || activeAudio !== audio) return;
        triggerFallback();
      }

      audio.addEventListener('loadedmetadata', onMeta);
      audio.addEventListener('playing', onPlaying);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onErrorEvent);

      audio.src = url;
      audio.playbackRate = rate;

      try {
        const promise = audio.play();
        if (promise && typeof promise.catch === 'function') {
          promise.catch(() => {
            if (session !== currentPlaySession || chunkToken !== currentChunkToken || activeAudio !== audio) return;
            triggerFallback();
          });
        }
      } catch {
        triggerFallback();
      }
    };

    playNextChunk();
  };

  root.lessonSpeech = { stop: stopPlayback };

  const playShadowTarget = (rate = 0.95, onEnd) => {
    if (!shadowTarget) return;
    speakText(shadowTarget, rate, {
      onEnd: () => {
        onEnd?.();
      }
    });
  };

  const hasAudioSupport = typeof Audio !== 'undefined';
  const hasSynthesisSupport = synthesis && typeof window.SpeechSynthesisUtterance === 'function';
  if (!hasAudioSupport && !hasSynthesisSupport) {
    if (status) status.textContent = '此瀏覽器不支援語音播放';
    root.querySelectorAll('.speech-button, .shadow-button, .speech-stop').forEach((button) => {
      button.disabled = true;
    });
    return;
  }

  const setSpeechEnabled = (enabled) => {
    speechReady = enabled;
    root.querySelectorAll('.speech-button, .shadow-button').forEach((button) => { button.disabled = !enabled; });
    voiceSelect.disabled = !enabled;
  };
  let voiceTimer;
  const selectVoice = (finished = false) => {
    if (isCleanedUp) return;
    const voices = synthesis?.getVoices ? synthesis.getVoices() : [];
    const rank = (voice) => (voice.lang.toLowerCase() === 'ja-jp' ? 0 : 2) + (voice.localService ? 0 : 1);
    japaneseVoices = voices.filter((voice) => /^ja(?:-|$)/i.test(voice.lang))
      .sort((a, b) => rank(a) - rank(b) || Number(b.default) - Number(a.default)
        || a.name.localeCompare(b.name) || String(a.voiceURI).localeCompare(String(b.voiceURI)));

    if (!finished && !japaneseVoices.length) {
      voiceSelect.replaceChildren();
      const option = document.createElement('option');
      option.textContent = '正在載入日語語音…';
      voiceSelect.append(option);
      if (status) status.textContent = '等待日語語音載入…';
      setSpeechEnabled(false);
      return;
    }

    const foundSavedBrowserVoice = savedVoiceKey && savedVoiceKey !== GOOGLE_VOICE_KEY
      ? japaneseVoices.find((voice) => voiceKey(voice) === savedVoiceKey)
      : null;

    if (foundSavedBrowserVoice) {
      japaneseVoice = foundSavedBrowserVoice;
      useGoogleOnline = false;
    } else if (savedVoiceKey === GOOGLE_VOICE_KEY || !savedVoiceKey) {
      useGoogleOnline = true;
      japaneseVoice = japaneseVoices[0] || null;
    } else {
      japaneseVoice = japaneseVoices[0] || null;
      useGoogleOnline = false;
    }

    voiceSelect.replaceChildren();

    const googleOption = document.createElement('option');
    googleOption.value = GOOGLE_VOICE_KEY;
    googleOption.textContent = GOOGLE_VOICE_LABEL;
    voiceSelect.append(googleOption);

    for (const voice of japaneseVoices) {
      const option = document.createElement('option');
      option.value = voiceKey(voice);
      option.textContent = `${voice.name} (${voice.lang}・${voice.localService ? '本機' : '線上'})`;
      voiceSelect.append(option);
    }

    clearTimeout(voiceTimer);
    if (useGoogleOnline) {
      voiceSelect.value = GOOGLE_VOICE_KEY;
      if (status) status.textContent = '已就緒：Google 線上日語（自然語音），點選播放即可聆聽。';
    } else if (japaneseVoice) {
      voiceSelect.value = voiceKey(japaneseVoice);
      if (status) status.textContent = savedVoiceKey && voiceKey(japaneseVoice) !== savedVoiceKey
        ? '原選語音目前不可用，暫用優先候選；可重新選擇。' : '日語語音已就緒，可選擇並試聽。';
    } else {
      voiceSelect.value = GOOGLE_VOICE_KEY;
      useGoogleOnline = true;
      if (status) status.textContent = '已就緒：Google 線上日語（自然語音）。';
    }

    setSpeechEnabled(true);
  };
  setSpeechEnabled(false);
  const onVoicesChanged = () => {
    if (isCleanedUp) return;
    selectVoice(true);
  };
  if (synthesis?.addEventListener) {
    synthesis.addEventListener('voiceschanged', onVoicesChanged);
  }
  voiceTimer = setTimeout(() => selectVoice(true), 3000);
  selectVoice();

  const onVoiceChange = () => {
    if (isCleanedUp) return;
    stopPlayback();
    if (voiceSelect.value === GOOGLE_VOICE_KEY) {
      useGoogleOnline = true;
      savedVoiceKey = GOOGLE_VOICE_KEY;
      try {
        localStorage.setItem(voiceStorageKey, GOOGLE_VOICE_KEY);
        if (status) status.textContent = `已記住：${GOOGLE_VOICE_LABEL}，按試聽即可體驗。`;
      } catch {
        if (status) status.textContent = '語音已切換，但瀏覽器禁止儲存；本次有效。';
      }
      return;
    }

    const selected = japaneseVoices.find((voice) => voiceKey(voice) === voiceSelect.value);
    if (!selected) return;
    useGoogleOnline = false;
    japaneseVoice = selected;
    savedVoiceKey = voiceKey(selected);
    try {
      localStorage.setItem(voiceStorageKey, savedVoiceKey);
      if (status) status.textContent = `已記住：${selected.name}，按試聽即可比較。`;
    } catch {
      if (status) status.textContent = '語音已切換，但瀏覽器禁止儲存；本次有效。';
    }
  };
  if (voiceSelect && typeof voiceSelect.addEventListener === 'function') {
    voiceSelect.addEventListener('change', onVoiceChange);
  }

  const onRootClick = async (event) => {
    if (isCleanedUp) return;
    const closeButton = event.target.closest('[data-shadow-close]');
    if (closeButton) {
      recordGeneration++;
      requestingMicrophone = false;
      const recordBtn = root.querySelector('[data-shadow-record]');
      if (recordBtn) {
        recordBtn.disabled = false;
        recordBtn.classList.remove('is-recording');
        recordBtn.textContent = '🎙 開始跟讀';
      }
      try { recognition?.abort(); } catch {}
      recognitionActive = false;
      clearTimeout(recognitionTimer);
      stopPlayback();
      stopRecording();
      revokeRecordingUrl();
      if (recordedAudio) {
        try {
          recordedAudio.pause();
          recordedAudio.src = '';
          if (typeof recordedAudio.removeAttribute === 'function') {
            recordedAudio.removeAttribute('src');
          }
          if (typeof recordedAudio.load === 'function') {
            recordedAudio.load();
          }
        } catch {}
      }
      playbackElement.hidden = true;
      panel.hidden = true;
      root.classList?.remove?.('shadow-mode-active');
      const toggleOnClose = root.querySelector?.('[data-shadow-mode-toggle]');
      if (toggleOnClose) {
        toggleOnClose.textContent = '🎙 開啟跟讀';
        toggleOnClose.classList.remove('is-active');
      }
      return;
    }

    const shadowToggle = event.target.closest('[data-shadow-mode-toggle]');
    if (shadowToggle) {
      const active = root.classList?.contains?.('shadow-mode-active');
      if (active) {
        root.classList?.remove?.('shadow-mode-active');
        shadowToggle.textContent = '🎙 開啟跟讀';
        shadowToggle.classList.remove('is-active');
        if (status) status.textContent = '已返回一般閱讀模式';
      } else {
        root.classList?.add?.('shadow-mode-active');
        shadowToggle.textContent = '✓ 關閉跟讀模式';
        shadowToggle.classList.add('is-active');
        if (status) status.textContent = '跟讀模式已開啟，每句皆可點選跟讀';
      }
      return;
    }

    const shadowButton = event.target.closest('[data-shadow]');
    if (shadowButton) {
      if (!speechReady) return;
      root.classList?.add?.('shadow-mode-active');
      const toggleOnOpen = root.querySelector?.('[data-shadow-mode-toggle]');
      if (toggleOnOpen) {
        toggleOnOpen.textContent = '✓ 關閉跟讀模式';
        toggleOnOpen.classList.add('is-active');
      }
      shadowTarget = decodeURIComponent(shadowButton.dataset.shadow || '');
      targetElement.textContent = shadowTarget;
      shadowResult.hidden = true;
      playbackElement.hidden = true;
      revokeRecordingUrl();
      if (recordedAudio) {
        try {
          recordedAudio.pause();
          recordedAudio.src = '';
          if (typeof recordedAudio.removeAttribute === 'function') {
            recordedAudio.removeAttribute('src');
          }
          if (typeof recordedAudio.load === 'function') {
            recordedAudio.load();
          }
        } catch {}
      }
      const recordBtn = root.querySelector('[data-shadow-record]');
      if (recordBtn) {
        recordBtn.disabled = false;
        recordBtn.classList.remove('is-recording');
        recordBtn.textContent = '🎙 開始跟讀';
      }
      panel.hidden = false;
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      shadowStatus.textContent = '正在播放示範，聽完後請按「開始跟讀」。';
      playShadowTarget(Number(root.querySelector('#speech-rate')?.value || 0.95), () => {
        shadowStatus.textContent = '輪到你了：按「開始跟讀」並說出上面的句子。';
      });
      return;
    }

    if (event.target.closest('[data-shadow-listen]')) {
      if (!shadowTarget || !speechReady) return;
      const requestedRate = Number(event.target.closest('[data-shadow-listen]').dataset.rate || 0.95);
      playShadowTarget(requestedRate, () => {
        shadowStatus.textContent = '輪到你了：按「開始跟讀」並說出上面的句子。';
      });
      shadowStatus.textContent = requestedRate < 0.95 ? '正在播放慢速示範。請注意長音、促音與停頓。' : '正在播放正常速度示範。';
      return;
    }

    const recordButton = event.target.closest('[data-shadow-record]');
    if (recordButton) {
      if (requestingMicrophone) {
        return;
      }
      if (recognitionActive) {
        try { recognition?.stop(); } catch {}
        shadowStatus.textContent = '正在整理辨識結果…';
        return;
      }
      if (!Recognition) {
        shadowStatus.textContent = '此瀏覽器沒有提供日文語音辨識。請改用電腦版 Chrome；目前仍可播放示範並自行跟讀。';
        return;
      }
      if (window.isSecureContext === false) {
        shadowStatus.textContent = '麥克風只能在 HTTPS 安全連線使用，請從正式 GitHub Pages 網址開啟。';
        return;
      }

      stopPlayback();
      revokeRecordingUrl();
      stopRecording();

      const thisGeneration = ++recordGeneration;
      requestingMicrophone = true;
      recordButton.disabled = true;
      recordButton.textContent = '⏳ 正在取得麥克風權限…';
      shadowResult.hidden = true;
      shadowStatus.textContent = '正在確認麥克風權限…';

      let stream = null;
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (permissionError) {
          if (thisGeneration === recordGeneration) {
            requestingMicrophone = false;
            recordButton.disabled = false;
            recordButton.textContent = '🎙 開始跟讀';
            shadowStatus.textContent = permissionError.name === 'NotAllowedError'
              ? '麥克風權限被拒絕。請按網址列左側圖示，將「麥克風」改成允許後重新整理。'
              : '目前無法開啟麥克風，請確認沒有被其他程式占用。';
          }
          return;
        }
      }

      if (thisGeneration !== recordGeneration || panel.hidden) {
        requestingMicrophone = false;
        if (stream) {
          try {
            stream.getTracks().forEach((track) => track.stop());
          } catch {}
        }
        return;
      }

      requestingMicrophone = false;
      recordButton.disabled = false;
      recordButton.textContent = '🎙 開始跟讀';
      microphoneStream = stream;

      const recorderGen = thisGeneration;
      let localChunks = [];
      if (stream && typeof MediaRecorder === 'function') {
        try {
          mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.ondataavailable = (chunkEvent) => {
            if (chunkEvent.data && chunkEvent.data.size > 0) {
              localChunks.push(chunkEvent.data);
            }
          };
          mediaRecorder.onstop = () => {
            if (recorderGen !== recordGeneration || panel.hidden) {
              localChunks = [];
              return;
            }
            if (!localChunks.length) return;
            revokeRecordingUrl();
            try {
              const blob = new Blob(localChunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
              localChunks = [];
              const url = URL.createObjectURL(blob);
              if (recorderGen !== recordGeneration || panel.hidden) {
                try { URL.revokeObjectURL(url); } catch {}
                return;
              }
              recordingUrl = url;
              recordedAudio.src = recordingUrl;
              playbackElement.hidden = false;
            } catch {}
          };
        } catch {}
      }

      try { recognition?.abort(); } catch {}
      recognition = new Recognition();
      recognition.lang = 'ja-JP';
      recognition.interimResults = false;
      recognition.maxAlternatives = 5;
      recognition.continuous = false;
      let recognitionHadResult = false;
      let recognitionError = '';
      recognition.onstart = () => {
        if (thisGeneration !== recordGeneration || panel.hidden) {
          try { recognition.abort(); } catch {}
          stopRecording();
          return;
        }
        recognitionActive = true;
        recordButton.classList.add('is-recording');
        recordButton.textContent = '■ 說完請按停止';
        shadowStatus.textContent = '麥克風已開啟，請開始說日文（最長12秒）。';
        if (mediaRecorder?.state === 'inactive') {
          try { mediaRecorder.start(); } catch {}
        }
        clearTimeout(recognitionTimer);
        recognitionTimer = setTimeout(() => {
          if (recognitionActive) {
            try { recognition.stop(); } catch {}
          }
        }, 12000);
      };
      recognition.onaudiostart = () => { shadowStatus.textContent = '已連接麥克風，正在等待你說話…'; };
      recognition.onsoundstart = () => { shadowStatus.textContent = '已收到聲音，請繼續說完整句子。'; };
      recognition.onspeechstart = () => { shadowStatus.textContent = '正在聽你的日文…說完後請稍等。'; };
      recognition.onspeechend = () => {
        shadowStatus.textContent = '已收到語音，正在辨識日文…';
        if (recognitionActive) {
          try { recognition.stop(); } catch {}
        }
      };
      recognition.onresult = (resultEvent) => {
        if (thisGeneration !== recordGeneration || panel.hidden) return;
        recognitionHadResult = true;
        const alternatives = Array.from(resultEvent.results[0]).map((result) => ({
          transcript: result.transcript,
          score: pronunciationScore(shadowTarget, result.transcript)
        })).sort((a, b) => b.score - a.score);
        const bestMatch = alternatives[0];
        const score = bestMatch.score;
        transcriptElement.textContent = bestMatch.transcript;
        scoreElement.textContent = `${score}%`;
        const otherCandidates = alternatives.slice(1).map((item) => item.transcript).filter((text, index, list) => text !== bestMatch.transcript && list.indexOf(text) === index);
        candidatesElement.textContent = otherCandidates.length ? `其他辨識候選：${otherCandidates.join('／')}` : '';
        candidatesElement.hidden = !otherCandidates.length;
        feedbackElement.textContent = score >= 90 ? '句子內容辨識很完整。請回放錄音，與正常示範比較語調和停頓。' : score >= 75 ? '大部分內容已辨識。請回放錄音，確認容易含糊的部分。' : score >= 55 ? '部分內容有被辨識，建議先聽慢速示範再試一次。' : '辨識到的文字差異較大；先用慢速示範分段模仿，再重新錄一次。';
        shadowResult.hidden = false;
      };
      recognition.onerror = (recognitionEvent) => {
        if (thisGeneration !== recordGeneration || panel.hidden) return;
        recognitionError = recognitionEvent.error;
        const errorMessages = {
          'not-allowed': '麥克風權限未允許。請在網址列的網站設定中允許麥克風。',
          'audio-capture': '找不到可用的麥克風，請檢查系統輸入裝置。',
          'no-speech': '麥克風已開啟，但沒有收到清楚語音。請靠近麥克風，按下按鈕後立即開始說。',
          'network': '瀏覽器語音辨識服務連線失敗，請確認網路後再試。',
          'aborted': '本次錄音已取消。'
        };
        shadowStatus.textContent = errorMessages[recognitionEvent.error] || `語音辨識失敗（${recognitionEvent.error}），請再試一次。`;
      };
      recognition.onnomatch = () => {
        if (thisGeneration !== recordGeneration || panel.hidden) return;
        recognitionError = 'no-match';
        shadowStatus.textContent = '有收到聲音，但無法判斷成日文。請先用慢速聽一次，再清楚重說。';
      };
      recognition.onend = () => {
        clearTimeout(recognitionTimer);
        stopRecording();
        recognitionActive = false;
        if (thisGeneration === recordGeneration && !panel.hidden) {
          recordButton.classList.remove('is-recording');
          recordButton.textContent = '🎙 再說一次';
          if (recognitionHadResult) {
            shadowStatus.textContent = '完成！可查看結果，或再說一次。';
          } else if (!recognitionError) {
            shadowStatus.textContent = '錄音結束，但沒有取得辨識文字。請靠近麥克風並在按下後立即開始說。';
          }
        }
      };
      try {
        recognition.start();
      } catch {
        recognitionActive = false;
        stopRecording();
        if (thisGeneration === recordGeneration && !panel.hidden) {
          recordButton.disabled = false;
          recordButton.textContent = '🎙 開始跟讀';
          shadowStatus.textContent = '麥克風尚未準備好，請等待一秒後再按一次。';
        }
      }
      return;
    }

    const stopButton = event.target.closest('[data-speech-stop]');
    if (stopButton) {
      stopPlayback();
      root.querySelectorAll('audio').forEach(audio => audio.pause());
      if (status) status.textContent = '已停止播放';
      return;
    }

    const playButton = event.target.closest('[data-speak]');
    if (!playButton || !speechReady) return;

    const text = decodeURIComponent(playButton.dataset.speak || '');
    if (!text) return;

    const rate = Number(playButton.dataset.rate || root.querySelector('#speech-rate')?.value || 0.95);
    speakText(text, rate, { playButton });
  };
  root.addEventListener('click', onRootClick);

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    if (typeof root.removeEventListener === 'function') {
      try { root.removeEventListener('click', onRootClick); } catch {}
    }
    if (voiceSelect && typeof voiceSelect.removeEventListener === 'function') {
      try { voiceSelect.removeEventListener('change', onVoiceChange); } catch {}
    }
    if (synthesis && typeof synthesis.removeEventListener === 'function') {
      try { synthesis.removeEventListener('voiceschanged', onVoicesChanged); } catch {}
    }
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      if (activeSpeechPagehideHandler === handlePageHide) {
        try { window.removeEventListener('pagehide', handlePageHide); } catch {}
        activeSpeechPagehideHandler = null;
        if (window.__speechPagehideHandler === handlePageHide) {
          window.__speechPagehideHandler = null;
        }
      }
    }

    clearTimeout(voiceTimer);
    clearTimeout(recognitionTimer);

    recordGeneration++;
    requestingMicrophone = false;
    try { recognition?.abort(); } catch {}
    recognitionActive = false;
    stopPlayback();
    stopRecording();
    revokeRecordingUrl();
    if (recordedAudio) {
      try {
        recordedAudio.pause();
        recordedAudio.src = '';
        if (typeof recordedAudio.removeAttribute === 'function') {
          recordedAudio.removeAttribute('src');
        }
        if (typeof recordedAudio.load === 'function') {
          recordedAudio.load();
        }
      } catch {}
    }
  };

  if (typeof root === 'object') {
    speechRootCleanups.set(root, cleanup);
  }
}

function resolveSectionId(section, usedIds) {
  if (section.id && !usedIds.has(section.id)) {
    usedIds.add(section.id);
    return section.id;
  }
  let baseId = null;
  const title = plainText(section.title || '');
  if (section.type === 'dialogue_lessons') {
    baseId = 'section-dialogue';
  } else if (section.type === 'scenario_practice') {
    if (title.includes('尋ねる') || title.includes('教える')) baseId = 'section-scenario';
    else if (title.includes('行き方') || title.includes('道順')) baseId = 'section-scenario-intro';
    else baseId = 'section-scenario';
  } else if (section.type === 'audio_tracks') {
    if (title.includes('CD18')) baseId = 'section-listening';
    else if (title.includes('CD19')) baseId = 'section-audio-cd19';
    else if (title.includes('CD20')) baseId = 'section-audio-cd20';
    else baseId = 'section-audio';
  } else if (section.type === 'long_reading') {
    baseId = 'section-reading';
  } else if (title.includes('逐句翻譯')) {
    baseId = 'section-reading-sentences';
  }

  if (!baseId) return null;
  let candidate = baseId;
  let counter = 2;
  while (usedIds.has(candidate)) {
    candidate = `${baseId}-${counter++}`;
  }
  usedIds.add(candidate);
  return candidate;
}

function renderLesson(root, data) {
  if (!root || !data) return;

  const html = [];
  if (!document.getElementById('lesson-page-title')) {
    html.push(`<h2>${data.titleRuby || data.title}</h2>`);
    html.push(`<p class="lesson-muted">${data.description || ''}</p>`);
  }

  if (data.status) {
    html.push(`<span class="lesson-status">${data.status}</span>`);
  }

  html.push(renderSpeechToolbar());

  if (!data.sections?.length) {
    html.push(`<p class="empty-state">本課教材正在整理中，完成後會顯示在這裡。</p>`);
  }

  const usedIds = new Set(['speech-toolbar']);
  for (const chapter of data.chapters || []) {
    usedIds.add(`chapter-${chapter.id}`);
  }

  for (const section of data.sections || []) {
    if (section.type === 'chapter_heading') {
      const location = section.__lessonLocation;
      html.push(`<div class="lesson-section" data-lesson-section data-section-kind="chapter" data-chapter-id="${escapeAttribute(location?.chapterId || section.id)}" data-section-id="${escapeAttribute(location?.sectionId || `chapter-${section.id}`)}" data-location-key="${escapeAttribute(location?.key || `chapter-${section.id}`)}" data-page-label="${escapeAttribute(section.pages || '')}">`);
      html.push(`
        <header class="chapter-heading" id="chapter-${section.id}">
          <span class="chapter-number">${section.number}</span>
          <div>
            <p class="chapter-pages">課本 ${section.pages} 頁</p>
            <h2>${section.title}<small>${section.chinese}</small></h2>
            <p>${section.description}</p>
          </div>
        </header>`);
      if (!section.hasContent) {
        html.push(`<p class="chapter-pending">本部分將依照已提供的課本照片逐頁建置。</p>`);
      }
      html.push(`</div>`);
      continue;
    }

    const location = section.__lessonLocation || {};
    const secId = resolveSectionId(section, usedIds);
    const canonicalId = `section-${data.__lessonId || 'lesson'}-${location.sectionId || lessonToken(section.type || 'section')}`;
    const domId = secId || canonicalId;
    const pageAttribute = Number.isInteger(section.pageOrder) ? ` data-page="${section.pageOrder}"` : '';
    const pageKeyAttribute = location.pageKey ? ` data-page-key="${escapeAttribute(location.pageKey)}"` : '';
    const pageOrderAttribute = Number.isFinite(section.pageOrder) ? ` data-page-order="${section.pageOrder}"` : '';
    html.push(`<div class="lesson-section" id="${escapeAttribute(domId)}" data-lesson-section data-section-kind="content" data-chapter-id="${escapeAttribute(location.chapterId || 'lesson')}" data-section-id="${escapeAttribute(location.sectionId || lessonToken(section.type || 'section'))}" data-location-key="${escapeAttribute(location.key || canonicalId)}"${pageKeyAttribute}${pageOrderAttribute}${pageAttribute}>`);
    html.push(`<div class="lesson-section-heading"><h3>${section.title || ''}</h3>${speechButton(sectionSpeechText(section), '朗讀本單元')}</div>`);
    if (section.notice) html.push(`<p class="lesson-muted">${section.notice}</p>`);

    if (section.type === 'video_resource') {
      const start = Number(section.start) || 0;
      const videoTitle = plainText(section.title || '日文教學影片');
      html.push(`<article class="video-resource-card">`);
      html.push(`<div class="video-resource-frame"><iframe src="https://www.youtube-nocookie.com/embed/${section.videoId}?start=${start}" title="${videoTitle}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`);
      if (section.description) html.push(`<p>${section.description}</p>`);
      if (section.sourceUrl) html.push(`<a class="video-resource-link" href="${section.sourceUrl}" target="_blank" rel="noopener noreferrer">在 YouTube 開啟影片</a>`);
      html.push(`</article>`);
    } else if (section.type === 'audio_tracks') {
      html.push(`<div class="audio-track-grid">`);
      for (const item of section.items || []) {
        html.push(`<article class="audio-track-card">`);
        html.push(`<div class="audio-track-badge"><span>CD</span>${item.track}</div>`);
        html.push(`<div class="audio-track-content"><p class="audio-track-meta">課本 ${item.pages} 頁・${item.duration}</p><h3>${item.title}</h3><audio controls preload="metadata" src="${item.src}">您的瀏覽器不支援音訊播放。</audio><p class="lesson-muted">${item.segments?.length ? '真人教材音源。播放後可搭配下方逐句「跟讀」練習。' : '真人教材原音。可搭配本頁文字與課本照片聆聽練習。'}</p>`);
        if (item.segments?.length) {
          html.push(`<div class="audio-segment-list"><h4>逐句真人原音與解說</h4>`);
          for (const segment of item.segments) {
            html.push(`<article class="audio-segment">`);
            html.push(`<div class="audio-segment-heading"><strong>${segment.speaker || '原音'}</strong><button type="button" class="audio-segment-play" data-audio-start="${segment.start}" data-audio-end="${segment.end}">▶ 播放本句</button></div>`);
            html.push(`<p lang="ja">${segment.japanese}</p>`);
            if (segment.reading) html.push(`<p class="lesson-muted" lang="ja">${segment.reading}</p>`);
            if (segment.chinese) html.push(`<div class="lesson-kv"><strong>中文</strong>${segment.chinese}</div>`);
            if (segment.note) html.push(`<div class="lesson-kv"><strong>重點</strong>${segment.note}</div>`);
            html.push(`${speechButton(segment.japanese)}</article>`);
          }
          html.push(`</div>`);
        }
        html.push(`</div>`);
        html.push(`</article>`);
      }
      html.push(`</div>`);
    } else if (section.type === 'long_reading') {
      html.push(`<article class="reading-article">`);
      html.push(`<div class="reading-article-toolbar">${speechButton((section.paragraphs || []).join(''), '朗讀全文')}</div>`);
      (section.paragraphs || []).forEach((paragraph, index) => {
        html.push(`<div class="reading-paragraph"><span>${index + 1}</span><div><p lang="ja">${paragraph}</p>${speechButton(paragraph, '朗讀本段')}</div></div>`);
      });
      html.push(`</article>`);
    } else if (section.type === 'sentence_cards' || section.type === 'dialogue_lessons') {
      html.push(`<div class="lesson-grid">`);
      for (const item of section.items || []) {
        const displayedJapanese = item.classroom?.originalRuby || item.jpRuby || item.japanese || '';
        const plainJapanese = item.jpPlain || item.plainText || '';
        const itemIdAttribute = item.id
          ? ` data-item-id="${escapeAttribute(String(item.id))}"`
          : '';
        const answerTypeAttribute = item.answerType
          ? ` data-answer-type="${escapeAttribute(String(item.answerType))}"`
          : '';
        html.push(`<article class="lesson-item${item.answerType === 'suggested' ? ' is-suggested-answer' : ''}"${itemIdAttribute}${answerTypeAttribute}>`);
        html.push(`<h3>${item.topic || item.title || item.id || ''}</h3>`);
        if (item.answerType === 'suggested') {
          html.push(`<p class="lesson-answer-kind"><strong>示範答案</strong> 非課本印刷答案，其他合理答案也可以。</p>`);
        } else if (item.answerType || item.answerEvidence) {
          html.push(`<p class="lesson-answer-kind"><strong>${answerLabel(item)}</strong>${answerLabel(item) === '示範答案' ? ' 解答例並非唯一答案。' : ''}</p>`);
        }
        if (displayedJapanese) html.push(`<p lang="ja">${displayedJapanese}</p>`);
        if (!item.jpRuby && plainJapanese && plainJapanese !== displayedJapanese) {
          html.push(`<p class="lesson-muted" lang="ja">${plainJapanese}</p>`);
        }
        html.push(speechButton(item.classroom?.originalRuby || itemSpeechText(item)));
        if ((item.zh || item.chinese) && !item.classroom?.originalRuby) html.push(`<div class="lesson-kv"><strong>中文</strong>${item.zh || item.chinese}</div>`);
        if (item.classroom?.originalRuby) html.push(`<details class="lesson-answer classroom-answer"><summary>查看答案｜${answerLabel(item)}</summary><p lang="ja">${item.jpRuby || item.japanese}</p>${speechButton(itemSpeechText(item))}<p><strong>中文：</strong>${item.zh || item.chinese || ''}</p>${evidenceHtml(item)}</details>`);
        else html.push(evidenceHtml(item));
        if (item.grammarNote || item.verbInfo) html.push(`<div class="lesson-kv"><strong>文法解析</strong>${item.grammarNote || item.verbInfo}</div>`);
        if (item.examples?.length) {
          const isAnswer = item.classroom?.examplesRole === 'answer';
          const isCollapsible = isAnswer || section.chapter !== 'vocabulary';
          const summaryLabel = isAnswer ? '看答案' : item.examplesTitle || `更多例句／補充（點擊展開 ${item.examples.length} 句）`;
          if (isCollapsible) {
            html.push(`<details class="vocabulary-examples ${isAnswer ? 'lesson-answer' : 'lesson-examples-details'}"><summary class="vocabulary-examples-title">${summaryLabel}</summary>`);
          } else {
            html.push(`<div class="vocabulary-examples"><strong class="vocabulary-examples-title">${item.examplesTitle || '例句'}</strong>`);
          }
          for (const example of item.examples) {
            if (example.answerType) html.push(`<p class="lesson-muted">${answerLabel(example)}</p>${evidenceHtml(example)}`);
            html.push(`<div class="vocabulary-example"><p class="vocabulary-example-japanese" lang="ja">${example.ruby || example.japanese || example.plain}</p>${speechButton(example.plain || example.japanese || example.ruby)}${example.chinese ? `<p class="vocabulary-example-chinese">${example.chinese}</p>` : ''}</div>`);
            if (example.answerSource) html.push(`<p><a href="${escapeAttribute(example.answerSource)}" target="_blank" rel="noopener">查看解答本照片</a></p>`);
          }
          if (isCollapsible && item.supplementNote) {
            html.push(`<div class="lesson-kv lesson-supplement-note">${item.supplementNote}</div>`);
          }
          html.push(isCollapsible ? `</details>` : `</div>`);
        } else if (item.supplementNote) {
          html.push(`<details class="vocabulary-examples lesson-examples-details"><summary class="vocabulary-examples-title">${item.examplesTitle || '更多說明／補充'}</summary><div class="lesson-kv lesson-supplement-note">${item.supplementNote}</div></details>`);
        }
        if (item.answerSource) html.push(`<p><a href="${escapeAttribute(item.answerSource)}" target="_blank" rel="noopener">查看解答本照片</a></p>`);
        if (item.role) html.push(`<div class="lesson-kv"><strong>角色</strong>${item.role}</div>`);
        if (item.dialoguePrompts) html.push(`<div class="lesson-kv"><strong>演練提示</strong>${item.dialoguePrompts.join(' / ')}</div>`);
        if (item.promptQ && !item.classroom?.originalRuby) html.push(`<div class="lesson-kv"><strong>題目</strong>${item.promptQ}</div>`);
        if (item.speakerBAns && !item.classroom?.originalRuby) html.push(`<div class="lesson-kv"><strong>答案</strong>${item.speakerBAns}</div>`);
        if (item.speakerBTrans) html.push(`<div class="lesson-kv"><strong>翻譯</strong>${item.speakerBTrans}</div>`);
        if (item.grammarKey) html.push(`<div class="lesson-kv"><strong>要點</strong>${item.grammarKey}</div>`);
        html.push(`</article>`);
      }
      html.push(`</div>`);
    } else if (section.type === 'picture_lessons') {
      html.push(`<div class="lesson-grid">`);
      for (const item of section.items || []) {
        html.push(`<article class="lesson-item">`);
        html.push(`<h3>${item.title || ''}</h3>`);
        if (item.imageDesc) html.push(`<p class="lesson-muted">${item.imageDesc}</p>`);
        if (item.japanese) html.push(`<p>${item.japanese}</p>`);
        if (item.plainText) html.push(`<p class="lesson-muted">${item.plainText}</p>`);
        html.push(speechButton(itemSpeechText(item)));
        if (item.romaji) html.push(`<p class="lesson-muted"><code>${item.romaji}</code></p>`);
        if (item.chinese) html.push(`<div class="lesson-kv"><strong>中文</strong>${item.chinese}</div>`);
        if (item.verbInfo) html.push(`<div class="lesson-kv"><strong>文法提示</strong>${item.verbInfo}</div>`);
        html.push(`</article>`);
      }
      html.push(`</div>`);
    } else if (section.type === 'grammar_notes') {
      html.push(`<div class="lesson-grid">`);
      for (const item of section.items || []) {
        html.push(`<article class="lesson-item">`);
        html.push(`<h3>${item.title || ''}</h3>`);
        if (item.formula) html.push(`<p class="lesson-muted"><strong>公式：</strong>${item.formula}</p>`);
        if (item.answerType) html.push(`<p class="lesson-muted">${answerLabel(item)}</p>${evidenceHtml(item)}`);
        html.push(`<div class="lesson-options">`);
        for (const ex of item.examples || []) {
          const spoken = [ex.fromLang !== 'zh' ? ex.from : '', ex.toLang !== 'zh' ? ex.to : ''].filter(Boolean).join('。');
          html.push(`<div class="lesson-option"><p lang="${ex.fromLang || 'ja'}"><strong>${ex.from}</strong></p><p lang="${ex.toLang || 'ja'}">${ex.to}</p>${speechButton(spoken)}</div>`);
        }
        html.push(`</div>`);
        if (item.answerSource) html.push(`<p><a href="${escapeAttribute(item.answerSource)}" target="_blank" rel="noopener">查看解答本照片</a></p>`);
        html.push(`</article>`);
      }
      html.push(`</div>`);
    } else if (section.type === 'quiz_questions') {
      html.push(`<div class="lesson-grid">`);
      for (const item of section.items || []) {
        html.push(`<article class="lesson-item">`);
        html.push(`<h3>${item.topic || item.question || ''}</h3>`);
        if (item.jpRuby || item.jpPlain) html.push(`<p lang="ja">${item.jpRuby || item.jpPlain}</p>`);
        if (item.questionLanguage !== 'zh') html.push(speechButton(itemSpeechText(item) || item.question));
        if (item.chinese) html.push(`<p><strong>中文：</strong>${item.chinese}</p>`);
        html.push(`<div class="lesson-options">`);
        (item.options || []).forEach((opt, idx) => {
          html.push(`<div class="lesson-option">${item.optionLabels?.[idx] || String.fromCharCode(65 + idx)}. ${opt}</div>`);
        });
        html.push(`</div>`);
        if (Number.isInteger(item.correct) || item.explanation || item.answerText) {
          const answer = Number.isInteger(item.correct) ? `${item.optionLabels?.[item.correct] || String.fromCharCode(65 + item.correct)}. ${(item.options || [])[item.correct] || ''}` : '';
          const answerKind = answerLabel(item);
          html.push(`<p class="lesson-answer-kind"><strong>${answerKind}</strong></p>`);
          html.push(`<details class="lesson-answer"><summary>查看答案與解釋</summary>${answer ? `<p><strong>${answerKind}：</strong>${answer}</p>` : ''}${item.answerText ? `<p${item.answerPlain ? ' lang="ja"' : ''}>${item.answerText}</p>${item.answerPlain ? speechButton(item.answerPlain) : ''}` : ''}${item.explanation ? `<p>${item.explanation}</p>` : ''}${item.answerSource ? `<p><a href="${escapeAttribute(item.answerSource)}" target="_blank" rel="noopener">查看解答本照片</a></p>` : ''}</details>`);
        }
        html.push(`</article>`);
      }
      html.push(`</div>`);
    } else if (section.type === 'answer_key') {
      html.push(`<div class="lesson-grid">`);
      for (const item of section.items || []) {
        const kind = answerLabel(item);
        const sourceLink = item.sourcePhoto ? `<p><a href="${item.sourcePhoto}" target="_blank" rel="noopener">查看解答本照片</a></p>` : '';
        html.push(`<details class="lesson-item lesson-answer"${item.answerType ? ` data-answer-type="${item.answerType}"` : ''}><summary>${item.label} · ${kind}</summary><p><strong>${kind}：</strong><span lang="ja">${item.answerRuby || item.answer}</span></p>${item.jpPlain ? speechButton(item.jpPlain) : ''}${item.chinese ? `<p><strong>中文：</strong>${item.chinese}</p>` : ''}${item.reason ? `<p>${item.reason}</p>` : ''}${sourceLink}</details>`);
      }
      html.push(`</div>`);
    } else if (section.type === 'scenario_practice') {
      html.push(`<div class="scenario-grid">`);
      for (const item of section.items || []) {
        html.push(`<article class="scenario-card">`);
        html.push(`<p class="scenario-label">${item.situation}</p>`);
        html.push(`<h3>${item.title}</h3>`);
        if (item.answerType) html.push(`<p class="lesson-muted">${answerLabel(item)}</p>${evidenceHtml(item)}`);
        html.push(`<div class="scenario-turn"><strong>對方</strong><p lang="ja">${item.partner}</p>${speechButton(item.partner)}</div>`);
        html.push(`<details class="lesson-answer"><summary>看答案</summary><div class="scenario-turn is-you"><strong>你要說</strong><p lang="ja">${item.target}</p>${speechButton(item.target)}</div></details>`);
        if (item.swap) html.push(`<p class="scenario-swap"><strong>替換練習：</strong>${item.swap}</p>`);
        if (item.answerSource) html.push(`<p><a href="${escapeAttribute(item.answerSource)}" target="_blank" rel="noopener">查看解答本照片</a></p>`);
        html.push(`</article>`);
      }
      html.push(`</div>`);
    }

    if (section.sourcePhoto) {
      html.push(`<details class="lesson-source-photo"><summary>查看第 ${section.pageOrder} 頁課本照片</summary><a href="${section.sourcePhoto}" target="_blank" rel="noopener"><img src="${section.sourcePhoto}" alt="第 ${section.pageOrder} 頁原課本照片" loading="lazy"></a></details>`);
    }
    html.push(`</div>`);
  }

  root.innerHTML = html.join('');
  setupSpeech(root);
  setupAudioSegments(root);
}

function setupAudioSegments(root) {
  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-audio-start]');
    if (!button) return;
    const card = button.closest('.audio-track-card');
    const audio = card?.querySelector('audio');
    if (!audio) return;
    const start = Number(button.dataset.audioStart);
    const end = Number(button.dataset.audioEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;

    card.querySelectorAll('.audio-segment-play').forEach((item) => {
      item.textContent = '▶ 播放本句';
      item.classList.remove('is-playing');
    });
    audio.pause();
    audio.currentTime = start;
    button.textContent = '■ 停止';
    button.classList.add('is-playing');

    const stopAtEnd = () => {
      if (audio.currentTime >= end || audio.paused) {
        audio.pause();
        audio.removeEventListener('timeupdate', stopAtEnd);
        button.textContent = '▶ 播放本句';
        button.classList.remove('is-playing');
      }
    };
    audio.addEventListener('timeupdate', stopAtEnd);
    try {
      await audio.play();
    } catch (error) {
      stopAtEnd();
    }
  });
}

function collectRenderedLocations(root) {
  return [...root.querySelectorAll(':scope > [data-lesson-section]')].map((section) => {
    const chapterId = section.dataset.chapterId || null;
    const sectionId = section.dataset.sectionId || null;
    const pageKey = section.dataset.pageKey || null;
    const kind = section.dataset.sectionKind === 'chapter' ? 'chapter' : 'section';
    const heading = section.querySelector(kind === 'chapter' ? '.chapter-heading h2' : '.lesson-section-heading h3');
    const chapterChinese = kind === 'chapter' ? plainText(heading?.querySelector('small')?.textContent || '') : '';
    const chapterJapanese = kind === 'chapter'
      ? plainText([...(heading?.childNodes || [])]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent || '')
        .join(' '))
      : '';
    const label = kind === 'chapter'
      ? [chapterJapanese, chapterChinese].filter(Boolean).join('／')
      : plainText(heading?.textContent || sectionId || chapterId || '');
    const href = kind === 'chapter'
      ? `#chapter-${chapterId}`
      : `#${section.id}`;
    return {
      key: section.dataset.locationKey || (kind === 'chapter' ? `chapter-${chapterId}` : `section-${sectionId}`),
      href,
      label: label || sectionId || chapterId || '',
      chapterId,
      sectionId,
      pageKey,
      kind
    };
  });
}

function openAncestorDetails(target) {
  let node = target?.parentElement;
  while (node) {
    if (node.tagName === 'DETAILS') node.open = true;
    node = node.parentElement;
  }
}

function createSectionNavigation(root, lessonId, locations) {
  const sections = [...root.querySelectorAll(':scope > [data-lesson-section]')];
  const records = locations.map((location, index) => ({ ...location, element: sections[index] }));
  const chapterRecords = records.filter((record) => record.kind === 'chapter');
  const chapterNav = root.querySelector('[data-chapter-navigation]');
  const useChapterPages = root.lessonContext?.navigationMode === 'chapter-pages' && Boolean(chapterNav && chapterRecords.length > 1);
  let currentRecord = null;
  let currentChapterIndex = -1;
  let pageNav = null;
  let pageSelect = null;

  function findRecord(target) {
    if (target instanceof Element) {
      const section = target.closest('[data-lesson-section]');
      return records.find((record) => record.element === section) || null;
    }
    if (target && typeof target === 'object') {
      return records.find((record) =>
        (target.key && record.key === target.key) ||
        (target.href && record.href === target.href) ||
        (target.sectionId && record.sectionId === target.sectionId) ||
        (target.chapterId && !target.sectionId && record.kind === 'chapter' && record.chapterId === target.chapterId)
      ) || null;
    }
    const raw = String(target || '').replace(/^#/, '');
    if (!raw) return null;
    const element = document.getElementById(raw)?.closest('[data-lesson-section]');
    return records.find((record) => record.element === element) ||
      records.find((record) => record.key === raw || record.href === `#${raw}` || record.sectionId === raw) || null;
  }

  function publicLocation(record) {
    if (!record) return null;
    const { element, ...location } = record;
    return location;
  }

  function chapterLocation(record) {
    if (!record) return null;
    const pageKey = record.element.dataset.pageLabel || null;
    return {
      key: `chapter-${record.chapterId}`,
      href: `#chapter-${record.chapterId}`,
      label: `${pageKey ? `${pageKey} 頁｜` : ''}${record.label}`,
      chapterId: record.chapterId,
      sectionId: record.sectionId,
      pageKey,
      kind: 'page'
    };
  }

  function chapterIndexFor(record) {
    return chapterRecords.findIndex((chapter) => chapter.chapterId === record?.chapterId);
  }

  function showChapter(index, scroll = false, source = 'pages') {
    const chapterRecord = chapterRecords[index];
    if (!chapterRecord) return false;
    const changed = currentChapterIndex !== index;
    if (changed && currentChapterIndex >= 0) {
      root.querySelector('[data-speech-stop]')?.click();
      root.querySelector('[data-shadow-close]')?.click();
      root.querySelectorAll('audio').forEach(audio => audio.pause());
    }
    currentChapterIndex = index;
    currentRecord = chapterRecord;
    sections.forEach(section => {
      section.hidden = section.dataset.chapterId !== chapterRecord.chapterId;
    });
    pageSelect.value = chapterRecord.chapterId;
    pageNav.querySelector('[data-page-prev]').disabled = index === 0;
    pageNav.querySelector('[data-page-next]').disabled = index === chapterRecords.length - 1;
    chapterNav.querySelectorAll('a').forEach((link) => {
      if (link.hash === `#chapter-${chapterRecord.chapterId}`) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (scroll) pageNav.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (changed && japaneseLessonApi._hasNavigation()) {
      japaneseLessonApi._notifyLocation(chapterLocation(chapterRecord), source);
    }
    return true;
  }

  if (useChapterPages) {
    pageNav = document.createElement('nav');
    pageNav.className = 'lesson-page-navigation';
    pageNav.id = 'textbook-pages';
    pageNav.dataset.pageNavigation = lessonId;
    pageNav.setAttribute('aria-label', '教材翻頁');
    pageNav.innerHTML = '<button type="button" data-page-prev>← 上一頁</button><label>教材頁碼 <select aria-label="教材頁碼"></select></label><button type="button" data-page-next>下一頁 →</button>';
    pageSelect = pageNav.querySelector('select');
    chapterRecords.forEach((record) => {
      const location = chapterLocation(record);
      const option = document.createElement('option');
      option.value = record.chapterId;
      option.textContent = location.label;
      pageSelect.append(option);
    });
    chapterNav.after(pageNav);
    chapterNav.hidden = true;
    const initialRecord = (location.hash && findRecord(location.hash)) || chapterRecords[0];
    showChapter(Math.max(0, chapterIndexFor(initialRecord)));
  }

  function getCurrent() {
    if (useChapterPages) return chapterLocation(chapterRecords[currentChapterIndex] || chapterRecords[0]);
    if (!currentRecord) {
      currentRecord = (location.hash && findRecord(location.hash)) ||
        records.find((candidate) => candidate.kind === 'section') || records[0];
    }
    return publicLocation(currentRecord);
  }

  function reveal(target, options = {}) {
    const record = findRecord(target);
    if (!record) return false;
    if (useChapterPages) {
      const index = chapterIndexFor(record);
      if (index < 0) return false;
      const exactTarget = target instanceof Element ? target : null;
      const historyMode = options.history ?? 'push';
      const href = exactTarget ? record.href : `#chapter-${record.chapterId}`;
      if (historyMode !== 'none' && href && location.hash !== href) {
        if (historyMode === 'replace') history.replaceState(null, '', href);
        else history.pushState(null, '', href);
      }
      if (!showChapter(index, !exactTarget && options.scroll !== false, options.source || 'pages')) return false;
      if (exactTarget) {
        openAncestorDetails(exactTarget);
        if (options.scroll !== false) exactTarget.scrollIntoView({ behavior: options.behavior || 'smooth', block: 'start' });
      }
      return true;
    }
    currentRecord = record;
    const exactTarget = target instanceof Element ? target : record.element;
    const historyMode = options.history ?? 'push';
    if (historyMode !== 'none' && record.href && location.hash !== record.href) {
      if (historyMode === 'replace') history.replaceState(null, '', record.href);
      else history.pushState(null, '', record.href);
    }
    openAncestorDetails(exactTarget);
    if (options.scroll !== false) exactTarget.scrollIntoView({ behavior: options.behavior || 'smooth', block: 'start' });
    japaneseLessonApi._notifyLocation(publicLocation(record), options.source || 'sections');
    return true;
  }

  const navigation = {
    kind: useChapterPages ? 'pages' : 'sections',
    lessonId,
    getCurrent,
    getLocations: () => useChapterPages ? chapterRecords.map(chapterLocation) : records.map(publicLocation),
    goTo: reveal,
    reveal
  };
  if (useChapterPages) {
    pageNav.querySelector('[data-page-prev]').onclick = () => reveal(chapterRecords[currentChapterIndex - 1], { source: 'previous' });
    pageNav.querySelector('[data-page-next]').onclick = () => reveal(chapterRecords[currentChapterIndex + 1], { source: 'next' });
    pageSelect.onchange = () => reveal(chapterRecords.find((record) => record.chapterId === pageSelect.value), { source: 'select' });
  }
  window.addEventListener('hashchange', () => {
    const record = findRecord(location.hash);
    if (useChapterPages && record) showChapter(chapterIndexFor(record), false, 'hash');
    else {
      currentRecord = record || currentRecord;
      japaneseLessonApi._notifyLocation(getCurrent(), 'hash');
    }
  });
  return navigation;
}

async function loadLesson() {
  const root = document.getElementById('lesson-root');
  if (!root) return;

  try {
    const res = await fetch(
      document.documentElement.classList.contains('lesson-k6') ? './data.json?v=7' : './data.json',
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const includedLessons = await Promise.all(
      (data.includes || []).map(async (include) => {
        const includedResponse = await fetch(include.path, { cache: 'no-store' });
        if (!includedResponse.ok) throw new Error(`HTTP ${includedResponse.status}: ${include.path}`);
        const includedData = await includedResponse.json();
        return (includedData.sections || []).map((section) => ({
          ...section,
          chapter: include.chapter,
          title: `${include.label}｜${section.title || ''}`
        }));
      })
    );
    const vocabularySection = data.vocabulary?.length && !data.hideVocabularySection ? [{
      id: 'sentence-cards',
      type: 'sentence_cards',
      chapter: 'vocabulary',
      pageOrder: data.vocabularyPageOrder,
      title: `${data.chapters?.find((chapter) => chapter.id === 'vocabulary')?.title || '単語'} 1–${data.vocabulary.length}`,
      items: data.vocabulary.map((entry, index) => {
        const normalized = typeof entry === 'string'
          ? (() => {
              const [japanese, chinese] = entry.split('|');
              return { japanese, chinese };
            })()
          : entry;
        return {
          ...normalized,
          id: entry.id || String(index + 1).padStart(2, '0'),
          topic: `${index + 1}. ${normalized.jpRuby || normalized.japanese}`,
          plainText: normalized.plainText || normalized.japanese
        };
      })
    }] : [];
    const legacySections = data.hideLegacySections
      ? []
      : (data.sections || []).map((section) => ({
          ...section,
          chapter: data.sectionChapter,
          title: `${data.sectionLabel || '話す・聞く'}｜${section.title || ''}`
        }));
    const lessonSections = [
      ...vocabularySection,
      ...includedLessons.flat(),
      ...(data.supplementalSections || []),
      ...legacySections
    ];
    data.sections = (data.chapters || []).flatMap((chapter) => {
      const sections = lessonSections.filter((section) => section.chapter === chapter.id);
      if (data.sortSectionsByPage) {
        sections.sort((left, right) => {
          const pageOf = (section) => Number(resolvePageKey(section)) || Number.MAX_SAFE_INTEGER;
          return pageOf(left) - pageOf(right);
        });
      }
      return [{ type: 'chapter_heading', ...chapter, hasContent: sections.length > 0 }, ...sections];
    });
    const lessonId = resolveLessonId(data);
    data.__lessonId = lessonId;
    prepareLessonLocations(data, lessonId);
    document.title = `${data.title}｜日文互動學習平台`;

    const pageTitle = document.getElementById('lesson-page-title');
    const pageDescription = document.getElementById('lesson-page-description');
    if (pageTitle) pageTitle.innerHTML = data.titleRuby || data.title || '日文課程';
    if (pageDescription) pageDescription.textContent = data.description || '';

    renderLesson(root, data);
    root.dataset.lessonId = lessonId;
    const toolbar = root.querySelector('.speech-toolbar');
    if (toolbar && data.chapters?.length) {
      toolbar.insertAdjacentHTML('afterend', `<nav class="chapter-nav" data-chapter-navigation aria-label="課本章節">${data.chapters.map((chapter) => `<a href="#chapter-${chapter.id}" data-chapter-id="${chapter.id}"><span>${chapter.number}</span><strong>${chapter.title}</strong><small>${chapter.pages}頁</small></a>`).join('')}</nav>`);
    }
    const renderedLocations = collectRenderedLocations(root);
    japaneseLessonApi._setContext({
      root,
      lessonId,
      title: plainText(data.title || ''),
      chapters: (data.chapters || []).map((chapter) => ({
        id: chapter.id,
        number: chapter.number,
        title: plainText(chapter.title || ''),
        pages: chapter.pages
      })),
      navigationMode: data.navigationMode || null,
      pagePresentation: data.pagePresentation || null,
      data,
      locations: renderedLocations
    });
    root.dispatchEvent(new CustomEvent('lesson:rendered', {
      bubbles: true,
      detail: { lessonId, locations: renderedLocations.map((location) => ({ ...location })) }
    }));
    queueMicrotask(() => {
      if (!japaneseLessonApi._hasNavigation()) {
        const navigation = createSectionNavigation(root, lessonId, renderedLocations);
        japaneseLessonApi._registerNavigation(navigation);
        japaneseLessonApi._notifyLocation(navigation.getCurrent(), 'initial');
      }
    });
    scrollToCurrentHash('auto');
  } catch (err) {
    root.innerHTML = `<h2>載入失敗</h2><p class="lesson-muted">無法讀取 data.json。</p>`;
    console.error(err);
  }
}

function scrollToCurrentHash(behavior = 'auto') {
  if (typeof window === 'undefined' || !window.location || !window.location.hash) return;
  if (location.hash.startsWith('#item-')) return; // Legacy item URLs now resolve to the textbook page only.
  const rawHash = window.location.hash.slice(1);
  let targetId = rawHash;
  try {
    targetId = decodeURIComponent(rawHash);
  } catch (_) {
    targetId = rawHash;
  }
  if (!targetId) return;
  const target = document.getElementById(targetId);
  if (target) {
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior, block: 'start' });
    });
  }
}

document.addEventListener('DOMContentLoaded', loadLesson);
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => scrollToCurrentHash('smooth'));
}

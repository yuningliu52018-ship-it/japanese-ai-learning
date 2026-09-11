function plainText(value = '') {
  const container = document.createElement('div');
  container.innerHTML = String(value);
  if (typeof container.querySelectorAll === 'function') {
    container.querySelectorAll('rt, rp').forEach((node) => node.remove());
  }
  return (container.textContent || String(value)).replace(/\s+/g, ' ').trim();
}

function speechButton(text, label = '播放') {
  const cleanText = plainText(text);
  if (!cleanText) return '';
  const encoded = encodeURIComponent(cleanText);
  const escaped = cleanText.replace(/"/g, '&quot;');
  const canShadow = label === '播放' || label === '朗讀本段';
  return `<span class="speech-actions"><button class="speech-button" type="button" data-speak="${encoded}" aria-label="播放日文：${escaped}"><span aria-hidden="true">▶</span> ${label}</button>${canShadow ? `<button class="shadow-button" type="button" data-shadow="${encoded}" aria-label="跟讀練習：${escaped}"><span aria-hidden="true">🎙</span> 跟讀</button>` : ''}</span>`;
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
  return item.jpPlain || item.plainText || item.japanese || item.jpRuby || '';
}

function sectionSpeechText(section = {}) {
  const parts = [];
  if (section.type === 'long_reading') return (section.paragraphs || []).join('');
  for (const item of section.items || []) {
    if (section.type === 'grammar_notes') {
      for (const example of item.examples || []) parts.push(example.from, example.to);
    } else if (section.type === 'quiz_questions') {
      parts.push(item.question, ...(item.options || []));
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
    <aside class="speech-toolbar" aria-label="日文 AI 發音導讀">
      <div>
        <strong>日文 AI 發音導讀</strong>
        <span id="speech-status" class="speech-status" aria-live="polite">點選播放即可聆聽</span>
      </div>
      <div class="speech-controls">
        <label for="speech-voice">日語語音</label>
        <select id="speech-voice" disabled aria-describedby="speech-voice-help"><option>正在載入日語語音…</option></select>
        <button class="speech-button" type="button" data-speak="${encodeURIComponent('明日は図書館で日本語を勉強します。')}" data-rate="0.95" disabled>▶ 試聽此語音</button>
        <label for="speech-rate">速度</label>
        <select id="speech-rate">
          <option value="0.82">慢速 0.82×</option>
          <option value="0.95" selected>正常 0.95×</option>
          <option value="1.25">快速 1.25×</option>
        </select>
        <button class="speech-stop" type="button" data-speech-stop>停止</button>
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
      return;
    }

    const shadowButton = event.target.closest('[data-shadow]');
    if (shadowButton) {
      if (!speechReady) return;
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

  for (const section of data.sections || []) {
    html.push(`<div class="lesson-section">`);
    if (section.type === 'chapter_heading') {
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
    html.push(`<div class="lesson-section-heading"><h3>${section.title || ''}</h3>${speechButton(sectionSpeechText(section), '朗讀本單元')}</div>`);

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
        html.push(`<div class="audio-track-content"><p class="audio-track-meta">課本 ${item.pages} 頁・${item.duration}</p><h3>${item.title}</h3><audio controls preload="metadata" src="${item.src}">您的瀏覽器不支援音訊播放。</audio><p class="lesson-muted">真人教材音源。播放後可搭配下方逐句「跟讀」練習。</p>`);
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
        const displayedJapanese = item.jpRuby || item.japanese || '';
        const plainJapanese = item.jpPlain || item.plainText || '';
        html.push(`<article class="lesson-item">`);
        html.push(`<h3>${item.topic || item.title || item.id || ''}</h3>`);
        if (displayedJapanese) html.push(`<p lang="ja">${displayedJapanese}</p>`);
        if (!item.jpRuby && plainJapanese && plainJapanese !== displayedJapanese) {
          html.push(`<p class="lesson-muted" lang="ja">${plainJapanese}</p>`);
        }
        html.push(speechButton(itemSpeechText(item)));
        if (item.zh || item.chinese) html.push(`<div class="lesson-kv"><strong>中文</strong>${item.zh || item.chinese}</div>`);
        if (item.grammarNote || item.verbInfo) html.push(`<div class="lesson-kv"><strong>文法解析</strong>${item.grammarNote || item.verbInfo}</div>`);
        if (item.examples?.length) {
          html.push(`<div class="vocabulary-examples"><strong class="vocabulary-examples-title">例句</strong>`);
          for (const example of item.examples) {
            html.push(`<div class="vocabulary-example"><p class="vocabulary-example-japanese" lang="ja">${example.ruby || example.japanese || example.plain}</p>${speechButton(example.plain || example.japanese || example.ruby)}${example.chinese ? `<p class="vocabulary-example-chinese">${example.chinese}</p>` : ''}</div>`);
          }
          html.push(`</div>`);
        }
        if (item.role) html.push(`<div class="lesson-kv"><strong>角色</strong>${item.role}</div>`);
        if (item.dialoguePrompts) html.push(`<div class="lesson-kv"><strong>演練提示</strong>${item.dialoguePrompts.join(' / ')}</div>`);
        if (item.promptQ) html.push(`<div class="lesson-kv"><strong>題目</strong>${item.promptQ}</div>`);
        if (item.speakerBAns) html.push(`<div class="lesson-kv"><strong>答案</strong>${item.speakerBAns}</div>`);
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
        html.push(`<div class="lesson-options">`);
        for (const ex of item.examples || []) {
          html.push(`<div class="lesson-option"><strong>${ex.from}</strong> → ${ex.to}${speechButton(`${ex.from}。${ex.to}`)}</div>`);
        }
        html.push(`</div>`);
        html.push(`</article>`);
      }
      html.push(`</div>`);
    } else if (section.type === 'quiz_questions') {
      html.push(`<div class="lesson-grid">`);
      for (const item of section.items || []) {
        html.push(`<article class="lesson-item">`);
        html.push(`<h3>${item.question || ''}</h3>`);
        html.push(speechButton(item.question));
        html.push(`<div class="lesson-options">`);
        (item.options || []).forEach((opt, idx) => {
          html.push(`<div class="lesson-option">${String.fromCharCode(65 + idx)}. ${opt}</div>`);
        });
        html.push(`</div>`);
        if (Number.isInteger(item.correct) || item.explanation) {
          const answer = Number.isInteger(item.correct) ? `${String.fromCharCode(65 + item.correct)}. ${(item.options || [])[item.correct] || ''}` : '';
          html.push(`<details class="lesson-answer"><summary>查看答案與解釋</summary>${answer ? `<p><strong>答案：</strong>${answer}</p>` : ''}${item.explanation ? `<p>${item.explanation}</p>` : ''}</details>`);
        }
        html.push(`</article>`);
      }
      html.push(`</div>`);
    } else if (section.type === 'scenario_practice') {
      html.push(`<div class="scenario-grid">`);
      for (const item of section.items || []) {
        html.push(`<article class="scenario-card">`);
        html.push(`<p class="scenario-label">${item.situation}</p>`);
        html.push(`<h3>${item.title}</h3>`);
        html.push(`<div class="scenario-turn"><strong>對方</strong><p lang="ja">${item.partner}</p>${speechButton(item.partner)}</div>`);
        html.push(`<div class="scenario-turn is-you"><strong>你要說</strong><p lang="ja">${item.target}</p>${speechButton(item.target)}</div>`);
        if (item.swap) html.push(`<p class="scenario-swap"><strong>替換練習：</strong>${item.swap}</p>`);
        html.push(`</article>`);
      }
      html.push(`</div>`);
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

async function loadLesson() {
  const root = document.getElementById('lesson-root');
  if (!root) return;

  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const includedLessons = await Promise.all(
      (data.includes || []).map(async (include) => {
        const includedResponse = await fetch(include.path);
        if (!includedResponse.ok) throw new Error(`HTTP ${includedResponse.status}: ${include.path}`);
        const includedData = await includedResponse.json();
        return (includedData.sections || []).map((section) => ({
          ...section,
          chapter: include.chapter,
          title: `${include.label}｜${section.title || ''}`
        }));
      })
    );
    const vocabularySection = data.vocabulary?.length ? [{
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
          id: String(index + 1).padStart(2, '0'),
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
          const pageOf = (section) => {
            if (Number.isFinite(section.pageOrder)) return section.pageOrder;
            const match = String(section.title || '').match(/(\d{3})(?:[–-]\d{3})?頁/);
            return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
          };
          return pageOf(left) - pageOf(right);
        });
      }
      return [{ type: 'chapter_heading', ...chapter, hasContent: sections.length > 0 }, ...sections];
    });
    document.title = `${data.title}｜日文互動學習平台`;

    const pageTitle = document.getElementById('lesson-page-title');
    const pageDescription = document.getElementById('lesson-page-description');
    if (pageTitle) pageTitle.innerHTML = data.titleRuby || data.title || '日文課程';
    if (pageDescription) pageDescription.textContent = data.description || '';

    renderLesson(root, data);
    const toolbar = root.querySelector('.speech-toolbar');
    if (toolbar && data.chapters?.length) {
      toolbar.insertAdjacentHTML('afterend', `<nav class="chapter-nav" aria-label="課本章節">${data.chapters.map((chapter) => `<a href="#chapter-${chapter.id}"><span>${chapter.number}</span><strong>${chapter.title}</strong><small>${chapter.pages}頁</small></a>`).join('')}</nav>`);
    }
  } catch (err) {
    root.innerHTML = `<h2>載入失敗</h2><p class="lesson-muted">無法讀取 data.json。</p>`;
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', loadLesson);

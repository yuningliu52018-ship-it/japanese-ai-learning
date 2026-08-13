function plainText(value = '') {
  const container = document.createElement('div');
  container.innerHTML = String(value);
  return (container.textContent || '').replace(/\s+/g, ' ').trim();
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

function renderSpeechToolbar() {
  return `
    <aside class="speech-toolbar" aria-label="日文 AI 發音導讀">
      <div>
        <strong>日文 AI 發音導讀</strong>
        <span id="speech-status" class="speech-status" aria-live="polite">點選播放即可聆聽</span>
      </div>
      <div class="speech-controls">
        <label for="speech-rate">速度</label>
        <select id="speech-rate">
          <option value="0.75">慢速 0.75×</option>
          <option value="1" selected>正常 1×</option>
          <option value="1.25">快速 1.25×</option>
        </select>
        <button class="speech-stop" type="button" data-speech-stop>停止</button>
      </div>
    </aside>
    <aside class="shadowing-panel" id="shadowing-panel" hidden aria-live="polite">
      <div class="shadowing-heading">
        <div><strong>跟讀練習</strong><span>先聽示範，再按下錄音說一次</span></div>
        <button type="button" class="shadow-close" data-shadow-close aria-label="關閉跟讀練習">×</button>
      </div>
      <p class="shadow-target" id="shadow-target" lang="ja"></p>
      <div class="shadowing-controls">
        <button type="button" class="speech-button" data-shadow-listen data-rate="1">▶ 正常示範</button>
        <button type="button" class="speech-button" data-shadow-listen data-rate="0.7">🐢 慢速示範</button>
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

function setupSpeech(root) {
  const status = root.querySelector('#speech-status');
  const synthesis = window.speechSynthesis;
  let japaneseVoice = null;
  let shadowTarget = '';
  let recognition = null;
  let recognitionActive = false;
  let recognitionTimer = null;
  let mediaRecorder = null;
  let microphoneStream = null;
  let recordedChunks = [];
  let recordingUrl = '';
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

  const stopRecording = () => {
    if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
    microphoneStream?.getTracks().forEach((track) => track.stop());
    microphoneStream = null;
  };

  const playShadowTarget = (rate = 1) => {
    if (!shadowTarget) return;
    const utterance = new SpeechSynthesisUtterance(shadowTarget);
    utterance.lang = 'ja-JP';
    utterance.rate = rate;
    if (japaneseVoice) utterance.voice = japaneseVoice;
    synthesis.cancel();
    synthesis.speak(utterance);
    return utterance;
  };

  if (!synthesis || typeof window.SpeechSynthesisUtterance !== 'function') {
    if (status) status.textContent = '此瀏覽器不支援語音播放';
    root.querySelectorAll('.speech-button, .speech-stop').forEach((button) => {
      button.disabled = true;
    });
    return;
  }

  const selectVoice = () => {
    const voices = synthesis.getVoices();
    japaneseVoice = voices.find((voice) => voice.lang === 'ja-JP')
      || voices.find((voice) => voice.lang?.toLowerCase().startsWith('ja'))
      || null;
  };
  selectVoice();
  synthesis.addEventListener?.('voiceschanged', selectVoice);

  root.addEventListener('click', async (event) => {
    const closeButton = event.target.closest('[data-shadow-close]');
    if (closeButton) {
      recognition?.abort();
      stopRecording();
      panel.hidden = true;
      return;
    }

    const shadowButton = event.target.closest('[data-shadow]');
    if (shadowButton) {
      shadowTarget = decodeURIComponent(shadowButton.dataset.shadow || '');
      targetElement.textContent = shadowTarget;
      shadowResult.hidden = true;
      playbackElement.hidden = true;
      panel.hidden = false;
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      shadowStatus.textContent = '正在播放示範，聽完後請按「開始跟讀」。';
      const utterance = playShadowTarget(Number(root.querySelector('#speech-rate')?.value || 1));
      utterance.onend = () => { shadowStatus.textContent = '輪到你了：按「開始跟讀」並說出上面的句子。'; };
      return;
    }

    if (event.target.closest('[data-shadow-listen]')) {
      if (!shadowTarget) return;
      const requestedRate = Number(event.target.closest('[data-shadow-listen]').dataset.rate || 1);
      playShadowTarget(requestedRate);
      shadowStatus.textContent = requestedRate < 1 ? '正在播放慢速示範。請注意長音、促音與停頓。' : '正在播放正常速度示範。';
      return;
    }

    const recordButton = event.target.closest('[data-shadow-record]');
    if (recordButton) {
      if (recognitionActive) {
        recognition?.stop();
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
      synthesis.cancel();
      shadowResult.hidden = true;
      shadowStatus.textContent = '正在確認麥克風權限…';
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (typeof MediaRecorder === 'function') {
            recordedChunks = [];
            mediaRecorder = new MediaRecorder(microphoneStream);
            mediaRecorder.ondataavailable = (chunkEvent) => {
              if (chunkEvent.data.size) recordedChunks.push(chunkEvent.data);
            };
            mediaRecorder.onstop = () => {
              if (!recordedChunks.length) return;
              if (recordingUrl) URL.revokeObjectURL(recordingUrl);
              recordingUrl = URL.createObjectURL(new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'audio/webm' }));
              recordedAudio.src = recordingUrl;
              playbackElement.hidden = false;
            };
          }
        } catch (permissionError) {
          shadowStatus.textContent = permissionError.name === 'NotAllowedError'
            ? '麥克風權限被拒絕。請按網址列左側圖示，將「麥克風」改成允許後重新整理。'
            : '目前無法開啟麥克風，請確認沒有被其他程式占用。';
          return;
        }
      }
      recognition?.abort();
      recognition = new Recognition();
      recognition.lang = 'ja-JP';
      recognition.interimResults = false;
      recognition.maxAlternatives = 5;
      recognition.continuous = false;
      let recognitionHadResult = false;
      let recognitionError = '';
      recognition.onstart = () => {
        recognitionActive = true;
        recordButton.classList.add('is-recording');
        recordButton.textContent = '■ 說完請按停止';
        shadowStatus.textContent = '麥克風已開啟，請開始說日文（最長12秒）。';
        if (mediaRecorder?.state === 'inactive') mediaRecorder.start();
        clearTimeout(recognitionTimer);
        recognitionTimer = window.setTimeout(() => {
          if (recognitionActive) recognition.stop();
        }, 12000);
      };
      recognition.onaudiostart = () => { shadowStatus.textContent = '已連接麥克風，正在等待你說話…'; };
      recognition.onsoundstart = () => { shadowStatus.textContent = '已收到聲音，請繼續說完整句子。'; };
      recognition.onspeechstart = () => { shadowStatus.textContent = '正在聽你的日文…說完後請稍等。'; };
      recognition.onspeechend = () => {
        shadowStatus.textContent = '已收到語音，正在辨識日文…';
        if (recognitionActive) recognition.stop();
      };
      recognition.onresult = (resultEvent) => {
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
        recognitionError = 'no-match';
        shadowStatus.textContent = '有收到聲音，但無法判斷成日文。請先用慢速聽一次，再清楚重說。';
      };
      recognition.onend = () => {
        clearTimeout(recognitionTimer);
        stopRecording();
        recognitionActive = false;
        recordButton.classList.remove('is-recording');
        recordButton.textContent = '🎙 再說一次';
        if (recognitionHadResult) {
          shadowStatus.textContent = '完成！可查看結果，或再說一次。';
        } else if (!recognitionError) {
          shadowStatus.textContent = '錄音結束，但沒有取得辨識文字。請靠近麥克風並在按下後立即開始說。';
        }
      };
      try {
        recognition.start();
      } catch (startError) {
        recognitionActive = false;
        stopRecording();
        shadowStatus.textContent = '麥克風尚未準備好，請等待一秒後再按一次。';
      }
      return;
    }

    const stopButton = event.target.closest('[data-speech-stop]');
    if (stopButton) {
      synthesis.cancel();
      if (status) status.textContent = '已停止播放';
      return;
    }

    const playButton = event.target.closest('[data-speak]');
    if (!playButton) return;

    const text = decodeURIComponent(playButton.dataset.speak || '');
    if (!text) return;
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = Number(root.querySelector('#speech-rate')?.value || 1);
    if (japaneseVoice) utterance.voice = japaneseVoice;
    utterance.onstart = () => {
      root.querySelectorAll('.speech-button.is-playing').forEach((button) => button.classList.remove('is-playing'));
      playButton.classList.add('is-playing');
      if (status) status.textContent = `播放中：${text.slice(0, 34)}${text.length > 34 ? '…' : ''}`;
    };
    utterance.onend = () => {
      playButton.classList.remove('is-playing');
      if (status) status.textContent = '播放完成';
    };
    utterance.onerror = () => {
      playButton.classList.remove('is-playing');
      if (status) status.textContent = '播放失敗，請確認裝置已安裝日文語音';
    };
    synthesis.speak(utterance);
  });
}

function renderLesson(root, data) {
  if (!root || !data) return;

  const html = [];
  if (!document.getElementById('lesson-page-title')) {
    html.push(`<h2>${data.title}</h2>`);
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
        html.push(`<div class="audio-track-content"><p class="audio-track-meta">課本 ${item.pages} 頁・${item.duration}</p><h3>${item.title}</h3><audio controls preload="metadata" src="${item.src}">您的瀏覽器不支援音訊播放。</audio><p class="lesson-muted">真人教材音源。播放後可搭配下方逐句「跟讀」練習。</p></div>`);
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
        if (plainJapanese && plainJapanese !== displayedJapanese) {
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
      title: `単語 1–${data.vocabulary.length}`,
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
          topic: `${index + 1}. ${normalized.japanese}`,
          plainText: normalized.plainText || normalized.japanese
        };
      })
    }] : [];
    const lessonSections = [
      ...vocabularySection,
      ...includedLessons.flat(),
      ...(data.supplementalSections || []),
      ...(data.sections || []).map((section) => ({
        ...section,
        chapter: data.sectionChapter,
        title: `${data.sectionLabel || '話す・聞く'}｜${section.title || ''}`
      }))
    ];
    data.sections = (data.chapters || []).flatMap((chapter) => {
      const sections = lessonSections.filter((section) => section.chapter === chapter.id);
      return [{ type: 'chapter_heading', ...chapter, hasContent: sections.length > 0 }, ...sections];
    });
    document.title = `${data.title}｜日文互動學習平台`;

    const pageTitle = document.getElementById('lesson-page-title');
    const pageDescription = document.getElementById('lesson-page-description');
    if (pageTitle) pageTitle.textContent = data.title || '日文課程';
    if (pageDescription) pageDescription.textContent = data.description || '';

    renderLesson(root, data);
    const toolbar = root.querySelector('.speech-toolbar');
    if (toolbar && data.chapters?.length) {
      toolbar.insertAdjacentHTML('afterend', `<nav class="chapter-nav" aria-label="課本章節">${data.chapters.map((chapter) => `<a href="#chapter-${chapter.id}"><span>${chapter.number}</span>${chapter.title}<small>${chapter.pages}頁</small></a>`).join('')}</nav>`);
    }
  } catch (err) {
    root.innerHTML = `<h2>載入失敗</h2><p class="lesson-muted">無法讀取 data.json。</p>`;
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', loadLesson);

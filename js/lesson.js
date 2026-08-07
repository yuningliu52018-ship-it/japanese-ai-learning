function plainText(value = '') {
  const container = document.createElement('div');
  container.innerHTML = String(value);
  return (container.textContent || '').replace(/\s+/g, ' ').trim();
}

function speechButton(text, label = '播放') {
  const cleanText = plainText(text);
  if (!cleanText) return '';
  return `<button class="speech-button" type="button" data-speak="${encodeURIComponent(cleanText)}" aria-label="播放日文：${cleanText.replace(/"/g, '&quot;')}"><span aria-hidden="true">▶</span> ${label}</button>`;
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
    </aside>`;
}

function setupSpeech(root) {
  const status = root.querySelector('#speech-status');
  const synthesis = window.speechSynthesis;
  let japaneseVoice = null;

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

  root.addEventListener('click', (event) => {
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
  html.push(`<h2>${data.title}</h2>`);
  html.push(`<p class="lesson-muted">${data.description || ''}</p>`);

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

    if (section.type === 'long_reading') {
      html.push(`<article class="reading-article">`);
      html.push(`<div class="reading-article-toolbar">${speechButton((section.paragraphs || []).join(''), '朗讀全文')}</div>`);
      (section.paragraphs || []).forEach((paragraph, index) => {
        html.push(`<div class="reading-paragraph"><span>${index + 1}</span><div><p lang="ja">${paragraph}</p>${speechButton(paragraph, '朗讀本段')}</div></div>`);
      });
      html.push(`</article>`);
    } else if (section.type === 'sentence_cards' || section.type === 'dialogue_lessons') {
      html.push(`<div class="lesson-grid">`);
      for (const item of section.items || []) {
        html.push(`<article class="lesson-item">`);
        html.push(`<h3>${item.topic || item.title || item.id || ''}</h3>`);
        if (item.jpRuby || item.japanese) html.push(`<p>${item.jpRuby || item.japanese}</p>`);
        if (item.jpPlain || item.plainText) html.push(`<p class="lesson-muted">${item.jpPlain || item.plainText}</p>`);
        html.push(speechButton(itemSpeechText(item)));
        if (item.zh || item.chinese) html.push(`<div class="lesson-kv"><strong>中文</strong>${item.zh || item.chinese}</div>`);
        if (item.grammarNote || item.verbInfo) html.push(`<div class="lesson-kv"><strong>文法解析</strong>${item.grammarNote || item.verbInfo}</div>`);
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
      title: '単語 1–80',
      items: data.vocabulary.map((entry, index) => {
        const [japanese, chinese] = entry.split('|');
        return {
          id: String(index + 1).padStart(2, '0'),
          topic: `${index + 1}. ${japanese}`,
          japanese,
          plainText: japanese,
          chinese
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

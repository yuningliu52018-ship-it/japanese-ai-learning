function renderLesson(root, data) {
  if (!root || !data) return;

  const html = [];
  html.push(`<h2>${data.title}</h2>`);
  html.push(`<p class="lesson-muted">${data.description || ''}</p>`);

  if (data.status) {
    html.push(`<span class="lesson-status">${data.status}</span>`);
  }

  if (!data.sections?.length) {
    html.push(`<p class="empty-state">本課教材正在整理中，完成後會顯示在這裡。</p>`);
  }

  for (const section of data.sections || []) {
    html.push(`<div class="lesson-section">`);
    html.push(`<h3>${section.title || ''}</h3>`);

    if (section.type === 'sentence_cards' || section.type === 'dialogue_lessons') {
      html.push(`<div class="lesson-grid">`);
      for (const item of section.items || []) {
        html.push(`<article class="lesson-item">`);
        html.push(`<h3>${item.topic || item.title || item.id || ''}</h3>`);
        if (item.jpRuby || item.japanese) html.push(`<p>${item.jpRuby || item.japanese}</p>`);
        if (item.jpPlain || item.plainText) html.push(`<p class="lesson-muted">${item.jpPlain || item.plainText}</p>`);
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
          html.push(`<div class="lesson-option"><strong>${ex.from}</strong> → ${ex.to}</div>`);
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
        html.push(`<div class="lesson-options">`);
        (item.options || []).forEach((opt, idx) => {
          const mark = idx === item.correct ? '（正解）' : '';
          html.push(`<div class="lesson-option">${opt}${mark}</div>`);
        });
        html.push(`</div>`);
        if (item.explanation) html.push(`<div class="lesson-kv"><strong>解釋</strong>${item.explanation}</div>`);
        html.push(`</article>`);
      }
      html.push(`</div>`);
    }

    html.push(`</div>`);
  }

  root.innerHTML = html.join('');
}

async function loadLesson() {
  const root = document.getElementById('lesson-root');
  if (!root) return;

  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    document.title = `${data.title}｜日文互動學習平台`;

    const pageTitle = document.getElementById('lesson-page-title');
    const pageDescription = document.getElementById('lesson-page-description');
    if (pageTitle) pageTitle.textContent = data.title || '日文課程';
    if (pageDescription) pageDescription.textContent = data.description || '';

    renderLesson(root, data);
  } catch (err) {
    root.innerHTML = `<h2>載入失敗</h2><p class="lesson-muted">無法讀取 data.json。</p>`;
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', loadLesson);

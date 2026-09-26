(() => {
  const low = 136;
  const high = 164;
  const storageKey = 'japanese-ai-learning.k6.page';
  const root = document.getElementById('current-page');
  const picker = document.getElementById('page-picker');
  const input = document.getElementById('page-number');
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  let content = null;
  let page = low;
  let showTranslations = false;
  let showAnswers = false;
  const el = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value != null) node.textContent = value;
    return node;
  };
  const sectionFor = number => content.sections.find(section => number >= section.pages[0] && number <= section.pages[1]).title;

  function speak(sentence, slow) {
    if (!('speechSynthesis' in window)) {
      alert('這個瀏覽器目前不支援語音朗讀。');
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = 'ja-JP';
    utterance.rate = slow ? 0.82 : 0.95;
    utterance.pitch = 1;
    const japanese = speechSynthesis.getVoices().find(voice => voice.lang.toLowerCase().startsWith('ja'));
    if (japanese) utterance.voice = japanese;
    speechSynthesis.speak(utterance);
  }

  function render() {
    const info = content.pages[String(page)] || {};
    root.replaceChildren();
    const heading = el('div', 'page-heading');
    const title = el('h2', null, `P${page}｜${sectionFor(page)}`);
    heading.append(title);
    const turn = el('div', 'page-turn');
    for (const [symbol, target] of [['←', page - 1], ['→', page + 1]]) {
      const button = el('button', null, symbol);
      button.type = 'button';
      button.disabled = target < low || target > high;
      button.addEventListener('click', () => navigate(target));
      turn.append(button);
    }
    heading.append(turn);
    root.append(heading);
    const layout = el('div', 'page-content');
    const photo = el('figure', 'page-photo');
    const link = el('a');
    link.href = `pages/${page}.jpeg`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', `放大第 ${page} 頁課本照片`);
    const image = el('img');
    image.src = link.href;
    image.alt = `第 6 課第 ${page} 頁的課本照片`;
    image.loading = 'eager';
    link.append(image);
    photo.append(link, el('figcaption', null, '點照片可放大查看原頁'));
    const support = el('div', 'support-panel');
    support.append(el('h3', null, '課堂速查'));
    const hasSentences = !!info.sentences?.length;
    const hasAnswers = !!info.answers?.length;
    const status = el('p', 'status', info.note || (
      hasSentences || hasAnswers
        ? '下方是已整理的部分句子與答案；其他內容請對照課本照片。'
        : '這頁已可依頁碼直達課本照片。逐句讀音、中文與題目答案仍待逐項核對。'
    ));
    support.append(status);
    for (const sentence of info.sentences || []) {
      const card = el('article', 'sentence');
      const jp = el('p', 'jp', sentence.jp);
      jp.lang = 'ja';
      const reading = el('p', 'reading', sentence.reading);
      reading.hidden = true;
      const zh = el('p', 'zh', sentence.zh);
      zh.hidden = !showTranslations;
      const actions = el('div', 'sentence-actions');
      for (const [label, action] of [
        ['🔊 朗讀', () => speak(sentence.jp, false)],
        ['🐢 慢速', () => speak(sentence.jp, true)],
        ['讀音', () => { reading.hidden = !reading.hidden; }],
        ['中文', () => { zh.hidden = !zh.hidden; }]
      ]) {
        const button = el('button', 'small-action secondary', label);
        button.type = 'button';
        button.addEventListener('click', action);
        actions.append(button);
      }
      card.append(jp, reading, zh, actions);
      support.append(card);
    }
    const answers = el('section', 'answer-section');
    answers.id = 'page-answers';
    answers.append(el('h3', null, '題目答案'));
    if (hasAnswers) {
      const toggle = el('button', 'small-action', showAnswers ? '隱藏答案' : '顯示全部答案');
      toggle.type = 'button';
      toggle.addEventListener('click', () => { showAnswers = !showAnswers; render(); document.getElementById('page-answers').scrollIntoView({ block: 'nearest' }); });
      answers.append(toggle);
      for (const item of info.answers) {
        const box = el('div', 'answer');
        box.hidden = !showAnswers;
        box.append(el('strong', null, `${item.label}｜${item.answer}`), el('p', null, item.reason));
        answers.append(box);
      }
    } else {
      answers.append(el('p', 'status', page === 150 ? 'CD23 聽力填空①～⑥尚無音檔或解答可核對。' : '此頁尚無已核對的題目答案。'));
    }
    support.append(answers);
    layout.append(support, photo);
    root.append(layout);
    input.value = String(page);
    previous.disabled = page === low;
    next.disabled = page === high;
    picker.querySelectorAll('a').forEach(anchor => {
      if (Number(anchor.dataset.page) === page) anchor.setAttribute('aria-current', 'page');
      else anchor.removeAttribute('aria-current');
    });
  }

  function navigate(number, scroll = true) {
    if (!Number.isInteger(number) || number < low || number > high || !content) return false;
    window.speechSynthesis?.cancel();
    page = number;
    showTranslations = false;
    showAnswers = false;
    try { localStorage.setItem(storageKey, String(page)); } catch {}
    if (location.hash !== `#p${page}`) history.pushState(null, '', `#p${page}`);
    render();
    if (scroll) root.scrollIntoView({ block: 'start' });
    return true;
  }

  for (let number = low; number <= high; number++) {
    const anchor = el('a', null, String(number));
    anchor.href = `#p${number}`;
    anchor.dataset.page = number;
    anchor.addEventListener('click', event => { event.preventDefault(); navigate(number); });
    picker.append(anchor);
  }
  document.getElementById('page-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!navigate(Number(input.value))) input.reportValidity();
  });
  previous.addEventListener('click', () => navigate(page - 1));
  next.addEventListener('click', () => navigate(page + 1));
  document.getElementById('jump').addEventListener('click', () => { document.getElementById('page-form').scrollIntoView(); input.focus(); input.select(); });
  document.getElementById('translation').addEventListener('click', () => { showTranslations = !showTranslations; root.querySelectorAll('.zh').forEach(node => { node.hidden = !showTranslations; }); });
  document.getElementById('answers').addEventListener('click', () => { showAnswers = true; render(); document.getElementById('page-answers').scrollIntoView({ block: 'nearest' }); });
  window.addEventListener('popstate', () => {
    const number = Number(location.hash.match(/^#p(\d{3})$/)?.[1]);
    if (number >= low && number <= high) { page = number; render(); }
  });

  fetch('data.json').then(response => {
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    return response.json();
  }).then(data => {
    content = data;
    const hashPage = Number(location.hash.match(/^#p(\d{3})$/)?.[1]);
    let saved = low;
    try { saved = Number(localStorage.getItem(storageKey)) || low; } catch {}
    page = hashPage >= low && hashPage <= high ? hashPage : saved >= low && saved <= high ? saved : low;
    navigate(page, false);
  }).catch(() => { root.textContent = '教材載入失敗，請重新整理頁面。'; });
})();

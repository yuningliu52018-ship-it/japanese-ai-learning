(() => {
  const read = (key) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  };
  const savedPage = (id) => {
    try { return localStorage.getItem(`japanese-ai-learning.${id}.page`); } catch { return null; }
  };
  let catalogue = [];
  function showContinue(lessons) {
    catalogue = lessons;
    const link = document.querySelector('[data-continue-link]');
    if (!link || !lessons.length) return;
    const recent = read('japanese-ai-learning.last-read');
    const legacy = read('japanese-ai-learning-passport-v1');
    const lesson = lessons.find((entry) => entry.id === recent?.lessonId)
      || lessons.find((entry) => legacy?.lastLesson?.split('#')[0] === entry.href.split('#')[0])
      || lessons[0];
    const image = window.JapaneseTextbookArtwork(lesson);
    const page = savedPage(lesson.id);
    const number = lesson.title.split('：')[0];
    const name = lesson.title.split('：').slice(1).join('：') || lesson.title;
    const heading = document.querySelector('.continue-copy h3');
    heading.replaceChildren();
    const label = document.createElement('span');
    label.className = 'lesson-numeral';
    label.textContent = `${number}${/^\d+$/.test(page || '') ? `・第 ${page} 頁` : ''}`;
    const title = document.createElement('span');
    title.lang = 'ja'; title.textContent = name;
    heading.append(label, title);
    const picture = document.querySelector('.continue-image');
    picture.src = image.src; picture.alt = image.alt;
    link.href = `${lesson.href.split('#')[0]}${/^\d+$/.test(page || '') ? `#page-${page}` : ''}`;
    document.querySelector('.continue-copy p').textContent = page
      ? '接著上次閱讀的課本頁，繼續聆聽與練習。'
      : '從這一課開始，逐頁聆聽、閱讀與練習。';
    document.querySelectorAll('.toc-lesson').forEach((entry) => {
      entry.classList.toggle('is-current', entry.dataset.lessonId === lesson.id);
    });
  }
  document.addEventListener('lessons:loaded', (event) => showContinue(event.detail.lessons));
  window.addEventListener('pageshow', () => { if (catalogue.length) showContinue(catalogue); });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-learning-link]');
    if (!link) return;
    const href = link.getAttribute('href').split('#')[0];
    const lesson = catalogue.find((entry) => entry.href.split('#')[0] === href);
    if (lesson) {
      try { localStorage.setItem('japanese-ai-learning.last-read', JSON.stringify({ lessonId: lesson.id })); } catch {}
    }
  });
})();

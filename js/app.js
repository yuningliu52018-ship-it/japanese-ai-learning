window.JapaneseTextbookArtwork = (lesson) => {
  const artwork = {
    k4: { src: 'assets/textbook/k4-watercolor-v2.png', alt: '日式辦公室接待人員以電話接受傳言' },
    k5: { src: 'assets/textbook/k5-watercolor-v2.png', alt: '在日本河畔街道詢問路線' },
    k6: { src: 'assets/textbook/k6-watercolor-v2.png', alt: '日本職場中向主管提出請求並交涉' }
  };
  return lesson.image ? { src: lesson.image, alt: lesson.imageAlt || '' }
    : artwork[lesson.id] || { src: 'assets/textbook/cover-watercolor-v2.png', alt: '日式閱讀書桌' };
};

function renderTextbookContents(lessons) {
  return lessons.map((lesson) => {
    const image = window.JapaneseTextbookArtwork(lesson);
    const entryHref = lesson.href;
    const number = lesson.title.split('：')[0];
    const title = lesson.title.split('：').slice(1).join('：') || lesson.title;
    return `<li class="toc-lesson" data-lesson-id="${lesson.id || ''}">
      <img class="toc-thumbnail" src="${image.src}" alt="${image.alt}" width="1536" height="1024" loading="lazy">
      <div><a class="toc-title" data-learning-link href="${entryHref}"><span class="toc-number">${number}</span><span lang="ja">${title}</span></a>
      <p class="toc-description">${lesson.description}</p>
      </div>
      <a class="toc-arrow" data-learning-link href="${entryHref}" aria-label="開啟${number}">›</a>
    </li>`;
  }).join('');
}

async function loadLessons() {
  const lessonList = document.getElementById('lesson-list');
  if (!lessonList) return;
  try {
    const response = await fetch('data/lessons.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const lessons = await response.json();
    lessonList.innerHTML = document.body.classList.contains('textbook-home')
      ? renderTextbookContents(lessons)
      : lessons.map((lesson) => `<li><a href="${lesson.href}"><span class="lesson-title">${lesson.title}</span><span class="lesson-meta">${lesson.description}</span></a></li>`).join('');
    document.dispatchEvent(new CustomEvent('lessons:loaded', { detail: { lessons } }));
  } catch (error) {
    lessonList.innerHTML = '<li class="empty-state">課程目次暫時無法載入，請重新整理。</li>';
    console.error('Failed to load lessons:', error);
  }
}
document.addEventListener('DOMContentLoaded', loadLessons);

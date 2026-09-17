function renderTextbookContents(lessons) {
  return lessons.map((lesson) => {
    const current = lesson.href.includes('/k5-');
    const entryHref = current ? `${lesson.href.split('#')[0]}#textbook-pages` : lesson.href;
    const number = current ? '第 5 課' : '第 4 課';
    const title = lesson.title.split('：').slice(1).join('：') || lesson.title;
    return `<li class="toc-lesson${current ? ' is-current' : ''}">
      <img class="toc-thumbnail${current ? '' : ' is-quiet'}" src="assets/textbook/${current ? 'coastal-train' : 'fuji-watercolor'}.webp" alt="" loading="lazy">
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
  } catch (error) {
    lessonList.innerHTML = '<li class="empty-state">課程目次暫時無法載入，請重新整理。</li>';
    console.error('Failed to load lessons:', error);
  }
}
document.addEventListener('DOMContentLoaded', loadLessons);

async function loadLessons() {
  const lessonList = document.getElementById('lesson-list');
  if (!lessonList) return;

  try {
    const response = await fetch('data/lessons.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const lessons = await response.json();
    lessonList.innerHTML = lessons
      .map(
        (lesson) => `
          <li>
            <a href="${lesson.href}">
              <span class="lesson-title">${lesson.title}</span>
              <span class="lesson-meta">${lesson.description}</span>
            </a>
          </li>
        `
      )
      .join('');
  } catch (error) {
    lessonList.innerHTML = `
      <li class="empty-state">無法載入課程清單，請確認 data/lessons.json 是否存在。</li>
    `;
    console.error('Failed to load lessons:', error);
  }
}

document.addEventListener('DOMContentLoaded', loadLessons);

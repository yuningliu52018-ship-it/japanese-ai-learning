const lessons = [
  {
    title: '第四課：ということだ',
    description: '情報傳達、確認與轉述句型',
    href: 'lessons/k4-ということだ/index.html'
  },
  {
    title: '第四課：使役被動',
    description: '〜させられる 的規則、例句與練習',
    href: 'lessons/k4-使役被動/index.html'
  },
  {
    title: '第四課：伝言、お願いできますか',
    description: '電話轉接、代接留言與商務敬語',
    href: 'lessons/k4-伝言お願いできますか/index.html'
  }
];

const lessonList = document.getElementById('lesson-list');

if (lessonList) {
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
}

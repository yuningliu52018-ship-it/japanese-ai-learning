(() => {
  const KEY = 'japanese-ai-learning-passport-v1';
  const today = new Date();
  const dateKey = today.toISOString().slice(0, 10);
  const dateLabel = new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  }).format(today);

  const fallback = { visits: 0, activeDays: [], lastLesson: '', lastVisit: '' };
  let state = fallback;

  try {
    state = { ...fallback, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch (_) {}

  if (!state.activeDays.includes(dateKey)) state.activeDays.push(dateKey);
  state.activeDays = state.activeDays.slice(-60);
  state.visits = Number(state.visits || 0) + 1;
  state.lastVisit = dateKey;
  localStorage.setItem(KEY, JSON.stringify(state));

  document.querySelectorAll('[data-today-date]').forEach((el) => {
    el.textContent = dateLabel;
  });

  const activeDays = document.querySelector('[data-active-days]');
  const visits = document.querySelector('[data-visits]');
  const lessonCount = document.querySelector('[data-lesson-count]');
  if (activeDays) activeDays.textContent = state.activeDays.length;
  if (visits) visits.textContent = state.visits;

  fetch('data/lessons.json')
    .then((response) => response.ok ? response.json() : [])
    .then((lessons) => {
      if (lessonCount) lessonCount.textContent = lessons.length;
    })
    .catch(() => {});

  document.querySelectorAll('a[data-learning-link]').forEach((link) => {
    link.addEventListener('click', () => {
      state.lastLesson = link.getAttribute('href') || '';
      localStorage.setItem(KEY, JSON.stringify(state));
    });
  });
})();
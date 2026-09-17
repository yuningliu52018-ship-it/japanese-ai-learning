(() => {
  const key = 'audio-textbook.last-position';
  const continueLink = document.querySelector('[data-continue-link]');
  // Always enter at the page chooser, regardless of an older saved chapter.
  if (continueLink) continueLink.hash = 'textbook-pages';
  // Preserve the existing prototype passport without changing the entry target.
  const passportKey = 'japanese-ai-learning-passport-v1';
  const day = new Date().toISOString().slice(0, 10);
  let passport = {};
  try { passport = JSON.parse(localStorage.getItem(passportKey) || '{}') || {}; } catch {}
  if (typeof passport !== 'object' || Array.isArray(passport)) passport = {};
  passport.activeDays = Array.isArray(passport.activeDays) ? passport.activeDays : [];
  if (!passport.activeDays.includes(day)) passport.activeDays.push(day);
  passport.activeDays = passport.activeDays.slice(-60);
  passport.visits = (Number.isFinite(Number(passport.visits)) ? Number(passport.visits) : 0) + 1;
  passport.lastVisit = day;
  const savePassport = () => {
    try { localStorage.setItem(passportKey, JSON.stringify(passport)); } catch {}
  };
  savePassport();
  const activeDays = document.querySelector('[data-active-days]');
  const visits = document.querySelector('[data-visits]');
  const count = document.querySelector('[data-lesson-count]');
  if (activeDays) activeDays.textContent = passport.activeDays.length;
  if (visits) visits.textContent = passport.visits;
  document.querySelectorAll('[data-today-date]').forEach(element => {
    element.textContent = new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date());
  });
  if (count) fetch('data/lessons.json').then(response => response.ok ? response.json() : [])
    .then(lessons => { count.textContent = lessons.length; }).catch(() => {});
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-learning-link]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    passport.lastLesson = href;
    savePassport();
    if (href.startsWith('lessons/k5-')) {
      try { localStorage.setItem(key, href); } catch {}
    }
  });
})();

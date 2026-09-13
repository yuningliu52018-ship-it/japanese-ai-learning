(() => {
  const key = 'audio-textbook.last-position';
  const continueLink = document.querySelector('[data-continue-link]');
  try {
    const saved = localStorage.getItem(key);
    // The continuing lesson must remain within the actual Lesson 05 directory.
    if (saved && /^lessons\/k5-[^/]+\/index\.html(?:#[\w-]+)?$/.test(decodeURI(saved)) && continueLink) {
      continueLink.href = saved;
    }
  } catch { /* Reading is available even when device storage is blocked. */ }
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-learning-link]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (href.startsWith('lessons/k5-')) {
      try { localStorage.setItem(key, href); } catch {}
    }
  });
})();

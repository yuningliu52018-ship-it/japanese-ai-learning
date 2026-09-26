/* Lesson 06 uses the same page control and lesson renderer as Lesson 05. */
(() => {
  const root = document.getElementById('lesson-root');
  if (!root) return;
  const storageKey = 'japanese-ai-learning.k6.page';

  function setup() {
    const chapterNav = root.querySelector('.chapter-nav');
    if (!chapterNav) return false;
    const sections = [...root.querySelectorAll(':scope > .lesson-section')];
    const headers = new Map();
    const pages = new Map();
    let chapter = 'vocabulary';

    for (const section of sections) {
      const heading = section.querySelector('.chapter-heading');
      if (heading) {
        chapter = heading.id.replace('chapter-', '');
        headers.set(chapter, section);
        continue;
      }
      const page = Number(section.dataset.page);
      if (!Number.isInteger(page) || page < 136 || page > 164) continue;
      if (!pages.has(page)) pages.set(page, { chapter, sections: [] });
      pages.get(page).sections.push(section);
    }
    if (pages.size !== 29) return false;

    const nav = document.createElement('nav');
    nav.className = 'lesson-page-navigation';
    nav.id = 'textbook-pages';
    nav.setAttribute('aria-label', '教材翻頁');
    nav.innerHTML = '<button type="button" data-page-prev>← 上一頁</button><label>教材頁碼 <select aria-label="教材頁碼"></select></label><button type="button" data-page-next>下一頁 →</button>';
    const select = nav.querySelector('select');
    for (let page = 136; page <= 164; page++) {
      const option = document.createElement('option');
      option.value = String(page);
      option.textContent = `${page} 頁`;
      select.add(option);
    }
    chapterNav.after(nav);
    chapterNav.hidden = true;
    let current = 136;

    function show(page, scroll = false) {
      const entry = pages.get(page);
      if (!entry) return;
      if (page !== current) {
        root.querySelector('[data-speech-stop]')?.click();
        root.querySelector('[data-shadow-close]')?.click();
      }
      current = page;
      sections.forEach(section => { section.hidden = true; });
      headers.get(entry.chapter).hidden = false;
      entry.sections.forEach(section => { section.hidden = false; });
      select.value = String(page);
      nav.querySelector('[data-page-prev]').disabled = page === 136;
      nav.querySelector('[data-page-next]').disabled = page === 164;
      try { localStorage.setItem(storageKey, String(page)); } catch {}
      if (scroll) nav.scrollIntoView({ block: 'start' });
    }

    function navigate(page) {
      if (!pages.has(page)) return;
      history.pushState(null, '', `#page-${page}`);
      show(page, true);
    }
    nav.querySelector('[data-page-prev]').onclick = () => navigate(current - 1);
    nav.querySelector('[data-page-next]').onclick = () => navigate(current + 1);
    select.onchange = () => navigate(Number(select.value));

    function followHash() {
      const match = location.hash.match(/^#(?:page-|p)(\d{3})$/);
      let saved = 136;
      try { saved = Number(localStorage.getItem(storageKey)) || 136; } catch {}
      const requested = match ? Number(match[1]) : saved;
      show(pages.has(requested) ? requested : 136);
      if (match) nav.scrollIntoView({ block: 'start' });
    }
    window.addEventListener('hashchange', followHash);
    window.addEventListener('popstate', followHash);
    followHash();
    return true;
  }

  if (!setup()) {
    const observer = new MutationObserver(() => { if (setup()) observer.disconnect(); });
    observer.observe(root, { childList: true });
  }
})();

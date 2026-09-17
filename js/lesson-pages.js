/* Lesson 05 presentation only: keep the existing renderer and speech nodes. */
(() => {
  const root = document.getElementById('lesson-root');
  if (!root) return;
  function setup() {
    const chapterNav = root.querySelector('.chapter-nav');
    if (!chapterNav) return false;
    const sections = [...root.querySelectorAll(':scope > .lesson-section')];
    const pages = new Map();
    const headers = new Map();
    const assignments = new Map();
    let chapter = 'vocabulary';
    const text = node => {
      const copy = node.cloneNode(true);
      copy.querySelectorAll('rt').forEach(el => el.remove());
      return copy.textContent.trim();
    };
    function add(key, section, items = null) {
      if (!pages.has(key)) pages.set(key, { key, chapter, entries: [] });
      pages.get(key).entries.push({ section, items });
      if (!assignments.has(section)) assignments.set(section, key);
    }
    for (const section of sections) {
      const header = section.querySelector('.chapter-heading');
      if (header) {
        chapter = header.id.replace('chapter-', '');
        headers.set(chapter, section);
        continue;
      }
      const title = text(section.querySelector('.lesson-section-heading') || section);
      if (chapter === 'vocabulary' && /1[–-]66/.test(title)) {
        const items = [...section.querySelectorAll('.lesson-item')];
        add('112', section, items.slice(0, 31));
        add('113', section, items.slice(31, 64));
        add('supplement-vocabulary', section, items.slice(64));
        continue;
      }
      let key;
      if (section.id === 'section-dialogue') key = '124';
      else if (section.id === 'section-listening') key = '123';
      else if (section.id === 'section-audio-cd19') key = '130';
      else if (section.id === 'section-audio-cd20') key = '133';
      else if (title.includes('118–119')) key = '118';
      else if (title.includes('125–127')) key = title.includes('完整示範會話') ? '126' : '125';
      else if (title.includes('128–131')) key = 'review-reading';
      else key = title.match(/^(\d{3})頁/)?.[1] || `supplement-${chapter}`;
      const heading = section.querySelector('.lesson-section-heading h3');
      if (heading && (title.includes('118–119') || title.includes('125–127'))) {
        const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) walker.currentNode.textContent = walker.currentNode.textContent.replace(/118–119|125–127/g, key);
      }
      add(key, section);
    }
    const chapterOrder = [...headers.keys()];
    const list = [...pages.values()].sort((a, b) =>
      chapterOrder.indexOf(a.chapter) - chapterOrder.indexOf(b.chapter) ||
      (Number(a.key) || 999) - (Number(b.key) || 999));
    const label = key => /^\d+$/.test(key) ? `${key} 頁` : key.startsWith('review') ? '128–131 頁・綜合複習' : '補充（未指定頁碼）';
    const nav = document.createElement('nav');
    nav.className = 'lesson-page-navigation';
    nav.id = 'textbook-pages';
    nav.setAttribute('aria-label', '教材翻頁');
    nav.innerHTML = '<button type="button" data-page-prev>← 上一頁</button><label>教材頁碼 <select aria-label="教材頁碼"></select></label><button type="button" data-page-next>下一頁 →</button>';
    const select = nav.querySelector('select');
    for (const page of list) {
      const option = document.createElement('option');
      option.value = page.key;
      option.textContent = label(page.key) + (page.key.startsWith('supplement') ? `・${page.chapter === 'vocabulary' ? '單語' : '文法'}` : '');
      select.append(option);
    }
    chapterNav.after(nav);
    chapterNav.hidden = true;
    let current = -1;
    function show(index, scroll = false) {
      if (index < 0 || index >= list.length) return;
      const page = list[index];
      if (current !== index && current !== -1) {
        root.querySelector('[data-speech-stop]')?.click();
        root.querySelector('[data-shadow-close]')?.click();
        root.querySelectorAll('audio').forEach(audio => audio.pause());
      }
      current = index;
      sections.forEach(section => { section.hidden = true; });
      headers.get(page.chapter).hidden = false;
      for (const { section, items } of page.entries) {
        section.hidden = false;
        if (items) {
          section.querySelectorAll('.lesson-item').forEach(item => { item.hidden = !items.includes(item); });
          section.querySelector('.lesson-section-heading h3').textContent = page.key === '112' ? '112頁｜單語 1–31' : page.key === '113' ? '113頁｜單語 32–64' : '補充單語 65–66（未指定頁碼）';
          const button = section.querySelector('.lesson-section-heading [data-speak]');
          if (button) {
            const phrases = items.map(item => item.querySelector('[data-speak]')?.dataset.speak).filter(Boolean).map(decodeURIComponent).join('。');
            button.dataset.speak = encodeURIComponent(phrases);
            button.setAttribute('aria-label', '朗讀本頁單語');
          }
        }
      }
      select.value = page.key;
      nav.querySelector('[data-page-prev]').disabled = index === 0;
      nav.querySelector('[data-page-next]').disabled = index === list.length - 1;
      chapterNav.querySelectorAll('a').forEach(a => {
        if (a.hash === `#chapter-${page.chapter}`) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
      if (scroll) nav.scrollIntoView({ block: 'start' });
    }
    function navigate(index) {
      if (!list[index]) return;
      history.pushState(null, '', `#page-${list[index].key}`);
      show(index, true);
    }
    nav.querySelector('[data-page-prev]').onclick = () => navigate(current - 1);
    nav.querySelector('[data-page-next]').onclick = () => navigate(current + 1);
    select.onchange = () => navigate(list.findIndex(page => page.key === select.value));
    function followHash() {
      const id = decodeURIComponent(location.hash.slice(1));
      let index = -1;
      if (id.startsWith('page-')) index = list.findIndex(page => page.key === id.slice(5));
      else if (id.startsWith('chapter-')) index = list.findIndex(page => page.chapter === id.slice(8));
      else {
        const section = document.getElementById(id)?.closest('.lesson-section');
        index = list.findIndex(page => page.key === assignments.get(section));
      }
      show(index >= 0 ? index : current >= 0 ? current : 0);
      if (id.startsWith('page-')) nav.scrollIntoView({ block: 'start' });
      else document.getElementById(id)?.scrollIntoView({ block: 'start' });
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

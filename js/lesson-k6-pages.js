/* Lesson 06 uses the same page control and lesson renderer as Lesson 05. */
(() => {
  const root = document.getElementById('lesson-root');
  if (!root) return;
  const storageKey = 'japanese-ai-learning.k6.page';
  let initialized = false;
  let observer = null;

  function setup() {
    if (initialized) return true;
    if (root.querySelector('[data-page-navigation]')) {
      initialized = true;
      return true;
    }

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
    nav.setAttribute('data-page-navigation', 'k6');
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
    let hasShown = false;
    let navigationRegistered = false;
    let registeredWithApi = false;

    const locationFor = (page) => {
      const entry = pages.get(page);
      if (!entry) return null;
      return {
        key: `page-${page}`,
        href: `#page-${page}`,
        label: `${page} 頁`,
        chapterId: entry.chapter,
        sectionId: entry.sections[0]?.dataset.sectionId || null,
        pageKey: String(page),
        kind: 'page'
      };
    };

    const pageFrom = (value) => {
      let candidate = value;
      if (candidate && typeof candidate === 'object') {
        candidate = candidate.pageKey ?? candidate.key ?? candidate.href ?? candidate.page;
      }
      const match = String(candidate ?? '').match(/^#?(?:(?:page-|p))?(\d{3})$/);
      if (!match) return null;
      const page = Number(match[1]);
      return pages.has(page) ? page : null;
    };

    const notifyLocation = (source = 'adapter') => {
      const currentLocation = locationFor(current);
      if (!currentLocation) return;
      if (registeredWithApi && typeof window.JapaneseLesson?._notifyLocation === 'function') {
        window.JapaneseLesson._notifyLocation(currentLocation, source);
        return;
      }
      root.dispatchEvent(new CustomEvent('lesson:location-change', {
        bubbles: true,
        detail: { location: currentLocation, source }
      }));
    };

    function show(page, scroll = false, source = 'adapter') {
      const entry = pages.get(page);
      if (!entry) return false;
      const changed = !hasShown || page !== current;
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
      hasShown = true;
      if (changed && navigationRegistered) notifyLocation(source);
      return true;
    }

    function goTo(value, options = {}) {
      const page = pageFrom(value);
      if (page === null) return false;
      const historyMode = options.history ?? 'push';
      const scroll = options.scroll !== false;
      const href = `#page-${page}`;
      if (location.hash !== href) {
        if (historyMode === 'replace') {
          history.replaceState(null, '', href);
        } else if (historyMode !== 'none') {
          history.pushState(null, '', href);
        }
      }
      return show(page, scroll, options.source || 'adapter');
    }

    function reveal(target, options = {}) {
      const requestedPage = pageFrom(target);
      if (requestedPage !== null && !target?.nodeType) {
        return goTo(requestedPage, { ...options, source: options.source || 'reveal' });
      }

      let element = target;
      if (element && typeof element === 'object' && !element.nodeType) {
        element = element.element || element.target || null;
      }
      if (typeof element === 'string') {
        const id = element.replace(/^#/, '');
        element = document.getElementById(id);
        if (!element) {
          try { element = root.querySelector(element); } catch { element = null; }
        }
      }
      if (element?.nodeType && !element.closest) element = element.parentElement;
      const section = element?.closest?.('.lesson-section');
      const chapterId = section?.dataset.chapterId || section?.querySelector('.chapter-heading')?.id.replace('chapter-', '');
      const page = pageFrom(section?.dataset.page) ??
        [...pages].find(([, entry]) => entry.chapter === chapterId)?.[0] ?? null;
      if (page === null) return false;

      let details = element.closest?.('details');
      while (details && root.contains(details)) {
        details.open = true;
        details = details.parentElement?.closest('details');
      }

      const didShow = goTo(page, {
        ...options,
        history: options.history ?? 'push',
        scroll: false,
        source: options.source || 'reveal'
      });
      if (didShow && options.scroll !== false) {
        requestAnimationFrame(() => {
          element.scrollIntoView({
            behavior: options.behavior || 'smooth',
            block: options.block || 'center'
          });
        });
      }
      return didShow;
    }

    const navigation = {
      kind: 'pages',
      lessonId: 'k6',
      getCurrent: () => locationFor(current),
      getLocations: () => [...pages.keys()].map(locationFor),
      goTo,
      reveal
    };

    nav.querySelector('[data-page-prev]').onclick = () => goTo(current - 1, { source: 'previous' });
    nav.querySelector('[data-page-next]').onclick = () => goTo(current + 1, { source: 'next' });
    select.onchange = () => goTo(Number(select.value), { source: 'select' });

    function followHash(event) {
      const match = location.hash.match(/^#(?:page-|p)(\d{3})$/);
      let saved = 136;
      try { saved = Number(localStorage.getItem(storageKey)) || 136; } catch {}
      const requested = match ? Number(match[1]) : saved;
      show(pages.has(requested) ? requested : 136, false, event?.type || 'initial');
      if (match) nav.scrollIntoView({ block: 'start' });
    }
    window.addEventListener('hashchange', followHash);
    window.addEventListener('popstate', followHash);
    followHash();

    if (typeof window.JapaneseLesson?._registerNavigation === 'function') {
      registeredWithApi = window.JapaneseLesson._registerNavigation(navigation) === true;
    }
    if (!registeredWithApi) {
      root.lessonNavigation = navigation;
      root.dispatchEvent(new CustomEvent('lesson:navigation-ready', {
        bubbles: true,
        detail: { navigation, location: navigation.getCurrent() }
      }));
    }
    navigationRegistered = true;
    notifyLocation('initial');
    initialized = true;
    return true;
  }

  const trySetup = () => {
    if (!setup()) return false;
    observer?.disconnect();
    observer = null;
    root.removeEventListener('lesson:rendered', handleRendered);
    return true;
  };

  const handleRendered = () => queueMicrotask(trySetup);

  root.addEventListener('lesson:rendered', handleRendered);
  if (!trySetup()) {
    observer = new MutationObserver(trySetup);
    observer.observe(root, { childList: true });
  }
})();

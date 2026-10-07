/* Shared textbook-page presentation driven only by the explicit pagePresentation contract. */
(() => {
  const root = document.getElementById('lesson-root');
  if (!root) return;

  const token = (value = '') => String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'section';

  const decodeSpeak = (value = '') => {
    try { return decodeURIComponent(value); } catch { return value; }
  };

  let initialized = false;
  let setupPending = false;
  let observer = null;

  function renderedStructure() {
    const chapterNav = root.querySelector('[data-chapter-navigation]');
    if (!chapterNav) return null;
    const allSections = [...root.querySelectorAll(':scope > [data-lesson-section]')];
    const contentSections = allSections.filter((section) => section.dataset.sectionKind === 'content');
    const sectionById = new Map(contentSections.map((section) => [section.dataset.sectionId, section]));
    const chapterHeaders = new Map(
      allSections
        .filter((section) => section.dataset.sectionKind === 'chapter')
        .map((section) => [section.dataset.chapterId, section])
    );
    return {
      chapterNav,
      allSections,
      contentSections,
      sectionById,
      chapterHeaders,
      chapterOrder: [...chapterHeaders.keys()]
    };
  }

  function pagesFromPresentation(structure, presentation) {
    const { contentSections, sectionById, chapterHeaders, chapterOrder } = structure;
    const itemBySectionAndId = new Map();

    for (const section of contentSections) {
      const sectionId = section.dataset.sectionId;
      const items = [...section.querySelectorAll('.lesson-item')];
      if (!items.length) continue;
      const byId = new Map();
      items.forEach((item) => {
        const itemId = item.dataset.itemId;
        if (!itemId) return;
        if (byId.has(itemId)) throw new Error(`${sectionId} 有重複 itemId：${itemId}`);
        byId.set(itemId, item);
      });
      if (byId.size) itemBySectionAndId.set(sectionId, byId);
    }

    const assignedWholeSections = new Set();
    const assignedItems = new WeakSet();
    const verifiedKeys = new Set((presentation.verifiedPages || []).map(String));
    const pages = [];
    const pageKeys = new Set();

    const addEntry = (page, section, items = null) => {
      let entry = page.entries.find((candidate) => candidate.section === section);
      if (!entry) {
        entry = { section, items: items ? new Set() : null };
        page.entries.push(entry);
      }
      if (!items) {
        if (entry.items?.size) throw new Error(`${section.dataset.sectionId} 同時被整段與部分指派`);
        entry.items = null;
        return;
      }
      if (entry.items === null) throw new Error(`${section.dataset.sectionId} 同時被整段與部分指派`);
      items.forEach((item) => entry.items.add(item));
    };

    for (const pageDefinition of presentation.pages) {
      const key = String(pageDefinition.key);
      if (pageKeys.has(key)) throw new Error(`pagePresentation 有重複頁碼：${key}`);
      pageKeys.add(key);
      const page = {
        key,
        label: pageDefinition.label || `${key} 頁`,
        chapterId: pageDefinition.chapterId,
        entries: [],
        verified: verifiedKeys.size ? verifiedKeys.has(key) : true
      };
      if (!chapterHeaders.has(page.chapterId)) throw new Error(`${key} 頁的章節不存在：${page.chapterId}`);

      for (const assignment of pageDefinition.assignments || []) {
        const section = sectionById.get(assignment.sectionId);
        if (!section) throw new Error(`${key} 頁找不到 section：${assignment.sectionId}`);
        if (section.dataset.chapterId !== page.chapterId) {
          throw new Error(`${assignment.sectionId} 不屬於 ${page.chapterId} 章`);
        }

        if (Array.isArray(assignment.itemIds)) {
          if (assignedWholeSections.has(section)) throw new Error(`${assignment.sectionId} 同時被整段與部分指派`);
          const byId = itemBySectionAndId.get(assignment.sectionId);
          if (!byId) throw new Error(`${assignment.sectionId} 沒有可依 itemId 分頁的項目`);
          const items = assignment.itemIds.map((itemId) => {
            const item = byId.get(String(itemId));
            if (!item) throw new Error(`${key} 頁找不到 ${assignment.sectionId}/${itemId}`);
            if (assignedItems.has(item)) throw new Error(`${assignment.sectionId}/${itemId} 被重複指派`);
            assignedItems.add(item);
            return item;
          });
          addEntry(page, section, items);
        } else {
          if (assignedWholeSections.has(section)) throw new Error(`${assignment.sectionId} 被重複指派`);
          if ([...section.querySelectorAll('.lesson-item')].some((item) => assignedItems.has(item))) {
            throw new Error(`${assignment.sectionId} 同時被整段與部分指派`);
          }
          assignedWholeSections.add(section);
          addEntry(page, section);
        }
      }
      pages.push(page);
    }

    const pendingByChapter = new Map();
    for (const range of presentation.pendingRanges || []) {
      if (!pendingByChapter.has(range.chapterId)) pendingByChapter.set(range.chapterId, range);
    }
    const fallbackPages = new Map();
    const fallbackFor = (chapterId) => {
      if (fallbackPages.has(chapterId)) return fallbackPages.get(chapterId);
      const pending = pendingByChapter.get(chapterId);
      const page = {
        key: pending ? `pending-${token(pending.pages)}` : `supplement-${token(chapterId)}`,
        label: pending
          ? `${pending.pages} 頁｜待逐頁核對`
          : `${chapterId === 'vocabulary' ? '單語補充' : '補充教材'}｜未指定課本頁碼`,
        chapterId,
        entries: [],
        verified: false
      };
      fallbackPages.set(chapterId, page);
      return page;
    };

    for (const section of contentSections) {
      const chapterId = section.dataset.chapterId;
      const items = [...section.querySelectorAll('.lesson-item')];
      if (assignedWholeSections.has(section)) continue;
      if (items.length && items.some((item) => assignedItems.has(item))) {
        const remainingItems = items.filter((item) => !assignedItems.has(item));
        if (remainingItems.length) addEntry(fallbackFor(chapterId), section, remainingItems);
      } else {
        addEntry(fallbackFor(chapterId), section);
      }
    }

    const ordered = [];
    for (const chapterId of chapterOrder) {
      const chapterPages = pages.filter((page) => page.chapterId === chapterId);
      const fallback = fallbackPages.get(chapterId);
      if (fallback?.entries.length) chapterPages.push(fallback);
      ordered.push(...chapterPages);
    }
    if (!ordered.length) throw new Error('pagePresentation 沒有可顯示的頁面');
    return ordered;
  }

  function mountAdapter(structure, pages, lessonId, options = {}) {
    const { chapterNav, allSections, contentSections, sectionById, chapterHeaders } = structure;
    const rememberPage = options.rememberPage !== false;
    const storageKey = `japanese-ai-learning.${lessonId}.page`;

    root.querySelector(':scope > .lesson-page-navigation')?.remove();
    allSections.forEach((section) => { section.hidden = false; });
    contentSections.forEach((section) => {
      section.querySelectorAll('.lesson-item').forEach((item) => { item.hidden = false; });
    });

    const nav = document.createElement('nav');
    nav.className = 'lesson-page-navigation';
    nav.id = 'textbook-pages';
    nav.dataset.pageNavigation = lessonId;
    nav.setAttribute('aria-label', '教材翻頁');
    nav.innerHTML = '<button type="button" data-page-prev>← 上一頁</button><label>教材頁碼 <select aria-label="教材頁碼"></select></label><button type="button" data-page-next>下一頁 →</button>';
    const select = nav.querySelector('select');
    pages.forEach((page) => {
      const option = document.createElement('option');
      option.value = page.key;
      option.textContent = page.label;
      select.append(option);
    });
    chapterNav.after(nav);
    chapterNav.hidden = true;

    const headingSpeech = new Map();
    const headingText = new Map();
    contentSections.forEach((section) => {
      const heading = section.querySelector('.lesson-section-heading h3');
      if (heading) headingText.set(section, heading.textContent);
      const button = section.querySelector('.lesson-section-heading [data-speak]');
      if (button) {
        headingSpeech.set(section, {
          value: button.dataset.speak || '',
          label: button.getAttribute('aria-label') || '朗讀本單元'
        });
      }
    });

    const pageIndexesBySection = new Map();
    const pageIndexByItem = new WeakMap();
    pages.forEach((page, pageIndex) => {
      page.entries.forEach(({ section, items }) => {
        const indexes = pageIndexesBySection.get(section) || [];
        if (!indexes.includes(pageIndex)) indexes.push(pageIndex);
        pageIndexesBySection.set(section, indexes);
        items?.forEach((item) => pageIndexByItem.set(item, pageIndex));
      });
    });

    const locations = pages.map((page) => ({
      key: `page-${page.key}`,
      href: `#page-${page.key}`,
      label: page.label,
      chapterId: page.chapterId,
      sectionId: page.entries[0]?.section?.dataset.sectionId || null,
      pageKey: page.key,
      kind: 'page',
      verified: page.verified
    }));
    let current = -1;
    let navigationRegistered = false;

    const setSectionSpeech = (section, visibleItems) => {
      const button = section.querySelector('.lesson-section-heading [data-speak]');
      const original = headingSpeech.get(section);
      if (!button || !original) return;
      if (!visibleItems) {
        button.dataset.speak = original.value;
        button.setAttribute('aria-label', original.label);
        return;
      }
      const phrases = [...visibleItems]
        .map((item) => item.querySelector('[data-speak]')?.dataset.speak)
        .filter(Boolean)
        .map(decodeSpeak);
      button.dataset.speak = encodeURIComponent(phrases.join('。'));
      button.setAttribute('aria-label', '朗讀本頁內容');
    };

    const stopPageMedia = () => {
      root.querySelector('[data-speech-stop]')?.click();
      root.querySelector('[data-shadow-close]')?.click();
      root.querySelectorAll('audio').forEach((audio) => audio.pause());
    };

    function show(index, scroll = false, source = 'page') {
      const page = pages[index];
      if (!page) return false;
      const changed = current !== index;
      if (changed && current >= 0) stopPageMedia();
      current = index;
      allSections.forEach((section) => { section.hidden = true; });
      contentSections.forEach((section) => {
        section.querySelectorAll('.lesson-item').forEach((item) => { item.hidden = false; });
        setSectionSpeech(section, null);
        const heading = section.querySelector('.lesson-section-heading h3');
        if (heading && headingText.has(section)) heading.textContent = headingText.get(section);
      });
      chapterHeaders.get(page.chapterId).hidden = false;
      page.entries.forEach(({ section, items }) => {
        section.hidden = false;
        if (page.headingLabel) {
          const heading = section.querySelector('.lesson-section-heading h3');
          if (heading) heading.textContent = page.headingLabel;
        }
        if (items) {
          section.querySelectorAll('.lesson-item').forEach((item) => {
            // Reparented inline answers still belong to their original assignment.
            if(item.dataset.classroomSection && item.dataset.classroomSection!==section.dataset.sectionId)return;
            item.hidden = !items.has(item);
          });
          setSectionSpeech(section, items);
          const heading = section.querySelector('.lesson-section-heading h3');
          if (heading) heading.textContent = page.headingLabel || page.label;
        }
      });
      select.value = page.key;
      nav.querySelector('[data-page-prev]').disabled = index === 0;
      nav.querySelector('[data-page-next]').disabled = index === pages.length - 1;
      chapterNav.querySelectorAll('a').forEach((link) => {
        if (link.hash === `#chapter-${page.chapterId}`) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      if (rememberPage) {
        try { localStorage.setItem(storageKey, page.key); } catch {}
        try { localStorage.setItem('japanese-ai-learning.last-read', JSON.stringify({ lessonId, pageKey: page.key })); } catch {}
      }
      // A sticky nav can already be at viewport top while the reader is far below it.
      // Position the content root once, rather than scrolling that sticky element.
      if (scroll) root.scrollIntoView({ behavior: 'instant', block: 'start' });
      if (changed && navigationRegistered) window.JapaneseLesson?._notifyLocation?.(locations[index], source);
      return true;
    }

    function indexFor(target) {
      if (target instanceof Element) {
        const item = target.closest('.lesson-item');
        if (item && pageIndexByItem.has(item)) return pageIndexByItem.get(item);
        const section = target.closest('[data-lesson-section]');
        const indexes = pageIndexesBySection.get(section) || [];
        return indexes.includes(current) ? current : (indexes[0] ?? -1);
      }
      if (target && typeof target === 'object') {
        if (target.pageKey != null) return pages.findIndex((page) => page.key === String(target.pageKey));
        if (target.key) return locations.findIndex((location) => location.key === target.key);
        if (target.href) return indexFor(target.href);
        if (target.sectionId) {
          const section = sectionById.get(target.sectionId);
          const indexes = pageIndexesBySection.get(section) || [];
          return indexes.includes(current) ? current : (indexes[0] ?? -1);
        }
        if (target.chapterId) return pages.findIndex((page) => page.chapterId === target.chapterId);
      }
      let raw = String(target || '').replace(/^#/, '');
      try { raw = decodeURIComponent(raw); } catch {}
      if (raw.startsWith('page-')) return pages.findIndex((page) => page.key === raw.slice(5));
      if (raw.startsWith('chapter-')) return pages.findIndex((page) => page.chapterId === raw.slice(8));
      const directPage = pages.findIndex((page) => page.key === raw);
      if (directPage >= 0) return directPage;
      // Stable page-bearing item links remain page aliases after data cleanup.
      const aliasPage = raw.startsWith('item-') && raw.match(/-page-(\d+)-/)?.[1];
      if (aliasPage) return pages.findIndex((page) => page.key === aliasPage);
      const element = document.getElementById(raw);
      if (element) return indexFor(element);
      const section = sectionById.get(raw);
      const indexes = pageIndexesBySection.get(section) || [];
      return indexes.includes(current) ? current : (indexes[0] ?? -1);
    }

    function setLocation(index, locationOptions = {}) {
      if (!pages[index]) return false;
      const href = locations[index].href;
      const historyMode = locationOptions.history ?? 'push';
      if (historyMode !== 'none' && location.hash !== href) {
        if (historyMode === 'replace') history.replaceState(null, '', href);
        else history.pushState(null, '', href);
      }
      return show(index, locationOptions.scroll !== false, locationOptions.source || 'page');
    }

    function reveal(target, revealOptions = {}) {
      const index = indexFor(target);
      if (index < 0) return false;
      const exactTarget = target instanceof Element ? target : null;
      if (!setLocation(index, {
        ...revealOptions,
        scroll: exactTarget ? false : revealOptions.scroll,
        source: revealOptions.source || 'reveal'
      })) return false;
      if (exactTarget) {
        let details = exactTarget.closest('details');
        while (details && root.contains(details)) {
          details.open = true;
          details = details.parentElement?.closest('details');
        }
        if (revealOptions.scroll !== false) {
          exactTarget.scrollIntoView({
            behavior: revealOptions.behavior || 'smooth',
            block: revealOptions.block || 'start'
          });
        }
      }
      return true;
    }

    const adapter = {
      kind: 'pages',
      lessonId,
      getCurrent: () => current >= 0 ? { ...locations[current] } : null,
      getLocations: () => locations.map((location) => ({ ...location })),
      goTo: (target, locationOptions = {}) => setLocation(indexFor(target), locationOptions),
      reveal
    };
    root.lessonNavigation = adapter;
    nav.querySelector('[data-page-prev]').onclick = () => setLocation(current - 1, { source: 'previous' });
    nav.querySelector('[data-page-next]').onclick = () => setLocation(current + 1, { source: 'next' });
    select.onchange = () => setLocation(pages.findIndex((page) => page.key === select.value), { source: 'select' });

    let returningHash = null;
    function followHash(event) {
      if(event?.type==='popstate')returningHash=location.hash;
      const returning=event?.type==='popstate'||(event?.type==='hashchange'&&returningHash===location.hash);
      if(event?.type==='hashchange')returningHash=null;
      // Stable item URLs are page aliases; returning uses browser scroll restoration.
      const itemAlias = location.hash.startsWith('#item-');
      const hashIndex = indexFor(location.hash);
      let index = hashIndex;
      if (index < 0 && !location.hash && rememberPage) {
        try { index = pages.findIndex((page) => page.key === localStorage.getItem(storageKey)); } catch {}
      }
      if (index < 0) index = current >= 0 ? current : 0;
      show(index, hashIndex >= 0 && location.hash.startsWith('#page-') && !returning, event?.type || 'initial');
      if (hashIndex >= 0 && location.hash && !location.hash.startsWith('#page-')) {
        let id = location.hash.slice(1);
        try { id = decodeURIComponent(id); } catch {}
        if (!itemAlias) document.getElementById(id)?.scrollIntoView({ block: 'start' });
      }
    }
    window.addEventListener('hashchange', followHash);
    window.addEventListener('popstate', followHash);
    followHash();

    const registered = window.JapaneseLesson?._registerNavigation?.(adapter) === true;
    navigationRegistered = true;
    if (registered) window.JapaneseLesson?._notifyLocation?.(adapter.getCurrent(), 'initial');
    root.dataset.pageAdapterReady = lessonId;
    initialized = true;
    return true;
  }

  function setup() {
    if (initialized) return true;
    const structure = renderedStructure();
    if (!structure) return false;
    const lessonId = root.dataset.lessonId || root.lessonContext?.lessonId;
    if (!lessonId) return false;
    const presentation = root.lessonContext?.pagePresentation;

    if (presentation?.pages?.length) {
      const pages = pagesFromPresentation(structure, presentation);
      return mountAdapter(structure, pages, lessonId, {
        rememberPage: presentation.rememberPage !== false
      });
    }

    return false;
  }

  function ensureSetup() {
    if (initialized || setupPending) return;
    setupPending = true;
    queueMicrotask(() => {
      setupPending = false;
      try {
        if (setup()) {
          observer?.disconnect();
          observer = null;
        }
      } catch (error) {
        console.error('逐頁導覽初始化失敗；保留完整章節內容。', error);
      }
    });
  }

  root.addEventListener('lesson:rendered', ensureSetup);
  ensureSetup();
  if (!initialized) {
    observer = new MutationObserver(ensureSetup);
    observer.observe(root, { childList: true });
  }
})();

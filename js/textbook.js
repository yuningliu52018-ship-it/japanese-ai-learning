/* Lesson 05 presentation adapter. Speech, recording and fallback stay in lesson.js. */
(() => {
  const layouts = new WeakMap();
  const escape = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const element = (markup) => {
    const template = document.createElement('template');
    template.innerHTML = markup.trim();
    return template.content.firstElementChild;
  };
  const heading = (number, title, subtitle) => `<div class="book-unit-heading"><h2><span>${number}</span>${title}</h2><p lang="ja">${subtitle}</p></div>`;
  const compactActions = (text) => speechButton(text).replace('class="speech-button"', 'class="speech-button compact-play"');
  const formatTime = (seconds) => Number.isFinite(seconds) && seconds >= 0 ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '—';

  function vocabularyTable(entries) {
    const rows = entries.map((entry, index) => {
      const reading = (entry.plainText || '').match(/[（(]([^）)]+)[）)]/)?.[1]?.split('／')[0] || plainText(entry.japanese);
      const examples = entry.examples || [];
      const example = examples[0];
      const extra = [entry.grammarNote || entry.verbInfo, ...examples.map((ex, i) =>
        `${i ? `${ex.ruby || ex.japanese || ex.plain}${speechButton(ex.plain || ex.japanese || ex.ruby)}` : ''}${ex.chinese ? `<p>${ex.chinese}</p>` : ''}`)].filter(Boolean).join('');
      return `<tr${index >= 5 ? ' hidden data-more-word' : ''}>
        <td class="word-number">${String(index + 1).padStart(2, '0')}</td>
        <td class="word-term" lang="ja">${entry.japanese || entry.jpRuby || ''}</td>
        <td class="word-reading" lang="ja">${escape(reading)}</td>
        <td class="word-meaning">${entry.chinese || entry.zh || ''}</td>
        <td class="word-example" lang="ja">${example ? example.ruby || example.japanese || example.plain : entry.jpRuby || entry.japanese || ''}
          ${extra ? `<details class="word-extra"><summary>解說${examples.length > 1 ? `・另 ${examples.length - 1} 例` : ''}</summary>${extra}</details>` : ''}</td>
        <td class="word-sound">${compactActions(example ? example.plain || example.japanese || example.ruby : entry.japanese || entry.plainText)}</td>
      </tr>`;
    }).join('');
    return element(`<section class="book-unit vocabulary-unit" id="chapter-vocabulary">
      ${heading('01', '単語', 'ことばを覚えましょう')}
      <table class="word-table"><caption class="sr-only">第五課單語、讀音、中文及例句</caption><thead><tr>
        <th class="word-number" scope="col">No.</th><th class="word-term" scope="col">ことば</th><th class="word-reading" scope="col">読み方</th><th class="word-meaning" scope="col">中文</th><th scope="col">例文</th><th class="word-sound" scope="col">音声</th>
      </tr></thead><tbody>${rows}</tbody></table>
      ${entries.length > 5 ? `<button class="book-expand" type="button" data-expand-words aria-expanded="false">＋ もっと見る（全${entries.length}語）</button>` : ''}
    </section>`);
  }

  function dialogueSection(section) {
    const items = section?.items || [];
    return element(`<section class="book-unit" id="section-dialogue"><span id="chapter-speaking"></span>
      ${heading('03', '会話', '会話を聞いて、練習しましょう')}
      <p class="dialogue-intro">${section?.title || ''}</p>
      <div class="dialogue-lines">${items.map((item, i) => `<div class="dialogue-line"${i >= 3 ? ' hidden data-more-dialogue' : ''}>
        <span class="dialogue-role" lang="ja">${item.role || ''}</span>
        <div><p lang="ja">${item.jpRuby || item.japanese || item.jpPlain || ''}</p>
          <details class="dialogue-translation"><summary>中文・文法</summary><p>${item.zh || item.chinese || ''}</p>${item.grammarNote ? `<p>${item.grammarNote}</p>` : ''}</details>
        </div>${compactActions(itemSpeechText(item))}</div>`).join('')}</div>
      <div class="dialogue-actions">${speechButton(sectionSpeechText(section || {}), '全部播放')}
        <button type="button" data-dialogue-shadow>跟讀練習</button>
        ${items.length > 3 ? `<button type="button" data-expand-dialogue aria-expanded="false">展開完整會話 ↓</button>` : ''}
      </div>
    </section>`);
  }

  window.presentAudioTextbook = (root, data) => {
    if (!document.body.classList.contains('textbook-lesson')) return;
    layouts.get(root)?.();
    const controller = new AbortController();
    const on = (target, type, handler) => target?.addEventListener(type, handler, { signal: controller.signal });
    const originalSections = Array.from(root.children).filter((node) => node.classList.contains('lesson-section'));
    const records = originalSections.map((node, i) => ({ node, section: data.sections[i] }));
    const dialogue = data.sections.find((section) => section.type === 'dialogue_lessons');
    const audio = root.querySelector('#section-listening audio');
    const toolbar = root.querySelector('#speech-toolbar');
    const shadowPanel = root.querySelector('#shadowing-panel');
    const voice = root.querySelector('#speech-voice');
    const rate = root.querySelector('#speech-rate');
    const status = root.querySelector('#speech-status');
    const stop = root.querySelector('[data-speech-stop]');
    const preview = toolbar.querySelector('[data-speak]');
    const help = root.querySelector('#speech-voice-help');
    const title = document.getElementById('lesson-page-title');
    title.innerHTML = `<span class="lesson-title-prefix">第 5 課</span>${(data.titleRuby || data.title).split('：').slice(1).join('：')}`;
    document.getElementById('lesson-page-description').textContent = '道を尋ねる表現と、交通のことば';

    // Relocate existing controls so setupSpeech retains the same selectors and root.
    toolbar.replaceChildren(element(`<div class="audio-identity"><span class="cd-disc" aria-hidden="true"></span><div><strong>CD18</strong><small>第5課・会話音声</small></div></div>`));
    toolbar.append(element(`<div class="audio-transport"><button type="button" class="audio-play" data-cd-play aria-label="播放 CD18">▶</button><div class="audio-timeline"><input type="range" min="0" max="100" value="0" step="0.1" aria-label="CD18 播放進度" data-cd-progress disabled><div class="audio-times"><span data-cd-time>0:00</span><span>/</span><span data-cd-duration>—</span></div></div></div>`));
    const speedBox = element(`<div class="audio-setting"><span class="audio-label">再生速度</span><div class="audio-speeds"><button type="button" data-book-rate="0.95" aria-pressed="true" aria-label="Normal 0.95 倍速">0.95×</button><button type="button" data-book-rate="0.82" aria-pressed="false" aria-label="Slow 0.82 倍速">0.82×</button></div></div>`);
    rate.classList.add('sr-only');
    rate.setAttribute('aria-label', '朗讀速度');
    rate.tabIndex = -1;
    speedBox.append(rate);
    toolbar.append(speedBox);
    const voiceBox = element('<div class="audio-setting"><label for="speech-voice">音声 / Voice</label></div>');
    voiceBox.append(voice);
    toolbar.append(voiceBox);
    toolbar.append(element('<div class="audio-setting"><span class="audio-label">Shadowing</span><label class="shadow-mode"><input type="checkbox" id="book-shadow-mode" role="switch" aria-label="跟讀模式"><span>跟讀模式</span></label></div>'));
    help.classList.add('sr-only');
    toolbar.append(help);
    const statusLine = element('<div class="book-speech-status"></div>');
    statusLine.append(status, preview, stop);

    const spread = element('<div class="book-spread"><div class="book-primary"></div></div>');
    const primary = spread.firstElementChild;
    primary.append(vocabularyTable(data.vocabulary || []), dialogueSection(dialogue));
    const listening = element(`<section class="book-unit" id="section-listening">${heading('04', '聴解', '聞いて、答えましょう')}<div class="listening-strip"><span>CD18</span><span>会話を聞きましょう。</span><button type="button" data-cd-play aria-label="播放 CD18 原音">▶ 播放原音</button></div></section>`);
    primary.append(listening);
    const groups = [
      ['grammar', 'chapter-grammar', '02　文法', '句型與例句'],
      ['scenario', 'book-scenario', '05　情境練習', '道順を尋ねる・教える'],
      ['speaking', 'book-speaking-more', '会話・聴解 補充', '課內完整教材'],
      ['reading', 'chapter-reading', '読む・書く', '閱讀與寫作'],
      ['questions', 'chapter-questions', '問題', '綜合練習'],
      ['vocabulary', 'book-vocabulary-more', '単語 補充', '講義與用法']
    ];
    const groupElements = new Map(groups.map(([key,id,label,note]) => [key, element(`<details class="book-appendix" id="${id}"><summary>${label}<small>${note}</small></summary></details>`)]));
    for (const { node, section } of records) {
      if (!section || section.type === 'chapter_heading') continue;
      if (section === dialogue || (section.chapter === 'vocabulary' && section.items?.[0]?.id === '01')) continue;
      if (node.id === 'section-listening') {
        node.removeAttribute('id');
        const originalAudio = element('<details class="book-appendix"><summary>音檔資訊與原生播放器</summary></details>');
        originalAudio.append(node);
        listening.append(originalAudio);
        continue;
      }
      const key = section.type === 'scenario_practice' ? 'scenario' : section.chapter;
      groupElements.get(key)?.append(node);
    }
    for (const box of groupElements.values()) if (box.children.length > 1) primary.append(box);
    spread.append(element(`<aside class="book-sidebar" aria-label="教材側欄">
      <img class="sidebar-illustration" src="../../assets/textbook/fuji-watercolor.webp" alt="富士山與湖畔鳥居的水彩風景">
      <p class="sidebar-caption">日本の風景 ・ ILLUSTRATION</p>
      <p class="sidebar-verse" lang="ja">ことばが、<br>どこかへ連れて行ってくれる。</p>
      <section class="sidebar-points"><h3 lang="ja">この課のポイント</h3><ul><li>詢問與說明前往的方式</li><li>練習方向、位置與交通用語</li><li>聽懂會話，再試著跟讀</li></ul></section>
      <div class="sidebar-note"><strong>ことばの手帖</strong><p lang="ja">すみません。<br>どう行ったらいいでしょうか。</p><p>先交代想去的地方，再禮貌地詢問走法。試著留意句尾的語氣。</p></div>
    </aside>`));
    root.replaceChildren(toolbar, statusLine, shadowPanel, spread);

    const mode = root.querySelector('#book-shadow-mode');
    const setMode = (enabled) => {
      mode.checked = enabled;
      document.body.classList.toggle('shadow-mode-on', enabled);
      if (!enabled && !shadowPanel.hidden) root.querySelector('[data-shadow-close]').click();
    };
    on(mode, 'change', () => setMode(mode.checked));
    on(root, 'click', (event) => {
      const target = event.target.closest('button');
      if (!target) return;
      if (target.matches('[data-expand-words]')) {
        const expanded = target.getAttribute('aria-expanded') !== 'true';
        root.querySelectorAll('[data-more-word]').forEach(row => { row.hidden = !expanded; });
        target.setAttribute('aria-expanded', String(expanded));
        target.textContent = expanded ? '－ 收合單語' : `＋ もっと見る（全${data.vocabulary.length}語）`;
      }
      if (target.matches('[data-expand-dialogue]')) {
        const expanded = target.getAttribute('aria-expanded') !== 'true';
        root.querySelectorAll('[data-more-dialogue]').forEach(row => { row.hidden = !expanded; });
        target.setAttribute('aria-expanded', String(expanded));
        target.textContent = expanded ? '收合會話 ↑' : '展開完整會話 ↓';
      }
      if (target.matches('[data-book-rate]')) {
        rate.value = target.dataset.bookRate;
        rate.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (target.matches('[data-dialogue-shadow]')) {
        setMode(true);
        root.querySelector('#section-dialogue [data-shadow]')?.click();
      }
      if (target.matches('[data-speak], [data-shadow], [data-shadow-listen], [data-shadow-record], [data-speech-stop]')) audio?.pause();
    });
    on(rate, 'change', () => {
      root.querySelectorAll('[data-book-rate]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.bookRate === rate.value)));
      if (audio) audio.playbackRate = Number(rate.value);
    });

    if (audio) {
      audio.playbackRate = Number(rate.value);
      const progress = root.querySelector('[data-cd-progress]');
      const updateAudio = () => {
        const duration = audio.duration;
        const validDuration = Number.isFinite(duration) && duration > 0;
        progress.disabled = !validDuration;
        progress.value = validDuration ? String(audio.currentTime / duration * 100) : '0';
        root.querySelector('[data-cd-time]').textContent = formatTime(audio.currentTime);
        root.querySelector('[data-cd-duration]').textContent = formatTime(duration);
        root.querySelectorAll('[data-cd-play]').forEach(button => {
          const playing = !audio.paused && !audio.ended;
          button.textContent = button.classList.contains('audio-play') ? playing ? 'Ⅱ' : '▶' : playing ? 'Ⅱ 暫停原音' : '▶ 播放原音';
          button.setAttribute('aria-label', playing ? '暫停 CD18' : '播放 CD18');
          button.setAttribute('aria-pressed', String(playing));
        });
      };
      for (const event of ['loadedmetadata','durationchange','timeupdate','play','pause','ended']) on(audio, event, updateAudio);
      on(audio, 'error', () => { status.textContent = 'CD18 暫時無法播放，請稍後重試。'; });
      on(progress, 'input', () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = audio.duration * Number(progress.value) / 100;
      });
      on(root, 'click', async (event) => {
        if (!event.target.closest('[data-cd-play]')) return;
        if (!audio.paused) { audio.pause(); return; }
        stop.click();
        if (audio.ended) audio.currentTime = 0;
        try { await audio.play(); } catch { status.textContent = '無法播放 CD18，請再按一次播放。'; }
      });
      updateAudio();
    }

    const revealAnchor = () => {
      let hash;
      try { hash = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const target = document.getElementById(hash);
      for (let parent = target; parent && parent !== root; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
      const ids = ['chapter-vocabulary', 'chapter-grammar', 'section-dialogue', 'section-listening', 'section-scenario'];
      const current = ids.includes(hash) ? hash : hash === 'speech-toolbar' ? 'section-listening' : 'chapter-vocabulary';
      document.querySelectorAll('.book-chapters a').forEach(link => {
        if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      });
      const lessonPath = window.location.pathname.split('/lessons/')[1];
      if (lessonPath) { try { localStorage.setItem('audio-textbook.last-position', `lessons/${lessonPath}${window.location.hash}`); } catch {} }
    };
    on(window, 'hashchange', revealAnchor);
    on(window, 'pagehide', () => { audio?.pause(); });
    revealAnchor();
    layouts.set(root, () => { controller.abort(); audio?.pause(); document.body.classList.remove('shadow-mode-on'); });
  };
})();

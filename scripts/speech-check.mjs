import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Isolated DOM/synthesis/storage doubles: no device settings or real audio touched.
const source = readFileSync(new URL('../js/lesson.js', import.meta.url), 'utf8');
const key = 'japanese-ai-learning.speech-voice.v1';
const voice = (name, lang, localService, isDefault = false) => ({ name, lang, localService, default: isDefault, voiceURI: name });
const remote = voice('A remote', 'ja-JP', false);
const local = voice('Z local', 'ja-JP', true);
const generic = voice('Generic', 'ja', true);
const english = voice('English', 'en-US', true, true);
const voices = [english, remote, generic, local];
const voiceKey = (v) => JSON.stringify([v.voiceURI, v.name, v.lang, v.localService]);

class MockTrack {
  constructor(kind = 'audio') { this.kind = kind; this.stopped = false; }
  stop() { this.stopped = true; }
}
class MockMediaStream {
  constructor() { this.tracks = [new MockTrack('audio')]; }
  getTracks() { return this.tracks; }
}

class MockMediaRecorder {
  static instances = [];
  constructor(stream, options = {}) {
    this.stream = stream;
    this.options = options;
    this.state = 'inactive';
    this.mimeType = 'audio/webm';
    this.ondataavailable = null;
    this.onstop = null;
    MockMediaRecorder.instances.push(this);
  }
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    if (typeof this.ondataavailable === 'function') {
      this.ondataavailable({ data: { size: 1024, type: this.mimeType } });
    }
    setTimeout(() => {
      if (typeof this.onstop === 'function') this.onstop();
    }, 5);
  }
}

class MockRecognition {
  static instances = [];
  constructor() {
    this.lang = '';
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this.started = false;
    this.aborted = false;
    MockRecognition.instances.push(this);
  }
  start() {
    this.started = true;
    if (typeof this.onstart === 'function') this.onstart();
  }
  stop() {
    this.started = false;
    if (typeof this.onend === 'function') this.onend();
  }
  abort() {
    this.aborted = true;
    this.started = false;
  }
}

class MockBlob {
  constructor(chunks = [], options = {}) {
    this.chunks = chunks;
    this.type = options.type || '';
  }
}

class MockAudio {
  static instances = [];
  static failNext = false;
  static failPredicate = null;
  static stallNext = false;
  constructor() {
    this.events = {};
    this.playbackRate = 1;
    this.src = '';
    this.paused = true;
    this.currentTime = 0;
    this.duration = 2.0;
    MockAudio.instances.push(this);
  }
  addEventListener(name, fn) {
    if (!this.events[name]) this.events[name] = [];
    this.events[name].push(fn);
  }
  removeEventListener(name, fn) {
    if (this.events[name]) this.events[name] = this.events[name].filter((f) => f !== fn);
  }
  dispatchEvent(name, evt = {}) {
    for (const fn of [...(this.events[name] || [])]) fn(evt);
  }
  play() {
    this.paused = false;
    const shouldFail = MockAudio.failNext || (typeof MockAudio.failPredicate === 'function' && MockAudio.failPredicate(this));
    if (shouldFail) {
      MockAudio.failNext = false;
      setTimeout(() => this.dispatchEvent('error', new Error('audio load error')), 0);
      return Promise.reject(new Error('audio load error'));
    }
    if (MockAudio.stallNext) {
      MockAudio.stallNext = false;
      setTimeout(() => {
        this.dispatchEvent('playing');
      }, 5);
      return Promise.resolve();
    }
    setTimeout(() => {
      this.dispatchEvent('playing');
      this.dispatchEvent('ended');
    }, 10);
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
    this.dispatchEvent('pause');
  }
  removeAttribute(attr) {
    if (attr === 'src') this.src = '';
  }
}

function fixture(initial = [], store = new Map(), blocked = false) {
  const elements = new Map();
  const make = () => {
    const eventListeners = new Map();
    return {
      disabled: false, value: '', textContent: '', children: [], hidden: false,
      classList: { add() {}, remove() {}, contains: () => false },
      replaceChildren() { this.children = []; },
      append(x) { this.children.push(x); },
      querySelectorAll: () => [],
      addEventListener(name, fn) {
        if (!eventListeners.has(name)) eventListeners.set(name, []);
        eventListeners.get(name).push(fn);
      },
      removeEventListener(name, fn) {
        if (eventListeners.has(name)) {
          eventListeners.set(name, eventListeners.get(name).filter((f) => f !== fn));
        }
      },
      getListeners(name) {
        return eventListeners.get(name) || [];
      },
      dispatchEvent(name, evt = {}) {
        const fns = eventListeners.get(name) || [];
        for (const fn of [...fns]) fn(evt);
      },
      get handlers() {
        return new Proxy({}, {
          get: (_, prop) => (evt = {}) => {
            const fns = eventListeners.get(prop) || [];
            let last;
            for (const fn of [...fns]) last = fn(evt);
            return last;
          }
        });
      },
      scrollIntoView() {},
      removeAttribute(attr) { if (attr === 'src') this.src = ''; },
      pause() {},
      load() {}
    };
  };
  const element = (id) => {
    if (!elements.has(id)) {
      const el = make();
      if (id.includes('shadowing-panel') || id.includes('shadow-result') || id.includes('shadow-playback')) {
        el.hidden = true;
      }
      elements.set(id, el);
    }
    return elements.get(id);
  };
  const buttons = [make(), make()];
  const rootListeners = new Map();
  const root = {
    querySelector: element,
    querySelectorAll: () => buttons,
    addEventListener(name, fn) {
      if (!rootListeners.has(name)) rootListeners.set(name, []);
      rootListeners.get(name).push(fn);
    },
    removeEventListener(name, fn) {
      if (rootListeners.has(name)) {
        rootListeners.set(name, rootListeners.get(name).filter((f) => f !== fn));
      }
    },
    getListeners(name) {
      return rootListeners.get(name) || [];
    },
    get handlers() {
      return new Proxy({}, {
        get: (_, prop) => (evt = {}) => {
          const fns = rootListeners.get(prop) || [];
          let last;
          for (const fn of [...fns]) last = fn(evt);
          return last;
        }
      });
    }
  };
  let available = initial;
  const events = {};
  const spoken = [];
  const timers = [];
  const scheduledTimers = new Map();
  let timerCounter = 0;

  const synthesisListeners = new Map();
  const synthesis = {
    getVoices: () => available,
    addEventListener: (name, fn) => {
      if (!synthesisListeners.has(name)) synthesisListeners.set(name, []);
      synthesisListeners.get(name).push(fn);
    },
    removeEventListener: (name, fn) => {
      if (synthesisListeners.has(name)) {
        synthesisListeners.set(name, synthesisListeners.get(name).filter((f) => f !== fn));
      }
    },
    getListeners(name) {
      return synthesisListeners.get(name) || [];
    },
    cancel() {},
    speak(u) { spoken.push(u); }
  };

  class Utterance {
    constructor(text) {
      this.text = text;
      this.lang = '';
      this.rate = 1;
      this.pitch = 1;
      this.voice = null;
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
    }
  }

  let getUserMediaCalls = 0;
  const pendingUserMediaResolvers = [];
  const mockMediaDevices = {
    getUserMedia: async (constraints) => {
      getUserMediaCalls++;
      return new Promise((resolve, reject) => {
        pendingUserMediaResolvers.push({ resolve, reject, constraints });
      });
    }
  };

  const createdUrls = [];
  const revokedUrls = [];
  const mockUrl = {
    createObjectURL: () => {
      const u = 'blob:mock-url-' + (createdUrls.length + 1);
      createdUrls.push(u);
      return u;
    },
    revokeObjectURL: (url) => {
      revokedUrls.push(url);
    }
  };

  const mockSetTimeout = (fn, delay) => {
    timers.push(fn);
    const id = ++timerCounter;
    scheduledTimers.set(id, { fn, delay });
    return id;
  };
  const mockClearTimeout = (id) => {
    scheduledTimers.delete(id);
  };

  const windowListeners = new Map();
  const windowAddEventListener = (event, fn) => {
    if (!windowListeners.has(event)) windowListeners.set(event, []);
    windowListeners.get(event).push(fn);
  };
  const windowRemoveEventListener = (event, fn) => {
    if (windowListeners.has(event)) {
      windowListeners.set(event, windowListeners.get(event).filter((f) => f !== fn));
    }
  };
  const dispatchWindowEvent = (event, evt = {}) => {
    const fns = windowListeners.get(event) || [];
    for (const fn of [...fns]) fn(evt);
  };

  const context = vm.createContext({
    window: {
      speechSynthesis: synthesis,
      SpeechSynthesisUtterance: Utterance,
      Audio: MockAudio,
      URL: mockUrl,
      MediaRecorder: MockMediaRecorder,
      SpeechRecognition: MockRecognition,
      webkitSpeechRecognition: MockRecognition,
      navigator: { mediaDevices: mockMediaDevices },
      isSecureContext: true,
      setTimeout: mockSetTimeout,
      clearTimeout: mockClearTimeout,
      addEventListener: windowAddEventListener,
      removeEventListener: windowRemoveEventListener,
      dispatchEvent: dispatchWindowEvent
    },
    Audio: MockAudio,
    SpeechSynthesisUtterance: Utterance,
    URL: mockUrl,
    Blob: MockBlob,
    MediaRecorder: MockMediaRecorder,
    SpeechRecognition: MockRecognition,
    webkitSpeechRecognition: MockRecognition,
    navigator: { mediaDevices: mockMediaDevices },
    isSecureContext: true,
    document: { createElement: make, addEventListener() {}, head: { appendChild() {} }, querySelector: () => null },
    localStorage: {
      getItem(k) { if (blocked) throw Error('blocked'); return store.get(k) || null; },
      setItem(k, v) { if (blocked) throw Error('blocked'); store.set(k, v); }
    },
    setTimeout: mockSetTimeout,
    clearTimeout: mockClearTimeout,
    console
  });

  vm.runInContext(source, context);
  context.setupSpeech(root);

  const makeRoot = () => {
    const rootElements = new Map();
    const rootElement = (id) => {
      if (!rootElements.has(id)) {
        const el = make();
        if (id.includes('shadowing-panel') || id.includes('shadow-result') || id.includes('shadow-playback')) {
          el.hidden = true;
        }
        rootElements.set(id, el);
      }
      return rootElements.get(id);
    };
    const localListeners = new Map();
    return {
      querySelector: rootElement,
      querySelectorAll: () => [make(), make()],
      addEventListener(name, fn) {
        if (!localListeners.has(name)) localListeners.set(name, []);
        localListeners.get(name).push(fn);
      },
      removeEventListener(name, fn) {
        if (localListeners.has(name)) {
          localListeners.set(name, localListeners.get(name).filter((f) => f !== fn));
        }
      },
      getListeners(name) {
        return localListeners.get(name) || [];
      },
      get handlers() {
        return new Proxy({}, {
          get: (_, prop) => (evt = {}) => {
            const fns = localListeners.get(prop) || [];
            let last;
            for (const fn of [...fns]) last = fn(evt);
            return last;
          }
        });
      },
      element: rootElement
    };
  };

  const click = (selector, dataset = {}) => {
    const el = element(selector);
    el.dataset = dataset;
    return root.handlers.click({
      target: {
        closest: (s) => s === selector ? el : null
      }
    });
  };

  return {
    context,
    buttons,
    spoken,
    root,
    store,
    element,
    timers,
    scheduledTimers,
    createdUrls,
    revokedUrls,
    pendingUserMediaResolvers,
    getMediaCalls: () => getUserMediaCalls,
    getWindowListeners: (event) => windowListeners.get(event) || [],
    getSynthesisListeners: (event) => synthesisListeners.get(event) || [],
    dispatchWindowEvent,
    makeRoot,
    make,
    MockMediaRecorder,
    MockRecognition,
    MockMediaStream,
    update(list) {
      available = list;
      const fns = synthesisListeners.get('voiceschanged') || [];
      for (const fn of [...fns]) fn();
    },
    select(v) {
      element('#speech-voice').value = typeof v === 'string' ? v : voiceKey(v);
      element('#speech-voice').handlers.change();
    },
    click
  };
}

const delayed = fixture();
assert.equal(delayed.element('#speech-voice').disabled, true);
await delayed.click('[data-speak]', { speak: 'test' });
assert.equal(delayed.spoken.length, 0);
delayed.update(voices);
assert.equal(delayed.element('#speech-voice').children.length, 4);
assert.equal(delayed.element('#speech-voice').children[0].textContent, 'Google 線上日語（自然語音）');
assert.equal(delayed.element('#speech-voice').value, 'google-online');
assert.equal(delayed.buttons[0].disabled, false);

const sentence = '明日は図書館で日本語を勉強します。';

// 1. Google 線上語音播放、語速 0.95x 與 0.82x、停止
await delayed.click('[data-speak]', { speak: encodeURIComponent(sentence) });
assert.match(MockAudio.instances.at(-1).src, /translate_tts.*q=%E6%98%8E%E6%97%A5/);
assert.equal(MockAudio.instances.at(-1).playbackRate, 0.95);

await delayed.click('[data-speak]', { speak: encodeURIComponent(sentence), rate: '0.82' });
assert.equal(MockAudio.instances.at(-1).playbackRate, 0.82);

await delayed.click('[data-speech-stop]', {});
assert.equal(MockAudio.instances.at(-1).paused, true);
assert.equal(delayed.element('#speech-status').textContent, '已停止播放');

// 2. Google 音訊失敗時自動降級備援至 speechSynthesis
MockAudio.failNext = true;
await delayed.click('[data-speak]', { speak: encodeURIComponent(sentence) });
await new Promise((r) => setTimeout(r, 20));
assert.equal(delayed.spoken.at(-1).text, sentence);
assert.match(delayed.element('#speech-status').textContent, /自動改用本機語音/);

// 3. 手動選擇瀏覽器語音並保存至 localStorage
delayed.select(remote);
assert.equal(delayed.store.get(key), voiceKey(remote));
await delayed.click('[data-speak]', { speak: encodeURIComponent(sentence) });
assert.equal(delayed.spoken.at(-1).text, sentence);
assert.equal(delayed.spoken.at(-1).voice, remote);
assert.equal(delayed.spoken.at(-1).rate, 0.95);
assert.equal(delayed.spoken.at(-1).pitch, 1);

// 3a. 本機語音路徑 TDZ 檢查：onstart 回呼讀取 fallbackTriggered 不得拋出 ReferenceError
assert.doesNotThrow(() => {
  if (typeof delayed.spoken.at(-1).onstart === 'function') delayed.spoken.at(-1).onstart();
});
assert.doesNotThrow(() => {
  if (typeof delayed.spoken.at(-1).onend === 'function') delayed.spoken.at(-1).onend();
});

await delayed.click('[data-speak]', { speak: encodeURIComponent(sentence), rate: '0.82' });
assert.equal(delayed.spoken.at(-1).rate, 0.82);

await delayed.click('[data-shadow]', { shadow: encodeURIComponent(sentence) });
assert.equal(delayed.spoken.at(-1).rate, 0.95);

await delayed.click('[data-shadow-listen]', { rate: '0.82' });
assert.equal(delayed.spoken.at(-1).voice, remote);
assert.equal(delayed.spoken.at(-1).rate, 0.82);
assert.equal(delayed.spoken.at(-1).pitch, 1);

// 4. 再次造訪時保留原選瀏覽器語音，全新訪客預設使用 Google 線上語音
assert.equal(fixture(voices, delayed.store).element('#speech-voice').value, voiceKey(remote));
assert.equal(fixture(voices).element('#speech-voice').value, 'google-online');

// 5. 瀏覽器語音清單變動處理
delayed.update([local]);
assert.equal(delayed.element('#speech-voice').value, voiceKey(local));
assert.match(delayed.element('#speech-status').textContent, /原選語音/);
delayed.update(voices);
assert.equal(delayed.element('#speech-voice').value, voiceKey(remote));

// 6. 若僅有非日語語音，仍可使用 Google 線上語音
const none = fixture([english]);
assert.equal(none.element('#speech-voice').disabled, true);
none.timers[0]();
assert.equal(none.element('#speech-voice').value, 'google-online');
assert.equal(none.buttons[0].disabled, false);

// 7. localStorage 被封鎖時的相容性
const blocked = fixture(voices, new Map(), true);
blocked.select(remote);
assert.match(blocked.element('#speech-status').textContent, /禁止儲存/);
assert.equal(blocked.element('#speech-voice').value, voiceKey(remote));

// 8. 日文長句依標點符號安全分段測試
const splitFn = delayed.context.splitJapaneseSentences;
assert.deepEqual(Array.from(splitFn('明日は図書館で勉強します。')), ['明日は図書館で勉強します。']);
const longDoc = 'これは最初の文です。これは二番目の文です。文法を壊さずに句点で安全に分割されることを確認します。'.repeat(3);
const chunks = splitFn(longDoc);
assert.ok(chunks.length > 1);
assert.ok(chunks.every((c) => c.length <= 120));

// 8b. 無標點符號長句的硬性切分保證（不得超過120字元，且不遺失不重複）
const noPunct = 'あ'.repeat(300);
const noPunctChunks = splitFn(noPunct);
assert.ok(noPunctChunks.length >= 3);
assert.ok(noPunctChunks.every((c) => c.length <= 120));
assert.equal(noPunctChunks.join(''), noPunct);

// 9. Google 分段語音在後段失敗時，speechSynthesis 只朗讀「尚未播放的目前分段及後續內容」
delayed.select('google-online');
const s1 = '第一段の文です。'.repeat(15); // 120 chars
const s2 = '第二段の文です。'.repeat(9);  // 72 chars
const multiSentence = s1 + s2;
MockAudio.failPredicate = (audio) => audio.src.includes('%E7%AC%AC%E4%BA%8C%E6%AE%B5');
await delayed.click('[data-speak]', { speak: encodeURIComponent(multiSentence) });
await new Promise((r) => setTimeout(r, 40));
MockAudio.failPredicate = null;
const fallbackUtt = delayed.spoken.at(-1);
assert.equal(fallbackUtt.text, s2);
assert.match(delayed.element('#speech-status').textContent, /自動改用本機語音/);

// 10. 播放卡住保護（Watchdog）：若 playing 觸發但未觸發 ended，watchdog 逾時降級
MockAudio.stallNext = true;
await delayed.click('[data-speak]', { speak: encodeURIComponent('卡住測試句子。') });
await new Promise((r) => setTimeout(r, 15));
const watchdog = [...delayed.scheduledTimers.values()].find((t) => t.delay >= 6000);
assert.ok(watchdog, 'Watchdog timer should be registered');
watchdog.fn();
assert.equal(delayed.spoken.at(-1).text, '卡住測試句子。');
assert.match(delayed.element('#speech-status').textContent, /自動改用本機語音/);

// 11. 連續快速點擊：舊 session 的非同步回呼不得干擾新播放
await delayed.click('[data-speak]', { speak: encodeURIComponent('第一個快速點擊。') });
const firstAudio = MockAudio.instances.at(-1);
await delayed.click('[data-speak]', { speak: encodeURIComponent('第二個快速點擊。') });
const secondAudio = MockAudio.instances.at(-1);
assert.notEqual(firstAudio, secondAudio);
assert.equal(firstAudio.paused, true);
firstAudio.dispatchEvent('playing');
firstAudio.dispatchEvent('ended');
assert.match(secondAudio.src, /%E7%AC%AC%E4%BA%8C%E5%80%8B/);

// 12. 關閉 shadowing 彈窗時一併停止播放與錄音，並釋放 Blob URL，重複呼叫不拋錯
await delayed.click('[data-shadow]', { shadow: encodeURIComponent('跟讀練習示範。') });
assert.equal(MockAudio.instances.at(-1).paused, false);
await delayed.click('[data-shadow-close]', {});
assert.equal(MockAudio.instances.at(-1).paused, true);
assert.equal(delayed.element('#shadowing-panel').hidden, true);
assert.doesNotThrow(() => {
  delayed.root.handlers.click({ target: { closest: (s) => s === '[data-shadow-close]' ? {} : null } });
});
assert.doesNotThrow(() => {
  delayed.root.handlers.click({ target: { closest: (s) => s === '[data-speech-stop]' ? {} : null } });
});

// 13. 錄音啟動競態（P1）：權限等待期間連點只產生一個 getUserMedia
await delayed.click('[data-shadow]', { shadow: encodeURIComponent('テスト跟讀') });
assert.equal(delayed.element('#shadowing-panel').hidden, false);
delayed.click('[data-shadow-record]', {});
delayed.click('[data-shadow-record]', {});
delayed.click('[data-shadow-record]', {});
assert.equal(delayed.getMediaCalls(), 1, 'Only 1 getUserMedia call while pending');
assert.equal(delayed.element('[data-shadow-record]').disabled, true);
assert.match(delayed.element('[data-shadow-record]').textContent, /正在取得麥克風權限/);

// 14. 錄音啟動競態（P1）：權限等待時關閉面板；權限稍後成功，stream tracks 被停止且不開始錄音
await delayed.click('[data-shadow-close]', {});
assert.equal(delayed.element('#shadowing-panel').hidden, true);
assert.equal(delayed.element('[data-shadow-record]').disabled, false);
assert.equal(delayed.element('[data-shadow-record]').textContent, '🎙 開始跟讀');
const stream1 = new delayed.MockMediaStream();
const resolver1 = delayed.pendingUserMediaResolvers.shift();
resolver1.resolve(stream1);
await new Promise((r) => setTimeout(r, 10));
assert.equal(stream1.getTracks()[0].stopped, true, 'Stream tracks stopped because panel was closed');
assert.equal(delayed.MockMediaRecorder.instances.length, 0, 'No MediaRecorder created when panel was closed');

// 15. MediaRecorder.onstop / Blob URL 競態（P1）：正常錄音生成 Blob URL，隨後關閉或開始新錄音時確實 revoke
await delayed.click('[data-shadow]', { shadow: encodeURIComponent('テスト跟讀2') });
delayed.click('[data-shadow-record]', {});
const stream2 = new delayed.MockMediaStream();
const resolver2 = delayed.pendingUserMediaResolvers.shift();
resolver2.resolve(stream2);
await new Promise((r) => setTimeout(r, 10));
assert.equal(delayed.MockMediaRecorder.instances.length, 1, 'MediaRecorder created');
const recorder = delayed.MockMediaRecorder.instances[0];
assert.equal(recorder.state, 'recording');
recorder.stop();
await new Promise((r) => setTimeout(r, 15));
assert.equal(delayed.element('#shadow-playback').hidden, false, 'Playback shown after normal record stop');
assert.ok(delayed.createdUrls.length >= 1, 'Blob URL was created');
const activeUrl = delayed.createdUrls.at(-1);

await delayed.click('[data-shadow-close]', {});
assert.equal(delayed.element('#shadowing-panel').hidden, true);
assert.equal(delayed.element('#shadow-playback').hidden, true);
assert.ok(delayed.revokedUrls.includes(activeUrl), 'Active Blob URL was revoked on close');

// 15b. 延遲到達的 onstop 競態：若在 onstop 觸發前關閉面板，onstop 不得顯示播放區且不得建立新 URL
await delayed.click('[data-shadow]', { shadow: encodeURIComponent('テスト跟讀3') });
delayed.click('[data-shadow-record]', {});
const stream3 = new delayed.MockMediaStream();
const resolver3 = delayed.pendingUserMediaResolvers.shift();
resolver3.resolve(stream3);
await new Promise((r) => setTimeout(r, 10));
const recorder3 = delayed.MockMediaRecorder.instances[1];
const urlsBeforeClose = delayed.createdUrls.length;
recorder3.stop();
await delayed.click('[data-shadow-close]', {});
await new Promise((r) => setTimeout(r, 20));
assert.equal(delayed.createdUrls.length, urlsBeforeClose, 'createdUrls.length must not increase when onstop arrives after close');
assert.equal(delayed.element('#shadow-playback').hidden, true, 'Playback remains hidden if closed before onstop');
for (const u of delayed.createdUrls) {
  assert.ok(delayed.revokedUrls.includes(u), 'All created Blob URLs must be revoked');
}

// 16. Watchdog 跨段競態（P2）：舊段 watchdog 在新段開始後觸發，不影響新段
delayed.select('google-online');
const longTextS1 = '第一段の文です。'.repeat(15);
const longTextS2 = '第二段の文です。'.repeat(9);
await delayed.click('[data-speak]', { speak: encodeURIComponent(longTextS1 + longTextS2) });
const chunk0Audio = MockAudio.instances.at(-1);
chunk0Audio.dispatchEvent('playing');
const watchdogChunk0 = [...delayed.scheduledTimers.values()].find((t) => t.delay >= 6000);
assert.ok(watchdogChunk0, 'Watchdog for chunk 0 was registered');
chunk0Audio.dispatchEvent('ended');
const chunk1Audio = MockAudio.instances.at(-1);
assert.notEqual(chunk0Audio, chunk1Audio, 'New audio created for chunk 1');
const spokenBeforeLateWatchdog = delayed.spoken.length;
watchdogChunk0.fn();
assert.equal(delayed.spoken.length, spokenBeforeLateWatchdog, 'Chunk 0 watchdog must NOT trigger fallback for chunk 1');

// 17. Unicode 硬切分邊界（P2）：emoji 及罕見漢字 surrogate pair 位於第 120 字邊界不破損，每段 code points <= 120
const emojiBoundary = 'あ'.repeat(119) + '🌸' + 'い'.repeat(10);
const emojiChunks = splitFn(emojiBoundary);
assert.equal(Array.from(emojiChunks[0]).length, 120);
assert.equal(emojiChunks[0].endsWith('🌸'), true);
assert.equal(emojiChunks.join(''), emojiBoundary);
assert.ok(emojiChunks.every((c) => Array.from(c).length <= 120));

const surrogateBoundary = 'あ'.repeat(119) + '𠮷' + 'い'.repeat(10);
const surrogateChunks = splitFn(surrogateBoundary);
assert.equal(Array.from(surrogateChunks[0]).length, 120);
assert.equal(surrogateChunks[0].endsWith('𠮷'), true);
assert.equal(surrogateChunks.join(''), surrogateBoundary);
assert.ok(surrogateChunks.every((c) => Array.from(c).length <= 120));
const loneSurrogateRegex = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
assert.equal(loneSurrogateRegex.test(surrogateChunks[0]), false);
assert.equal(loneSurrogateRegex.test(surrogateChunks[1]), false);

// 18. setupSpeech() 重複執行兩次與 pagehide 冪等性測試
const pagehideBefore = delayed.getWindowListeners('pagehide');
assert.equal(pagehideBefore.length, 1, 'Exactly one pagehide handler registered after first setup');
const handler1 = pagehideBefore[0];

// 第二次執行 setupSpeech
const root2 = delayed.makeRoot();
delayed.context.setupSpeech(root2);

const pagehideAfter = delayed.getWindowListeners('pagehide');
assert.equal(pagehideAfter.length, 1, 'Only one pagehide handler remains on window after second setup');
assert.notEqual(pagehideAfter[0], handler1, 'New handler replaced old handler');
assert.equal(pagehideAfter.includes(handler1), false, 'Old pagehide handler was completely removed');

// 驗證觸發 pagehide 時，清理目前 setup 的狀態（root2），不使用舊狀態
// 在 setup 2 啟動播放
const speakBtn2 = root2.element('[data-speak]');
speakBtn2.dataset = { speak: encodeURIComponent('セットアップ2の音声') };
await root2.handlers.click({ target: { closest: (s) => s === '[data-speak]' ? speakBtn2 : null } });
const audio2 = MockAudio.instances.at(-1);
assert.equal(audio2.paused, false, 'Audio playing in setup 2');

// 在 setup 2 啟動錄音並產生 Blob URL
const recordBtn2 = root2.element('[data-shadow-record]');
root2.handlers.click({ target: { closest: (s) => s === '[data-shadow-record]' ? recordBtn2 : null } });
const stream4 = new delayed.MockMediaStream();
const resolver4 = delayed.pendingUserMediaResolvers.shift();
resolver4.resolve(stream4);
await new Promise((r) => setTimeout(r, 10));
const recorder4 = delayed.MockMediaRecorder.instances.at(-1);
recorder4.stop();
await new Promise((r) => setTimeout(r, 15));
const setup2Url = delayed.createdUrls.at(-1);
assert.ok(setup2Url, 'Setup 2 created a Blob URL');

// 觸發 pagehide 事件
delayed.dispatchWindowEvent('pagehide');
assert.equal(audio2.paused, true, 'Audio in setup 2 paused by current handler');
assert.ok(delayed.revokedUrls.includes(setup2Url), 'Setup 2 Blob URL was revoked by current handler');
assert.equal(stream4.getTracks()[0].stopped, true, 'Setup 2 microphone stream stopped by current handler');

// 19. 同一 root 重複執行 setupSpeech(root) 兩次的生命週期與監聽器清理測試 (A~F)
const sameRootFixture = fixture([]);
const testRoot = sameRootFixture.root;

// 第一次 setupSpeech 已在 fixture 初始化完成（無 voices 時排程了 voiceTimer）
assert.equal(testRoot.getListeners('click').length, 1, 'Initial setup registers 1 click listener on root');
assert.equal(sameRootFixture.getSynthesisListeners('voiceschanged').length, 1, 'Initial setup registers 1 voiceschanged listener');
const voiceSelect = sameRootFixture.element('#speech-voice');
assert.equal(voiceSelect.getListeners('change').length, 1, 'Initial setup registers 1 voice select change listener');
assert.equal(sameRootFixture.getWindowListeners('pagehide').length, 1, 'Initial setup registers 1 pagehide listener');

// 記錄第一次 setup 的延遲 voiceTimer
const timersBefore = Array.from(sameRootFixture.scheduledTimers.values());
const oldVoiceTimer = timersBefore.find((t) => t.delay === 3000);
assert.ok(oldVoiceTimer, 'Old voiceTimer was scheduled');

// A. 第二次在同一個 root 上執行 setupSpeech(testRoot)
sameRootFixture.context.setupSpeech(testRoot);

// B. 驗證：各項監聽器只有一個有效 handler
assert.equal(testRoot.getListeners('click').length, 1, 'root.click must have exactly 1 active handler after re-setup');
assert.equal(sameRootFixture.getSynthesisListeners('voiceschanged').length, 1, 'voiceschanged must have exactly 1 active handler after re-setup');
assert.equal(voiceSelect.getListeners('change').length, 1, 'voice select change must have exactly 1 active handler after re-setup');
assert.equal(sameRootFixture.getWindowListeners('pagehide').length, 1, 'pagehide must have exactly 1 active handler after re-setup');

// E. 觸發 voiceschanged 一次，只執行新 setup 的更新
sameRootFixture.update(voices);
assert.ok(voiceSelect.children.length >= 1, 'Voices updated successfully for setup 2');

// C. 點擊一次 data-speak，只建立一次 Audio 或一次 utterance
const audioCountBefore = MockAudio.instances.length;
const spokenCountBefore = sameRootFixture.spoken.length;
await sameRootFixture.click('[data-speak]', { speak: encodeURIComponent('同一ルートテスト') });
const audioCountAfter = MockAudio.instances.length;
const spokenCountAfter = sameRootFixture.spoken.length;
const totalAudioCreated = (audioCountAfter - audioCountBefore) + (spokenCountAfter - spokenCountBefore);
assert.equal(totalAudioCreated, 1, 'Clicking data-speak once must create exactly 1 Audio instance');

// D. 點擊一次錄音，只呼叫一次 getUserMedia
const mediaCallsBefore = sameRootFixture.getMediaCalls();
sameRootFixture.click('[data-shadow-record]', {});
const mediaCallsAfter = sameRootFixture.getMediaCalls();
assert.equal(mediaCallsAfter - mediaCallsBefore, 1, 'Clicking record once must invoke getUserMedia exactly once');
// 清理解析當前請求
const streamPending = new sameRootFixture.MockMediaStream();
const resolverPending = sameRootFixture.pendingUserMediaResolvers.shift();
resolverPending.resolve(streamPending);
await new Promise((r) => setTimeout(r, 10));

// F. 舊 setup 的延遲 callback 抵達時，不得改變新 setup 狀態
const statusTextBefore = sameRootFixture.element('#speech-status').textContent;
oldVoiceTimer.fn();
assert.equal(sameRootFixture.element('#speech-status').textContent, statusTextBefore, 'Old timer must not mutate status of new setup');

assert.match(source, /querySelectorAll\('rt, rp'\)/);
assert.match(delayed.context.renderSpeechToolbar(), /正常 0\.95×/);
assert.match(delayed.context.renderSpeechToolbar(), /慢速 0\.82×/);

console.log('PASS: All speech checks passed (TDZ, multi-chunk fallback, watchdog, 120-char hard slice, session concurrency, resource cleanup, voice persistence, recording races, blob url cleanup, Unicode surrogate safety, pagehide idempotency, and same-root lifecycle cleanup).');

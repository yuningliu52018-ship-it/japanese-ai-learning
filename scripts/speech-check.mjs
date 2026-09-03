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

function fixture(initial = [], store = new Map(), blocked = false) {
  const elements = new Map();
  const make = () => ({ disabled: false, value: '', textContent: '', children: [], handlers: {},
    classList: { add() {}, remove() {} },
    replaceChildren() { this.children = []; }, append(x) { this.children.push(x); },
    addEventListener(name, fn) { this.handlers[name] = fn; }, scrollIntoView() {} });
  const element = (id) => { if (!elements.has(id)) elements.set(id, make()); return elements.get(id); };
  const buttons = [make(), make()];
  const root = { querySelector: element, querySelectorAll: () => buttons, handlers: {},
    addEventListener(name, fn) { this.handlers[name] = fn; } };
  let available = initial;
  const events = {};
  const spoken = [];
  const timers = [];
  const synthesis = { getVoices: () => available, addEventListener: (name, fn) => { events[name] = fn; },
    cancel() {}, speak(u) { spoken.push(u); } };
  class Utterance { constructor(text) { this.text = text; } }
  const context = vm.createContext({ window: { speechSynthesis: synthesis, SpeechSynthesisUtterance: Utterance },
    SpeechSynthesisUtterance: Utterance, document: { createElement: make, addEventListener() {} },
    localStorage: { getItem(k) { if (blocked) throw Error('blocked'); return store.get(k) || null; },
      setItem(k, v) { if (blocked) throw Error('blocked'); store.set(k, v); } },
    setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {} });
  vm.runInContext(source, context);
  context.setupSpeech(root);
  const click = (selector, dataset) => root.handlers.click({ target: { closest: (s) => s === selector
    ? { dataset, classList: { add() {}, remove() {} } } : null } });
  return { context, buttons, spoken, root, store, element, timers,
    update(list) { available = list; events.voiceschanged(); },
    select(v) { element('#speech-voice').value = voiceKey(v); element('#speech-voice').handlers.change(); }, click };
}

const delayed = fixture();
assert.equal(delayed.element('#speech-voice').disabled, true);
await delayed.click('[data-speak]', { speak: 'test' });
assert.equal(delayed.spoken.length, 0);
delayed.update(voices);
assert.equal(delayed.element('#speech-voice').children.length, 3);
assert.equal(delayed.element('#speech-voice').value, voiceKey(local));
assert.equal(delayed.buttons[0].disabled, false);

const sentence = '明日は図書館で日本語を勉強します。';
delayed.select(remote);
assert.equal(delayed.store.get(key), voiceKey(remote));
await delayed.click('[data-speak]', { speak: encodeURIComponent(sentence) });
assert.equal(delayed.spoken.at(-1).text, sentence);
assert.equal(delayed.spoken.at(-1).voice, remote);
assert.equal(delayed.spoken.at(-1).rate, 0.95);
assert.equal(delayed.spoken.at(-1).pitch, 1);
await delayed.click('[data-speak]', { speak: encodeURIComponent(sentence), rate: '0.82' });
assert.equal(delayed.spoken.at(-1).rate, 0.82);
await delayed.click('[data-shadow]', { shadow: encodeURIComponent(sentence) });
assert.equal(delayed.spoken.at(-1).rate, 0.95);
await delayed.click('[data-shadow-listen]', { rate: '0.82' });
assert.equal(delayed.spoken.at(-1).voice, remote);
assert.equal(delayed.spoken.at(-1).rate, 0.82);
assert.equal(delayed.spoken.at(-1).pitch, 1);
assert.equal(fixture(voices, delayed.store).element('#speech-voice').value, voiceKey(remote));
assert.equal(fixture(voices).element('#speech-voice').value, voiceKey(local)); // separate device store
delayed.update([local]);
assert.equal(delayed.element('#speech-voice').value, voiceKey(local));
assert.match(delayed.element('#speech-status').textContent, /原選語音/);
delayed.update(voices);
assert.equal(delayed.element('#speech-voice').value, voiceKey(remote));
const none = fixture([english]);
assert.equal(none.element('#speech-voice').disabled, true);
assert.match(none.element('#speech-status').textContent, /沒有可用日語/);
none.timers[0]();
none.update([generic]);
assert.equal(none.element('#speech-voice').value, voiceKey(generic));
const blocked = fixture(voices, new Map(), true);
blocked.select(remote);
assert.match(blocked.element('#speech-status').textContent, /禁止儲存/);
assert.equal(blocked.element('#speech-voice').value, voiceKey(remote));
assert.match(source, /querySelectorAll\('rt, rp'\)/);
assert.match(delayed.context.renderSpeechToolbar(), /正常 0\.95×/);
assert.match(delayed.context.renderSpeechToolbar(), /慢速 0\.82×/);
console.log('PASS: async/cached voices, preference ranking, filtering, persistence, isolated stores, unavailable/reappearing voices, blocked storage, normal/slow speech and shadowing, pitch, toolbar.');

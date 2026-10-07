// One-time, idempotent metadata migration; retains all text and textbook page keys.
import fs from 'node:fs';
import path from 'node:path';
import '../js/lesson-classroom-core.js';
const core = globalThis.LessonClassroomCore;
const review = { by: '教材照片逐句核對（Codex）', date: '2026-10-07', method: '對照使用者提供的課本與解答本照片；未作真人音源時間軸核對' };
const source = (kind, page, href, locator) => ({ kind, page: String(page), href, locator });
const evidence = (page, locator) => ({ status: 'provided-verified', sources: [source('answer-book', page, `pages/answers-${page}.jpg`, locator)], review });
for (const folder of fs.readdirSync('lessons').filter(f => /^k[456]-/.test(f))) {
  const file = path.join('lessons', folder, 'data.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.catalog?.listed) continue;
  data.classroomSpecVersion = 1;
  for (const section of data.supplementalSections || []) {
    (section.items || []).forEach((item, index) => {
      item.id ||= `item-${String(index + 1).padStart(3, '0')}`;
      if (!item.answerType && (Number.isInteger(item.correct) || section.type === 'answer_key')) item.answerType = 'pending';
    });
  }
  function migrate(value) {
    if (!value || typeof value !== 'object') return;
    if (value.answerType && !value.answerEvidence) {
      const href = value.answerSource || value.sourcePhoto;
      const page = href?.match(/answers-(\d+)/)?.[1];
      value.answerEvidence = { status: value.answerType === 'suggested' ? 'suggested' : 'pending', sources: page ? [source('answer-book', page, href, '原有來源；尚待逐題复核')] : [] };
    }
    Object.values(value).forEach(v => { if (v && typeof v === 'object') Array.isArray(v) ? v.forEach(migrate) : migrate(v); });
  }
  migrate(data.supplementalSections);
  if (data.id === 'k6') {
    for (const section of data.supplementalSections.filter(s => [149, 150, 151, 161].includes(s.pageOrder))) {
      if (section.type !== 'sentence_cards') continue;
      const p = section.pageOrder;
      section.items.forEach((item, index) => {
        item.classroom = { ...(item.classroom || {}), kind: 'text', textbookPage: String(p), lineNumber: String(index + 1), cd: p === 161 ? [index < 4 ? '25' : '26'] : ['23'], textSource: source('textbook', p, `pages/${p}.jpeg`, '本頁原文') };
        if (p === 149) {
          const q = item.topic.match(/([12]）[①②③])/);
          if (q) item.classroom.questionNumber = q[1];
          if (/題目$/.test(item.topic)) item.classroom.kind = 'question';
          if (item.answerType) item.answerEvidence = evidence(117, `話す・聞く 2. ${q?.[1] || item.topic}`);
        }
        if (p === 150 && item.promptQ) {
          item.classroom.kind = 'question';
          item.classroom.questionNumber = [...item.speakerBAns.matchAll(/[①②③④⑤⑥]/g)].map(m => m[0]).join('・');
          const answerPage = /[③④⑤⑥]/.test(item.classroom.questionNumber) ? 118 : 117;
          item.answerEvidence = evidence(answerPage, `話す・聞く 3. ${item.classroom.questionNumber}`);
          item.classroom.originalRuby = item.promptQ.replace('」、②', '」②');
        }
        if (p === 161) {
          const number = item.topic.match(/^([12]）[①②]|2）[123])/);
          if (number) item.classroom.questionNumber = number[1];
          if (/題目/.test(item.topic)) item.classroom.kind = 'question';
          const ans = /提供解答/.test(item.topic);
          if (ans) item.answerEvidence = evidence(index < 4 || /2）1/.test(item.topic) ? 119 : 120, `問題 ${item.classroom.questionNumber}`);
          else if (item.answerType) { delete item.answerType; delete item.answerEvidence; }
          if (item.sourcePhoto) item.classroom.textSource = source('answer-book', /119/.test(item.sourcePhoto) ? 119 : 120, item.sourcePhoto, `問題 ${item.classroom.questionNumber} 聽力原文`);
        }
      });
      // Keep existing answer-card IDs and URLs; nest these cards under their question in the UI.
      for (let index = 0; index < section.items.length; index++) {
        const item = section.items[index];
        if (item.classroom.kind !== 'question' || p === 150) continue;
        const answers = [];
        for (let next = index + 1; next < section.items.length; next++) {
          const candidate = section.items[next];
          if (candidate.classroom.kind === 'question') break;
          if (candidate.answerType && candidate.classroom.questionNumber === item.classroom.questionNumber) answers.push(candidate.id);
        }
        if (answers.length) item.classroom.answerIds = answers;
      }
      section.notice = '上課樣板：原文／題目、AI朗讀、中文、答案與逐題來源。課本頁碼與解答本頁碼分開；照片核對不代表真人音源分句時間已核對。';
      if (p === 150) {
        const item = section.items.find(i => i.id === 'p150-line-01');
        item.jpRuby = 'もう<ruby>一度<rt>いちど</rt></ruby><ruby>聞<rt>き</rt></ruby>きましょう。';
      }
    }
  }
  const formatted = JSON.stringify(data, null, 2) + '\n';
  if (fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== formatted) fs.writeFileSync(file, formatted);
  console.log(`${data.id}: metadata migrated; textbook navigation unchanged`);
}

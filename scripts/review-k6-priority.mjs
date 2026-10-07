// Mechanical application of the explicitly reviewed local photos; not an OCR/answer generator.
import fs from 'node:fs';
import '../js/lesson-classroom-core.js';
const folder = fs.readdirSync('lessons').find(f => f.startsWith('k6-'));
const file = `lessons/${folder}/data.json`;
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const core = globalThis.LessonClassroomCore;
const plain = ruby => ruby.replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi,'').replace(/<[^>]*>/g,'');
const priority = [140, 141, 149, 150, 151, 152, 153];
const review = { by: 'Codex：逐句對照本機課本及提供解答照片', date: '2026-10-07', method: '核對文字與照片可見注音；數字／時刻未印完整讀音者另列待教師確認，非真人原音時間軸核對' };
const src = (page, locator, answer = false) => ({ kind: answer ? 'answer-book' : 'textbook', page: String(page), href: `pages/${answer ? 'answers-' + page + '.jpg' : page + '.jpeg'}`, locator });
const section = (page, type = 'sentence_cards') => data.supplementalSections.find(s => s.pageOrder === page && s.type === type);
function update(s, id, ruby, chinese) {
  const item = s.items.find(i => i.id === id);
  item.jpRuby = ruby; item.jpPlain = item.japanese = plain(ruby); if (chinese) item.chinese = chinese;
  delete item.plainText; return item;
}
function add(s, id, topic, ruby, chinese) {
  if (!s.items.some(i => i.id === id)) s.items.push({ id, topic, japanese: plain(ruby), jpPlain: plain(ruby), jpRuby: ruby, chinese });
}
function order(s, ids) { s.items.sort((a, b) => (ids.indexOf(a.id) < 0 ? 999 : ids.indexOf(a.id)) - (ids.indexOf(b.id) < 0 ? 999 : ids.indexOf(b.id))); }

const s140 = section(140), s141 = section(141), s152 = section(152), s153 = section(153);
s140.title = '140頁｜2（1）～つもりはない｜練習';
s141.title = '141頁｜2（2）～つもりだった｜練習';
s152.title = '152頁｜5. 練習をしましょう｜1）請求';
s153.title = '153頁｜5. 練習をしましょう｜2）交涉';
update(s140, 'item-002', 'うん。<ruby>買<rt>か</rt></ruby>うつもりはなかったんだけど、<ruby>店員<rt>てんいん</rt></ruby>に<ruby>勧<rt>すす</rt></ruby>められて……。');
update(s140, 'item-007', 'いいえ、わたしは<ruby>同<rt>おな</rt></ruby>じ<ruby>会社<rt>かいしゃ</rt></ruby>で<ruby>一生<rt>いっしょう</rt></ruby><ruby>働<rt>はたら</rt></ruby>くつもりはありません。');
update(s140,'item-004','いいえ、いっしょに<ruby>住<rt>す</rt></ruby>むつもりはありません。<ruby>子<rt>こ</rt></ruby>どもには<ruby>子<rt>こ</rt></ruby>どもの<ruby>生活<rt>せいかつ</rt></ruby>がありますから。');
order(s140,['item-003','item-007','item-008','item-002','item-009','item-004','item-005','item-006']);
order(s141,['item-003','item-004','item-007','item-002','item-008','item-009','item-005','item-006']);

update(s152,'item-003','<ruby>出張<rt>しゅっちょう</rt></ruby>の<ruby>予定<rt>よてい</rt></ruby>を<ruby>１週間<rt>いっしゅうかん</rt></ruby><ruby>延期<rt>えんき</rt></ruby>したい。');
update(s152,'item-007','<ruby>実<rt>じつ</rt></ruby>は、<ruby>夏休<rt>なつやす</rt></ruby>みのことなんですが……。できれば<ruby>日<rt>ひ</rt></ruby>にちを<ruby>変更<rt>へんこう</rt></ruby>させていただきたいんですが、どうでしょうか。<ruby>飛行機<rt>ひこうき</rt></ruby>の<ruby>切符<rt>きっぷ</rt></ruby>が<ruby>取<rt>と</rt></ruby>れなかったんです。');
add(s152,'p152-heading','5. 練習をしましょう','<ruby>練習<rt>れんしゅう</rt></ruby>をしましょう。','來練習吧。');
add(s152,'p152-example-prompt','1）例｜請求內容','<ruby>夏休<rt>なつやす</rt></ruby>みの<ruby>日<rt>ひ</rt></ruby>にちを<ruby>変更<rt>へんこう</rt></ruby>したい。','想更改暑假的日期。（對方：課長）');
for (const n of [1,2]) {
  add(s152,`p152-q${n}-response-1`,`1）（${n}）課長｜確認`,'はい、<ruby>何<rt>なん</rt></ruby>ですか。','可以，什麼事？');
  add(s152,`p152-q${n}-response-2`,`1）（${n}）課長｜同意`,'そうですか。いいですよ。','這樣啊，可以。');
}
order(s152,['p152-heading','p152-example-prompt','item-005','item-006','item-007','item-008','item-003','p152-q1-response-1','p152-q1-response-2','item-004','p152-q2-response-1','p152-q2-response-2']);
add(s153,'p153-example-prompt','2）例｜請求內容','パソコン<ruby>研修<rt>けんしゅう</rt></ruby>の<ruby>費用<rt>ひよう</rt></ruby>を<ruby>出<rt>だ</rt></ruby>してほしい。だめなら<ruby>半額<rt>はんがく</rt></ruby>でもいい。','希望公司負擔電腦研習費用；若不行，一半也可以。（對方：課長）');
update(s153,'item-003','<ruby>夏休<rt>なつやす</rt></ruby>みを<ruby>３週間<rt>さんしゅうかん</rt></ruby><ruby>取<rt>と</rt></ruby>りたい。だめなら<ruby>２週間<rt>にしゅうかん</rt></ruby>でもいい。');
for (const n of [1,2]) {
  add(s153,`p153-q${n}-response-1`,`2）（${n}）課長｜確認`, n === 1 ? 'うーん。<ruby>３週間<rt>さんしゅうかん</rt></ruby>ですか。' : 'うーん。パソコンとコピー<ruby>機<rt>き</rt></ruby>ですか。','嗯，' + (n === 1 ? '三個星期嗎？' : '電腦和影印機嗎？'));
  add(s153,`p153-q${n}-response-2`,`2）（${n}）課長｜同意`,'そうですね。それなら、いいでしょう。','這樣啊。如果是那樣，應該可以。');
}
order(s153,['p153-example-prompt','item-002','item-004','item-001','item-005','item-003','p153-q1-response-1','p153-q1-response-2','item-006','p153-q2-response-1','p153-q2-response-2']);
for (const s of [s140,s141,s152,s153]) {
  s.notice = '已逐句對照本頁照片；課本原題與解答本解答例分開。數字完整讀音仍待教師確認。';
}

// Fix source attribution and exact printed blanks on the original sample.
for (const i of section(149).items.filter(i => i.answerEvidence)) i.classroom.textSource = i.answerEvidence.sources[0];
section(150).items.find(i=>i.id==='p150-line-21').classroom.originalRuby = 'あのう、④＿＿＿＿＿＿＿＿<ruby>全額<rt>ぜんがく</rt></ruby>が⑤＿＿＿＿＿＿＿＿、<ruby>会社<rt>かいしゃ</rt></ruby>に<ruby>社員研修<rt>しゃいんけんしゅう</rt></ruby>の<ruby>制度<rt>せいど</rt></ruby>がありますよね。';
add(section(150),'p150-work-context','場面','<ruby>仕事中<rt>しごとちゅう</rt></ruby>','工作中。');
const s150=section(150); s150.items.splice(2,0,s150.items.splice(s150.items.findIndex(i=>i.id==='p150-work-context'),1)[0]);

for (const s of data.supplementalSections) {
  const p = Number(s.pageOrder); if (!p || s.type === 'audio_tracks') continue;
  s.items.forEach((i,n) => {
    if (priority.includes(p) && (i.jpRuby || i.answerRuby)) {
      i.jpPlain = plain(i.jpRuby || i.answerRuby);
      if (i.japanese) i.japanese = i.jpPlain;
    }
    i.classroom = { ...i.classroom, kind: i.classroom?.kind || (s.type === 'answer_key' ? 'answer' : 'text'), textbookPage:String(p), lineNumber:String(n+1) };
    if (!i.classroom.textSource) i.classroom.textSource = i.sourcePhoto ? src(Number(i.sourcePhoto.match(/answers-(\d+)/)?.[1] || p),i.label || i.topic, /answers-/.test(i.sourcePhoto)) : src(p,i.topic || i.label || '本頁原文');
    const checked = priority.includes(p);
    i.classroom.priorityReviewed = checked;
    i.classroom.textReview = { status: checked ? 'photo-verified' : 'pending', ...(checked ? {review} : {}), note: checked ? '逐句核對課本；答案／完成句另以解答本核對。' : '來源照片已連結，尚未逐句重核。' };
    if (checked) i.classroom.readingReview = {status:/[１２３４５６７８９０0-9]/.test(i.jpPlain || i.answer || '') ? 'partial' : 'photo-verified', note:/[１２３４５６７８９０0-9]/.test(i.jpPlain || i.answer || '') ? '漢字注音已核對；數字、週數或時刻未印完整讀音，教學讀法待教師確認。' : '對照照片可見漢字注音；中文屬教學翻譯，不是來源原稿。', sources:[i.classroom.textSource], review};
    if (s.type === 'answer_key' && priority.includes(p)) {
      const answerPage = p < 149 ? 116 : 118;
      const q = Number(i.label.match(/練習([12])/)?.[1]);
      i.classroom.questionNumber = `${p < 149 ? '2（'+ (p === 140 ? '1' : '2') +'）' : (p===152 ? '1）' : '2）')}練習（${q}）`;
      i.classroom.textSource = src(answerPage,`${p < 149 ? '文法・練習 2.（'+(p===140?'1':'2')+'）' : '話す・聞く 5. '+(p===152?'1）':'2）')}（${q}）${i.label.split('｜')[1] || ''}`,true);
      i.answerEvidence = {status:'provided-verified', sources:[i.classroom.textSource], review};
      i.classroom.readingReview.sources = [i.classroom.textSource];
    }
  });
}
for (const p of [140,141,152,153]) {
  const s=section(p), answer=section(p,'answer_key');
  const answerSection = core.sections(data).find(s=>s.pageOrder===p && s.type==='answer_key').sectionId;
  const questions = p===140 ? ['item-005','item-006'] : p===141 ? ['item-005','item-006'] : p===152 ? ['item-003','item-004'] : ['item-003','item-006'];
  questions.forEach((id,n)=> {
    const i=s.items.find(i=>i.id===id); i.classroom.kind='question';
    i.classroom.questionNumber=answer.items.find(a=>a.label.startsWith('練習'+(n+1))).classroom.questionNumber;
    i.classroom.answerRefs=answer.items.filter(a=>a.label.startsWith('練習'+(n+1))).map(a=>({sectionId:answerSection,itemId:a.id}));
    if (p>=152) i.classroom.responseIds=[`p${p}-q${n+1}-response-1`,`p${p}-q${n+1}-response-2`];
  });
}
data.classroomTeaching = { completedPages:priority.map(String), nextRange:null, note:'昨天已上課；下次範圍尚未公布。' };
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
console.log('K6 priority photos reviewed; remaining pages ordered and explicitly pending, not auto-verified.');

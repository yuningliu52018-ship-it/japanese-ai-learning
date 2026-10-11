// One-time, source-backed DATA migration; not a lesson renderer or player.
// Run without --write to preview. Review statuses cover printed text only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const file = 'lessons/k4-伝言お願いできますか/data.json';
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const originalIds = new Set([...d.sections, ...d.supplementalSections].flatMap(s => (s.items || []).map(i => `${s.id}/${i.id}`)));
const section = id => d.supplementalSections.find(s => s.id === id);
const item = (sid, id) => section(sid).items.find(i => i.id === id);
const plain = s => s.replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/g, '').replace(/<br\s*\/?\s*>/g, '\n').replace(/<[^>]*>/g, '');
const ruby = s => s.replace(/([^\s<>]+)\[([^\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>').replace(/ /g, '');
const review = {by:'Codex：逐項對照使用者重拍第4課課本照片（不採手寫填答）',date:'2026-10-11',method:'比較印刷原文與教材顯示／朗讀文字；中文為教學翻譯，讀音另保留待核對狀態'};
function set(i, r, zh) { i.jpRuby = r; i.jpPlain = plain(r); if (zh) i.zh = zh; }
function answer(i, page, locator) {
  i.classroom.examplesRole = 'answer';
  i.answerEvidence = {status:'provided-verified',sources:[{kind:'answer-book',page:String(page),href:`pages/answers-${page}.jpg`,locator}],review:{by:'Codex：對照提供解答本印刷答案',date:'2026-10-11',method:'逐題比對既有解答本照片；不將使用者手寫筆記當作官方答案'}};
}
function question(i, r, zh, number) {
  if (!i.examples?.length && i.answerEvidence) i.examples = [{plain:i.jpPlain,ruby:i.jpRuby,chinese:i.zh}];
  set(i, r, zh);
  i.classroom.kind = 'question'; i.classroom.questionNumber = number;
  if (i.examples?.length) i.classroom.examplesRole = 'answer';
}
function insertAfter(s, parent, extra) {
  assert(!s.items.some(i => i.id === extra.id));
  s.items.splice(s.items.indexOf(parent)+1,0,extra);
  const page = d.pagePresentation.pages.find(p => p.key === parent.classroom.textbookPage);
  const a = page.assignments.find(a => a.sectionId === `${s.chapter}-${s.id}`);
  if (a?.itemIds) a.itemIds.splice(a.itemIds.indexOf(parent.id)+1,0,extra.id);
}
function split(sid, id, parts) {
  const s=section(sid), base=item(sid,id), old=structuredClone(base);
  parts.forEach(([r,zh],n) => {
    const i = n === 0 ? base : {id:`${id}-line-${n+1}`,topic:old.topic,classroom:{...structuredClone(old.classroom),kind:'text'}};
    if(n) { delete i.classroom.examplesRole; delete i.classroom.answerRefs; delete i.classroom.answerIds; }
    set(i,r,zh);
    if(n) insertAfter(s, n===1?base:item(sid,`${id}-line-${n}`),i);
  });
}

// 88–89: printed prompts must not be replaced by completed answer-book sentences.
set(item('unit1','u1-3'),ruby('課長[かちょう] の 話[はなし]・今年[ことし] の 忘年会[ぼうねんかい] は 中止[ちゅうし] になりました。<br>→ 課長[かちょう] の 話[はなし] では、今年[ことし] の 忘年会[ぼうねんかい] は 中止[ちゅうし] になったということです。'),'例：課長的話「今年的尾牙取消了」→ 據課長所說，今年的尾牙取消了。');
question(item('unit1','u1-4'),ruby('医者[いしゃ] の 説明[せつめい]・専門[せんもん] の 病院[びょういん] で 検査[けんさ] してもらったほうがいいです。'),'醫師的說明：最好去專科醫院接受檢查。','練習1 1）');
question(item('unit1','u1-5'),ruby('部長[ぶちょう] の 話[はなし]・シュミットさんはあさって 帰国[きこく] されます。'),'部長的話：施密特先生後天回國。','練習1 2）');
for(const [id,r,zh,n] of [
 ['u1-7',ruby('発表会[はっぴょうかい] を 担当[たんとう] する'),'負責發表會','練習2 1）'],
 ['u1-8',ruby('明日[あす]、会場[かいじょう] へ 行[い] く'),'明天去會場','練習2 2）'],
 ['u1-8c',ruby('そちらへ 行[い] く'),'到您那邊去','練習2 3）'],
]) { const i=item('unit1',id);question(i,r,zh,n);delete i.promptQ; }
for(const [id,r,zh,n] of [
 ['u2-4',ruby('大[おお] きいマスクをしている 子[こ] どもに'),'向戴大口罩的小孩提問','練習 1）'],
 ['u2-5',ruby('スーツケースを 持[も] って 出[で] かける 友達[ともだち] に'),'向帶著行李箱出門的朋友提問','練習 2）'],
]) question(item('unit2',id),r,zh,n);
// Add the printed exercise instruction missing from the previous transcription.
const instruction={id:'u2-instruction',topic:'練習｜作答指示',jpRuby:ruby('「あれ？」と 思[おも] ったことを 質問[しつもん] してください。答[こた] えも 考[かんが] えてください。'),zh:'請就感到「咦？」的事情提問，也想一想回答。',classroom:{kind:'text',textbookPage:'89',textReview:{status:'pending'},readingReview:{status:'partial'}}};
instruction.jpPlain=plain(instruction.jpRuby);
insertAfter(section('unit2'),item('unit2','u2-2'),instruction);
for(const i of section('unit1').items.filter(i=>['u1-4','u1-5','u1-7','u1-8','u1-8c'].includes(i.id))) answer(i,106,i.classroom.questionNumber);
for(const i of section('unit2').items.filter(i=>['u2-4','u2-5'].includes(i.id))) answer(i,106,`2.練習 ${i.classroom.questionNumber}`);
item('unit2','u2-4').grammarNote='解答本列有兩種回答；課本印刷題目只有情境提示。';
item('unit1','u1-8c').grammarNote='課本情境為そちらへ行く；答案使用來訪者的視角確認。';

// Dialogues: each printed sentence gets its own play control, original IDs survive.
split('unit1','u1-2',[
 ['<ruby>部長<rt>ぶちょう</rt></ruby>に30<ruby>分<rt>ぷん</rt></ruby>ほど<ruby>遅<rt>おく</rt></ruby>れると<ruby>伝<rt>つた</rt></ruby>えてください。','請轉告部長，我會遲到約三十分鐘。'],
 ['はい、わかりました。','好的，明白了。'],
 ['30<ruby>分<rt>ぷん</rt></ruby>ほど<ruby>遅<rt>おく</rt></ruby>れるということですね。','也就是說，會遲到約三十分鐘，對吧？']]);
split('page98-listening-dialogue','p98-3',[
 ['あ、いつもお<ruby>世話<rt>せわ</rt></ruby>になっております。','啊，平時承蒙您照顧。'],
 ['①＿＿＿＿ <ruby>松本<rt>まつもと</rt></ruby>は<ruby>出張<rt>しゅっちょう</rt></ruby>しておりますが。','①＿＿＿＿，松本正在出差。']]);
const greeting=item('page98-listening-dialogue','p98-3'), gap=item('page98-listening-dialogue','p98-3-line-2');
for(const k of ['answerType','examplesTitle','examples','answerSource','answerEvidence']) {gap[k]=greeting[k];delete greeting[k];}
gap.classroom.examplesRole='answer';delete greeting.classroom.examplesRole;
gap.examples[0]={plain:'あいにく、松本は出張しておりますが。',ruby:'あいにく、<ruby>松本<rt>まつもと</rt></ruby>は<ruby>出張<rt>しゅっちょう</rt></ruby>しておりますが。',chinese:'不巧，松本正在出差。①：あいにく。'};
gap.classroom.kind='question';gap.classroom.questionNumber='会話1 ①';
split('page98-listening-dialogue','p98-4', [['そうですか。','是嗎？'],['いつごろお<ruby>帰<rt>かえ</rt></ruby>りになりますか。','大約什麼時候回來呢？']]);
split('page98-listening-dialogue','p98-5', [['<ruby>明日<rt>あす</rt></ruby>の<ruby>午後<rt>ごご</rt></ruby>の<ruby>予定<rt>よてい</rt></ruby>です。','預計明天下午回來。'],['<ruby>戻<rt>もど</rt></ruby>りましたら、こちらからお<ruby>電話<rt>でんわ</rt></ruby><ruby>差<rt>さ</rt></ruby>し<ruby>上<rt>あ</rt></ruby>げましょうか。','他回來後，要由我們這邊打電話給您嗎？']]);
split('page98-listening-dialogue','p98-7',[['はい。','好的。'],['どうぞ。','請說。']]);
split('page98-listening-dialogue','p98-14',[['よろしくお<ruby>願<rt>ねが</rt></ruby>いいたします。','麻煩您了。'],['<ruby>失礼<rt>しつれい</rt></ruby>します。','那我先告辭。']]);
split('page99-message-dialogue','p99-1',[['ただいま<ruby>電話<rt>でんわ</rt></ruby>に<ruby>出<rt>で</rt></ruby>ることができません。','現在無法接聽電話。'],['メッセージをどうぞ。','請留言。']]);
split('page99-message-dialogue','p99-2',[
 ['わたし、けい<ruby>子<rt>こ</rt></ruby>。','是我，惠子。'],
 ['<ruby>今日<rt>きょう</rt></ruby>ね、<ruby>急<rt>きゅう</rt></ruby>な<ruby>仕事<rt>しごと</rt></ruby>が<ruby>入<rt>はい</rt></ruby>っちゃって、<ruby>遅<rt>おそ</rt></ruby>くなりそうなの。','今天臨時有工作，可能會晚回去。'],
 ['<ruby>晩<rt>ばん</rt></ruby>ご<ruby>飯<rt>はん</rt></ruby>、<ruby>先<rt>さき</rt></ruby>に<ruby>食<rt>た</rt></ruby>べといて。','晚飯先吃吧。'],
 ['じゃね。','那先這樣。']]);
// Source photo 98 has two initial utterances separated by 。.
split('page98-listening-dialogue','p98-6',[['いえ。','不用。'],['あのう、②＿＿＿＿、③＿＿＿＿。','那個，②＿＿＿＿，③＿＿＿＿。']]);
const no=item('page98-listening-dialogue','p98-6'), request=item('page98-listening-dialogue','p98-6-line-2');
for(const k of ['answerType','examplesTitle','examples','answerSource','answerEvidence']) {request[k]=no[k];delete no[k];}
request.classroom.examplesRole='answer';delete no.classroom.examplesRole;
request.classroom.kind='question';request.classroom.questionNumber='会話1 ②・③';
request.examples[0].plain=request.examples[0].plain.replace(/^いえ。/,'');request.examples[0].ruby=request.examples[0].ruby.replace(/^いえ。/,'');

// Missing printed condition cues on 100–101; retain blanks and existing answers.
for(const [sid,id,cue,zh] of [
 ['page100-practice-1','p100-q1','（1）<ruby>食<rt>しょく</rt></ruby>パンは<ruby>売<rt>う</rt></ruby>り<ruby>切<rt>き</rt></ruby>れだ（●：お<ruby>客<rt>きゃく</rt></ruby>さん）','情境：吐司已售完；客人詢問是否有吐司。'],
 ['page100-practice-1','p100-q2','（2）<ruby>今<rt>いま</rt></ruby>、<ruby>千円札<rt>せんえんさつ</rt></ruby>しか<ruby>持<rt>も</rt></ruby>っていない（●：<ruby>友達<rt>ともだち</rt></ruby>）','情境：現在只有一千日圓鈔票；朋友想借零錢。'],
 ['page101-practice-2','p101-example','<ruby>例<rt>れい</rt></ruby>：<ruby>今<rt>いま</rt></ruby>、<ruby>準備中<rt>じゅんびちゅう</rt></ruby>だ（●：レストランのお<ruby>客<rt>きゃく</rt></ruby>さん）','情境：目前準備中；請餐廳客人約三十分鐘後再來。'],
 ['page101-practice-2','p101-q1','（1）バーゲンセールの<ruby>案内状<rt>あんないじょう</rt></ruby>を<ruby>送<rt>おく</rt></ruby>りたい（●：デパートのお<ruby>客<rt>きゃく</rt></ruby>さん）','情境：想寄特賣邀請函給百貨公司的客人。'],
 ['page101-practice-2','p101-q2','（2）<ruby>電話<rt>でんわ</rt></ruby>が<ruby>遠<rt>とお</rt></ruby>い（●：<ruby>取引先<rt>とりひきさき</rt></ruby>の<ruby>人<rt>ひと</rt></ruby>）','情境：電話聽不清楚；對方是往來公司的聯絡人。'],
]) {const i=item(sid,id);set(i,`${cue}<br>${i.jpRuby}`,zh);}

// 106: the photograph says イギリスの作家 (missing 作家 previously).
const wells=item('page106-reading','p106-s02');set(wells,wells.jpRuby.replace('イギリスのH.G.','イギリスの<ruby>作家<rt>さっか</rt></ruby>、H. G. '));
// 109 is audio-only: source photo must not imply unseen CD16 questions are printed.
for(const id of ['p109-cd16-q1','p109-cd16-q2']) {
 const i=item('page109-exercises',id);
 i.grammarNote='本頁課本只印CD16作答空格；此題幹來自解答本109頁，尚未逐段核對原音。';
 i.classroom.textSource={kind:'answer-book',page:'109',href:'pages/answers-109.jpg',locator:`問題1 ${id.endsWith('q1')?'1）':'2）'}`};
}
const memo=item('page109-exercises','p109-cd17-memo1');set(memo,memo.jpRuby.replace('<ruby>留守<rt>るす</rt></ruby>メモ','<ruby>伝言<rt>でんごん</rt></ruby>メモ'));
// 109–111: no invented verbal placeholders (空欄/かっこ) or Chinese in jpPlain.
const mismatches=[];
for(const sid of ['page109-exercises','page110-exercises','page111-exercises']) for(const i of section(sid).items) {
 if(i.jpRuby && i.jpPlain!==plain(i.jpRuby)) {mismatches.push(i.id);i.jpPlain=plain(i.jpRuby);}
}
const q5=item('page110-exercises','p110-q5');set(q5,q5.jpRuby.replace('を（②　　　　）。','を（②　　　　）る。'));
const q8=item('page111-exercises','p111-q8');set(q8,q8.jpRuby.replace('（　）<ruby>腹','（に）<ruby>腹'));

// Attach evidence to each page; only reviewed printed originals get text verification.
const verifiedSections=new Set(['unit1','unit2','unit3','page90-short-practice','page90-causative-examples','page90-practice1','page91-practice2','page91-practice3','page92-dearu','page92-dearu-practice','page92-continuative','page93-continuative-practice','page93-garu','page93-garu-practice','page94-gatteiru','page94-picture-practice','page95-koto','page95-koto-practice','page96-situation-1','page96-situation-2','page97-listening-questions','page98-listening-dialogue','page99-message-dialogue','page99-repeat-practice','page100-practice-1','page101-practice-2','page103-challenge','page104-think','page105-vocabulary-check','page106-reading','page107-questions','page108-challenge','page110-exercises','page111-exercises']);
let verified=0;
for(const s of [...d.sections,...d.supplementalSections]) {
 const page=s.items?.[0]?.classroom?.textbookPage;
 if(page && fs.existsSync(`lessons/k4-伝言お願いできますか/pages/${page}.jpg`)) s.sourcePhoto=`pages/${page}.jpg`;
 if(s.notice?.includes('已依使用者提供的第4課解答本核對')) s.notice='原題依課本照片收錄；答案核對進度以各題標籤與來源為準。照片上手寫填答不是官方解答。';
 for(const i of s.items||[]) {
  if(!i.classroom) continue;
  const c=i.classroom,p=c.textbookPage;
  c.textSource ||= {kind:'textbook',page:p,href:`pages/${p}.jpg`,locator:`${s.title}／${i.topic||i.id}`};
  if(verifiedSections.has(s.id)&&i.jpRuby) {
   // Picture cue descriptions are not printed sentences; never promote them.
   c.textReview={status:'photo-verified',review};verified++;
   if(s.id==='page104-think'&&i.id==='p104-q1') {
    set(i,'いろいろな<ruby>時代<rt>じだい</rt></ruby>の<ruby>電話機<rt>でんわき</rt></ruby>です。<ruby>古<rt>ふる</rt></ruby>い<ruby>物<rt>もの</rt></ruby>から<ruby>順<rt>じゅん</rt></ruby>に<ruby>番号<rt>ばんごう</rt></ruby>をつけてください。','請把圖中五種不同時代的電話機，從古老的開始依序編號。');
   }
   i.jpPlain=plain(i.jpRuby);
  }
 }
}
// Vocabulary content/reading is not auto-promoted: handwritten readings ≠ printed proof.
for(const v of d.vocabulary) v.classroom.textSource={kind:'textbook',page:v.classroom.textbookPage,href:`pages/${v.classroom.textbookPage}.jpg`,locator:`単語 ${v.id}`};
// Keep all pre-existing anchors and all textbook page keys.
const afterIds=new Set([...d.sections,...d.supplementalSections].flatMap(s=>(s.items||[]).map(i=>`${s.id}/${i.id}`)));
for(const id of originalIds)assert(afterIds.has(id),`Lost stable ID ${id}`);
assert.deepEqual(d.pagePresentation.pages.map(p=>p.key),Array.from({length:26},(_,n)=>String(86+n)));
console.log(JSON.stringify({verifiedPrintedCards:verified,addedCards:afterIds.size-originalIds.size,synchronizedQuestionText:mismatches,mode:process.argv.includes('--write')?'write':'preview'},null,2));
if(process.argv.includes('--write'))fs.writeFileSync(file,JSON.stringify(d,null,2)+'\n');

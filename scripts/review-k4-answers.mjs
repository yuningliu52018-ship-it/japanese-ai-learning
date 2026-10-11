// Source-backed, one-time DATA audit. Not part of the lesson runtime.
// The manifest below was read against answers-106..110.jpg on 2026-10-11.
// Default: verify without writing; --write applies the reviewed data changes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const file = 'lessons/k4-伝言お願いできますか/data.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const cards = [...data.sections, ...data.supplementalSections].flatMap(s => s.items || []);
const find = id => { const i = cards.find(i => i.id === id); assert(i, id); return i; };
const strip = s => s.replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/g, '').replace(/<br\s*\/?\s*>/g, '\n').replace(/<[^>]*>/g, '');
const normalized = s => s.replace(/[\s。、，．]/g, '');
const manifest = [];
function group(page, locator, entries) {
  for (const [id, printed] of entries) manifest.push({id, page: String(page), locator, printed});
}
group(106, '文法3 練習・短い言い方', [
 ['p90-short-1', 'うん、きのう全部読んじゃった。'],
 ['p90-short-2', 'うん、カレー、作っといて／カレー、作っといてくれる？'],
 ['p90-short-3', 'ううん、込んでなかった。'],
]);
group(106, '文法4 練習1', [
 ['p90-pr1-1', '幼稚園のとき、父に外で遊ばされました。'],
 ['p90-pr1-2', '小学校のとき、両親にそろばんを習わされました。'],
 ['p90-pr1-3', 'お正月に、祖母に正座してあいさつをさせられました。'],
]);
group(106, '文法4 練習2 1）', [['p91-pr2-1','ええ。課長にカラオケで歌わされたんです。']]);
group(107, '文法4 練習2 続き', [
 ['p91-pr2-2','ええ。先輩に運動場を走らされたんです。'],
 ['p91-pr2-3','ええ。妻にやめさせられたんです。'],
]);
group(107, '文法5 練習', [['p92-rewrite','「駅」という字は「馬」と「尺」を合わせてできた漢字である。もともと「うまや」と読まれ、馬を乗り換えるところという意味であった。人は昔、馬に荷物や人を運ばせ、馬が疲れると、「うまや」で別の馬に乗り換えたのである。']]);
group(107, '文法6 練習', [
 ['p93-cont-1','彼は性格が明るく、ユーモアがあり、クラスの人気者だ。'],
 ['p93-cont-2','地震で壊れた建物には多くの人が残っており、けがをしている人もいるようだ。'],
]);
group(107, '文法7（1）練習', [
 ['p93-garu-q1','姉は雷の音を聞くと、怖がります。'],
 ['p93-garu-q2','弟はおふろに入るのを嫌がります。'],
 ['p93-garu-q3','うちの子どもは月曜日、学校へ行きたがりません。'],
]);
group(107, '文法7（2）練習', [
 ['p94-picture-1','赤ちゃんはミルクを欲しがっています。'],
 ['p94-picture-2','犬は散歩に行きたがっています。'],
 ['p94-picture-3','犬は散歩から帰るのをいやがっています。'],
]);
group(107, '話す・聞く2 会話1 1）内容', [
 ['p97-c1-q1','いいえ、来ていません。'],
 ['p97-c1-q2','いいえ、しません。'],
 ['p97-c1-q3','いいえ、会いません。'],
]);
group(107, '話す・聞く2 会話1 2）表現', [
 ['p97-c1-e1','恐れ入りますが、伝言、お願いできますか。'],
 ['p97-c1-e2','はい。あさっての金曜日はご都合が悪くなったということですね。'],
]);
group(108, '話す・聞く2 会話2', [
 ['p97-c2-q1','けい子さんが、今日急な仕事が入って遅くなりそうなので、晩ご飯を先に食べるようにというメッセージを入れました。'],
 ['p97-c2-e1','自分（メッセージを入れている人）の名前を言いました。'],
]);
group(108, '話す・聞く3 もう一度聞きましょう', [
 ['p98-3-line-2','あいにく、松本は出張しておりますが。'],
 ['p98-6-line-2','あのう、恐れ入りますが、伝言、お願いできますか。'],
 ['p98-10','申し訳ありませんが、そのようにお伝えいただけますか。'],
 ['p98-11','はい。あさっての金曜日はご都合が悪くなったということですね。'],
]);
group(108, '話す・聞く5 練習をしましょう（解答例）1）', [
 ['p100-q1','あいにく売り切れてしまったんですが、……。'],
 ['p100-q2','あいにく千円札しか持っていないんだ。'],
]);
group(108, '話す・聞く5 練習をしましょう（解答例）2）', [
 ['p101-q1','あのう、バーゲンセールのご案内状をお送りしたいので、恐れ入りますが、ご住所をこちらにお書きいただけませんか。'],
 ['p101-q2','もしもし、電話が遠いので、恐れ入りますが、もう少し大きい声で話していただけませんか。'],
]);
group(108, '読む・書く1 考えてみましょう 1）', [['p104-q1','①3、②2、③5、④4、⑤1。']]);
group(108, '読む・書く2 ことばをチェックしましょう', [
 ['p105-q1','キ．つないで'], ['p105-q2','イ．断って'],
 ['p105-q3','カ．味わって'], ['p105-q4','エ．腹を立てて'],
 ['p105-q5','ウ．勧めて'], ['p105-q6','オ．便利さ'], ['p105-q7','ア．失礼だ'],
]);
group(108, '読む・書く4 答えましょう', [
 ['p107-q1','1、6、4、5、3、2。'], ['p107-q2','1、4、5、2、3。'],
 ['p107-q3','聞きたくもない音を聞かされ、話したくもないときに、話したくもない人と話させられるから。'],
 ['p107-q4','その場にいなくても話したい人と話すことができるということです。'],
]);
group(109, '問題1 1）例', [['p109-cd16-q1','いいえ、よくないことだと思います。子どもは欲しがれば何でも買ってもらえると思いますから。']]);
group(109, '問題1 2）例', [['p109-cd16-q2','テレビを見たいのに、早く寝させられたことです。']]);
group(109, '問題2 1）印刷解答・会話の回電依頼', [['p109-cd17-memo1','① ワット（先生）　② ミラー　③ 8729-36-0541']]);
group(109, '問題2 2）印刷解答', [['p109-cd17-memo2','① 山田（先生）　② 小川　③ 風邪で今日の練習を休む']]);
group(109, '問題3', [
 ['p109-q3-1','悔しがり'], ['p109-q3-2','不安がって'], ['p109-q3-3','出かけたがり'],
 ['p110-q3-4','留学したがって'],
]);
group(110, '問題3 続き 5）', [['p110-q3-5','知りたがり']]);
group(110, '問題4 1）–9）', [['p110-q4','1）飲まされる　2）急がされる　3）払わされる　4）立たされる　5）話させられる\n6）食べさせられる　7）いさせられる　8）勉強させられる　9）来させられる']]);
group(110, '問題5 ①–④', [['p110-q5','①作らされ　②洗濯させられ／洗わされ／準備させられ　③持たされ　④行かされ']]);
group(110, '問題6', [
 ['p110-q6-1','ここは夏は涼しく、交通も便利で、住みやすいところだ。'],
 ['p110-q6-2','東京には世界中の情報が集まっており、人と物が24時間動いている。'],
]);
group(110, '問題7', [['p111-q7','富士山は日本で最も高い山である。夏の晴れた朝には赤くなり、とても美しい。葛飾北斎の「赤富士」はその美しさをかいたものである。']]);
group(110, '問題8 1）–4）（例は課本111頁）', [['p111-q8','例：に　1）と　2）に　3）を　4）に']]);
group(110, '問題9 ①–③', [['p111-q9','① 早速　② あいにく　③ 結局']]);
assert.equal(manifest.length,61);
assert.equal(new Set(manifest.map(x=>x.id)).size,61);
const oldIds = cards.map(i=>i.id);
const changed = [];
// Preserve the photograph's answer wording, not the previous paraphrase.
const rewrite=find('p92-rewrite').examples[0];
rewrite.ruby=rewrite.ruby.replace('。<ruby>昔<rt>むかし</rt></ruby>', '。<ruby>人<rt>ひと</rt></ruby>は<ruby>昔<rt>むかし</rt></ruby>');
rewrite.plain=strip(rewrite.ruby);
const order=find('p104-q1').examples[0];
order.plain='①3、②2、③5、④4、⑤1。';
order.chinese='依圖號填入①3、②2、③5、④4、⑤1；古老到現代的次序為⑤→②→①→④→③。中文說明不送入日文朗讀。';
const memo1=find('p109-cd17-memo1');
memo1.topic='2. CD17｜1）伝言メモ';
memo1.examples[0].plain='① ワット（先生）　② ミラー　③ 8729-36-0541';
memo1.examples[0].chinese='解答本印刷答案：①瓦特老師、②米勒、③電話8729-36-0541。勾選「電話をください」依據同頁會話要求回電；未聲稱原音已逐段核對。';
find('p109-cd17-memo2').examples[0].plain='① 山田（先生）　② 小川　③ 風邪で今日の練習を休む';
find('p109-cd17-memo2').examples[0].chinese='解答本印刷答案：①山田老師、②小川、③因感冒，今天的練習請假。';
const table=find('p110-q4').examples[0];table.plain=strip(table.ruby);
// Corrections supported by the printed answer-book furigana, not a phonetic guess.
const fixes=[
 ['p90-pr1-1','<ruby>父<rt>とう</rt></ruby>','<ruby>父<rt>ちち</rt></ruby>'],
 ['p97-c1-q1','<ruby>来<rt>こ</rt></ruby>て','<ruby>来<rt>き</rt></ruby>て'],
 ['p97-c2-q1','<ruby>入<rt>い</rt></ruby>って','<ruby>入<rt>はい</rt></ruby>って'],
 ['p101-q2','<ruby>話<rt>はなし</rt></ruby>','<ruby>話<rt>はな</rt></ruby>'],
 ['p107-q3','<ruby>話<rt>はなし</rt></ruby>','<ruby>話<rt>はな</rt></ruby>'],
 ['p107-q4','<ruby>話<rt>はなし</rt></ruby>','<ruby>話<rt>はな</rt></ruby>'],
];
for(const [id,from,to] of fixes){const e=find(id).examples[0];e.ruby=e.ruby.replaceAll(from,to);e.plain=strip(e.ruby);}
find('p98-6-line-2').examples[0].chinese='那個，不好意思，可以請您代為轉告嗎？②恐れ入りますが；③伝言、お願いできますか。';
// 107 answer-book lists the remaining numbers; first number derives from story order.
for(const id of ['p107-q1','p107-q2']) {
 const i=find(id);
 i.examples[0].chinese=id==='p107-q1' ? '完整順序：1、6、4、5、3、2。解答本列後五項6、4、5、3、2；第一项1依106頁課文開頭確定，不將照片手寫1當作印刷答案。' : '完整順序：1、4、5、2、3。解答本列後四項4、5、2、3；第一項1依106頁課文的發明／希望使用段落確定，不將照片手寫1當作印刷答案。';
}
for(const m of manifest) {
 const i=find(m.id);assert(i.answerEvidence?.status==='pending'||i.answerEvidence?.status==='provided-verified',m.id);
 assert.equal(i.examples.length,1,m.id);
 assert.equal(normalized(i.examples[0].plain),normalized(m.printed),`${m.id}: answer differs from reviewed manifest`);
 if(i.examples[0].ruby)assert.equal(normalized(strip(i.examples[0].ruby)),normalized(i.examples[0].plain),`${m.id}: ruby/plain mismatch`);
 const href=`pages/answers-${m.page}.jpg`;
 assert(fs.existsSync(`lessons/k4-伝言お願いできますか/${href}`));
 i.answerSource=href;
 i.answerEvidence={status:'provided-verified',sources:[{kind:'answer-book',page:m.page,href,locator:`${m.locator}／課本${i.classroom.textbookPage}頁 ${i.topic}`}],review:{by:'Codex：人工逐項比對提供解答本照片',date:'2026-10-11',method:'比對解答本印刷答案、課本頁與題號；已修正差異。中文為教學翻譯，部分讀音仍待核；不等於教師確認或原音核對。'}};
 if(m.id==='p107-q1'||m.id==='p107-q2') i.answerEvidence.sources.push({kind:'textbook',page:'106',href:'pages/106.jpg',locator:'電話嫌い・課文事件順序；支持第一項1'});
 i.classroom.kind='question';i.classroom.examplesRole='answer';
 i.classroom.questionNumber ||= i.topic;
 if(['p100-q1','p100-q2','p101-q1','p101-q2','p109-cd16-q1','p109-cd16-q2'].includes(m.id)) {
  i.examplesTitle='解答本例答（已核對，非唯一答案）';
  i.grammarNote=[i.grammarNote,'解答本以「解答例／例」列出的回答；本次確認與提供來源相符，不表示只能這樣作答。'].filter(Boolean).join(' ');
 }
 changed.push({id:m.id,textbookPage:i.classroom.textbookPage,answerBookPage:m.page});
}
// A genuine unresolved source gap: neither answer book nor textbook supplies 線.
const point=find('p106-reading-point');
point.answerEvidence={status:'pending',sources:[{kind:'textbook',page:'106',href:'pages/106.jpg',locator:'読むときのポイント・印刷指示只畫出一條待劃線的示意，未印「線」答案'}],review:{by:'Codex：檢查課本與解答本106–110頁',date:'2026-10-11',method:'課本指示與空格已確認；解答本未提供此項「線」填字答案，保留待核對，不冒稱官方答案。'}};
point.grammarNote='「線」是既有教學補充，課本只印畫線示意、解答本未列該填字答案。缺件：教師對此教學補充的確認，或印有該答案的來源。';
point.examplesTitle='教學補充（來源待核對）';
// Fix an earlier transcription markup error; printed example is not an answer.
const example=find('u1-3');
example.jpRuby='<ruby>課長<rt>かちょう</rt></ruby>の<ruby>話<rt>はなし</rt></ruby>・<ruby>今年<rt>ことし</rt></ruby>の<ruby>忘年会<rt>ぼうねんかい</rt></ruby>は<ruby>中止<rt>ちゅうし</rt></ruby>になりました。<br>→ <ruby>課長<rt>かちょう</rt></ruby>の<ruby>話<rt>はなし</rt></ruby>では、<ruby>今年<rt>ことし</rt></ruby>の<ruby>忘年会<rt>ぼうねんかい</rt></ruby>は<ruby>中止<rt>ちゅうし</rt></ruby>になったということです。';
example.jpPlain=strip(example.jpRuby);
find('p109-cd16-q2').jpRuby=find('p109-cd16-q2').jpRuby.replace('<ruby>嫌<rt>きら</rt></ruby>','<ruby>嫌<rt>いや</rt></ruby>');
assert.deepEqual(cards.map(i=>i.id),oldIds);
assert.equal(cards.filter(i=>i.answerEvidence?.status==='pending').length,1);
console.log(JSON.stringify({audited:62,providedVerified:61,unresolved:[{id:point.id,page:'106',reason:point.grammarNote}],changed,mode:process.argv.includes('--write')?'write':'preview'},null,2));
if(process.argv.includes('--write'))fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');

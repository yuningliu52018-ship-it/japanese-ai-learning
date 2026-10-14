// Data-only migration: printed vocabulary kana on textbook 86–87, not handwriting.
// --check validates the applied fixtures; --write applies them. No lesson runtime.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const path='lessons/k4-伝言お願いできますか/data.json';
const data=JSON.parse(fs.readFileSync(path,'utf8'));
const rows=[
 ['01','{検査|けんさ}する','けんさする'],
 ['02','{明日|あす}','あす'],
 ['03','{能力|のうりょく}','のうりょく'],
 ['07','{目|め}が{覚|さ}める','めがさめる'],
 ['08','{朝礼|ちょうれい}','ちょうれい'],
 ['09','{校歌|こうか}','こうか'],
 ['10','{敬語|けいご}','けいご'],
 ['11','{感想文|かんそうぶん}','かんそうぶん'],
 ['12','{運動場|うんどうじょう}','うんどうじょう'],
 ['14','{美|うつく}しい','うつくしい'],
 ['15','{世紀|せいき}','せいき'],
 ['16','{平和|へいわ}[な]','へいわな'],
 ['17','{人々|ひとびと}','ひとびと'],
 ['18','{願|ねが}う','ねがう'],
 ['19','{文|ぶん}','ぶん'],
 ['20','{書|か}き{換|か}える','かきかえる'],
 ['21','{合|あ}わせる','あわせる'],
 ['23','{若者|わかもの}','わかもの'],
 ['24','～{湖|こ}','こ'],
 ['25','{深|ふか}い','ふかい'],
 ['27','{苦|くる}しい（{生活|せいかつ}が～）','くるしい'],
 ['28','{性格|せいかく}','せいかく'],
 ['29','{人気者|にんきもの}','にんきもの'],
 ['30','{多|おお}く','おおく'],
 ['31','{不安|ふあん}[な]','ふあんな'],
 ['32','{出|で}る（{製品|せいひん}が～）','でる'],
 ['33','{雷|かみなり}','かみなり'],
 ['34','うち（＊うちの{子|こ}ども）','うち'],
 ['35','{残念|ざんねん}[な]','ざんねんな'],
 ['36','{認|みと}める','みとめる'],
 ['37','{現実|げんじつ}','げんじつ'],
 ['38','{愛|あい}する','あいする'],
 ['39','{首都|しゅと}','しゅと'],
 ['40','{伝言|でんごん}','でんごん'],
 ['41','{留守番電話|るすばんでんわ}','るすばんでんわ'],
 ['43','{受|う}ける（{伝言|でんごん}を～）','うける'],
 ['44','{入|い}れる（メッセージを～）','いれる'],
 ['45','{差|さ}し{上|あ}げる（{電話|でんわ}を～）','さしあげる'],
 ['47','{出|で}る（{電話|でんわ}に～）','でる'],
 ['48','{急|きゅう}[な]','きゅうな'],
 ['49','{入|はい}る（{仕事|しごと}が～）','はいる'],
 ['50','{取|と}り{消|け}す','とりけす'],
 ['51','{来客中|らいきゃくちゅう}','らいきゃくちゅう'],
 ['52','{食|しょく}パン','しょくパン'],
 ['53','{売|う}り{切|き}れ','うりきれ'],
 ['55','{案内状|あんないじょう}','あんないじょう'],
 ['56','～{状|じょう}（{招待|しょうたい}～）','じょう'],
 ['57','{遠|とお}い（{電話|でんわ}が～）','とおい'],
 ['58','～{嫌|ぎら}い','ぎらい'],
 ['59','{時代|じだい}','じだい'],
 ['60','{順|じゅん}に','じゅんに'],
 ['61','{失礼|しつれい}[な]','しつれいな'],
 ['62','{勧|すす}める','すすめる'],
 ['63','{腹|はら}を{立|た}てる','はらをたてる'],
 ['64','{味|あじ}わう','あじわう'],
 ['67','{大嫌|だいきら}い','だいきらい'],
 ['68','{大|だい}～（～{好|す}き／～{嫌|きら}い）','だい'],
 ['70','{全員|ぜんいん}','ぜんいん'],
 ['71','{数日|すうじつ}','すうじつ'],
 ['72','{親|しん}せき','しんせき'],
 ['73','{接続|せつぞく}する','せつぞくする'],
 ['74','{申|もう}し{出|で}る','もうしでる'],
 ['75','{結局|けっきょく}','けっきょく'],
 ['76','{早速|さっそく}','さっそく'],
 ['78','{取|と}り{付|つ}ける','とりつける'],
 ['79','{出席者|しゅっせきしゃ}','しゅっせきしゃ'],
 ['80','{料金|りょうきん}','りょうきん'],
];
assert.equal(rows.length,67);
const strip=r=>r.replace(/<rt>[^<]*<\/rt>/g,'').replace(/<[^>]*>/g,'');
const review={by:'Codex：逐項對照使用者提供的課本印刷假名',date:'2026-10-14',method:'比較86–87頁單語左欄假名及日文表記；不採鉛筆／羅馬字筆記。只核對單語與印刷搭配提示，不包含既有補充例句、音高或試聽。'};
const before=structuredClone(data);
for(const [id,notation,spoken] of rows){
 const v=data.vocabulary.find(v=>v.id===id);assert(v,id);
 const ruby=notation.replace(/\{([^|{}]+)\|([^{}]+)\}/g,'<ruby>$1<rt>$2</rt></ruby>');
 assert.equal(strip(ruby),v.japanese,`${id}: preserve textbook spelling`);
 assert(!/[\u3400-\u9fff]/.test(spoken),`${id}: speech must use the printed kana`);
 const source={kind:'textbook',page:v.classroom.textbookPage,href:`pages/${v.classroom.textbookPage}.jpg`,locator:`単語 ${Number(id)}・印刷假名欄（非手寫）`};
 assert(fs.existsSync(`lessons/k4-伝言お願いできますか/${source.href}`));
 if(process.argv.includes('--check')){
  assert.equal(v.jpRuby,ruby,id);assert.equal(v.jpPlain,v.japanese,id);assert.equal(v.speechReading,spoken,id);
  assert.equal(v.classroom.readingReview.status,'photo-verified',id);
 }else{
  v.jpRuby=ruby;v.jpPlain=v.japanese;v.speechReading=spoken;
  v.classroom.textSource=source;
  v.classroom.textReview={status:'photo-verified',review,note:'僅單語表記；下方既有補充例句非本頁印刷教材，未由此紀錄驗證。'};
  v.classroom.readingReview={status:'photo-verified',sources:[source],review,note:'單語依印刷假名核對；播放單語本體（な形容詞含な），不朗讀括號搭配提示、波浪線或文法括號。未核對音高、補充例句或實際合成語音。'};
 }
}
const section=[...data.sections,...data.supplementalSections].find(s=>s.id==='page102-reference-dialogue');
const item=section.items.find(i=>i.id==='business-7');
const sourceRuby='<ruby>私<rt>わたし</rt></ruby>、あさっての<ruby>金曜日<rt>きんようび</rt></ruby>、<ruby>部長<rt>ぶちょう</rt></ruby>にお<ruby>会<rt>あ</rt></ruby>いすることになっていましたが、<ruby>都合<rt>つごう</rt></ruby>で<ruby>急<rt>きゅう</rt></ruby>に<ruby>1週間<rt>いっしゅうかん</rt></ruby>ほど<ruby>帰国<rt>きこく</rt></ruby>することになりまして……。';
if(process.argv.includes('--check')){
 assert.equal(item.jpRuby,sourceRuby);assert.equal(item.jpPlain,strip(sourceRuby));
 assert.equal(item.classroom.textSource.page,'98');
 assert.equal(item.classroom.readingReview.status,'partial');
}else{
 section.notice='102頁只有四格圖片，以下保留既有CD14參考會話，文字參照98頁印刷對話；不是印刷在102頁的句子，也未完成CD14逐段聽核。核對狀態以各卡為準。';
 for(const i of section.items){
  i.classroom.textSource={kind:'textbook',page:'98',href:'pages/98.jpg',locator:`会話1・102頁圖片會話參考（${i.id}）；部分用語整理，未核對者不宣稱逐字相符`};
 }
 item.jpRuby=sourceRuby;item.jpPlain=strip(sourceRuby);
 item.classroom.textSource={kind:'textbook',page:'98',href:'pages/98.jpg',locator:'会話1・シュミット：私、あさっての金曜日…帰国することになりまして……。'};
 item.classroom.textReview={status:'photo-verified',review:{by:'Codex：對照98頁印刷對話',date:'2026-10-14',method:'逐字核對 business-7 與98頁同句，統一句尾省略號，保留102頁參考會話而非本頁原句的區分。'}};
 item.classroom.readingReview={status:'partial',note:'私依98頁印刷注音修正為わたし；1週間合併為同一ruby，避免「1＋いっしゅうかん」的重複注音。缺件：完整數字讀法之教師或原音確認；未完成CD14逐段聽核與試聽。'};
}
assert.deepEqual(data.vocabulary.map(v=>v.id),before.vocabulary.map(v=>v.id));
assert.deepEqual(data.vocabulary.map(v=>v.examples),before.vocabulary.map(v=>v.examples));
assert.deepEqual(data.pagePresentation,before.pagePresentation);
assert.deepEqual(data.sections.map(s=>s.items.map(i=>i.answerEvidence)),before.sections.map(s=>s.items.map(i=>i.answerEvidence)));
console.log(JSON.stringify({vocabularyReadings:rows.length,pages:['86','87'],displaySpeechConsistent:strip(item.jpRuby)===item.jpPlain,unconfirmed:['単語音高と合成音声の試聴','既有補充例句讀音／教材來源','102頁CD14逐段聽核、完整數字讀音'],mode:process.argv.includes('--check')?'check':process.argv.includes('--write')?'write':'preview'},null,2));
if(process.argv.includes('--write'))fs.writeFileSync(path,JSON.stringify(data,null,2)+'\n');

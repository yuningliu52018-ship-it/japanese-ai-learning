// Source-backed transcription from user textbook photo and existing answers-113.jpg.
import fs from 'node:fs';
const dir=fs.readdirSync('lessons').find(n=>n.startsWith('k5-'));
const file=`lessons/${dir}/data.json`, data=JSON.parse(fs.readFileSync(file));
const section=data.supplementalSections.find(s=>s.id==='p131-reading-questions');
const ruby=(s)=>s.replace(/([^\s<>「」『』、。]+)\[([^\]]+)\]/g,'<ruby>$1<rt>$2</rt></ruby>');
const plain=s=>s.replace(/<rt>.*?<\/rt>/g,'').replace(/<[^>]*>/g,'');
const originals=[
 'アメリカ 人[じん] がかいた 世界地図[せかいちず] にオーストラリアがなかったので、オーストラリア 人[じん] が「地図[ちず] Ａ」を 作[つく] った。',
 'アメリカ 人留学生[じんりゅうがくせい] は 世界地図[せかいちず] にオーストラリアをわざとかかなかった。',
 '地図[ちず] に 経度[けいど] と 緯度[いど] が 使用[しよう] されるようになって、北[きた] を 上[うえ] にして 地図[ちず] をかくのが 普通[ふつう] になった。',
 '昔[むかし] の 地図[ちず] には 北[きた] が 上[うえ] のものも 南[みなみ] が 上[うえ] のものもあった。',
 '「地図[ちず] Ｂ」は 世界中[せかいじゅう] の 人[ひと] に 平等[びょうどう] であるように 作[つく] られた。',
 '人[ひと] は、物[もの] を 観察[かんさつ] するとき、普通[ふつう] 、物[もの] のどの 部分[ぶぶん] をいちばんよく 見[み] ますか。',
 'どうして「位置[いち] の 平等[びょうどう] 」は 難[むずか] しいのですか。正[ただ] しいものを 選[えら] んでください。'
].map(s=>ruby(s).replace(/ /g,''));
const review={by:'Codex：對照使用者提供課本131頁及解答本113頁照片',date:'2026-10-07',method:'逐題核對印刷原文、可見漢字注音與解答本4.答えましょう；不將手寫圈選當作官方來源'};
section.items=section.items.filter(i=>!['p131-heading','p131-instruction'].includes(i.id));
section.items.forEach((i,n)=>{
 i.chinese=n===4?'「地圖B」被製作成讓世界各地的人平等。':i.chinese||plain(i.question);
 i.topic=n<5?`1）${['①','②','③','④','⑤'][n]}`:`${n-3}）`;
 i.jpRuby=originals[n];i.jpPlain=plain(i.jpRuby);i.question=i.jpRuby;
 i.classroom={...i.classroom,kind:'question',questionNumber:i.topic,textbookPage:'131',priorityReviewed:true,textSource:{kind:'textbook',page:'131',href:'pages/131.jpg',locator:`4.答えましょう ${i.topic}`},textReview:{status:'photo-verified',review},readingReview:{status:'photo-verified',review,note:'核對照片可見漢字注音；中文為教學翻譯。'}};
 i.answerEvidence={status:'provided-verified',sources:[{kind:'answer-book',page:'113',href:'pages/answers-113.jpg',locator:`読む・書く 4.答えましょう ${i.topic}`}],review};
});
const free=section.items[5];delete free.options;delete free.correct;
free.answerText=ruby('人[ひと] は 観察[かんさつ] しようとする 面[めん] の 中央[ちゅうおう] より 少[すこ] し 上[うえ] の 方[ほう] を 見[み] ます。').replace(/ /g,'');free.answerPlain=plain(free.answerText);
free.explanation='中文：人會看觀察面的中央稍微偏上方。';
const choice=section.items[6];choice.options=[
 ruby('東西[とうざい] を 上下[じょうげ] にした 地図[ちず] は 見[み] にくいから'),
 ruby('南北[なんぼく] を 左右[さゆう] にした 地図[ちず] は 見[み] にくいから'),
 ruby('どんな 地図[ちず] を 作[つく] っても、上下左右[じょうげさゆう] があるから')
].map(s=>s.replace(/ /g,''));choice.optionLabels=['①','②','③'];choice.answerText=choice.options[2];choice.answerPlain=plain(choice.answerText);
section.items.slice(0,5).forEach((i,n)=>{i.answerText=['○','×','○','○','×'][n];i.answerPlain=i.answerText==='○'?'まる':'ばつ';delete i.options;delete i.correct;i.explanation='解答本113頁所列答案；不是以照片手寫答案推定。';});
const source={kind:'textbook',page:'131',href:'pages/131.jpg',locator:'4.答えましょう 指示'};
section.items.unshift(...[
 {id:'p131-heading',topic:'4. 答えましょう',jpRuby:ruby('答[こた] えましょう。').replace(/ /g,''),chinese:'來回答問題吧。'},
 {id:'p131-instruction',topic:'1）作答指示',jpRuby:ruby('本文[ほんぶん] の 内容[ないよう] と 合[あ] っているものには○、違[ちが] っているものには×をつけてください。').replace(/ /g,''),chinese:'與本文內容相符的標○，不相符的標×。'}
].map(i=>({...i,jpPlain:plain(i.jpRuby),classroom:{kind:'text',textbookPage:'131',priorityReviewed:true,textSource:source,textReview:{status:'photo-verified',review},readingReview:{status:'photo-verified',review}}})));
section.pageKey='131';section.pageOrder=131;section.sourcePhoto='pages/131.jpg';
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');

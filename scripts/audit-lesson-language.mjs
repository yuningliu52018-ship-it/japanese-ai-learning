// Apply only manually identified language boundaries; never translate or infer answers.
import fs from 'node:fs';
import path from 'node:path';
import '../js/lesson-classroom-core.js';
const core=globalThis.LessonClassroomCore;
const catalog=JSON.parse(fs.readFileSync('data/lessons.json'));
for(const course of catalog){
 const file=path.join(path.dirname(course.href),'data.json'),data=JSON.parse(fs.readFileSync(file));
 if(data.id!=='k5')continue;
 const find=id=>data.supplementalSections.find(s=>s.id===id);
 for(const i of find('p116-ii-advice-note').items)for(const e of i.examples){e.fromLang='ja';e.toLang='zh';}
 for(const e of find('p115-so-note').items[1].examples){e.fromLang='zh';e.toLang='ja';}
 for(const e of find('topic-demonstratives-note').items[2].examples){e.fromLang='zh';e.toLang='ja';}
 const mixed=find('p117-ta-tokoro-note').items[2].examples[0];mixed.fromLang='zh';mixed.toLang='zh';
 for(const i of find('p133-listening-quiz').items.filter(i=>['item-003','item-004'].includes(i.id))){
  i.questionLanguage='zh';
  i.classroom.textReview.note='中文定位說明，不是課本日文原句；不送入日文朗讀。缺課本133頁原題照片，未翻譯補造。';
 }
 for(const i of find('p134-tokoro-quiz').items.slice(0,3)){
  if(!i.jpRuby){const boundary=i.question.indexOf('此處的');if(boundary<0)throw new Error('Missing manually reviewed language boundary');i.jpRuby=i.question.slice(0,boundary);i.jpPlain=core.text(i.jpRuby).replace(/ /g,'');i.chinese=i.question.slice(boundary);i.question=i.jpRuby;}
  i.optionsLanguage='zh';i.topic=i.id.replace('item-','')+'）';
  i.classroom.textReview.note='只拆分既有日文例句與中文教學提問／選項；未用翻譯補造教材，原文來源仍待核對。';
 }
 // Existing source is insufficient to pair the five blanks with full printed prompts.
 for(const s of data.supplementalSections.filter(s=>['p122-expression-matching','p124-listening-blanks'].includes(s.id)))for(const i of s.items){
  if(!i.label.startsWith('原題未配對'))i.label='原題未配對｜'+i.label;
  i.classroom.textReview.note=s.id==='p122-expression-matching'?'已找122頁道順1–8文字，但缺a–h原圖與題目照片，不能把八句文字任意當作原配對題。':'已找124頁CD18對話，但只保留節選、無原題①–⑤空格；③–⑤完整原題回應未收錄，不能僅按句意配對。';
 }
 fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
}
// Audit every catalog course; record candidates, never silently create answerRefs.
for(const course of catalog){
 const file=path.join(path.dirname(course.href),'data.json'),data=JSON.parse(fs.readFileSync(file));
 const records=core.records(data),owned=new Set();
 for(const r of records){for(const ref of r.item.classroom?.answerRefs||[])owned.add(ref.sectionId+'/'+ref.itemId);for(const id of r.item.classroom?.answerIds||[])owned.add(r.sectionId+'/'+id);}
 for(const s of core.sections(data))for(const g of s.readingGroups||[])for(const id of g.itemIds)owned.add(s.sectionId+'/'+id);
 let changed=false;
 for(const r of records.filter(r=>r.section.type==='answer_key'&&!owned.has(r.sectionId+'/'+r.itemId))){
  const actual=data.supplementalSections.find(s=>s.id===r.section.id)?.items.find(i=>i.id===r.itemId);if(!actual)continue;
  if(!actual.label.startsWith('原題未配對'))actual.label='原題未配對｜'+actual.label;
  const note='原題未配對：已搜尋同課本頁既有題目與對話，缺可靠題號／空格對照，不依句意自動配對。';
  if(!actual.classroom.textReview?.note?.includes(note))actual.classroom.textReview={...actual.classroom.textReview,note:(actual.classroom.textReview?.note||'')+' '+note};
  changed=true;
 }
 if(changed)fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
}

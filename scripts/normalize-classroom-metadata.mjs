// Mechanical, idempotent migration; never changes text, answers or evidence.
import fs from 'node:fs';
import path from 'node:path';
import '../js/lesson-classroom-core.js';
for(const course of JSON.parse(fs.readFileSync('data/lessons.json'))){
  const file=path.resolve(path.dirname(course.href),'data.json');
  const data=JSON.parse(fs.readFileSync(file));let changed=0;
  const sections=globalThis.LessonClassroomCore.sections(data);
  for(const source of [...(data.supplementalSections||[]),...(data.hideLegacySections?[]:data.sections||[])])if(!source.id){
    const section=sections.find(s=>s.items===source.items);
    if(!section)throw new Error('Section is not assigned to a chapter');
    source.id=section.sectionId.slice(String(section.chapter||data.sectionChapter).length+1);changed++;
  }
  for(const [index,item] of (data.vocabulary||[]).entries())if(typeof item==='object'&&item&&!item.id){item.id=String(index+1).padStart(2,'0');changed++;}
  for(const record of globalThis.LessonClassroomCore.records(data)){
    const item=record.sectionId==='vocabulary-sentence-cards'?data.vocabulary.find(i=>i.id===record.itemId):record.item;
    if(typeof item!=='object'||!item)throw new Error('Convert shorthand vocabulary to objects before migration: '+record.anchor);
    if(!item.classroom){
      item.classroom={kind:record.section.type==='answer_key'?'answer':'text',textbookPage:record.page,priorityReviewed:false,textReview:{status:'pending'},readingReview:{status:'partial'}};
      changed++;
    }
    if(record.section.type!=='answer_key'&&item.classroom.kind==='answer'){item.classroom.kind='text';changed++;}
    if(item.examples?.length&&/答案|解答/.test(item.examplesTitle||'')&&item.classroom.examplesRole!=='answer'){item.classroom.examplesRole='answer';changed++;}
  }
  if(changed)fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
  console.log(`${course.id}: ${changed} legacy items given explicit page/type and pending review metadata`);
}

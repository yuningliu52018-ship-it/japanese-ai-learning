// Read-only inventory using the same catalog and warning predicates as release checks.
import fs from 'node:fs';
import path from 'node:path';
import '../js/lesson-classroom-core.js';
const core=globalThis.LessonClassroomCore;
const taught=new Set(['140','141','149','150','151','152','153']);
const result=[];
for(const course of JSON.parse(fs.readFileSync('data/lessons.json','utf8'))){
 const data=JSON.parse(fs.readFileSync(path.join(path.dirname(course.href),'data.json'),'utf8'));
 const records=core.records(data),owned=new Set();
 for(const r of records){
  for(const ref of r.item.classroom?.answerRefs||[])owned.add(ref.sectionId+'/'+ref.itemId);
  for(const id of r.item.classroom?.answerIds||[])owned.add(r.sectionId+'/'+id);
 }
 for(const section of core.sections(data))for(const g of section.readingGroups||[])for(const id of g.itemIds)owned.add(section.sectionId+'/'+id);
 for(const r of records){
  const flags=[];
  if(r.section.type==='answer_key'&&!owned.has(r.sectionId+'/'+r.itemId))flags.push('unpaired');
  let pending=0;
  function visit(v){if(!v||typeof v!=='object')return;if(v.answerEvidence?.status==='pending')pending++;for(const [k,c] of Object.entries(v))if(k!=='answerEvidence'&&c&&typeof c==='object')Array.isArray(c)?c.forEach(visit):visit(c);}
  visit(r.item);
  if(pending)flags.push('pending');
  const ruby=r.item.jpRuby||r.item.answerRuby;
  if(ruby&&r.item.jpPlain&&core.text(ruby).replace(/\s/g,'')!==core.text(r.item.jpPlain).replace(/\s/g,''))flags.push('different');
  const readingPartial=r.item.classroom?.priorityReviewed&&r.item.classroom?.readingReview?.status==='partial';
  if(flags.length||readingPartial)result.push({course:data.id,page:r.page,id:r.sectionId+'/'+r.itemId,anchor:r.anchor,title:r.title,scope:data.id==='k6'&&taught.has(r.page)?'taught':'other',flags,pending,readingPartial:!!readingPartial,readingNote:r.item.classroom?.readingReview?.note,textReview:r.item.classroom?.textReview,answerStatus:r.item.answerEvidence?.status});
 }
}
console.log(JSON.stringify(result,null,2));

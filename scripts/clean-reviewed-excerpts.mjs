// One-time, evidence-reviewed cleanup. Never run in the browser or generate answers.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import '../js/lesson-classroom-core.js';
const core = globalThis.LessonClassroomCore;
const plan = [
  {page:140,id:'item-001',replacement:'item-007'},
  {page:141,id:'item-001',replacement:'item-004'},
  {page:152,id:'item-002',replacement:'item-007'},
  {page:152,id:'item-001',reason:'152.jpeg shows 出張予定１週間延期, not 日程１週間延長; manually inspected 2026-10-07.'}
];
for (const course of JSON.parse(fs.readFileSync('data/lessons.json'))) {
  const file=path.join(path.dirname(course.href),'data.json');
  const data=JSON.parse(fs.readFileSync(file));
  const before=core.records(data);
  const protectedItems=before.filter(r=>r.item.classroom?.kind!=='supplement').map(r=>[r.anchor,JSON.stringify(r.item)]);
  let removed=0;
  for(const entry of course.id==='k6'?plan:[]) {
    const section=data.supplementalSections.find(s=>s.pageOrder===entry.page&&s.type==='sentence_cards');
    const item=section.items.find(i=>i.id===entry.id);
    if(!item)continue;
    assert.equal(item.classroom.kind,'supplement');
    if(entry.replacement) {
      const full=section.items.find(i=>i.id===entry.replacement);
      assert.equal(full.classroom.textReview.status,'photo-verified');
      assert(full.jpPlain.includes(item.jpPlain),'excerpt must exist in retained complete original');
    } else assert(item.classroom.textReview.note.includes('未見於該頁照片'));
    section.items=section.items.filter(i=>i!==item);removed++;
    console.log(`${course.id} ${entry.page}/${entry.id}: deleted; ${entry.replacement?'full original '+entry.replacement:entry.reason}`);
  }
  if(removed) {
    for(const section of data.supplementalSections) {
      if(section.readingGroups) section.readingGroups=section.readingGroups.filter(g=>g.itemIds.every(id=>section.items.some(i=>i.id===id)));
      if(section.notice) section.notice=section.notice.replace('舊補充另標示，','');
    }
    const after=new Map(core.records(data).map(r=>[r.anchor,JSON.stringify(r.item)]));
    for(const [anchor,item] of protectedItems)assert.equal(after.get(anchor),item,'retain every non-supplement item, including questions, readings, audio and answers');
    fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
  }
  console.log(`${course.id}: retained all ${protectedItems.length} non-supplement records unchanged`);
}

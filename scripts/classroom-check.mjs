import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import '../js/lesson-classroom-core.js';
import { validateClassroom } from './classroom-validation.mjs';
const core = globalThis.LessonClassroomCore;
const catalog = JSON.parse(fs.readFileSync('data/lessons.json'));
const rendererSource=fs.readFileSync('js/lesson.js','utf8');
const speechContract=vm.createContext({plainText:core.text});
vm.runInContext(rendererSource.slice(rendererSource.indexOf('function itemSpeechText'),rendererSource.indexOf('function splitJapaneseSentences')),speechContract);
assert.equal(speechContract.itemSpeechText({jpPlain:'電話：０３－３３３－３３３',speechReading:'ゼロ さん の さん さん さん の さん さん さん'}),'ゼロ さん の さん さん さん の さん さん さん','Explicit telephone reading must not change textbook text');
const mixedSpeech=speechContract.sectionSpeechText({type:'grammar_notes',items:[{examples:[{from:'この文法がわかりません。',fromLang:'ja',to:'這個文法我不懂',toLang:'zh'},{from:'前文提到時間',fromLang:'zh',to:'その日',toLang:'ja'}]}]});
assert(mixedSpeech.includes('この文法')&&mixedSpeech.includes('その日')&&!/這個|前文/.test(mixedSpeech),'Chinese explanations must not enter Japanese section speech');
assert.equal(speechContract.sectionSpeechText({type:'quiz_questions',items:[{question:'中文題幹',questionLanguage:'zh',options:['中文選項'],optionsLanguage:'zh'}]}),'','Chinese-only quiz must not create Japanese speech');
assert(catalog.length, 'course catalog must not be empty');
assert.equal(new Set(catalog.map(c=>c.id)).size,catalog.length,'unique catalog IDs');
const listed = fs.readdirSync('lessons',{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>path.resolve('lessons',d.name,'data.json')).filter(fs.existsSync).filter(f=>JSON.parse(fs.readFileSync(f)).catalog?.listed);
assert.deepEqual(new Set(listed),new Set(catalog.map(c=>path.resolve(path.dirname(c.href),'data.json'))),'catalog covers every listed lesson');
for (const course of catalog) {
  const id = course.id;
  const file = path.resolve(path.dirname(course.href), 'data.json');
  const data = JSON.parse(fs.readFileSync(file));
  assert.equal(data.id,id,'catalog/data ID match');
  const html = fs.readFileSync(path.resolve(course.href),'utf8');
  for(const asset of ['js/lesson.js','js/lesson-pages.js','js/lesson-classroom.js','css/lesson-base.css','css/lesson-classroom.css'])assert(html.includes(asset),id+' shared asset '+asset);
  assert(!/lesson-k\d+-(?:base\.css|pages\.js)/.test(html),id+' no per-course layout or pager');
  assert.deepEqual(validateClassroom(file, data).errors, [], id + ' evidence contract');
  const records = core.records(data);
  console.log(`${id}: ${data.pagePresentation.pages.length} textbook pages, ${records.length} stable items checked`);
  assert(records.length > 0);
  assert.equal(new Set(records.map(r => r.anchor)).size, records.length, id + ' unique question links');
  for (const page of data.pagePresentation.pages) assert(core.search(records, { page: page.key }).length, id + ' page ' + page.key);
  if (id === 'k6') {
    for (const page of ['149', '150', '151', '161']) assert(core.search(records, { page }).some(r => r.item.classroom?.textSource));
    assert(core.search(records, { page: '149', cd: 'CD23', keyword: '日本語' }).length);
    assert(core.search(records, { page: '161', cd: '25' }).length);
    for (const page of ['140','141','152','153']) {
      const reviewed = core.search(records,{page});
      assert(reviewed.some(r=>r.item.classroom?.textReview?.status==='photo-verified'));
      const questions = reviewed.filter(r=>r.item.classroom?.kind==='question');
      assert.equal(questions.length,2,'two priority exercise questions on '+page);
      for (const question of questions) {
        assert(question.item.classroom.answerRefs.length);
        for (const ref of question.item.classroom.answerRefs) assert(reviewed.some(r=>r.sectionId===ref.sectionId && r.itemId===ref.itemId && core.status(r.item)==='provided-verified'));
      }
    }
    assert.deepEqual(data.classroomTeaching.completedPages,['140','141','149','150','151','152','153']);
    assert.equal(data.classroomTeaching.nextRange,null);
    const invalid = structuredClone(data); invalid.pagePresentation.pages[0].key = 'answers-116';
    assert(validateClassroom(file, invalid).errors.length, 'reject answer-book pagination');
    const invalidEvidence = structuredClone(data);
    const answer = invalidEvidence.supplementalSections.flatMap(s => s.items || []).find(i => i.answerEvidence?.status === 'provided-verified');
    answer.answerEvidence.sources = [];
    assert(validateClassroom(file, invalidEvidence).errors.length, 'reject verified answer without evidence');
    answer.answerEvidence.status = 'teacher-confirmed';
    answer.answerEvidence.sources = [{kind:'answer-book',page:'117',href:'pages/answers-117.jpg',locator:'test'}];
    assert(validateClassroom(file, invalidEvidence).errors.length, 'reject teacher confirmation without teacher record');
  }
}
assert.equal(core.status({ answerType: 'verified' }), 'pending');
assert.equal(core.status({ answerEvidence: { status: 'provided-verified', sources: [] } }), 'pending');
assert.equal(core.status({ answerType: 'suggested' }), 'suggested');
assert.equal(core.text('<ruby>学校<rt>がっこう</rt></ruby>'), '学校');
const classroomUI = fs.readFileSync('js/lesson-classroom.js','utf8');
assert(!classroomUI.includes('classroom-find'), 'no extra classroom search UI');
assert(!classroomUI.includes('JapaneseLesson.reveal'), 'no automatic answer reveal');
assert(classroomUI.includes('classroom-last-page'), 'last reading page remains available');
for(const file of ['js/lesson-classroom.js','js/lesson-pages.js','js/lesson.js','css/lesson-classroom.css'])assert(!/reading-page-152|reading-pilot|data\.id\s*===\s*'k6'/.test(fs.readFileSync(file,'utf8')),'no permanent lesson/page pilot branch in '+file);
// A future course exercises the same validator without extending a course whitelist.
const template = JSON.parse(fs.readFileSync('templates/lesson-data.json'));
template.catalog.listed=true;
assert.deepEqual(validateClassroom(path.resolve('templates/lesson-data.json'),template).errors,[],'new-course template contract');
const duplicateExcerpt=structuredClone(template);
duplicateExcerpt.supplementalSections[0].items[0].classroom.kind='supplement';
duplicateExcerpt.supplementalSections[0].items[1].classroom.textReview={status:'photo-verified',review:{by:'test',date:'2026-10-07'}};
duplicateExcerpt.supplementalSections[0].items[1].classroom.textSource={kind:'textbook',page:'165',href:'lesson-data.json',locator:'test'};
assert(validateClassroom(path.resolve('templates/lesson-data.json'),duplicateExcerpt).errors.some(e=>e.includes('補充摘句已被本頁核對原文涵蓋')),'future course rejects duplicate excerpts without a course-specific exception');
const broken=structuredClone(template);broken.pagePresentation.pages[0].key='answers-123';
assert(validateClassroom(path.resolve('templates/lesson-data.json'),broken).errors.length,'new-course range guard');
for(const [name,mutate] of [
  ['missing stable ID',d=>{delete d.supplementalSections[0].items[0].id;}],
  ['duplicate stable ID',d=>{d.supplementalSections[0].items[1].id='q1';}],
  ['missing required page metadata',d=>{delete d.supplementalSections[0].items[0].classroom;}],
  ['missing answer mapping',d=>{d.supplementalSections[0].items[0].classroom.answerIds=['missing'];}],
  ['circular response',d=>{d.supplementalSections[0].items[0].classroom.responseIds=['q1'];}],
  ['legacy excerpt block',d=>{d.supplementalSections[0].items[0].topic='舊補充／摘句（非本頁完整原句）';}],
  ['obsolete nested supplement group',d=>{d.supplementalSections[0].readingGroups=[{id:'old',kind:'supplement',itemIds:['q1']}];}],
  ['false verified evidence',d=>{d.supplementalSections[0].items[2].answerEvidence.status='provided-verified';}],
  ['nonexistent source',d=>{d.supplementalSections[0].items[2].answerEvidence.sources=[{kind:'answer-book',page:'123',href:'missing.jpg',locator:'1'}];}]
]){const bad=structuredClone(template);mutate(bad);assert(validateClassroom(path.resolve('templates/lesson-data.json'),bad).errors.length,name);}
console.log('Catalog-discovered classroom contracts, shared assets, textbook pages, stable links and evidence-status guards passed.');

import fs from 'node:fs';
import path from 'node:path';
import '../js/lesson-classroom-core.js';
const core = globalThis.LessonClassroomCore;
export function validateClassroom(file, data) {
  const errors = [], warnings = [];
  if (!data.catalog?.listed) return { errors, warnings };
  const label = path.relative(process.cwd(), file);
  if (data.classroomSpecVersion !== 1) errors.push(`${label}: 缺少 classroomSpecVersion: 1`);
  const pages = data.pagePresentation?.pages || [];
  const range = data.pageRange;
  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isInteger) || range[0] < 1 || range[1] < range[0]) errors.push(`${label}: pageRange 需為有效課本起訖頁 [start, end]`);
  if (Array.isArray(range) && range.length===2 && (pages.length!==range[1]-range[0]+1 || pages.some((p,i)=>String(p.key)!==String(range[0]+i)))) errors.push(`${label}: 翻頁須連續且僅使用課本 ${range.join('–')} 頁`);
  let pending = 0, missingReading = 0, missingChinese = 0, partialPriorityReading = 0;
  function link(href, context) {
    if (typeof href !== 'string' || !href.trim() || /^(?:javascript|data|file):/i.test(href)) { errors.push(`${label}: ${context} 無效來源網址`); return; }
    if (/^https:\/\//.test(href)) { warnings.push(`${label}: ${context} 外部來源需人工確認可存取`); return; }
    let target;
    try { target = path.resolve(path.dirname(file), decodeURIComponent(href.split(/[?#]/)[0])); }
    catch { errors.push(`${label}: ${context} 來源網址編碼無效`); return; }
    if (!target.startsWith(path.resolve(process.cwd()) + path.sep) || !fs.existsSync(target)) errors.push(`${label}: ${context} 來源檔案不存在或超出專案 ${href}`);
  }
  function inspect(value, context) {
    if (!value || typeof value !== 'object') return;
    for (const field of ['sourcePhoto', 'answerSource']) if (value[field]) link(value[field], context);
    if (value.answerType && !value.answerEvidence) errors.push(`${label}: ${context} 答案缺少結構化來源狀態`);
    if (value.answerEvidence) {
      const evidence = value.answerEvidence;
      if (!Object.hasOwn(core.labels, evidence.status)) errors.push(`${label}: ${context} 未知核對狀態`);
      if (evidence.status === 'pending') pending++;
      for (const source of evidence.sources || []) {
        if (!['answer-book', 'textbook', 'teacher-record'].includes(source.kind) || !/^\d+$/.test(source.page || '') || !source.locator) errors.push(`${label}: ${context} 來源需含 kind/page/locator`);
        link(source.href, context);
        const filenamePage = source.href?.match(/answers-(\d+)/)?.[1];
        if (filenamePage && filenamePage !== String(source.page)) errors.push(`${label}: ${context} 解答本頁碼與檔案不符`);
      }
      if (['provided-verified', 'teacher-confirmed'].includes(evidence.status)) {
        if (core.status(value) !== evidence.status || !evidence.review.method) errors.push(`${label}: ${context} 已核對須有來源及 by/date/method 紀錄`);
        if (evidence.status === 'provided-verified' && !evidence.sources?.some(s => s.kind === 'answer-book')) errors.push(`${label}: ${context} 提供解答已核對須對應解答本來源`);
        if (evidence.status === 'teacher-confirmed' && !evidence.sources?.some(s => s.kind === 'teacher-record')) errors.push(`${label}: ${context} 教師確認须有教師紀錄來源`);
      }
    }
    if (value.classroom?.textSource) {
      const source=value.classroom.textSource;
      if(!['textbook','answer-book','teacher-record'].includes(source.kind)||!/^\d+$/.test(source.page||'')||!source.locator)errors.push(`${label}: ${context} 原文來源缺 kind/page/locator`);
      link(source.href, context);
    }
    if (value.src) link(value.src, context + ' 音源');
    Object.entries(value).forEach(([key, child]) => { if (key !== 'answerEvidence' && child && typeof child === 'object') Array.isArray(child) ? child.forEach((v, i) => inspect(v, `${context}.${key}[${i}]`)) : inspect(child, `${context}.${key}`); });
  }
  const records = core.records(data);
  const owned = new Map();
  function claim(answer, owner) {
    if (owned.has(answer.anchor) && owned.get(answer.anchor)!==owner.anchor) errors.push(`${label}: ${answer.itemId} 被不同題目／群組重複使用`);
    owned.set(answer.anchor,owner.anchor);
  }
  for (const section of core.sections(data)) {
    if(!section.id)errors.push(`${label}: ${section.sectionId} 缺明確穩定區塊ID`);
    const ids = new Set();
    for (const item of section.items || []) {
      if (!item.id || ids.has(item.id)) errors.push(`${label}: ${section.sectionId} 缺少或重複穩定題目ID ${item.id || ''}`);
      ids.add(item.id);
      inspect(item, `${section.sectionId}/${item.id}`);
      if (['sentence_cards', 'dialogue_lessons'].includes(section.type)) {
        if (!item.jpRuby && /[\u3400-\u9fff]/.test(core.text(item.japanese || item.jpPlain))) missingReading++;
        if (!item.chinese && !item.zh) missingChinese++;
      }
    }
    if (section.sourcePhoto) link(section.sourcePhoto, section.sectionId);
    const groups=new Set();
    for(const group of section.readingGroups||[]) {
      if(!group.id||groups.has(group.id)||group.kind!=='example'||group.parentGroupId||!group.itemIds?.length)errors.push(`${label}: ${section.sectionId} 無效閱讀分組`);
      groups.add(group.id);
      const grouped=group.itemIds?.map(id=>records.find(r=>r.sectionId===section.sectionId&&r.itemId===id))||[];
      if(grouped.some(r=>!r)||new Set(grouped.filter(Boolean).map(r=>r.page)).size!==1)errors.push(`${label}: 分組 ${group.id} 引用不存在或跨頁卡片`);
      for(const r of grouped.filter(Boolean))claim(r,{anchor:'group-'+section.sectionId+'-'+group.id});
    }
    for (const item of section.items || []) for (const id of item.classroom?.answerIds || []) if (!ids.has(id)) errors.push(`${label}: ${item.id} 指向不存在答案 ${id}`);
  }
  for (const record of records) {
    const c = record.item.classroom;
    if (!c) { errors.push(`${label}: ${record.itemId} 缺 classroom 頁碼／內容類型資料`); continue; }
    if (!['text','question','answer','supplement'].includes(c.kind) || !c.textbookPage) errors.push(`${label}: ${record.itemId} 缺必要／有效 kind/textbookPage`);
    if (c.textbookPage !== record.page) errors.push(`${label}: ${record.itemId} 課本頁碼與翻頁指派不符`);
    if (c.kind === 'question' && !c.questionNumber) errors.push(`${label}: ${record.itemId} 缺課本題號`);
    if (c.priorityReviewed && c.readingReview?.status === 'partial') partialPriorityReading++;
    if (/舊補充|摘句（非本頁完整原句）/.test(record.item.topic || '')) errors.push(`${label}: ${record.itemId} 不得保留舊摘句區塊；核對完整原句後清理資料`);
    if (c.kind === 'supplement') {
      const excerpt=core.text(record.item.jpPlain || record.item.jpRuby || record.item.japanese).normalize('NFKC').replace(/\s/g,'');
      if(excerpt&&records.some(r=>r.page===record.page&&r.anchor!==record.anchor&&r.item.classroom?.kind==='text'&&r.item.classroom?.textReview?.status==='photo-verified'&&core.text(r.item.jpPlain||r.item.jpRuby||r.item.japanese).normalize('NFKC').replace(/\s/g,'').includes(excerpt)))errors.push(`${label}: ${record.itemId} 補充摘句已被本頁核對原文涵蓋，應刪除重複資料`);
    }
    const ruby = record.item.jpRuby || record.item.answerRuby;
    if (c.priorityReviewed === true && (!ruby || !record.item.jpPlain || !record.item.chinese)) errors.push(`${label}: 樣板 ${record.itemId} 缺原文/讀音/中文`);
    if (ruby && record.item.jpPlain && core.text(ruby).replace(/\s/g, '') !== core.text(record.item.jpPlain).replace(/\s/g, '')) {
      const reviewed=c.textReview?.status==='photo-verified'||c.priorityReviewed===true;
      (reviewed?errors:warnings).push(`${label}: ${record.sectionId}/${record.itemId} ruby與播放原文不一致${reviewed?'':'（待核對舊內容，未更改文字）'}`);
    }
    if (c.textReview?.status==='excerpt-verified') errors.push(`${label}: ${record.itemId} 舊摘句核對狀態不再用於完整教材；先核對來源及完整原句`);
    if (c.textReview?.status==='photo-verified' && (!c.textSource || !c.textReview.review?.by || !c.textReview.review?.date)) errors.push(`${label}: ${record.itemId} 原文已核對缺來源或紀錄`);
    const seenRefs=new Set();
    for (const ref of [...(c.answerRefs || []),...(c.answerIds||[]).map(itemId=>({sectionId:record.sectionId,itemId}))]) {
      const key=ref.sectionId+'/'+ref.itemId;
      if(seenRefs.has(key))errors.push(`${label}: ${record.itemId} 重複答案引用 ${key}`);
      seenRefs.add(key);
      const answer = records.find(r => r.sectionId === ref.sectionId && r.itemId === ref.itemId);
      if (!answer || answer.page !== record.page || !answer.item.answerEvidence) errors.push(`${label}: ${record.itemId} 答案引用缺失／跨錯課本頁`);
      else { if(answer.anchor===record.anchor||answer.item.classroom?.answerRefs?.length||answer.item.classroom?.answerIds?.length)errors.push(`${label}: 答案不能引用自己或另一個題答容器`);claim(answer,record); }
    }
    for(const id of c.responseIds||[]) {
      const response=records.find(r=>r.sectionId===record.sectionId&&r.itemId===id);
      if(!response||response.page!==record.page||response.anchor===record.anchor||response.item.classroom?.kind==='question')errors.push(`${label}: ${record.itemId} 課本回應不存在／跨頁／自我或題目循環引用`);
      else claim(response,record);
    }
  }
  const unmapped=records.filter(r=>r.section.type==='answer_key'&&!owned.has(r.anchor));
  if(unmapped.length)warnings.push(`${label}: ${unmapped.length}項獨立答案尚缺原題引用：${unmapped.map(r=>r.page+'/'+r.sectionId+'/'+r.itemId).join(', ')}；保留但不宣稱逐題閱讀已完成`);
  if (pending) warnings.push(`${label}: ${pending}筆答案待逐題复核（不得標示已核對）`);
  if (partialPriorityReading) warnings.push(`${label}: 優先上課範圍 ${partialPriorityReading}項數字／時刻完整讀音待教師確認（不冒充照片注音）`);
  if (missingReading || missingChinese) warnings.push(`${label}: 既有內容缺讀音 ${missingReading}筆、缺中文 ${missingChinese}筆；樣板之外尚待補齊`);
  return { errors, warnings };
}

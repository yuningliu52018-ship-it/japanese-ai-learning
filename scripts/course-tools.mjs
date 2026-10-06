import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const lessonsDir = path.join(root, 'lessons');
const indexPath = path.join(root, 'data', 'lessons.json');

function lessonFiles() {
  return fs.readdirSync(lessonsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(lessonsDir, entry.name, 'data.json'))
    .filter(fs.existsSync)
    .sort((a, b) => a.localeCompare(b, 'zh-Hant'));
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${path.relative(root, file)}：JSON 無法解析（${error.message}）`);
  }
}

function lessonToken(value = '') {
  return String(value)
    .replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, '')
    .replace(/<rp\b[^>]*>[\s\S]*?<\/rp>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function resolvePageKey(section = {}) {
  if (section.pageKey != null && String(section.pageKey).trim()) return String(section.pageKey).trim();
  if (Number.isFinite(section.pageOrder) && section.pageOrder >= 10) return String(Math.trunc(section.pageOrder));
  const match = String(section.title || '').replace(/<[^>]+>/g, '').match(/(?:^|\D)(\d{2,3})(?:[–-]\d{2,3})?頁/);
  return match ? match[1] : null;
}

function normalizedLessonSections(file, data) {
  const includedSections = (data.includes || []).flatMap((include) => {
    if (!include?.path) return [];
    const target = path.resolve(path.dirname(file), include.path);
    if (!fs.existsSync(target)) return [];
    return (readJson(target).sections || []).map((section) => ({ ...section, chapter: include.chapter }));
  });
  const vocabularySection = data.vocabulary?.length && !data.hideVocabularySection ? [{
    id: 'sentence-cards',
    type: 'sentence_cards',
    chapter: 'vocabulary',
    pageOrder: data.vocabularyPageOrder,
    items: data.vocabulary.map((entry, index) => ({
      ...(typeof entry === 'object' && entry ? entry : {}),
      id: String(index + 1).padStart(2, '0')
    }))
  }] : [];
  const legacySections = data.hideLegacySections
    ? []
    : (data.sections || []).map((section) => ({ ...section, chapter: data.sectionChapter }));
  const sourceSections = [
    ...vocabularySection,
    ...includedSections,
    ...(data.supplementalSections || []),
    ...legacySections
  ];
  const sections = [];
  const counts = new Map();
  const usedSectionIds = new Set();

  for (const chapter of data.chapters || []) {
    const chapterSections = sourceSections.filter((section) => section.chapter === chapter.id);
    if (data.sortSectionsByPage) {
      chapterSections.sort((left, right) => {
        const leftPage = Number(resolvePageKey(left)) || Number.MAX_SAFE_INTEGER;
        const rightPage = Number(resolvePageKey(right)) || Number.MAX_SAFE_INTEGER;
        return leftPage - rightPage;
      });
    }
    for (const section of chapterSections) {
      const sectionItems = section.items || [];
      const pageKey = resolvePageKey(section);
      const explicit = section.id ? lessonToken(section.id) : '';
      const base = explicit || `${lessonToken(section.type || 'section')}${pageKey ? `-page-${lessonToken(pageKey)}` : ''}`;
      const countKey = `${chapter.id}-${base}`;
      const count = (counts.get(countKey) || 0) + 1;
      counts.set(countKey, count);
      let sectionId = `${chapter.id}-${base}${count > 1 ? `-${count}` : ''}`;
      let duplicate = 2;
      while (usedSectionIds.has(sectionId)) sectionId = `${chapter.id}-${base}-${duplicate++}`;
      usedSectionIds.add(sectionId);
      sections.push({
        chapterId: chapter.id,
        sectionId,
        itemCount: sectionItems.length,
        itemsWithoutIds: sectionItems.filter((item) => item?.id == null || !String(item.id).trim()).length,
        itemIds: new Set(sectionItems.filter((item) => item?.id != null && String(item.id).trim()).map((item) => String(item.id)))
      });
    }
  }
  return sections;
}

function validatePagePresentation(file, data, chapterIds, errors) {
  if (data.pagePresentation == null) return;
  const label = path.relative(root, file);
  const presentation = data.pagePresentation;
  const prefix = `${label}：pagePresentation`;
  if (!presentation || typeof presentation !== 'object' || Array.isArray(presentation)) {
    errors.push(`${prefix} 必須是物件`);
    return;
  }
  if (!['partial', 'complete'].includes(presentation.status)) {
    errors.push(`${prefix}.status 必須為 partial 或 complete`);
  }
  if (presentation.rememberPage != null && typeof presentation.rememberPage !== 'boolean') {
    errors.push(`${prefix}.rememberPage 必須是布林值`);
  }
  if (!Array.isArray(presentation.pages) || presentation.pages.length === 0) {
    errors.push(`${prefix}.pages 至少需要一頁`);
    return;
  }

  const sectionById = new Map(normalizedLessonSections(file, data).map((section) => [section.sectionId, section]));
  const pageKeys = new Set();
  const assignedWholeSections = new Set();
  const assignedItems = new Set();
  for (const [pageIndex, page] of presentation.pages.entries()) {
    const pagePath = `${prefix}.pages[${pageIndex}]`;
    const pageKey = typeof page?.key === 'string' ? page.key.trim() : '';
    if (!pageKey) errors.push(`${pagePath}.key 必須是非空字串`);
    else if (pageKeys.has(pageKey)) errors.push(`${prefix} 有重複頁碼 key「${pageKey}」`);
    else pageKeys.add(pageKey);
    if (!page?.chapterId || !chapterIds.has(page.chapterId)) {
      errors.push(`${pagePath}.chapterId 指向不存在的章節「${page?.chapterId || ''}」`);
    }
    if (typeof page?.label !== 'string' || !page.label.trim()) errors.push(`${pagePath}.label 不可空白`);
    if (!Array.isArray(page?.assignments) || page.assignments.length === 0) {
      errors.push(`${pagePath}.assignments 至少需要一項`);
      continue;
    }
    const pageSectionIds = new Set();
    for (const [assignmentIndex, assignment] of page.assignments.entries()) {
      const assignmentPath = `${pagePath}.assignments[${assignmentIndex}]`;
      const sectionId = typeof assignment?.sectionId === 'string' ? assignment.sectionId.trim() : '';
      if (!sectionId) {
        errors.push(`${assignmentPath}.sectionId 必須是非空字串`);
        continue;
      }
      if (pageSectionIds.has(sectionId)) errors.push(`${pagePath} 重複指派 section「${sectionId}」`);
      pageSectionIds.add(sectionId);
      const section = sectionById.get(sectionId);
      if (!section) {
        errors.push(`${assignmentPath} 找不到正規化後的 section「${sectionId}」`);
        continue;
      }
      if (page.chapterId && section.chapterId !== page.chapterId) {
        errors.push(`${assignmentPath} 的 section「${sectionId}」不屬於章節「${page.chapterId}」`);
      }
      if (assignment.itemIds == null) {
        if (assignedWholeSections.has(sectionId) || [...assignedItems].some((key) => key.startsWith(`${sectionId}\u0000`))) {
          errors.push(`${assignmentPath} 重複或混合整段／部分指派 section「${sectionId}」`);
        }
        assignedWholeSections.add(sectionId);
        continue;
      }
      if (!Array.isArray(assignment.itemIds) || assignment.itemIds.length === 0) {
        errors.push(`${assignmentPath}.itemIds 必須是非空陣列`);
        continue;
      }
      if (assignedWholeSections.has(sectionId)) {
        errors.push(`${assignmentPath} 不可在整段指派後再指派 itemIds`);
      }
      const localItemIds = new Set();
      for (const rawItemId of assignment.itemIds) {
        const itemId = typeof rawItemId === 'string' ? rawItemId.trim() : '';
        if (!itemId) {
          errors.push(`${assignmentPath}.itemIds 只能包含非空字串`);
          continue;
        }
        if (localItemIds.has(itemId)) errors.push(`${assignmentPath}.itemIds 有重複項目「${itemId}」`);
        localItemIds.add(itemId);
        if (!section.itemIds.has(itemId)) errors.push(`${assignmentPath} 找不到 item「${sectionId}/${itemId}」`);
        const key = `${sectionId}\u0000${itemId}`;
        if (assignedItems.has(key)) errors.push(`${prefix} 重複指派 item「${sectionId}/${itemId}」`);
        assignedItems.add(key);
      }
    }
  }

  if (!Array.isArray(presentation.verifiedPages)) {
    errors.push(`${prefix}.verifiedPages 必須是陣列`);
  } else {
    const verified = new Set();
    for (const rawKey of presentation.verifiedPages) {
      const key = typeof rawKey === 'string' ? rawKey.trim() : '';
      if (!key) errors.push(`${prefix}.verifiedPages 只能包含非空字串`);
      else if (verified.has(key)) errors.push(`${prefix}.verifiedPages 有重複頁碼「${key}」`);
      else verified.add(key);
    }
    for (const key of pageKeys) if (!verified.has(key)) errors.push(`${prefix}.verifiedPages 缺少 pages 中的「${key}」`);
    for (const key of verified) if (!pageKeys.has(key)) errors.push(`${prefix}.verifiedPages 含未定義頁碼「${key}」`);
  }

  if (presentation.pendingRanges != null && !Array.isArray(presentation.pendingRanges)) {
    errors.push(`${prefix}.pendingRanges 必須是陣列`);
    return;
  }
  const pendingKeys = new Set();
  const pendingChapters = new Set();
  for (const [index, range] of (presentation.pendingRanges || []).entries()) {
    const rangePath = `${prefix}.pendingRanges[${index}]`;
    if (!range?.chapterId || !chapterIds.has(range.chapterId)) {
      errors.push(`${rangePath}.chapterId 指向不存在的章節「${range?.chapterId || ''}」`);
    }
    if (typeof range?.pages !== 'string' || !range.pages.trim()) errors.push(`${rangePath}.pages 不可空白`);
    if (range?.chapterId && pendingChapters.has(range.chapterId)) {
      errors.push(`${prefix}.pendingRanges 的章節「${range.chapterId}」只能有一筆；請把範圍合併到同一個 pages 字串`);
    }
    if (range?.chapterId) pendingChapters.add(range.chapterId);
    const key = `${range?.chapterId || ''}\u0000${range?.pages || ''}`;
    if (pendingKeys.has(key)) errors.push(`${prefix}.pendingRanges 有重複範圍「${range?.pages || ''}」`);
    pendingKeys.add(key);
  }

  if (presentation.status === 'complete') {
    if ((presentation.pendingRanges || []).length) {
      errors.push(`${prefix}.status 為 complete 時不可保留 pendingRanges`);
    }
    for (const section of sectionById.values()) {
      if (assignedWholeSections.has(section.sectionId)) continue;
      if (section.itemCount === 0) {
        errors.push(`${prefix} 完整課程尚未指派 section「${section.sectionId}」`);
        continue;
      }
      if (section.itemsWithoutIds) {
        errors.push(`${prefix} 完整課程的 section「${section.sectionId}」有 ${section.itemsWithoutIds} 個項目缺少穩定 id`);
      }
      for (const itemId of section.itemIds) {
        if (!assignedItems.has(`${section.sectionId}\u0000${itemId}`)) {
          errors.push(`${prefix} 完整課程尚未指派 item「${section.sectionId}/${itemId}」`);
        }
      }
    }
  }
}

function validateLesson(file, data) {
  const label = path.relative(root, file);
  const errors = [];
  const warnings = [];
  const requireText = (key) => {
    if (typeof data[key] !== 'string' || !data[key].trim()) errors.push(`${label}：缺少 ${key}`);
  };

  if (data.schemaVersion !== 1) errors.push(`${label}：schemaVersion 必須為 1`);
  requireText('title');
  requireText('description');
  if (data.catalog?.listed && (typeof data.id !== 'string' || !data.id.trim())) {
    errors.push(`${label}：公開課程缺少穩定 id`);
  }
  if (data.catalog?.listed && data.pagePresentation == null) {
    errors.push(`${label}：公開課程必須提供 pagePresentation 固定逐頁規格`);
  }
  if (!Array.isArray(data.sections) && !Array.isArray(data.vocabulary)) {
    errors.push(`${label}：至少需要 sections 或 vocabulary`);
  }

  const chapterIds = new Set();
  for (const [index, chapter] of (data.chapters || []).entries()) {
    if (!chapter?.id || !chapter?.title) errors.push(`${label}：chapters[${index}] 缺少 id 或 title`);
    if (chapterIds.has(chapter.id)) errors.push(`${label}：重複的 chapter id「${chapter.id}」`);
    chapterIds.add(chapter.id);
  }

  for (const [index, include] of (data.includes || []).entries()) {
    if (!include?.path) {
      errors.push(`${label}：includes[${index}] 缺少 path`);
      continue;
    }
    const target = path.resolve(path.dirname(file), include.path);
    if (!fs.existsSync(target)) errors.push(`${label}：引用檔案不存在「${include.path}」`);
  }

  validatePagePresentation(file, data, chapterIds, errors);

  for (const [index, entry] of (data.vocabulary || []).entries()) {
    if (typeof entry === 'string') {
      if (!entry.includes('|')) errors.push(`${label}：vocabulary[${index}] 簡寫必須是「日文|中文」`);
      warnings.push(`${label}：vocabulary[${index}] 仍是簡寫，建議補上讀音與例句`);
      continue;
    }
    if (!entry?.japanese || !entry?.chinese) errors.push(`${label}：vocabulary[${index}] 缺少 japanese 或 chinese`);
    if (!entry?.plainText) warnings.push(`${label}：${entry?.japanese || `vocabulary[${index}]`} 缺少 plainText 讀音`);
    if (!Array.isArray(entry?.examples) || entry.examples.length === 0) {
      if (!data.vocabularyExamplesOptional) warnings.push(`${label}：${entry?.japanese || `vocabulary[${index}]`} 缺少例句`);
    } else {
      entry.examples.forEach((example, exampleIndex) => {
        if (!(example?.plain || example?.japanese || example?.ruby) || !example?.chinese) {
          errors.push(`${label}：${entry.japanese} 的 examples[${exampleIndex}] 缺少日文或中文`);
        }
      });
    }
  }

  const allowedTypes = new Set([
    'sentence_cards', 'picture_lessons', 'dialogue_lessons', 'grammar_notes',
    'quiz_questions', 'answer_key', 'long_reading', 'video_resource', 'audio_tracks', 'scenario_practice'
  ]);
  for (const [index, section] of [...(data.sections || []), ...(data.supplementalSections || [])].entries()) {
    if (!section?.type) errors.push(`${label}：section[${index}] 缺少 type`);
    else if (!allowedTypes.has(section.type)) warnings.push(`${label}：section[${index}] 使用未知 type「${section.type}」`);
    if (section?.chapter && chapterIds.size && !chapterIds.has(section.chapter)) {
      errors.push(`${label}：section[${index}] 指向不存在的 chapter「${section.chapter}」`);
    }
  }
  return { errors, warnings };
}

function validateAll() {
  const errors = [];
  const warnings = [];
  for (const file of lessonFiles()) {
    try {
      const result = validateLesson(file, readJson(file));
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    } catch (error) {
      errors.push(error.message);
    }
  }
  return { errors, warnings };
}

function buildIndex({ write = true } = {}) {
  const lessons = lessonFiles()
    .map((file) => ({ file, data: readJson(file) }))
    .filter(({ data }) => data.catalog?.listed)
    .sort((a, b) => (a.data.catalog.order ?? 999) - (b.data.catalog.order ?? 999))
    .map(({ file, data }) => ({
      id: data.id,
      title: data.title,
      description: data.catalog.description || data.description,
      href: `${path.relative(root, path.dirname(file)).replaceAll('\\', '/')}/index.html`
    }));
  const output = `${JSON.stringify(lessons, null, 2)}\n`;
  if (write) fs.writeFileSync(indexPath, output, 'utf8');
  return { lessons, output, current: fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '' };
}

function report(result) {
  result.warnings.forEach((message) => console.warn(`WARN  ${message}`));
  result.errors.forEach((message) => console.error(`ERROR ${message}`));
  console.log(`\n${lessonFiles().length} 份課程資料；${result.errors.length} 個錯誤；${result.warnings.length} 個提醒。`);
  if (result.errors.length) process.exitCode = 1;
}

const command = process.argv[2] || 'check';
if (command === 'validate') {
  report(validateAll());
} else if (command === 'index') {
  const built = buildIndex();
  console.log(`已更新 data/lessons.json（${built.lessons.length} 門公開課程）。`);
} else if (command === 'check') {
  const result = validateAll();
  const built = buildIndex({ write: false });
  const normalizeNewlines = (value) => value.replace(/\r\n/g, '\n');
  if (normalizeNewlines(built.output) !== normalizeNewlines(built.current)) {
    result.errors.push('data/lessons.json 尚未同步，請執行 npm run courses:index');
  }
  report(result);
} else {
  console.error('用法：node scripts/course-tools.mjs [validate|index|check]');
  process.exitCode = 1;
}

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

  for (const [index, entry] of (data.vocabulary || []).entries()) {
    if (typeof entry === 'string') {
      if (!entry.includes('|')) errors.push(`${label}：vocabulary[${index}] 簡寫必須是「日文|中文」`);
      warnings.push(`${label}：vocabulary[${index}] 仍是簡寫，建議補上讀音與例句`);
      continue;
    }
    if (!entry?.japanese || !entry?.chinese) errors.push(`${label}：vocabulary[${index}] 缺少 japanese 或 chinese`);
    if (!entry?.plainText) warnings.push(`${label}：${entry?.japanese || `vocabulary[${index}]`} 缺少 plainText 讀音`);
    if (!Array.isArray(entry?.examples) || entry.examples.length === 0) {
      warnings.push(`${label}：${entry?.japanese || `vocabulary[${index}]`} 缺少例句`);
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
    'quiz_questions', 'long_reading', 'video_resource', 'audio_tracks', 'scenario_practice'
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
  if (built.output !== built.current) result.errors.push('data/lessons.json 尚未同步，請執行 npm run courses:index');
  report(result);
} else {
  console.error('用法：node scripts/course-tools.mjs [validate|index|check]');
  process.exitCode = 1;
}

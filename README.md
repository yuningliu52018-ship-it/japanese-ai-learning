# japanese-ai-learning

Interactive Japanese Learning Platform with AI Chat, Speech, Quiz and JLPT Lessons.

## Structure

- `index.html` — home dashboard
- `css/` — shared styles
- `js/` — shared scripts
- `lessons/` — lesson pages and data
- `assets/` — images, audio, icons
- `data/` — site-wide data files
- `.github/workflows/` — GitHub Actions deployment

## Status

This repository is being rebuilt from three standalone HTML lessons into a unified learning site.

## Data-driven course workflow

Each lesson lives in `lessons/<lesson-slug>/data.json`; the shared `js/lesson.js`
renderer turns that data into vocabulary cards, grammar notes, dialogues, audio,
video and quizzes.

1. Copy `data/lesson.template.json` into a new lesson directory.
2. Fill in the lesson metadata, vocabulary and sections.
3. Add an `index.html` that loads the shared lesson renderer.
4. Run `npm run courses:validate` to check the lesson data.
5. Run `npm run courses:index` to rebuild the home-page course list.
6. Run `npm run courses:check` before committing or deploying.

The format reference is `data/lesson.schema.json`. Set `catalog.listed` to
`true` only for complete lessons that should appear on the home page.

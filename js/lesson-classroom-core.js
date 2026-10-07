/* Pure shared contract: usable by the browser and release checks, without a DOM. */
(function (scope) {
  const text = (value = '') => String(value).replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const token = value => text(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'section';
  const labels = { 'provided-verified': '提供解答已核對', 'teacher-confirmed': '教師確認', suggested: '示範答案', pending: '待核對' };
  function status(item) {
    const evidence = item.answerEvidence;
    if (evidence?.status === 'suggested' || item.answerType === 'suggested') return 'suggested';
    if (['provided-verified', 'teacher-confirmed'].includes(evidence?.status) && evidence.sources?.length && evidence.review?.by && evidence.review?.date) return evidence.status;
    return 'pending';
  }
  function sections(data) {
    const all = [...(data.vocabulary?.length && !data.hideVocabularySection ? [{ id: 'sentence-cards', type: 'sentence_cards', chapter: 'vocabulary', items: data.vocabulary.map((i, n) => ({ ...i, id: i.id || String(n + 1).padStart(2, '0') })) }] : []), ...(data.supplementalSections || []), ...(data.hideLegacySections ? [] : data.sections || [])];
    const counts = new Map();
    return (data.chapters || []).flatMap(chapter => {
      const list = all.filter(s => (s.chapter || data.sectionChapter) === chapter.id);
      if (data.sortSectionsByPage) list.sort((a, b) => Number(pageOf(a) || 9999) - Number(pageOf(b) || 9999));
      return list.map(s => {
        const base = `${chapter.id}-${s.id ? token(s.id) : token(s.type) + (pageOf(s) ? '-page-' + pageOf(s) : '')}`;
        const count = (counts.get(base) || 0) + 1; counts.set(base, count);
        return { ...s, sectionId: base + (count > 1 ? '-' + count : '') };
      });
    });
  }
  function pageOf(s) { return s.pageKey || s.pageOrder || text(s.title).match(/(?:^|\D)(\d{2,3})(?:[–-]\d{2,3})?頁/)?.[1]; }
  function records(data) {
    const byId = new Map(sections(data).map(s => [s.sectionId, s]));
    const result = [];
    for (const page of data.pagePresentation?.pages || []) for (const assignment of page.assignments || []) {
      const s = byId.get(assignment.sectionId); if (!s) continue;
      const cds = [...new Set((s.items || []).flatMap(i => i.classroom?.cd || i.track || []))];
      const items = (s.items || []).filter(i => !assignment.itemIds || assignment.itemIds.includes(String(i.id)));
      for (const i of items) {
        const itemId = String(i.id || '');
        const anchor = `item-${data.id}-${s.sectionId}-${itemId}`;
        const number = i.classroom?.questionNumber || '';
        result.push({ lessonId: data.id, page: String(page.key), sectionId: s.sectionId, itemId, anchor,
          title: text(i.topic || i.title || i.question || i.label || s.title), questionNumber: number,
          cd: [].concat(i.classroom?.cd || i.track || cds),
          text: text([i.topic, i.title, i.question, i.jpPlain, i.japanese, i.jpRuby, i.chinese, i.zh, i.target, i.partner, i.answer, i.answerText, i.speakerBAns].filter(Boolean).join(' ')), item: i, section: s });
      }
    }
    return result;
  }
  function search(records, { page = '', cd = '', keyword = '' } = {}) {
    const clean = s => text(s).normalize('NFKC').toLowerCase();
    const terms = clean(keyword).split(/\s+/).filter(Boolean);
    return records.filter(r => (!page || r.page === String(page)) && (!cd || r.cd.map(String).includes(String(cd).replace(/^cd\s*/i, ''))) && terms.every(t => clean(`${r.text} ${r.questionNumber}`).includes(t)));
  }
  scope.LessonClassroomCore = { text, token, labels, status, sections, records, search };
})(typeof window === 'undefined' ? globalThis : window);

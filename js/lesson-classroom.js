/* Page-first classroom reading, using the existing renderer and pager. */
(() => {
  const root=document.getElementById('lesson-root'), core=window.LessonClassroomCore;
  if(!root||!core)return;
  let priorRead=null;
  try{priorRead=JSON.parse(localStorage.getItem('japanese-ai-learning.last-read'));}catch{}
  window.JapaneseLesson.ready.then(async()=>{
    const data=root.lessonContext.data, records=core.records(data);
    document.body.classList.add('classroom-reading');
    const byAnchor=new Map(records.map(r=>[r.anchor,r]));
    const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    for(const section of data.sections.filter(s=>s.__lessonLocation?.kind==='section')){
      const element=root.querySelector('[data-section-id="'+section.__lessonLocation.sectionId+'"]'); if(!element)continue;
      element.classList.add('reading-flow');
      const cards=element.querySelectorAll(':scope > .lesson-grid > article, :scope > .lesson-grid > details, :scope > .scenario-grid > article, :scope > .audio-track-grid > article');
      (section.items||[]).forEach((item,index)=>{
        const card=cards[index]; if(!card||!item.id)return;
        card.id='item-'+data.id+'-'+section.__lessonLocation.sectionId+'-'+item.id;
        const record=byAnchor.get(card.id); if(!record)return;
        card.dataset.textbookPage=record.page;
        card.dataset.classroomSection=section.__lessonLocation.sectionId;
        card.classList.add('reading-line');
        if(item.classroom?.kind==='question'||card.querySelector(':scope > details.lesson-answer'))card.classList.add('reading-question');
        const japanese=card.querySelector(':scope > p[lang="ja"], :scope > p > span[lang="ja"]')?.closest('p'),play=card.querySelector(':scope > .speech-actions');
        if(japanese&&play){const row=document.createElement('div');row.className='reading-sentence';japanese.before(row);row.append(japanese,play);}
        card.insertAdjacentHTML('afterbegin','<div class="classroom-location">第'+data.id.slice(1)+'課 · 課本 '+record.page+'頁'+(item.classroom?.questionNumber?' · '+safe(item.classroom.questionNumber):'')+'</div>');
        const metadata=document.createElement('details');metadata.className='reading-metadata';metadata.innerHTML='<summary>來源／核對／補充</summary>';
        const source=item.classroom?.textSource, review=item.classroom?.textReview, reading=item.classroom?.readingReview;
        const visibleReview=[];
        if(review&&review.status!=='photo-verified')visibleReview.push('原文待核對');
        if(reading?.status==='partial')visibleReview.push('讀音部分核對／待教師確認');
        if(reading?.status==='user-confirmed')visibleReview.push('讀音：使用者試聽已確認（非教師確認）');
        if(visibleReview.length)card.querySelector('.classroom-location').insertAdjacentHTML('afterend','<small class="reading-answer-status">'+visibleReview.join('；')+'</small>');
        if(item.answerEvidence&&!card.querySelector('.classroom-evidence')){
          const evidence=item.answerEvidence;
          metadata.insertAdjacentHTML('beforeend','<p>答案：'+core.labels[core.status(item)]+'</p>');
          for(const s of evidence.sources||[])metadata.insertAdjacentHTML('beforeend','<p><a target="_blank" rel="noopener" href="'+safe(s.href)+'">'+(s.kind==='answer-book'?'解答本':s.kind==='teacher-record'?'教師紀錄':'課本')+' '+safe(s.page)+'頁 · '+safe(s.locator)+'</a></p>');
          if(evidence.review)metadata.insertAdjacentHTML('beforeend','<p>'+safe(evidence.review.by)+' · '+safe(evidence.review.date)+' · '+safe(evidence.review.method)+'</p>');
        }
        if(source)metadata.insertAdjacentHTML('beforeend','<a target="_blank" rel="noopener" href="'+safe(source.href)+'">'+(source.kind==='answer-book'?'解答本':'課本')+' '+safe(source.page)+'頁</a>');
        if(review)metadata.insertAdjacentHTML('beforeend','<p>原文：'+(review.status==='photo-verified'?'照片逐句已核對':'待核對')+'。'+safe(review.note)+'</p><p>讀音：'+(reading?.status==='photo-verified'?'照片可見漢字注音已核對':reading?.status==='user-confirmed'?'使用者試聽已確認（非教師確認）':'部分核對／待教師確認')+'。'+safe(reading?.note)+'</p>');
        for(const node of [...card.children])if(node.matches('.classroom-evidence,.lesson-examples-details')||(node.tagName==='P'&&node.querySelector('a[target="_blank"]'))||(node.classList.contains('lesson-kv')&&/文法解析|補充/.test(node.querySelector('strong')?.textContent||'')))metadata.append(node);
        if(metadata.children.length>1)card.append(metadata);
      });
    }
    for(const record of records){
      const item=record.item, question=document.getElementById(record.anchor);
      const refs=[...(item.classroom?.answerIds||[]).map(itemId=>({sectionId:record.sectionId,itemId})),...(item.classroom?.answerRefs||[])];
      if(!question||!refs.length)continue;
      const answer=document.createElement('details');answer.className='lesson-answer classroom-answer';answer.innerHTML='<summary>看答案</summary>';
      const statuses=[];
      for(const ref of refs){
        const anchor='item-'+data.id+'-'+ref.sectionId+'-'+ref.itemId, card=document.getElementById(anchor);
        if(!card)continue;statuses.push(core.status(byAnchor.get(anchor).item));card.classList.add('classroom-answer-content');
        if(card.tagName==='DETAILS'){card.open=true;card.classList.add('reading-answer-line');card.querySelector('summary').tabIndex=-1;}
        answer.append(card);
      }
      question.classList.add('reading-question');
      for(const id of item.classroom?.responseIds||[]){
        const response=document.getElementById('item-'+data.id+'-'+record.sectionId+'-'+id);
        if(response){response.classList.add('reading-response');question.append(response);}
      }
      question.insertAdjacentHTML('beforeend','<small class="reading-answer-status">'+[...new Set(statuses)].map(s=>core.labels[s]).join('／')+'</small>');
      question.append(answer);
    }
    // Grouping is textbook data, never a lesson/page-specific rendering branch.
    for(const section of data.sections.filter(s=>s.__lessonLocation?.kind==='section')){
      const element=root.querySelector('[data-section-id="'+section.__lessonLocation.sectionId+'"]'),grid=element?.querySelector('.lesson-grid');
      if(!grid)continue;
      for(const group of section.readingGroups||[]){
        const cards=group.itemIds.map(id=>document.getElementById('item-'+data.id+'-'+section.__lessonLocation.sectionId+'-'+id)).filter(Boolean);
        if(!cards.length)continue;
        const block=document.createElement('article');
        block.className='reading-example';
        cards[0].before(block);
        cards.forEach(card=>block.append(card));
      }
    }
    const nav=root.querySelector('#textbook-pages');nav.classList.add('classroom-page-nav');
    nav.insertAdjacentHTML('afterbegin','<label>課次<select aria-label="課次"></select></label>');
    const lessonSelect=nav.querySelector('[aria-label="課次"]');
    try{
      const response=await fetch('../../data/lessons.json',{cache:'no-store'});if(!response.ok)throw new Error('catalog');
      const catalog=await response.json();
      for(const lesson of catalog){const option=document.createElement('option');option.value=lesson.id;option.textContent='第'+lesson.id.slice(1)+'課';lessonSelect.append(option);}
      lessonSelect.value=data.id;lessonSelect.onchange=()=>{const lesson=catalog.find(l=>l.id===lessonSelect.value);if(lesson)location.href=new URL('../../'+lesson.href,location.href).href;};
    }catch{lessonSelect.innerHTML='<option>第'+data.id.slice(1)+'課</option>';}
    nav.insertAdjacentHTML('beforeend','<a class="classroom-last-page">上次閱讀頁</a>');
    const lastLink=nav.querySelector('.classroom-last-page');let lastPage=priorRead?.lessonId===data.id?priorRead.pageKey:window.JapaneseLesson.getState()?.pageKey;
    const settings=document.createElement('details');settings.className='reading-tools';settings.innerHTML='<summary>朗讀設定</summary>';nav.after(settings);settings.append(root.querySelector('#speech-toolbar'));
    const stopAll=()=>{root.lessonSpeech?.stop();root.querySelectorAll('audio').forEach(a=>a.pause());};
    function updatePage(){
      const page=window.JapaneseLesson.getState()?.pageKey;
      lastLink.href='#page-'+lastPage;lastLink.textContent='上次閱讀 '+lastPage+'頁';lastPage=page;
    }
    root.addEventListener('lesson:location-change',()=>{stopAll();updatePage();});
    root.querySelectorAll('.audio-track-content audio').forEach(a=>a.setAttribute('aria-label','CD 原音（整段）'));
    root.addEventListener('change',event=>{if(event.target.id==='speech-rate')root.querySelectorAll('audio').forEach(a=>a.playbackRate=Number(event.target.value)||1);});
    root.addEventListener('play',event=>{
      if(event.target.tagName!=='AUDIO')return;
      root.lessonSpeech?.stop();root.querySelectorAll('audio').forEach(a=>{if(a!==event.target)a.pause();});
      event.target.playbackRate=Number(root.querySelector('#speech-rate')?.value)||1;
      const status=root.querySelector('#speech-status');if(status)status.textContent=event.target.closest('.audio-track-content')?'CD 原音播放中（整段）':'跟讀錄音播放中';
    },true);
    root.addEventListener('pause',event=>{const status=root.querySelector('#speech-status');if(event.target.tagName==='AUDIO'&&['CD 原音播放中（整段）','跟讀錄音播放中'].includes(status?.textContent))status.textContent='原音／錄音已停止';},true);
    let position=null;const release=()=>{position=null;};
    root.addEventListener('lesson:location-change',release);
    window.addEventListener('wheel',release,{passive:true});window.addEventListener('touchmove',release,{passive:true});
    window.addEventListener('keydown',event=>{if(['PageDown','PageUp','ArrowDown','ArrowUp','Home','End'].includes(event.key))release();});
    const rememberPosition=event=>{const card=event.target.closest('.reading-question')||event.target.closest('.reading-line');if(!card)return release();if(position?.card!==card)position={card,top:card.getBoundingClientRect().top};};
    root.addEventListener('pointerdown',rememberPosition,true);
    root.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key))rememberPosition(event);},true);
    root.addEventListener('click',event=>{
      if(event.target.closest('[data-speak]'))root.querySelectorAll('audio').forEach(a=>a.pause());
      const summary=event.target.closest('summary');
      if(summary?.closest('.reading-question')&&!summary.parentElement.classList.contains('reading-answer-line')){event.preventDefault();summary.parentElement.open=!summary.parentElement.open;}
      if(event.target.closest('[data-speak]')||summary?.closest('.reading-question'))requestAnimationFrame(()=>{if(position?.card.isConnected)window.scrollBy({top:position.card.getBoundingClientRect().top-position.top,behavior:'instant'});});
    });
    window.addEventListener('pagehide',stopAll);
    // Legacy item links are page aliases, never an instruction to open an answer.
    function pageAlias(){
      if(!location.hash.startsWith('#item-'))return;
      const anchor=decodeURIComponent(location.hash.slice(1));
      const page=byAnchor.get(anchor)?.page||anchor.match(/-page-(\d+)-/)?.[1];
      if(page&&data.pagePresentation.pages.some(p=>String(p.key)===page)){history.replaceState(null,'','#page-'+page);nav.querySelector('[aria-label="教材頁碼"]').value=page;nav.querySelector('[aria-label="教材頁碼"]').dispatchEvent(new Event('change',{bubbles:true}));}
    }
    window.addEventListener('hashchange',pageAlias);window.addEventListener('popstate',pageAlias);
    pageAlias();updatePage();root.dataset.classroomReady='true';
  });
})();

(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const STORE_KEY = 'gd_exam_tong_v1';
  const letters = ['A','B','C','D'];
  let bank = window.QUESTION_DATA;
  let meta = {};
  let db = loadDB();
  let view = 'home';
  let session = null;
  let examResult = null;
  let searchText = '';
  let examTimerId = null;

  function loadDB(){
    try {
      const v = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return {stats:v.stats||{}, wrongIds:v.wrongIds||[], favoriteIds:v.favoriteIds||[], history:v.history||[], daily:v.daily||{}, dailyGoal:v.dailyGoal||30, bestExam:v.bestExam||0};
    } catch(e){ return {stats:{},wrongIds:[],favoriteIds:[],history:[],daily:{},dailyGoal:30,bestExam:0}; }
  }
  function saveDB(){ try{localStorage.setItem(STORE_KEY,JSON.stringify(db));}catch(e){toast('本地空间不足，请先导出备份');} updateBadge(); }
  function todayKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function todayCount(){return db.daily[todayKey()]||0;}
  function toast(msg){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.style.cssText='position:fixed;left:50%;bottom:88px;transform:translateX(-50%);background:#172f4e;color:white;padding:10px 14px;border-radius:12px;font-size:12px;z-index:100;box-shadow:0 5px 20px #0002;max-width:85%;text-align:center';document.body.appendChild(el);}el.textContent=msg;el.style.opacity='1';clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>el.style.opacity='0',2200);}
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function fmtPct(n,d){return d?Math.round(n/d*100)+'%':'—';}
  function uniqueAnswered(){return Object.keys(db.stats).filter(id=>db.stats[id].attempts>0).length;}
  function totalAttempts(){return db.history.length;}
  function totalCorrect(){return db.history.filter(x=>x.correct).length;}
  function accuracy(){return fmtPct(totalCorrect(),totalAttempts());}
  function updateBadge(){const el=$('#wrongBadge');if(el)el.textContent=db.wrongIds.length>99?'99+':db.wrongIds.length;}
  function categoryCounts(){const m={};for(const q of bank.questions)m[q.category]=(m[q.category]||0)+1;return m;}
  function categories(){return Object.keys(categoryCounts());}
  function progressFor(cat){const ids=bank.questions.filter(q=>q.category===cat).map(q=>q.id);const done=ids.filter(id=>(db.stats[id]?.attempts||0)>0).length;return {done,total:ids.length,pct:ids.length?done/ids.length*100:0};}
  function stopExamTimer(){if(examTimerId){clearInterval(examTimerId);examTimerId=null;}}
  function formatTime(sec){sec=Math.max(0,sec||0);return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
  function startExamTimer(){stopExamTimer();if(!session||session.mode!=='exam')return;session.timeLeft=90*60;examTimerId=setInterval(()=>{if(!session||session.mode!=='exam'){stopExamTimer();return;}session.timeLeft--;const el=$('#examTimer');if(el)el.textContent='剩余时间 '+formatTime(session.timeLeft);if(session.timeLeft<=0){toast('考试时间到，系统自动交卷');finishExam();}},1000);}
  function nav(to){stopExamTimer();view=to;session=null;examResult=null;render();}
  function render(){
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.nav===view));
    const app=$('#app');
    if(view==='home')app.innerHTML=renderHome();
    else if(view==='chapters')app.innerHTML=renderChapters();
    else if(view==='wrong')app.innerHTML=renderCollection('wrong');
    else if(view==='favorites')app.innerHTML=renderCollection('favorites');
    else if(view==='stats')app.innerHTML=renderStats();
    else if(view==='quiz')app.innerHTML=renderQuiz();
    else if(view==='examResult')app.innerHTML=renderExamResult();
    else if(view==='settings')app.innerHTML=renderSettings();
    updateBadge();
  }
  function renderHome(){
    const goal=Math.max(1,Number(db.dailyGoal)||30),today=todayCount();
    return `
      <section class="hero">
        <div class="eyebrow" style="color:#b8c9da">2027 广东省考 · 常识专项</div>
        <h1>每天刷一点，考场稳一点。</h1>
        <p>题库${bank.questions.length}道 · 覆盖PDF第6—42页 · 支持离线练习</p>
        <div class="hero-actions"><button class="btn btn-primary" onclick="App.startRandom(20)">开始随机刷题</button><button class="btn btn-light" onclick="App.startExam(100)">100题模拟考试</button></div>
      </section>
      <div class="stats-grid">
        <div class="stat-card"><strong>${bank.questions.length}</strong><span>题库总量</span></div>
        <div class="stat-card"><strong>${uniqueAnswered()}</strong><span>已练习题目</span></div>
        <div class="stat-card"><strong>${accuracy()}</strong><span>累计正确率</span></div>
        <div class="stat-card"><strong>${db.wrongIds.length}</strong><span>待复习错题</span></div>
      </div>
      <div class="panel" style="padding:14px 15px">
        <div style="display:flex;justify-content:space-between;align-items:center"><strong style="font-size:13px">今日学习目标</strong><span style="font-size:11px;color:var(--muted)">${today} / ${goal}题</span></div>
        <div class="progress-track" style="margin-top:10px;height:8px"><i style="width:${Math.min(100,today/goal*100)}%"></i></div>
        <div style="font-size:10px;color:var(--muted);margin-top:7px">完成${Math.round(Math.min(100,today/goal*100))}% · 今日答题自动计数</div>
      </div>
      <div class="section-head"><h2>快速开始</h2><button onclick="App.go('chapters')">全部章节 →</button></div>
      <div class="quick-grid">
        <button class="quick-card" onclick="App.startRandom(20)"><span class="quick-icon">⤨</span><span><strong>随机练习</strong><small>随机抽取20题</small></span></button>
        <button class="quick-card" onclick="App.go('wrong')"><span class="quick-icon">↻</span><span><strong>错题重练</strong><small>${db.wrongIds.length}道待复习</small></span></button>
        <button class="quick-card" onclick="App.go('favorites')"><span class="quick-icon">☆</span><span><strong>我的收藏</strong><small>${db.favoriteIds.length}道收藏题</small></span></button>
        <button class="quick-card" onclick="App.go('stats')"><span class="quick-icon">▥</span><span><strong>学习统计</strong><small>查看章节掌握情况</small></span></button>
      </div>
      <div class="section-head"><h2>章节练习</h2><button onclick="App.go('chapters')">查看全部 →</button></div>
      <div class="chapter-list">${categories().slice(0,4).map(cat=>chapterCard(cat)).join('')}</div>
      <div class="footer-note">题库依据用户提供的《27广东省考常识知识点》PDF制作。资料中的时效性信息未另行联网核验；“长征胜利90周年”部分原文仅提示参见其他手册，暂未自行补题。</div>`;
  }
  function chapterCard(cat){const p=progressFor(cat);return `<button class="chapter-card" onclick="App.startCategory('${encodeURIComponent(cat)}')"><span class="chapter-title">${esc(cat)}</span><div class="mini-track"><i style="width:${p.pct}%"></i></div><span class="chapter-meta"><span>${p.total}道题</span><span>${p.done}/${p.total}已练</span></span></button>`;}
  function renderChapters(){
    return `<h1 class="page-title">章节练习</h1><p class="page-subtitle">按资料章节系统复习。每道题均标注原PDF页码。</p>
      <div class="searchbar"><input id="searchInput" placeholder="搜索知识点、题干或选项…" value="${esc(searchText)}" oninput="App.search(this.value)"></div>
      <div class="chapter-list">${categories().map(cat=>chapterCard(cat)).join('')}</div>
      <div class="section-head"><h2>搜索结果</h2><span style="font-size:11px;color:var(--muted)">${searchText?filteredQuestions().length+'道':'输入关键词查题'}</span></div>
      ${searchText?renderSearchResults():''}`;
  }
  function filteredQuestions(){const s=searchText.trim().toLowerCase();if(!s)return [];return bank.questions.filter(q=>(q.question+' '+q.category+' '+q.section+' '+q.options.join(' ')+' '+q.explanation).toLowerCase().includes(s)).slice(0,60);}
  function renderSearchResults(){const qs=filteredQuestions();if(!qs.length)return '<div class="empty">没有找到匹配题目，试试更短的关键词。</div>';return `<div class="result-list">${qs.map(q=>`<button class="result-item" style="text-align:left" onclick="App.startSingle('${q.id}')"><strong>${esc(q.question)}</strong><span style="color:var(--muted)">${esc(q.category)} · PDF第${q.sourcePage}页</span></button>`).join('')}</div>`;}
  function renderCollection(kind){
    const ids=kind==='wrong'?db.wrongIds:db.favoriteIds;
    const title=kind==='wrong'?'错题本':'我的收藏';
    const qs=ids.map(id=>bank.questions.find(q=>q.id===id)).filter(Boolean);
    return `<h1 class="page-title">${title}</h1><p class="page-subtitle">${kind==='wrong'?'答错的题目会自动收录。掌握后可从错题本移除。':'收藏的重点、易混淆知识点会集中显示在这里。'}</p>
      <div class="toolbar">${qs.length?`<button class="btn btn-primary" onclick="App.startCollection('${kind}')">开始${kind==='wrong'?'重练':'练习'}（${qs.length}题）</button>`:''}<button class="btn btn-outline btn-small" onclick="App.go('chapters')">继续刷题</button></div>
      ${qs.length?`<div class="result-list">${qs.map(q=>`<div class="result-item"><strong>${esc(q.question)}</strong><div style="color:var(--muted);font-size:10px">${esc(q.category)} · PDF第${q.sourcePage}页</div><div class="toolbar"><button class="btn btn-outline btn-small" onclick="App.startSingle('${q.id}')">单题练习</button>${kind==='wrong'?`<button class="btn btn-outline btn-small" onclick="App.master('${q.id}')">标记已掌握</button>`:`<button class="btn btn-outline btn-small" onclick="App.unfavorite('${q.id}')">取消收藏</button>`}</div></div>`).join('')}</div>`:'<div class="empty"><b>这里暂时空空的</b>'+ (kind==='wrong'?'练习中答错的题目会自动进入错题本。':'在答题页点击☆即可收藏重点题目。')+'</div>'}`;
  }
  function renderStats(){
    const counts=categoryCounts();
    const rows=Object.keys(counts).map(cat=>{const p=progressFor(cat);return `<div class="bar-row"><span>${esc(cat)}</span><div class="track"><i style="width:${p.pct}%"></i></div><em>${Math.round(p.pct)}%</em></div>`}).join('');
    const recent=db.history.slice(-8).reverse();
    return `<h1 class="page-title">学习统计</h1><p class="page-subtitle">统计数据保存在当前设备浏览器中，不会自动上传。</p>
      <div class="stats-grid"><div class="stat-card"><strong>${totalAttempts()}</strong><span>累计答题次数</span></div><div class="stat-card"><strong>${accuracy()}</strong><span>累计正确率</span></div><div class="stat-card"><strong>${uniqueAnswered()}</strong><span>已覆盖题目</span></div><div class="stat-card"><strong>${db.bestExam||0}</strong><span>模拟考最高分</span></div></div>
      <div class="panel"><strong style="font-size:13px">章节完成度</strong>${rows}</div>
      <div class="section-head"><h2>最近答题</h2><span style="font-size:10px;color:var(--muted)">最近8次</span></div>
      ${recent.length?`<div class="result-list">${recent.map(a=>{const q=bank.questions.find(x=>x.id===a.id);return `<div class="result-item"><strong>${a.correct?'✓':'✕'} ${esc(q?.question||'题目')}</strong><span style="color:var(--muted)">${esc(q?.category||'')} · ${new Date(a.at).toLocaleString('zh-CN')}</span></div>`}).join('')}</div>`:'<div class="empty">完成第一道题后，这里会显示答题记录。</div>'}
      <div class="section-head"><h2>数据管理</h2></div><div class="panel"><div class="settings-row"><span>导出答题记录备份</span><button class="btn btn-outline btn-small" onclick="App.exportBackup()">导出JSON</button></div><div class="settings-row"><span>导入已有备份</span><button class="btn btn-outline btn-small" onclick="App.importBackup()">选择文件</button></div><div class="settings-row"><span>每日刷题目标</span><button class="btn btn-outline btn-small" onclick="App.go('settings')">设置</button></div><div class="settings-row"><span>清空本机答题记录</span><button class="btn btn-danger btn-small" onclick="App.clearData()">清空</button></div></div>`;
  }
  function renderSettings(){return `<h1 class="page-title">设置</h1><p class="page-subtitle">调整每日目标，并管理本机学习数据。</p><div class="panel"><div class="settings-row"><label for="goalInput">每日刷题目标</label><input id="goalInput" type="number" min="5" max="300" value="${db.dailyGoal}" /></div><button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="App.saveSettings()">保存设置</button></div><div class="notice">建议每天完成20—40道题，并定期导出备份。更换手机或清理Safari网站数据前，请先备份。</div><div class="panel"><strong style="font-size:13px">关于题库</strong><p style="font-size:11px;line-height:1.7;color:var(--muted)">版本1.0.0 · ${bank.questions.length}道单选题。资料来源：用户提供PDF第6—42页。部分内容的有效日期和时效性信息以原资料为准，未作外部核验。</p></div>`;}
  function renderQuiz(){
    if(!session)return '<div class="empty"><b>没有正在进行的练习</b><button class="btn btn-primary" onclick="App.go(\'home\')">返回首页</button></div>';
    const q=session.questions[session.index];
    if(!q)return '<div class="empty">题目不存在。</div>';
    const chosen=session.answers[q.id];
    const answered=chosen!==undefined;
    const reveal=session.mode!=='exam' && answered;
    const pct=(session.index+1)/session.questions.length*100;
    const fav=db.favoriteIds.includes(q.id);
    const optionHTML=q.options.map((op,i)=>{
      let cls='option';if(chosen===i)cls+=' selected';if(reveal&&i===q.answer)cls+=' correct';if(reveal&&chosen===i&&i!==q.answer)cls+=' incorrect';
      return `<button class="${cls}" ${answered&&session.mode!=='exam'?'disabled':''} onclick="App.choose(${i})"><span class="letter">${letters[i]}</span><span>${esc(op)}</span></button>`;
    }).join('');
    let feedback='';
    if(reveal){const ok=chosen===q.answer;feedback=`<div class="feedback ${ok?'good':'bad'}"><strong>${ok?'回答正确':'回答错误 · 正确答案：'+letters[q.answer]}</strong><div class="explanation">${esc(q.explanation)}</div></div>`;}
    return `<div class="q-top"><span class="pill">${esc(q.category)} · ${esc(q.section)}</span><button class="bookmark ${fav?'on':''}" onclick="App.toggleFavorite('${q.id}')">${fav?'★ 已收藏':'☆ 收藏'}</button></div>
      <div class="progress-row"><small>${session.index+1} / ${session.questions.length}</small><div class="progress-track"><i style="width:${pct}%"></i></div><small>${session.mode==='exam'?'模拟考试':session.mode==='wrong'?'错题重练':'章节练习'}</small></div>
      <section class="question-card"><div class="q-top"><span class="q-number">第${session.index+1}题 · ${q.difficulty||'基础'}</span><span class="q-number">PDF第${q.sourcePage}页</span></div>${session.mode==='exam'?`<div id="examTimer" style="font-size:11px;color:var(--red);font-weight:800;margin-top:8px">剩余时间 ${formatTime(session.timeLeft)}</div>`:''}<div class="q-text">${esc(q.question)}</div><div class="option-list">${optionHTML}</div>${feedback}
      <div class="q-actions"><button class="btn btn-outline" onclick="App.prev()" ${session.index===0?'disabled':''}>上一题</button>${session.mode==='exam'?`<button class="btn btn-primary" onclick="App.next()">${session.index===session.questions.length-1?'完成答题':'下一题'}</button>`:`<button class="btn btn-primary" onclick="App.next()" ${!answered?'disabled':''}>${session.index===session.questions.length-1?'完成练习':'下一题'}</button>`}</div>
      ${session.mode==='exam'?`<div style="display:flex;justify-content:space-between;align-items:center;margin-top:13px"><span style="font-size:10px;color:var(--muted)">已作答 ${Object.keys(session.answers).length} / ${session.questions.length}</span><button class="btn btn-danger btn-small" onclick="App.finishExam()">交卷</button></div>`:''}
      </section><div class="source-line">题库依据原资料整理；如需核对，请查看PDF第${q.sourcePage}页。</div>`;
  }
  function renderExamResult(){
    if(!examResult)return '<div class="empty">暂无考试结果。</div>';
    const r=examResult;
    return `<div class="result-hero"><div class="eyebrow">模拟考试完成</div><div class="score">${r.score}分</div><div class="score-label">答对 ${r.correct} / ${r.total} 题 · 正确率 ${Math.round(r.correct/r.total*100)}%</div><div class="toolbar" style="justify-content:center"><button class="btn btn-primary" onclick="App.startExam(100)">再考一次</button><button class="btn btn-outline" onclick="App.go('home')">返回首页</button></div></div>
      <div class="section-head"><h2>本次错题回顾</h2><span style="font-size:11px;color:var(--muted)">${r.wrongs.length}道</span></div>
      ${r.wrongs.length?r.wrongs.map(x=>`<div class="result-item"><strong>✕ ${esc(x.q.question)}</strong><div style="margin:5px 0;color:var(--red)">你的答案：${x.selected===undefined?'未作答':letters[x.selected]+' '+esc(x.q.options[x.selected])}</div><div style="color:var(--green)">正确答案：${letters[x.q.answer]} ${esc(x.q.options[x.q.answer])}</div><div class="explanation" style="margin-top:6px">${esc(x.q.explanation)}</div><div class="source-line">PDF第${x.q.sourcePage}页</div></div>`).join(''):'<div class="empty"><b>全部答对</b>本次没有错题，继续保持。</div>'}`;
  }
  function record(q, selected){
    const correct=selected===q.answer;
    const s=db.stats[q.id]||{attempts:0,correct:0,wrong:0,streak:0};
    s.attempts++;if(correct){s.correct++;s.streak++;}else{s.wrong++;s.streak=0;if(!db.wrongIds.includes(q.id))db.wrongIds.push(q.id);}
    db.stats[q.id]=s;db.history.push({id:q.id,correct,at:Date.now()});if(db.history.length>5000)db.history=db.history.slice(-5000);
    const k=todayKey();db.daily[k]=(db.daily[k]||0)+1;
    saveDB();
  }
  function openQuiz(list,mode='practice',title='练习'){
    if(!list.length){toast('当前没有可练习的题目');return;}
    stopExamTimer();session={questions:list,mode,title,index:0,answers:{},recorded:{}};view='quiz';if(mode==='exam')startExamTimer();render();
  }
  function choose(i){if(!session)return;const q=session.questions[session.index];if(session.mode!=='exam'&&session.answers[q.id]!==undefined)return;session.answers[q.id]=i;if(session.mode!=='exam'){record(q,i);session.recorded[q.id]=true;}render();}
  function next(){if(!session)return;const q=session.questions[session.index];if(session.mode!=='exam'&&session.answers[q.id]===undefined){toast('请先选择一个答案');return;}if(session.index<session.questions.length-1){session.index++;render();}else if(session.mode==='exam'){finishExam();}else{const done=session.questions.filter(x=>session.answers[x.id]!==undefined).length;toast(`本组练习完成：已作答${done}题`);session=null;view='home';render();}}
  function prev(){if(session&&session.index>0){session.index--;render();}}
  function finishExam(){if(!session||session.mode!=='exam')return;stopExamTimer();let correct=0,wrongs=[];for(const q of session.questions){const selected=session.answers[q.id];const ok=selected===q.answer;if(ok)correct++;else wrongs.push({q,selected});if(!session.recorded[q.id]){record(q,selected);session.recorded[q.id]=true;}}
    const score=Math.round(correct/session.questions.length*100);db.bestExam=Math.max(db.bestExam,score);saveDB();examResult={correct,total:session.questions.length,score,wrongs};session=null;view='examResult';render();}
  function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function startRandom(n=20){openQuiz(shuffle(bank.questions).slice(0,n),'practice','随机练习');}
  function startExam(n=100){openQuiz(shuffle(bank.questions).slice(0,Math.min(n,bank.questions.length)),'exam','模拟考试');}
  function startCategory(encoded){const cat=decodeURIComponent(encoded);openQuiz(shuffle(bank.questions.filter(q=>q.category===cat)),'practice',cat);}
  function startCollection(kind){const ids=kind==='wrong'?db.wrongIds:db.favoriteIds;const list=ids.map(id=>bank.questions.find(q=>q.id===id)).filter(Boolean);openQuiz(shuffle(list),kind,kind==='wrong'?'错题重练':'收藏练习');}
  function startSingle(id){const q=bank.questions.find(x=>x.id===id);if(q)openQuiz([q],'practice','单题练习');}
  function toggleFavorite(id){if(db.favoriteIds.includes(id))db.favoriteIds=db.favoriteIds.filter(x=>x!==id);else db.favoriteIds.push(id);saveDB();render();}
  function unfavorite(id){db.favoriteIds=db.favoriteIds.filter(x=>x!==id);saveDB();render();}
  function master(id){db.wrongIds=db.wrongIds.filter(x=>x!==id);saveDB();render();toast('已从错题本移除');}
  function search(s){searchText=s;const pos=$('#searchInput')?.selectionStart;render();const el=$('#searchInput');if(el){el.focus();el.setSelectionRange(pos,pos);}}
  function exportBackup(){const payload={app:'广东省考常识通',version:'1.0.0',exportedAt:new Date().toISOString(),data:db};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='广东省考常识通-答题备份.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('备份文件已生成');}
  function importBackup(){ $('#importFile').click(); }
  function doImport(file){const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(reader.result);const d=parsed.data||parsed;if(!d.stats||!Array.isArray(d.wrongIds)||!Array.isArray(d.favoriteIds))throw new Error('格式不匹配');if(!confirm('导入备份将覆盖本机当前答题记录，是否继续？'))return;db={...db,...d};saveDB();render();toast('备份导入成功');}catch(e){alert('无法导入：文件格式不正确或已损坏。');}};reader.readAsText(file);}
  function clearData(){if(!confirm('确定清空本机全部答题记录、错题和收藏吗？建议先导出备份。'))return;localStorage.removeItem(STORE_KEY);db=loadDB();render();toast('本机答题记录已清空');}
  function saveSettings(){const n=Math.max(5,Math.min(300,Number($('#goalInput').value)||30));db.dailyGoal=n;saveDB();toast('每日目标已保存');render();}
  function go(to){nav(to);}
  window.App={go,startRandom,startExam,startCategory,startCollection,startSingle,choose,next,prev,finishExam,toggleFavorite,unfavorite,master,search,exportBackup,importBackup,clearData,saveSettings};

  document.addEventListener('click',e=>{const b=e.target.closest('[data-nav]');if(b)nav(b.dataset.nav);});
  $('#backupBtn').addEventListener('click',exportBackup);
  $('#importFile').addEventListener('change',e=>{if(e.target.files[0])doImport(e.target.files[0]);e.target.value='';});

  async function init(){
    if(!bank){
      try{const res=await fetch('questions.json');const data=await res.json();bank={meta:data.meta,questions:data.questions};}
      catch(e){$('#app').innerHTML='<div class="empty"><b>题库未能载入</b>请确认已完整解压软件文件夹，并通过HTTPS网页地址打开；不要直接预览缺少题库文件的页面。</div>';return;}
    }
    meta=bank.meta||{};
    if(!Array.isArray(bank.questions)||!bank.questions.length){$('#app').innerHTML='<div class="empty">题库数据为空。</div>';return;}
    render();
    if('serviceWorker' in navigator && location.protocol.startsWith('http')){navigator.serviceWorker.register('sw.js').catch(()=>{});}
  }
  init();
})();

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const KEYS = {entries:'acct_entries_v1', progress:'acct_progress_v1', settings:'acct_settings_v1', poster:'acct_poster_v1'};
let entries = load(KEYS.entries, DEFAULT_ENTRIES);
let progress = load(KEYS.progress, {});
let settings = load(KEYS.settings, {shuffle:false, autoHide:true, largeFont:false});
let poster = load(KEYS.poster, {title:'今日工作记录', type:'work', body:'09:30 整理资料清单\n10:20 核对项目明细表\n14:00 更新学习计划\n16:30 汇总今日记录', image:'', imageMode:'none', opacity:100});
let currentIndex = 0, filtered = [...entries], onlyHard = false;
function load(key, fallback){ try{return JSON.parse(localStorage.getItem(key)) || fallback}catch(e){return fallback} }
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function topics(){ return [...new Set(entries.map(e=>e.topic))]; }
function init(){ bindTabs(); renderTopicSelects(); applySettings(); renderQuestion(); renderCatalog(); renderEditorList(); renderPoster(); renderStats(); }
function bindTabs(){ $$('.tab').forEach(btn=>btn.onclick=()=>{ $$('.tab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); $$('.panel').forEach(p=>p.classList.remove('active-panel')); $('#'+btn.dataset.page).classList.add('active-panel'); renderCatalog(); renderStats(); }); }
function renderTopicSelects(){ const opts = ['全部专题', ...topics()].map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join(''); $('#topicSelect').innerHTML = opts; $('#catalogTopicFilter').innerHTML = opts; $('#topicSelect').onchange = () => {filterPractice();}; $('#catalogTopicFilter').onchange = renderCatalog; }
function filterPractice(){ const val = $('#topicSelect').value; filtered = val==='全部专题' ? [...entries] : entries.filter(e=>e.topic===val); currentIndex = 0; renderQuestion(); }
function renderQuestion(){ if(!filtered.length){ $('#questionText').textContent='暂无题目，请到“编辑”里新增。'; return; } const item = filtered[currentIndex]; $('#questionText').textContent = item.question; $('#answerText').textContent = item.answer; $('#tipText').textContent = item.tip ? '提示：' + item.tip : ''; if(settings.autoHide) $('#answerBox').classList.add('hidden'); $('#answerInput').value=''; }
function current(){ return filtered[currentIndex]; }
function mark(type){ const item = current(); if(!item) return; progress[item.id] ||= {right:0, wrong:0, hard:0, last:'未安排'}; if(type==='right') progress[item.id].right++; if(type==='wrong') progress[item.id].wrong++; if(type==='hard') progress[item.id].hard++; const days = type==='right' ? 3 : type==='wrong' ? 1 : 0; const d = new Date(); d.setDate(d.getDate()+days); progress[item.id].last = days===0 ? '今天复习' : `${d.getMonth()+1}-${String(d.getDate()).padStart(2,'0')}`; save(KEYS.progress, progress); renderCatalog(); renderStats(); }
$('#showAnswerBtn').onclick=()=>$('#answerBox').classList.toggle('hidden');
$('#markRightBtn').onclick=()=>mark('right'); $('#markWrongBtn').onclick=()=>mark('wrong'); $('#markHardBtn').onclick=()=>mark('hard');
$('#nextBtn').onclick=()=>{ if(!filtered.length) return; currentIndex = settings.shuffle ? Math.floor(Math.random()*filtered.length) : (currentIndex+1)%filtered.length; renderQuestion(); };
function renderCatalog(){ const q = ($('#searchInput').value||'').trim(); const topic = $('#catalogTopicFilter').value || '全部专题'; let list = entries.filter(e => (topic==='全部专题'||e.topic===topic) && (!q || (e.topic+e.title+e.question+e.answer).includes(q))); if(onlyHard) list = list.filter(e => (progress[e.id]?.wrong||0)+(progress[e.id]?.hard||0)>0); $('#catalogBody').innerHTML = list.map((e,i)=>{ const p=progress[e.id]||{}; return `<tr><td>${i+1}</td><td><span class="tag">${esc(e.topic)}</span></td><td>${esc(e.title)}</td><td class="wrong">${(p.wrong||0)}/${(p.hard||0)}</td><td>${esc(p.last||'未安排')}</td></tr>`}).join(''); }
$('#searchInput').oninput=renderCatalog; $('#onlyHardBtn').onclick=()=>{onlyHard=true;renderCatalog()}; $('#resetFilterBtn').onclick=()=>{onlyHard=false;$('#searchInput').value='';$('#catalogTopicFilter').value='全部专题';renderCatalog()};
$('#exportBtn').onclick=()=>{ const blob = new Blob([JSON.stringify({entries,progress,settings,poster},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='中级会计分录默写数据.json'; a.click(); };
$('#importInput').onchange=e=>{ const file=e.target.files[0]; if(!file)return; const r=new FileReader(); r.onload=()=>{ try{ const data=JSON.parse(r.result); entries=data.entries||entries; progress=data.progress||progress; settings=data.settings||settings; poster=data.poster||poster; save(KEYS.entries,entries);save(KEYS.progress,progress);save(KEYS.settings,settings);save(KEYS.poster,poster); location.reload(); }catch(err){alert('导入失败：文件格式不对')} }; r.readAsText(file); };
$('#restoreBtn').onclick=()=>{ if(confirm('确定恢复原版？你自己编辑的题库会被覆盖。')){ localStorage.removeItem(KEYS.entries); localStorage.removeItem(KEYS.progress); location.reload(); }};
function renderEditorList(){ $('#editorList').innerHTML = entries.map((e,i)=>`<div class="editor-item ${i===currentIndex?'active':''}" data-i="${i}"><b>${esc(e.title)}</b><br><small>${esc(e.topic)}</small></div>`).join(''); $$('.editor-item').forEach(el=>el.onclick=()=>{ currentIndex=+el.dataset.i; fillForm(entries[currentIndex]); renderEditorList(); }); fillForm(entries[currentIndex]||{}); }
function fillForm(e){ $('#entryId').value=e.id||''; $('#entryTopic').value=e.topic||''; $('#entryTitle').value=e.title||''; $('#entryQuestion').value=e.question||''; $('#entryAnswer').value=e.answer||''; $('#entryTip').value=e.tip||''; }
$('#entryForm').onsubmit=e=>{ e.preventDefault(); const obj={id:$('#entryId').value || 'e'+Date.now(), topic:$('#entryTopic').value, title:$('#entryTitle').value, question:$('#entryQuestion').value, answer:$('#entryAnswer').value, tip:$('#entryTip').value}; const idx=entries.findIndex(x=>x.id===obj.id); if(idx>=0) entries[idx]=obj; else entries.push(obj); save(KEYS.entries,entries); renderTopicSelects(); filtered=[...entries]; renderEditorList(); renderQuestion(); alert('保存好了'); };
$('#newEntryBtn').onclick=()=>fillForm({id:'',topic:'',title:'',question:'',answer:'',tip:''});
$('#deleteEntryBtn').onclick=()=>{ const id=$('#entryId').value; if(!id)return; if(confirm('确定删除当前分录？')){entries=entries.filter(e=>e.id!==id);save(KEYS.entries,entries);currentIndex=0;filtered=[...entries];renderTopicSelects();renderEditorList();renderQuestion();}};
function posterDefaults(){ return {title:'今日工作记录', type:'work', body:'09:30 整理资料清单\n10:20 核对项目明细表\n14:00 更新学习计划\n16:30 汇总今日记录', image:'', imageMode:'none', opacity:100}; }
function normalizePoster(){ poster = Object.assign(posterDefaults(), poster || {}); }
function posterLines(){ return String(poster.body||'').split(/\n+/).filter(Boolean); }
function renderPoster(){
  normalizePoster();
  $('#fakeTitle').value=poster.title; $('#fakeBody').value=poster.body; $('#fakeOpacity').value=poster.opacity;
  $('#fakeType').value=poster.type || 'work'; $('#fakeImage').value=poster.image || ''; $('#fakeImageMode').value=poster.imageMode || 'none';
  const img = poster.image && poster.imageMode==='card' ? `<img class="preview-img" src="${esc(poster.image)}" alt="伪装图片">` : '';
  const bg = poster.image && poster.imageMode==='watermark' ? `style="background-image:linear-gradient(rgba(249,251,247,.86),rgba(249,251,247,.86)),url('${esc(poster.image)}')"` : '';
  $('#fakePreview').style.opacity=poster.opacity/100;
  $('#fakePreview').innerHTML=`<div class="preview-card" ${bg}><div class="preview-card-title">${esc(poster.title)}</div><div class="preview-lines">${esc(poster.body)}</div>${img}</div>`;
}
function savePosterFromForm(){
  poster={title:$('#fakeTitle').value || '今日工作记录', type:$('#fakeType').value, body:$('#fakeBody').value, image:$('#fakeImage').value, imageMode:$('#fakeImageMode').value, opacity:+$('#fakeOpacity').value};
  save(KEYS.poster,poster); renderPoster(); renderFakeMode();
}
$('#savePosterBtn').onclick=()=>{ savePosterFromForm(); alert('伪装设置保存好了'); };
$('#enterFakeBtn').onclick=()=>{ savePosterFromForm(); enterFakeMode(); };
$('#bossBtn').onclick=()=>{ savePosterFromForm(); enterFakeMode(); };
$('#resetPosterBtn').onclick=()=>{ poster=posterDefaults(); save(KEYS.poster,poster); renderPoster(); renderFakeMode(); };
$('#fakeImageFile').onchange=e=>{ const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ $('#fakeImage').value=reader.result; $('#fakeImageMode').value='card'; savePosterFromForm(); }; reader.readAsDataURL(file); };
['fakeTitle','fakeBody','fakeOpacity','fakeType','fakeImage','fakeImageMode'].forEach(id=>{ const el=$('#'+id); if(el) el.oninput=renderPoster; });
function renderFakeMode(){
  normalizePoster();
  const lines=posterLines();
  const today=new Date();
  $('#fakeNow').textContent=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}  自动保存中`;
  const typeName = poster.type==='study' ? '学习计划' : poster.type==='notes' ? '资料整理' : '工作记录';
  const list = lines.length ? lines.map(x=>`<li>${esc(x)}</li>`).join('') : '<li>暂无内容</li>';
  const imgCard = poster.image && poster.imageMode==='card' ? `<div class="fake-record-card"><h3>相关图片</h3><img class="fake-card-image" src="${esc(poster.image)}" alt="伪装图片"></div>` : '';
  const watermark = poster.image && poster.imageMode==='watermark' ? `<div class="fake-watermark" style="opacity:${poster.opacity/100};background-image:url('${esc(poster.image)}')"></div>` : '';
  $('#fakeContent').innerHTML=`${watermark}<div class="fake-content-inner"><h1 class="fake-doc-title">${esc(poster.title)}</h1><div class="fake-doc-sub">${typeName} · 仅本人可见 · 已同步</div><div class="fake-card-grid"><div class="fake-record-card"><h3>今日事项</h3><ul class="fake-record-list">${list}</ul><table class="fake-record-table"><tr><th>状态</th><th>数量</th><th>备注</th></tr><tr><td>已完成</td><td>${Math.max(1, lines.length-1)}</td><td>按计划推进</td></tr><tr><td>待确认</td><td>1</td><td>明日继续跟进</td></tr></table></div>${imgCard || `<div class="fake-record-card"><h3>提醒</h3><p>请按时间顺序整理记录，保持内容完整。</p><p>页面会自动保存当前资料。</p></div>`}</div></div>`;
}
function enterFakeMode(){ renderFakeMode(); document.body.classList.add('fake-mode-hidden'); $('#fakeMode').classList.remove('hidden'); $('#fakeMode').setAttribute('aria-hidden','false'); }
function exitFakeMode(){ document.body.classList.remove('fake-mode-hidden'); $('#fakeMode').classList.add('hidden'); $('#fakeMode').setAttribute('aria-hidden','true'); }
$('#exitFakeBtn').onclick=exitFakeMode;
document.addEventListener('keydown',e=>{ if(e.key==='F2'){ e.preventDefault(); savePosterFromForm(); enterFakeMode(); } if(e.key==='Escape' && !$('#fakeMode').classList.contains('hidden')) exitFakeMode(); });
function applySettings(){ $('#shuffleToggle').checked=settings.shuffle; $('#autoHideToggle').checked=settings.autoHide; $('#largeFontToggle').checked=settings.largeFont; document.body.classList.toggle('large-font', settings.largeFont); ['shuffleToggle','autoHideToggle','largeFontToggle'].forEach(id=>$('#'+id).onchange=()=>{ settings={shuffle:$('#shuffleToggle').checked, autoHide:$('#autoHideToggle').checked, largeFont:$('#largeFontToggle').checked}; save(KEYS.settings,settings); applySettings(); }); }
function renderStats(){ const total=entries.length; const right=Object.values(progress).reduce((s,p)=>s+(p.right||0),0); const wrong=Object.values(progress).reduce((s,p)=>s+(p.wrong||0),0); const hard=Object.values(progress).reduce((s,p)=>s+(p.hard||0),0); $('#statsText').innerHTML=`题库共 <b>${total}</b> 条；正确 <b>${right}</b> 次；错误 <b>${wrong}</b> 次；不熟悉 <b>${hard}</b> 次。`; }
function esc(str=''){return String(str).replace(/[&<>"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]))}
init();

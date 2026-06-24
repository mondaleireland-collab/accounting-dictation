const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const KEYS = {
  entries: 'acct_entries_v4',
  progress: 'acct_progress_v4',
  poster: 'acct_poster_v4'
};

let entries = load(KEYS.entries, DEFAULT_ENTRIES);
let progress = load(KEYS.progress, {});
let poster = load(KEYS.poster, posterDefaults());

let sequenceList = [...entries];
let currentIndex = 0;
let randomIndex = 0;
let onlyHard = false;

function load(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch(e){ return fallback; }
}
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function esc(str=''){
  return String(str).replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}
function topics(){ return [...new Set(entries.map(e => e.topic))]; }
function currentSequence(){ return sequenceList[currentIndex]; }
function currentRandom(){ return entries[randomIndex]; }

function init(){
  bindTabs();
  renderTopicSelects();
  renderPractice();
  pickRandom();
  renderCatalog();
  renderEditorList();
  renderPoster();
}

function bindTabs(){
  $$('.tab').forEach(btn => {
    btn.onclick = () => {
      $$('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.panel').forEach(p => p.classList.remove('active-panel'));
      $('#' + btn.dataset.page).classList.add('active-panel');
      renderCatalog();
    };
  });
}

function renderTopicSelects(){
  const opts = ['全部专题', ...topics()].map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
  $('#topicSelect').innerHTML = opts;
  $('#catalogTopicFilter').innerHTML = opts;
  $('#topicSelect').onchange = filterPractice;
  $('#catalogTopicFilter').onchange = renderCatalog;
}

function filterPractice(){
  const val = $('#topicSelect').value;
  sequenceList = val === '全部专题' ? [...entries] : entries.filter(e => e.topic === val);
  currentIndex = 0;
  renderPractice();
}

function fillQuestion(prefix, item){
  if(!item){
    $(`#${prefix}QuestionText`).textContent = '暂无题目';
    $(`#${prefix}QuestionMeta`).textContent = '';
    $(`#${prefix}AnswerText`).textContent = '';
    return;
  }
  $(`#${prefix}QuestionText`).textContent = item.question || `${item.item || item.title}的会计处理`;
  $(`#${prefix}QuestionMeta`).textContent = `${item.topic} ｜ ${item.title}`;
  $(`#${prefix}AnswerText`).textContent = item.answer || '';
  $(`#${prefix}AnswerBox`).classList.add('hidden');
  const input = prefix === '' ? $('#answerInput') : $('#randomAnswerInput');
  input.value = '';
}

function renderPractice(){
  if(!sequenceList.length){ sequenceList = [...entries]; currentIndex = 0; }
  const item = currentSequence();
  $('#questionText').textContent = item ? item.question : '暂无题目，请到“编辑”里新增。';
  $('#questionMeta').textContent = item ? `${item.topic} ｜ ${item.title}` : '';
  $('#answerText').textContent = item ? item.answer : '';
  $('#answerBox').classList.add('hidden');
  $('#answerInput').value = '';
}

function pickRandom(){
  if(!entries.length) return;
  if(entries.length === 1) randomIndex = 0;
  else {
    let n;
    do { n = Math.floor(Math.random() * entries.length); } while(n === randomIndex);
    randomIndex = n;
  }
  const item = currentRandom();
  $('#randomQuestionText').textContent = item.question;
  $('#randomQuestionMeta').textContent = `${item.topic} ｜ ${item.title}`;
  $('#randomAnswerText').textContent = item.answer;
  $('#randomAnswerBox').classList.add('hidden');
  $('#randomAnswerInput').value = '';
}

function ensureProgress(item){
  if(!item) return null;
  progress[item.id] ||= { right:0, wrong:0, hard:0 };
  return progress[item.id];
}

function mark(item, type){
  const p = ensureProgress(item);
  if(!p) return;
  if(type === 'right') p.right++;
  if(type === 'wrong') p.wrong++;
  if(type === 'hard') p.hard++;
  save(KEYS.progress, progress);
  renderCatalog();
}

$('#showAnswerBtn').onclick = () => $('#answerBox').classList.toggle('hidden');
$('#markRightBtn').onclick = () => mark(currentSequence(), 'right');
$('#markWrongBtn').onclick = () => mark(currentSequence(), 'wrong');
$('#markHardBtn').onclick = () => mark(currentSequence(), 'hard');
$('#nextBtn').onclick = () => {
  if(!sequenceList.length) return;
  currentIndex = (currentIndex + 1) % sequenceList.length;
  renderPractice();
};

$('#randomShowAnswerBtn').onclick = () => $('#randomAnswerBox').classList.toggle('hidden');
$('#randomMarkRightBtn').onclick = () => mark(currentRandom(), 'right');
$('#randomMarkWrongBtn').onclick = () => mark(currentRandom(), 'wrong');
$('#randomMarkHardBtn').onclick = () => mark(currentRandom(), 'hard');
$('#randomNextBtn').onclick = pickRandom;
$('#randomPickBtn').onclick = pickRandom;

function renderCatalog(){
  const q = ($('#searchInput').value || '').trim();
  const topic = $('#catalogTopicFilter').value || '全部专题';
  let list = entries.filter(e =>
    (topic === '全部专题' || e.topic === topic) &&
    (!q || `${e.topic}${e.title}${e.item}${e.question}${e.answer}`.includes(q))
  );
  if(onlyHard) list = list.filter(e => (progress[e.id]?.wrong || 0) + (progress[e.id]?.hard || 0) > 0);

  $('#catalogBody').innerHTML = list.map(e => {
    const originalIndex = entries.findIndex(x => x.id === e.id) + 1;
    const p = progress[e.id] || {};
    return `<tr>
      <td>${originalIndex}</td>
      <td><span class="tag">${esc(e.topic)}</span></td>
      <td><b>${esc(e.title)}</b><br><span class="muted">${esc(e.question)}</span></td>
      <td>${p.wrong || 0}/${p.hard || 0}</td>
    </tr>`;
  }).join('');
}

$('#searchInput').oninput = renderCatalog;
$('#onlyHardBtn').onclick = () => { onlyHard = true; renderCatalog(); };
$('#resetFilterBtn').onclick = () => {
  onlyHard = false;
  $('#searchInput').value = '';
  $('#catalogTopicFilter').value = '全部专题';
  renderCatalog();
};

$('#exportBtn').onclick = () => {
  const blob = new Blob([JSON.stringify({entries, progress, poster}, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '中级会计分录默写数据.json';
  a.click();
};

$('#importInput').onchange = e => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      entries = data.entries || entries;
      progress = data.progress || progress;
      poster = data.poster || poster;
      save(KEYS.entries, entries);
      save(KEYS.progress, progress);
      save(KEYS.poster, poster);
      location.reload();
    }catch(err){
      alert('导入失败：文件格式不对');
    }
  };
  reader.readAsText(file);
};

$('#restoreBtn').onclick = () => {
  if(confirm('确定恢复原版题库？你自己编辑的题库会被覆盖。')){
    localStorage.removeItem(KEYS.entries);
    localStorage.removeItem(KEYS.progress);
    location.reload();
  }
};

function renderEditorList(){
  $('#editorList').innerHTML = entries.map((e,i) => `
    <div class="editor-item ${i===currentIndex ? 'active' : ''}" data-i="${i}">
      <b>${i+1}. ${esc(e.question)}</b><br>
      <small>${esc(e.topic)} ｜ ${esc(e.title)}</small>
    </div>`).join('');
  $$('.editor-item').forEach(el => el.onclick = () => {
    currentIndex = +el.dataset.i;
    fillForm(entries[currentIndex]);
    renderEditorList();
  });
  fillForm(entries[currentIndex] || {});
}

function fillForm(e){
  $('#entryId').value = e.id || '';
  $('#entryTopic').value = e.topic || '';
  $('#entryTitle').value = e.title || '';
  $('#entryQuestion').value = e.question || '';
  $('#entryAnswer').value = e.answer || '';
}

$('#entryForm').onsubmit = e => {
  e.preventDefault();
  const obj = {
    id: $('#entryId').value || 'e' + Date.now(),
    topic: $('#entryTopic').value.trim(),
    title: $('#entryTitle').value.trim(),
    item: $('#entryQuestion').value.replace(/的会计处理$/,'').trim(),
    question: $('#entryQuestion').value.trim(),
    answer: $('#entryAnswer').value.trim()
  };
  const idx = entries.findIndex(x => x.id === obj.id);
  if(idx >= 0) entries[idx] = obj;
  else entries.push(obj);
  save(KEYS.entries, entries);
  sequenceList = [...entries];
  renderTopicSelects();
  renderEditorList();
  renderPractice();
  renderCatalog();
  alert('保存好了');
};
$('#newEntryBtn').onclick = () => fillForm({id:'',topic:'',title:'',question:'',answer:''});
$('#deleteEntryBtn').onclick = () => {
  const id = $('#entryId').value;
  if(!id) return;
  if(confirm('确定删除当前分录？')){
    entries = entries.filter(e => e.id !== id);
    save(KEYS.entries, entries);
    currentIndex = 0;
    sequenceList = [...entries];
    renderTopicSelects();
    renderEditorList();
    renderPractice();
    renderCatalog();
  }
};

function posterDefaults(){
  return {
    title:'今日工作记录',
    type:'table',
    body:'09:30 核对项目明细\n10:20 更新数据表格\n14:00 汇总待处理事项\n16:30 整理今日工作记录',
    image:'',
    imageMode:'none',
    opacity:88
  };
}
function normalizePoster(){ poster = Object.assign(posterDefaults(), poster || {}); }
function posterLines(){ return String(poster.body || '').split(/\n+/).filter(Boolean); }

function renderPoster(){
  normalizePoster();
  $('#fakeTitle').value = poster.title;
  $('#fakeType').value = poster.type;
  $('#fakeBody').value = poster.body;
  $('#fakeImage').value = poster.image;
  $('#fakeImageMode').value = poster.imageMode;
  $('#fakeOpacity').value = poster.opacity;

  const lines = posterLines();
  const rows = lines.map((x,i) => `<tr><td>${i+1}</td><td>${esc(x)}</td><td>进行中</td><td>正常</td></tr>`).join('');
  const img = poster.image && poster.imageMode === 'card'
    ? `<img class="preview-img" src="${esc(poster.image)}" alt="伪装图片">` : '';
  const bg = poster.image && poster.imageMode === 'watermark'
    ? `style="background-image:linear-gradient(rgba(255,255,255,.84),rgba(255,255,255,.84)),url('${esc(poster.image)}')"` : '';

  $('#fakePreview').style.opacity = (poster.opacity || 88) / 100;
  $('#fakePreview').innerHTML = `<div class="preview-card" ${bg}>
    <div class="preview-card-title">${esc(poster.title)}</div>
    <table class="fake-table">
      <tr><th>序号</th><th>事项</th><th>状态</th><th>备注</th></tr>
      ${rows || '<tr><td>1</td><td>暂无内容</td><td>待处理</td><td>-</td></tr>'}
    </table>
    ${img}
  </div>`;
}

function savePosterFromForm(){
  poster = {
    title: $('#fakeTitle').value || '今日工作记录',
    type: $('#fakeType').value || 'table',
    body: $('#fakeBody').value || '',
    image: $('#fakeImage').value || '',
    imageMode: $('#fakeImageMode').value || 'none',
    opacity: +$('#fakeOpacity').value || 88
  };
  save(KEYS.poster, poster);
  renderPoster();
  renderFakeMode();
}

$('#savePosterBtn').onclick = () => { savePosterFromForm(); alert('伪装设置保存好了'); };
$('#enterFakeBtn').onclick = () => { savePosterFromForm(); enterFakeMode(); };
$('#bossBtn').onclick = () => { savePosterFromForm(); enterFakeMode(); };
$('#resetPosterBtn').onclick = () => { poster = posterDefaults(); save(KEYS.poster, poster); renderPoster(); };
$('#fakeImageFile').onchange = e => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    $('#fakeImage').value = reader.result;
    $('#fakeImageMode').value = 'card';
    savePosterFromForm();
  };
  reader.readAsDataURL(file);
};
['fakeTitle','fakeType','fakeBody','fakeImage','fakeImageMode','fakeOpacity'].forEach(id => {
  const el = $('#' + id);
  if(el) el.oninput = renderPoster;
});

function renderFakeMode(){
  normalizePoster();
  const lines = posterLines();
  const today = new Date();
  const dateText = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const watermark = poster.image && poster.imageMode === 'watermark'
    ? `<div class="fake-watermark" style="opacity:${(poster.opacity||88)/100};background-image:url('${esc(poster.image)}')"></div>` : '';
  const imageCard = poster.image && poster.imageMode === 'card'
    ? `<div class="fake-record-card"><h3>附件预览</h3><img class="fake-card-image" src="${esc(poster.image)}" alt="附件"></div>` : '';

  let main = '';
  if(poster.type === 'table'){
    const rows = lines.map((x,i) => `<tr><td>${i+1}</td><td>${esc(x)}</td><td>进行中</td><td>${dateText}</td></tr>`).join('');
    main = `<div class="fake-record-card">
      <h3>项目明细表</h3>
      <table class="fake-table"><tr><th>序号</th><th>事项</th><th>状态</th><th>更新时间</th></tr>${rows}</table>
    </div>`;
  } else if(poster.type === 'todo'){
    main = `<div class="fake-record-card"><h3>待办事项</h3><ul class="fake-record-list">${lines.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
  } else {
    main = `<div class="fake-record-card"><h3>工作记录</h3><ul class="fake-record-list">${lines.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`;
  }

  $('#fakeContent').innerHTML = `${watermark}<div class="fake-content-inner">
    <h1 class="fake-doc-title">${esc(poster.title)}</h1>
    <div class="fake-doc-sub">工作台 · ${dateText} · 自动保存中</div>
    <div class="fake-card-grid">${main}${imageCard || `<div class="fake-record-card"><h3>处理进度</h3><p>当前资料已同步到工作台。</p><p>请按时间顺序更新记录，保持内容完整。</p></div>`}</div>
  </div>`;
}

function enterFakeMode(){
  renderFakeMode();
  document.body.classList.add('fake-mode-hidden');
  $('#fakeMode').classList.remove('hidden');
  $('#fakeMode').setAttribute('aria-hidden','false');
}
function exitFakeMode(){
  document.body.classList.remove('fake-mode-hidden');
  $('#fakeMode').classList.add('hidden');
  $('#fakeMode').setAttribute('aria-hidden','true');
}
$('#exitFakeBtn').onclick = exitFakeMode;
document.addEventListener('keydown', e => {
  if(e.key === 'F2'){ e.preventDefault(); savePosterFromForm(); enterFakeMode(); }
  if(e.key === 'Escape' && !$('#fakeMode').classList.contains('hidden')) exitFakeMode();
});

init();

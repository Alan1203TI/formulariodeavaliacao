import { collection, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from './firebase-config.js';
import { rubrics } from './data.js';

const user = JSON.parse(sessionStorage.getItem('fllUser') || localStorage.getItem('fllUser') || 'null');
if (!user || user.role !== 'admin') location.replace('index.html');
document.getElementById('logout').addEventListener('click', () => {
  sessionStorage.removeItem('fllUser');
  localStorage.removeItem('fllUser');
  location.replace('index.html');
});

let rows = [];
let judges = [];
let teams = [];

function esc(v){ return String(v ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function clean(v){ return String(v ?? '').trim(); }
function teamNameOf(r){ return clean(r.teamName || r.equipeNome || r.name || r.team || ''); }
function dateValue(r){
  if (r.createdAt?.toDate) return r.createdAt.toDate().getTime();
  if (r.createdAtLocal) return Date.parse(String(r.createdAtLocal).replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3')) || 0;
  return 0;
}
function getAnswers(r){ return Array.isArray(r.answers) ? r.answers : []; }
function calcTotal(r){
  const answers = getAnswers(r);
  if (!answers.length && r.total != null) return Number(r.total) || 0;
  return answers.reduce((s,a)=>s+(Number(a.score)||0),0);
}
function calcAwardTotal(r){
  const answers = getAnswers(r);
  if (!answers.length && r.awardTotal != null) return Number(r.awardTotal) || 0;
  return answers.reduce((s,a)=>s+((Number(a.score)||0)*(a.special?2:1)),0);
}
function calcSpecialBonus(r){ return getAnswers(r).filter(a=>a.special).reduce((s,a)=>s+(Number(a.score)||0),0); }

function questionScores(r){
  const answers = getAnswers(r);
  if (!answers.length) return '<span class="muted">Sem respostas detalhadas</span>';
  return `<div class="score-list">${answers.map(a => {
    const title = a.section ? ` title="${esc(a.section)}${a.special ? ' - Core Values, conta em dobro na premiação' : ' - Critério Técnico'}"` : '';
    return `<span class="score-pill ${a.special ? 'special' : ''}"${title}>Q${esc(a.row || '')}: <b>${esc(a.score ?? '-')}</b>${a.special ? ' ⚙️' : ''}</span>`;
  }).join('')}</div>`;
}

function rubricText(r, a){
  const rubric = rubrics[r.type];
  if (!rubric) return '';
  let n = 0;
  for (const item of rubric.items) {
    for (const row of item.rows) {
      n++;
      if (n === Number(a.row)) {
        const idx = Math.max(0, Math.min(3, Number(a.score || 1) - 1));
        const texts = Array.isArray(row) ? row : row.texts;
        return texts[idx] || '';
      }
    }
  }
  return '';
}

function buildDetailHtml(r){
  const answers = getAnswers(r);
  const total = calcTotal(r);
  const bonus = calcSpecialBonus(r);
  const award = calcAwardTotal(r);
  return `
    <h2>Rubrica completa</h2>
    <p><b>${esc(r.typeTitle || r.type)}</b> — Equipe <b>${esc(teamNameOf(r))}</b></p>
    <p>Juiz: <b>${esc(r.judge)}</b> | Sala: <b>${esc(r.room)}</b> | Data: ${esc(r.createdAtLocal)}</p>
    <div class="calc-box">
      <b>Total:</b> ${total} &nbsp; | &nbsp;
      <b>Bônus Core Values:</b> ${bonus} &nbsp; | &nbsp;
      <b>Total Core Values:</b> ${award}
      <small>Total Core Values = Total + soma novamente das questões ⚙️ Core Values.</small>
    </div>
    <div class="detail-list">
      ${answers.map(a => `
        <div class="detail-item ${a.special ? 'special' : ''}">
          <div><b>Q${esc(a.row)}</b> — ${esc(a.section)} ${a.special ? '<span class="gear">⚙️ Core Values</span>' : '<span class="muted">Critério Técnico</span>'}</div>
          <div>Nota: <b>${esc(a.score)}</b>${a.special ? ` | Pontos Core Values: <b>${(Number(a.score)||0)*2}</b>` : ` | Pontos: <b>${esc(a.score)}</b>`}</div>
          <small>${esc(rubricText(r, a))}</small>
          ${a.comment ? `<p><b>Comentário:</b> ${esc(a.comment)}</p>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function openDetails(index){
  const r = rows[index];
  if (!r) return;
  document.getElementById('modalContent').innerHTML = buildDetailHtml(r);
  document.getElementById('detailModal').classList.remove('hidden');
}
window.openDetails = openDetails;

function splitLines(doc, text, x, y, maxWidth, lineHeight){
  const lines = doc.splitTextToSize(String(text || ''), maxWidth);
  lines.forEach(line => { if (y > 282) { doc.addPage(); y = 15; } doc.text(line, x, y); y += lineHeight; });
  return y;
}
function downloadRubricPdf(index){
  const r = rows[index];
  if (!r) return;
  if (!window.jspdf?.jsPDF) { alert('Biblioteca de PDF não carregou. Verifique a conexão com a internet.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 14;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text('FLL - Rubrica de Avaliação', 14, y); y += 8;
  doc.setFontSize(12); doc.text(String(r.typeTitle || r.type), 14, y); y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  y = splitLines(doc, `Equipe: ${teamNameOf(r)} | Juiz: ${r.judge || ''} | Sala: ${r.room || ''} | Data: ${r.createdAtLocal || ''}`, 14, y, 180, 5);
  y += 2;
  doc.setFont('helvetica', 'bold');
  y = splitLines(doc, `Total: ${calcTotal(r)}   |   Total Core Values: ${calcAwardTotal(r)}`, 14, y, 180, 5);
  y += 4;
  doc.setFont('helvetica', 'normal');
  getAnswers(r).forEach(a => {
    if (y > 260) { doc.addPage(); y = 15; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    y = splitLines(doc, `Q${a.row} - ${a.section} - ${a.special ? 'Core Values' : 'Critério Técnico'} - Nota ${a.score}`, 14, y, 180, 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    y = splitLines(doc, rubricText(r, a), 18, y, 174, 4.5);
    if (a.comment) y = splitLines(doc, `Comentário: ${a.comment}`, 18, y, 174, 4.5);
    y += 3;
  });
  const file = `rubrica-${teamNameOf(r).replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-${r.type || 'avaliacao'}.pdf`;
  doc.save(file);
}
window.downloadRubricPdf = downloadRubricPdf;

async function load(){
  const status = document.getElementById('status');
  if (!db) { status.textContent = 'Firebase não inicializado.'; return; }
  status.textContent = 'Carregando avaliações...';
  try {
    const snap = await getDocs(collection(db, 'avaliacoes'));
    rows = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>dateValue(b)-dateValue(a));
    render();
    renderRanking();
    status.textContent = `${rows.length} avaliação(ões) encontrada(s).`;
  } catch (e) {
    console.error(e);
    status.textContent = 'Erro ao carregar avaliações. Confira as regras e a conexão com o Firebase.';
  }
}

async function loadJudges(){
  const tbody = document.querySelector('#judgesTable tbody');
  tbody.innerHTML = '<tr><td colspan="4">Carregando usuários...</td></tr>';
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, 'usuarios'));
    judges = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
    tbody.innerHTML = judges.length ? '' : '<tr><td colspan="4">Nenhum juiz criado ainda.</td></tr>';
    judges.forEach(j => tbody.insertAdjacentHTML('beforeend', `<tr><td>${esc(j.name)}</td><td>${esc(j.user)}</td><td>${esc(j.role)}</td><td>${j.active === false ? 'Inativo' : 'Ativo'}</td></tr>`));
  } catch(e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar usuários. Confira as regras do Firestore.</td></tr>';
  }
}

async function loadTeams(){
  const tbody = document.querySelector('#teamsTable tbody');
  tbody.innerHTML = '<tr><td colspan="3">Carregando equipes...</td></tr>';
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, 'equipes'));
    teams = snap.docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''), 'pt-BR', {numeric:true}));
    tbody.innerHTML = teams.length ? '' : '<tr><td colspan="3">Nenhuma equipe cadastrada ainda.</td></tr>';
    teams.forEach(t => tbody.insertAdjacentHTML('beforeend', `<tr><td><b>${esc(t.name || t.teamName)}</b></td><td>${esc(t.room || '')}</td><td>${t.active === false ? 'Inativa' : 'Ativa'}</td></tr>`));
  } catch(e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="3">Erro ao carregar equipes. Confira as regras do Firestore.</td></tr>';
  }
}

async function createTeam(e){
  e.preventDefault();
  const msg = document.getElementById('teamMsg');
  msg.textContent = 'Salvando equipe...';
  const name = clean(document.getElementById('teamNameInput').value);
  const room = clean(document.getElementById('teamRoomInput').value);
  if (!name) { msg.textContent = 'Preencha o nome da equipe.'; return; }
  try {
    const snap = await getDocs(collection(db, 'equipes'));
    const exists = snap.docs.some(d => clean(d.data().name || d.data().teamName).toLowerCase() === name.toLowerCase());
    if (exists) { msg.textContent = 'Já existe uma equipe cadastrada com esse nome.'; return; }
    await addDoc(collection(db, 'equipes'), { name, room, active:true, createdAt:serverTimestamp(), createdAtLocal:new Date().toLocaleString('pt-BR') });
    msg.textContent = 'Equipe cadastrada com sucesso!';
    e.target.reset();
    loadTeams();
  } catch(err) {
    console.error(err);
    msg.textContent = 'Erro ao salvar equipe. Confira as regras do Firestore.';
  }
}

function render(){
  const team = document.getElementById('filterTeam').value.toLowerCase();
  const type = document.getElementById('filterType').value;
  const tb = document.querySelector('#table tbody');
  tb.innerHTML = '';
  const filtered = rows.filter(r => (!type || r.type === type) && (!team || teamNameOf(r).toLowerCase().includes(team)));
  if (!filtered.length) { tb.innerHTML = '<tr><td colspan="9">Nenhuma avaliação encontrada.</td></tr>'; return; }
  filtered.forEach(r => {
    const originalIndex = rows.indexOf(r);
    tb.insertAdjacentHTML('beforeend', `<tr><td>${esc(r.createdAtLocal)}</td><td>${esc(r.typeTitle || r.type)}</td><td><b>${esc(teamNameOf(r))}</b></td><td>${esc(r.judge)}</td><td>${esc(r.room)}</td><td>${questionScores(r)}</td><td>${esc(calcTotal(r))}</td><td><b>${esc(calcAwardTotal(r))}</b></td><td><div class="actions compact"><button type="button" class="small-btn" onclick="openDetails(${originalIndex})">Ver rubrica</button><button type="button" class="small-btn secondary-small" onclick="downloadRubricPdf(${originalIndex})">Baixar PDF</button></div></td></tr>`);
  });
}

function renderRanking(){
  const tb = document.querySelector('#rankingTable tbody');
  if (!tb) return;
  const map = new Map();
  rows.forEach(r => {
    const name = teamNameOf(r);
    if (!name) return;
    if (!map.has(name)) map.set(name, { team:name, inovacao:0, robo:0, award:0 });
    const obj = map.get(name);
    const total = calcTotal(r);
    const award = calcAwardTotal(r);
    if (r.type === 'inovacao') obj.inovacao = Math.max(obj.inovacao, total);
    if (r.type === 'robo') obj.robo = Math.max(obj.robo, total);
    obj.award = Math.max(obj.award, award);
  });
  const ranking = [...map.values()].map(x => ({...x, geral:x.inovacao + x.robo})).sort((a,b)=>b.geral-a.geral || b.award-a.award || a.team.localeCompare(b.team));
  tb.innerHTML = ranking.length ? '' : '<tr><td colspan="6">Nenhuma avaliação enviada ainda.</td></tr>';
  ranking.forEach((r, i) => tb.insertAdjacentHTML('beforeend', `<tr><td><b>${i+1}º</b></td><td><b>${esc(r.team)}</b></td><td>${r.inovacao || '-'}</td><td>${r.robo || '-'}</td><td><b>${r.geral}</b></td><td>${r.award || '-'}</td></tr>`));
}

function csv(){
  const team = document.getElementById('filterTeam').value.toLowerCase();
  const type = document.getElementById('filterType').value;
  const visibleRows = rows.filter(r => (!type || r.type === type) && (!team || teamNameOf(r).toLowerCase().includes(team)));
  let out = 'Data;Tipo;Equipe;Juiz;Sala;Q1;Q2;Q3;Q4;Q5;Q6;Q7;Q8;Q9;Q10;Total;Total Core Values;Respostas Detalhadas\n';
  visibleRows.forEach(r => {
    const answers = getAnswers(r);
    const qScores = Array.from({length:10}, (_,i)=>{ const found = answers.find(a=>Number(a.row)===i+1); return found ? `${found.score ?? ''}${found.special ? ' ⚙️' : ''}` : ''; });
    const detailed = answers.map(a => `${a.section} linha ${a.row}: ${a.score}${a.special ? ' ⚙️ Core Values' : ' Critério Técnico'}${a.comment ? ' - ' + a.comment : ''}`).join(' | ');
    out += [r.createdAtLocal, r.typeTitle || r.type, teamNameOf(r), r.judge, r.room, ...qScores, calcTotal(r), calcAwardTotal(r), detailed]
      .map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(';') + '\n';
  });
  const blob = new Blob(['\ufeff' + out], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'avaliacoes-fll.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function createJudge(e){
  e.preventDefault();
  const msg = document.getElementById('judgeMsg');
  msg.textContent = 'Criando juiz...';
  const name = clean(document.getElementById('judgeNameInput').value);
  const userName = clean(document.getElementById('judgeUserInput').value);
  const password = document.getElementById('judgePassInput').value;
  if (!name || !userName || !password) { msg.textContent = 'Preencha todos os campos.'; return; }
  try {
    const snap = await getDocs(collection(db, 'usuarios'));
    const exists = snap.docs.some(d => clean(d.data().user) === userName);
    if (exists) { msg.textContent = 'Já existe um usuário com esse login.'; return; }
    await addDoc(collection(db, 'usuarios'), { name, user:userName, password, role:'judge', active:true, createdAt:serverTimestamp(), createdAtLocal:new Date().toLocaleString('pt-BR') });
    msg.textContent = 'Juiz criado com sucesso!';
    e.target.reset();
    loadJudges();
  } catch(err) {
    console.error(err);
    msg.textContent = 'Erro ao criar juiz. Confira as regras do Firestore.';
  }
}

document.getElementById('load').addEventListener('click', load);
document.getElementById('exportCsv').addEventListener('click', csv);
document.getElementById('filterTeam').addEventListener('input', render);
document.getElementById('filterType').addEventListener('change', render);
document.getElementById('judgeForm').addEventListener('submit', createJudge);
document.getElementById('teamForm').addEventListener('submit', createTeam);
document.getElementById('closeModal').addEventListener('click', () => document.getElementById('detailModal').classList.add('hidden'));
document.getElementById('detailModal').addEventListener('click', (e) => { if (e.target.id === 'detailModal') e.currentTarget.classList.add('hidden'); });
load();
loadJudges();
loadTeams();

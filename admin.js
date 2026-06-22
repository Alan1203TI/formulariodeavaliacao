import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
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

function esc(v){ return String(v ?? '').replace(/[&<>\"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m])); }
function dateValue(r){
  if (r.createdAt?.toDate) return r.createdAt.toDate().getTime();
  if (r.createdAtLocal) return Date.parse(String(r.createdAtLocal).replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3')) || 0;
  return 0;
}

function getAnswers(r) {
  return Array.isArray(r.answers) ? r.answers : [];
}

function calcTotal(r) {
  const answers = getAnswers(r);
  if (!answers.length && r.total != null) return Number(r.total) || 0;
  return answers.reduce((s, a) => s + (Number(a.score) || 0), 0);
}

function calcAwardTotal(r) {
  const answers = getAnswers(r);
  if (!answers.length && r.awardTotal != null) return Number(r.awardTotal) || 0;
  // Regra correta: questão normal conta 1x; questão com ⚙️ conta 2x.
  return answers.reduce((s, a) => s + ((Number(a.score) || 0) * (a.special ? 2 : 1)), 0);
}

function calcSpecialBonus(r) {
  return getAnswers(r).filter(a => a.special).reduce((s, a) => s + (Number(a.score) || 0), 0);
}

function questionScores(r) {
  const answers = getAnswers(r);
  if (!answers.length) return '<span class="muted">Sem respostas detalhadas</span>';
  return `<div class="score-list">${answers.map(a => {
    const label = `Q${a.row || ''}`;
    const sec = a.section ? ` title="${esc(a.section)}${a.special ? ' - critério especial, conta em dobro na premiação' : ''}"` : '';
    const gear = a.special ? ' ⚙️' : '';
    return `<span class="score-pill ${a.special ? 'special' : ''}"${sec}>${esc(label)}: <b>${esc(a.score ?? '-')}</b>${gear}</span>`;
  }).join('')}</div>`;
}

function rubricText(r, a) {
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

function openDetails(index) {
  const r = rows[index];
  if (!r) return;
  const answers = getAnswers(r);
  const total = calcTotal(r);
  const bonus = calcSpecialBonus(r);
  const award = calcAwardTotal(r);
  const html = `
    <h2>Rubrica completa</h2>
    <p><b>${esc(r.typeTitle || r.type)}</b> — Equipe <b>${esc(r.teamNumber)} - ${esc(r.teamName)}</b></p>
    <p>Juiz: <b>${esc(r.judge)}</b> | Sala: <b>${esc(r.room)}</b> | Data: ${esc(r.createdAtLocal)}</p>
    <div class="calc-box">
      <b>Total:</b> ${total} &nbsp; | &nbsp;
      <b>Bônus ⚙️:</b> ${bonus} &nbsp; | &nbsp;
      <b>Total Premiação:</b> ${award}
      <small>Total Premiação = Total + soma novamente das questões ⚙️.</small>
    </div>
    <div class="detail-list">
      ${answers.map(a => `
        <div class="detail-item ${a.special ? 'special' : ''}">
          <div><b>Q${esc(a.row)}</b> — ${esc(a.section)} ${a.special ? '<span class="gear">⚙️ Critério especial</span>' : '<span class="muted">Critério normal</span>'}</div>
          <div>Nota: <b>${esc(a.score)}</b>${a.special ? ` | Pontos para premiação: <b>${(Number(a.score)||0)*2}</b>` : ` | Pontos para premiação: <b>${esc(a.score)}</b>`}</div>
          <small>${esc(rubricText(r, a))}</small>
          ${a.comment ? `<p><b>Comentário:</b> ${esc(a.comment)}</p>` : ''}
        </div>
      `).join('')}
    </div>
    ${r.generalNotes ? `<p><b>Observações gerais:</b> ${esc(r.generalNotes)}</p>` : ''}
  `;
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('detailModal').classList.remove('hidden');
}
window.openDetails = openDetails;

async function load() {
  const status = document.getElementById('status');
  if (!db) { status.textContent = 'Firebase não inicializado.'; return; }
  status.textContent = 'Carregando avaliações...';
  try {
    const snap = await getDocs(collection(db, 'avaliacoes'));
    rows = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => dateValue(b) - dateValue(a));
    render();
    status.textContent = `${rows.length} avaliação(ões) encontrada(s).`;
  } catch (e) {
    console.error(e);
    status.textContent = 'Erro ao carregar avaliações. Publique as regras do FIREBASE-REGRAS.txt no Firestore.';
  }
}

async function loadJudges() {
  const tbody = document.querySelector('#judgesTable tbody');
  tbody.innerHTML = '<tr><td colspan="4">Carregando usuários...</td></tr>';
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, 'usuarios'));
    judges = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
    tbody.innerHTML = judges.length ? '' : '<tr><td colspan="4">Nenhum juiz criado ainda.</td></tr>';
    judges.forEach(j => tbody.insertAdjacentHTML('beforeend', `<tr><td>${esc(j.name)}</td><td>${esc(j.user)}</td><td>${esc(j.role)}</td><td>${j.active === false ? 'Inativo' : 'Ativo'}</td></tr>`));
  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar usuários. Publique as regras do FIREBASE-REGRAS.txt no Firestore.</td></tr>';
  }
}


async function loadTeams() {
  const tbody = document.querySelector('#teamsTable tbody');
  tbody.innerHTML = '<tr><td colspan="4">Carregando equipes...</td></tr>';
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, 'equipes'));
    teams = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>String(a.number||'').localeCompare(String(b.number||''), 'pt-BR', {numeric:true}));
    tbody.innerHTML = teams.length ? '' : '<tr><td colspan="4">Nenhuma equipe cadastrada ainda.</td></tr>';
    teams.forEach(t => tbody.insertAdjacentHTML('beforeend', `<tr><td><b>${esc(t.number)}</b></td><td>${esc(t.name)}</td><td>${esc(t.room || '')}</td><td>${t.active === false ? 'Inativa' : 'Ativa'}</td></tr>`));
  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar equipes. Confira as regras do Firestore.</td></tr>';
  }
}

async function createTeam(e) {
  e.preventDefault();
  const msg = document.getElementById('teamMsg');
  msg.textContent = 'Salvando equipe...';
  const number = document.getElementById('teamNumberInput').value.trim();
  const name = document.getElementById('teamNameInput').value.trim();
  const room = document.getElementById('teamRoomInput').value.trim();
  if (!number || !name) { msg.textContent = 'Preencha número e nome da equipe.'; return; }
  if (!db) { msg.textContent = 'Firebase não inicializado.'; return; }
  try {
    const snap = await getDocs(collection(db, 'equipes'));
    const exists = snap.docs.some(d => String(d.data().number || '').trim().toLowerCase() === number.toLowerCase());
    if (exists) { msg.textContent = 'Já existe uma equipe cadastrada com esse número.'; return; }
    await addDoc(collection(db, 'equipes'), { number, name, room, active: true, createdAt: serverTimestamp(), createdAtLocal: new Date().toLocaleString('pt-BR') });
    msg.textContent = 'Equipe cadastrada com sucesso!';
    e.target.reset();
    loadTeams();
  } catch (err) {
    console.error(err);
    msg.textContent = 'Erro ao salvar equipe. Confira as regras do Firestore.';
  }
}

function render() {
  const team = document.getElementById('filterTeam').value.toLowerCase();
  const type = document.getElementById('filterType').value;
  const tb = document.querySelector('#table tbody');
  tb.innerHTML = '';
  const filtered = rows.filter(r => (!type || r.type === type) && (!team || `${r.teamNumber} ${r.teamName}`.toLowerCase().includes(team)));
  if (!filtered.length) { tb.innerHTML = '<tr><td colspan="11">Nenhuma avaliação encontrada.</td></tr>'; return; }
  filtered.forEach(r => {
    const originalIndex = rows.indexOf(r);
    const total = calcTotal(r);
    const award = calcAwardTotal(r);
    const avg = getAnswers(r).length ? (total / getAnswers(r).length).toFixed(2) : (r.avg || '');
    tb.insertAdjacentHTML('beforeend', `<tr><td>${esc(r.createdAtLocal)}</td><td>${esc(r.typeTitle || r.type)}</td><td><b>${esc(r.teamNumber)}</b> - ${esc(r.teamName)}</td><td>${esc(r.judge)}</td><td>${esc(r.room)}</td><td>${questionScores(r)}</td><td>${esc(total)}</td><td><b>${esc(award)}</b></td><td>${esc(avg)}</td><td><button type="button" class="small-btn" onclick="openDetails(${originalIndex})">Ver rubrica</button></td><td>${esc(r.generalNotes)}</td></tr>`);
  });
}

function csv() {
  const visibleRows = rows.filter(r => {
    const team = document.getElementById('filterTeam').value.toLowerCase();
    const type = document.getElementById('filterType').value;
    return (!type || r.type === type) && (!team || `${r.teamNumber} ${r.teamName}`.toLowerCase().includes(team));
  });
  let out = 'Data;Tipo;Equipe Numero;Equipe Nome;Juiz;Sala;Q1;Q2;Q3;Q4;Q5;Q6;Q7;Q8;Q9;Q10;Total;Total Premiacao;Media;Observacoes;Respostas Detalhadas\n';
  visibleRows.forEach(r => {
    const answers = Array.isArray(r.answers) ? r.answers : [];
    const qScores = Array.from({ length: 10 }, (_, i) => {
      const found = answers.find(a => Number(a.row) === i + 1);
      return found ? `${found.score ?? ''}${found.special ? ' ⚙️' : ''}` : '';
    });
    const detailed = answers.map(a => `${a.section} linha ${a.row}: ${a.score}${a.special ? ' ⚙️' : ''}${a.comment ? ' - ' + a.comment : ''}`).join(' | ');
    out += [r.createdAtLocal, r.typeTitle, r.teamNumber, r.teamName, r.judge, r.room, ...qScores, calcTotal(r), calcAwardTotal(r), (getAnswers(r).length ? (calcTotal(r) / getAnswers(r).length).toFixed(2) : (r.avg || '')), r.generalNotes, detailed].map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(';') + '\n';
  });
  const blob = new Blob(['\ufeff' + out], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'avaliacoes-fll.csv';
  a.click();
}

async function createJudge(e) {
  e.preventDefault();
  const msg = document.getElementById('judgeMsg');
  msg.textContent = 'Criando usuário...';
  const name = document.getElementById('judgeNameInput').value.trim();
  const userName = document.getElementById('judgeUserInput').value.trim();
  const password = document.getElementById('judgePassInput').value.trim();
  if (!name || !userName || !password) { msg.textContent = 'Preencha nome, usuário e senha.'; return; }
  if (!db) { msg.textContent = 'Firebase não inicializado.'; return; }
  try {
    const snap = await getDocs(collection(db, 'usuarios'));
    const exists = snap.docs.some(d => String(d.data().user || '').trim() === userName);
    if (exists) { msg.textContent = 'Já existe um usuário com esse login.'; return; }
    await addDoc(collection(db, 'usuarios'), { name, user: userName, password, role: 'judge', active: true, createdAt: serverTimestamp(), createdAtLocal: new Date().toLocaleString('pt-BR') });
    msg.textContent = 'Juiz criado com sucesso!';
    e.target.reset();
    loadJudges();
  } catch (err) {
    console.error(err);
    msg.textContent = 'Erro ao criar juiz. Publique as regras do FIREBASE-REGRAS.txt no Firestore.';
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

import { collection, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from './firebase-config.js';

const user = JSON.parse(sessionStorage.getItem('fllUser') || localStorage.getItem('fllUser') || 'null');
if (!user || user.role !== 'admin') location.replace('index.html');
document.getElementById('logout').addEventListener('click', () => {
  sessionStorage.removeItem('fllUser');
  localStorage.removeItem('fllUser');
  location.replace('index.html');
});

let rows = [];
let judges = [];

function esc(v){ return String(v ?? '').replace(/[&<>\"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m])); }
function dateValue(r){
  if (r.createdAt?.toDate) return r.createdAt.toDate().getTime();
  if (r.createdAtLocal) return Date.parse(String(r.createdAtLocal).replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3')) || 0;
  return 0;
}

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

function render() {
  const team = document.getElementById('filterTeam').value.toLowerCase();
  const type = document.getElementById('filterType').value;
  const tb = document.querySelector('#table tbody');
  tb.innerHTML = '';
  const filtered = rows.filter(r => (!type || r.type === type) && (!team || `${r.teamNumber} ${r.teamName}`.toLowerCase().includes(team)));
  if (!filtered.length) { tb.innerHTML = '<tr><td colspan="9">Nenhuma avaliação encontrada.</td></tr>'; return; }
  filtered.forEach(r => {
    tb.insertAdjacentHTML('beforeend', `<tr><td>${esc(r.createdAtLocal)}</td><td>${esc(r.typeTitle || r.type)}</td><td><b>${esc(r.teamNumber)}</b> - ${esc(r.teamName)}</td><td>${esc(r.judge)}</td><td>${esc(r.room)}</td><td>${esc(r.total)}</td><td>${esc(r.awardTotal ?? '')}</td><td>${esc(r.avg)}</td><td>${esc(r.generalNotes)}</td></tr>`);
  });
}

function csv() {
  const visibleRows = rows.filter(r => {
    const team = document.getElementById('filterTeam').value.toLowerCase();
    const type = document.getElementById('filterType').value;
    return (!type || r.type === type) && (!team || `${r.teamNumber} ${r.teamName}`.toLowerCase().includes(team));
  });
  let out = 'Data;Tipo;Equipe Numero;Equipe Nome;Juiz;Sala;Total;Total Premiacao;Media;Observacoes;Respostas\n';
  visibleRows.forEach(r => { out += [r.createdAtLocal, r.typeTitle, r.teamNumber, r.teamName, r.judge, r.room, r.total, r.awardTotal ?? '', r.avg, r.generalNotes, (r.answers || []).map(a => `${a.section} linha ${a.row}: ${a.score}${a.special ? ' ⚙️' : ''}${a.comment ? ' - ' + a.comment : ''}`).join(' | ')].map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(';') + '\n'; });
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
load();
loadJudges();

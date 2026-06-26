import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from './firebase-config.js';
import { rubrics } from './data.js';

const user = JSON.parse(sessionStorage.getItem('fllUser') || localStorage.getItem('fllUser') || 'null');
if (!user || user.role !== 'admin') location.replace('index.html');
document.getElementById('logout').addEventListener('click', () => { sessionStorage.removeItem('fllUser'); localStorage.removeItem('fllUser'); location.replace('index.html'); });

let rows = [];
let judges = [];
let teams = [];

function esc(v){ return String(v ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m])); }
function dateValue(r){ if (r.createdAt?.toDate) return r.createdAt.toDate().getTime(); if (r.createdAtLocal) return Date.parse(String(r.createdAtLocal).replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3')) || 0; return 0; }
function getAnswers(r){ return Array.isArray(r.answers) ? r.answers : []; }
function calcTotal(r){ const answers = getAnswers(r); if (!answers.length && r.total != null) return Number(r.total) || 0; return answers.reduce((s,a)=>s+(Number(a.score)||0),0); }
function calcAwardTotal(r){ return calcTotal(r); }
function teamNameOf(r){ return r.teamName || r.team || r.equipe || ''; }
function questionScores(r){ const answers = getAnswers(r); if(!answers.length) return '<span class="muted">Sem respostas detalhadas</span>'; return `<div class="score-list">${answers.map(a=>`<span class="score-pill ${a.special?'special':''}" title="${esc(a.section || '')}">Q${esc(a.row || '')}: <b>${esc(a.score ?? '-')}</b>${a.special?' ⚙️':''}</span>`).join('')}</div>`; }
function rubricText(r,a){ const rubric = rubrics[r.type]; if(!rubric) return ''; let n=0; for(const item of rubric.items){ for(const row of item.rows){ n++; if(n===Number(a.row)){ const idx=Math.max(0,Math.min(3,Number(a.score||1)-1)); const texts=Array.isArray(row)?row:row.texts; return texts[idx]||''; } } } return ''; }

function renderRanking(){
  const tb = document.querySelector('#rankingTable tbody');
  const map = new Map();
  rows.forEach(r=>{
    const name = teamNameOf(r).trim();
    if(!name) return;
    if(!map.has(name)) map.set(name, { equipe:name, inovacao:0, robo:0, total:0 });
    const item = map.get(name);
    const value = calcTotal(r);
    if(r.type === 'inovacao') item.inovacao += value;
    else if(r.type === 'robo') item.robo += value;
    item.total += value;
  });
  const ranking = [...map.values()].sort((a,b)=>b.total-a.total || a.equipe.localeCompare(b.equipe));
  tb.innerHTML = ranking.length ? '' : '<tr><td colspan="5">Nenhuma avaliação enviada ainda.</td></tr>';
  ranking.forEach((r,i)=>tb.insertAdjacentHTML('beforeend', `<tr><td><b>${i+1}º</b></td><td>${esc(r.equipe)}</td><td>${esc(r.inovacao)}</td><td>${esc(r.robo)}</td><td><b>${esc(r.total)}</b></td></tr>`));
}

function openDetails(index){
  const r = rows[index]; if(!r) return;
  const answers = getAnswers(r); const total = calcTotal(r);
  document.getElementById('modalContent').innerHTML = `
    <h2>Rubrica completa</h2>
    <p><b>${esc(r.typeTitle || r.type)}</b> — Equipe <b>${esc(teamNameOf(r))}</b></p>
    <p>Sala: <b>${esc(r.room)}</b> | Data: ${esc(r.createdAtLocal)}</p>
    <div class="calc-box"><b>Total:</b> ${total}<small>Critério Técnico e Core Values contam com o mesmo peso.</small></div>
    ${r.generalComment ? `<div class="detail-item"><b>Comentário geral:</b><p>${esc(r.generalComment)}</p></div>` : ''}
    <div class="detail-list">${answers.map(a=>`<div class="detail-item ${a.special?'special':''}"><div><b>Q${esc(a.row)}</b> — ${esc(a.section)} ${a.special?'<span class="gear">⚙️ Core Values</span>':'<span class="muted">Critério Técnico</span>'}</div><div>Nota: <b>${esc(a.score)}</b></div><small>${esc(rubricText(r,a))}</small>${a.comment?`<p><b>Comentário:</b> ${esc(a.comment)}</p>`:''}</div>`).join('')}</div>`;
  document.getElementById('detailModal').classList.remove('hidden');
}

function buildPdfHtml(r){
  const answers = getAnswers(r);
  const total = calcTotal(r);
  const title = esc(r.typeTitle || r.type || 'Rubrica');
  const equipe = esc(teamNameOf(r));
  const sala = esc(r.room || '');
  const data = esc(r.createdAtLocal || new Date().toLocaleString('pt-BR'));
  const generalComment = esc(r.generalComment || '');
  const rowsHtml = answers.map(a=>`
    <tr>
      <td>Q${esc(a.row)}</td>
      <td>${esc(a.section || '')}</td>
      <td>${a.special ? 'Core Values' : 'Critério Técnico'}</td>
      <td class="score">${esc(a.score ?? '')}</td>
      <td>${esc(rubricText(r,a))}${a.comment ? `<br><b>Comentário:</b> ${esc(a.comment)}` : ''}</td>
    </tr>`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title} - ${equipe}</title>
  <style>
    @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;background:#061b12;color:#f3fff0;margin:0;padding:22px}.card{border:1px solid rgba(255,255,255,.18);border-radius:22px;background:linear-gradient(135deg,#123b28,#0a2017);padding:24px}h1{font-size:30px;text-transform:uppercase;margin:0 0 8px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}.meta div,.note{border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:10px 12px;background:rgba(255,255,255,.06)}table{width:100%;border-collapse:separate;border-spacing:0 8px;margin-top:14px}th{font-size:11px;text-transform:uppercase;text-align:left;color:#dff5dc}td{background:rgba(255,255,255,.08);border-top:1px solid rgba(255,255,255,.16);border-bottom:1px solid rgba(255,255,255,.16);padding:10px;font-size:12px;vertical-align:top}td:first-child{border-left:1px solid rgba(255,255,255,.16);border-radius:12px 0 0 12px}td:last-child{border-right:1px solid rgba(255,255,255,.16);border-radius:0 12px 12px 0}.score{font-size:18px;font-weight:900;color:#ffdf4d;text-align:center}.total{font-size:24px;font-weight:900;color:#ffdf4d}.badge{display:inline-block;background:#ffdf4d;color:#08180f;padding:8px 14px;border-radius:999px;font-weight:900;text-transform:uppercase}.footer{margin-top:18px;font-size:11px;color:#d8ead4}@media print{body{background:#061b12;-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none}}
  </style></head><body><div class="card"><div class="badge">FLL - Avaliação Online</div><h1>${title}</h1><div class="meta"><div><b>Equipe:</b><br>${equipe}</div><div><b>Sala:</b><br>${sala}</div><div><b>Data:</b><br>${data}</div><div><b>Total:</b><br><span class="total">${total}</span></div></div><div class="note">Critério Técnico e Core Values contam com o mesmo peso.</div>${generalComment ? `<div class="note"><b>Comentário geral:</b><br>${generalComment}</div>` : ''}<table><thead><tr><th>Questão</th><th>Grupo</th><th>Tipo</th><th>Nota</th><th>Descrição selecionada</th></tr></thead><tbody>${rowsHtml}</tbody></table><div class="footer">Documento gerado pelo sistema FLL - Avaliação Online.</div></div><script>window.onload=()=>{setTimeout(()=>window.print(),400)};<\/script></body></html>`;
}

function downloadEvaluationPdf(index){
  const r = rows[index];
  if(!r) return;
  const html = buildPdfHtml(r);
  const blob = new Blob([html], {type:'text/html;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if(!w){ alert('Permita pop-ups para gerar o PDF da rubrica.'); }
  setTimeout(()=>URL.revokeObjectURL(url), 20000);
}
window.downloadEvaluationPdf = downloadEvaluationPdf;

window.openDetails = openDetails;

async function deleteEvaluation(id){
  if(!id) return;
  if(!confirm('Deseja apagar esta avaliação enviada? Esta ação não pode ser desfeita.')) return;
  try { await deleteDoc(doc(db, 'avaliacoes', id)); await load(); }
  catch(e){ console.error(e); alert('Erro ao apagar avaliação. Confira as regras do Firestore.'); }
}
window.deleteEvaluation = deleteEvaluation;

async function deleteJudge(id, userName){
  if(!id) return;
  if(String(userName||'') === 'admin'){ alert('O usuário admin padrão não pode ser apagado por aqui.'); return; }
  if(!confirm(`Deseja apagar o usuário ${userName}?`)) return;
  try { await deleteDoc(doc(db, 'usuarios', id)); await loadJudges(); }
  catch(e){ console.error(e); alert('Erro ao apagar usuário. Confira as regras do Firestore.'); }
}
window.deleteJudge = deleteJudge;

async function load(){
  const status = document.getElementById('status');
  if(!db){ status.textContent='Firebase não inicializado.'; return; }
  status.textContent='Carregando avaliações...';
  try { const snap = await getDocs(collection(db,'avaliacoes')); rows = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>dateValue(b)-dateValue(a)); render(); renderRanking(); status.textContent = `${rows.length} avaliação(ões) encontrada(s).`; }
  catch(e){ console.error(e); status.textContent='Erro ao carregar avaliações. Confira as regras do Firestore.'; }
}

async function loadJudges(){
  const tbody=document.querySelector('#judgesTable tbody'); tbody.innerHTML='<tr><td colspan="4">Carregando usuários...</td></tr>'; if(!db) return;
  try { const snap=await getDocs(collection(db,'usuarios')); judges=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.user||'').localeCompare(String(b.user||''))); tbody.innerHTML=judges.length?'':'<tr><td colspan="4">Nenhum usuário criado ainda.</td></tr>'; judges.forEach(j=>tbody.insertAdjacentHTML('beforeend', `<tr><td>${esc(j.user)}</td><td>${esc(j.role || 'judge')}</td><td>${j.active===false?'Inativo':'Ativo'}</td><td><button type="button" class="small-btn danger" onclick="deleteJudge('${esc(j.id)}','${esc(j.user)}')">Apagar</button></td></tr>`)); }
  catch(e){ console.error(e); tbody.innerHTML='<tr><td colspan="4">Erro ao carregar usuários.</td></tr>'; }
}

async function loadTeams(){
  const tbody=document.querySelector('#teamsTable tbody'); tbody.innerHTML='<tr><td colspan="4">Carregando equipes...</td></tr>'; if(!db) return;
  try { const snap=await getDocs(collection(db,'equipes')); teams=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))); tbody.innerHTML=teams.length?'':'<tr><td colspan="4">Nenhuma equipe cadastrada ainda.</td></tr>'; teams.forEach(t=>tbody.insertAdjacentHTML('beforeend', `<tr><td><b>${esc(t.name)}</b></td><td>${esc(t.room || '')}</td><td>${t.active===false?'Inativa':'Ativa'}</td><td><button type="button" class="small-btn danger" onclick="deleteTeam('${esc(t.id)}','${esc(t.name)}')">Excluir</button></td></tr>`)); }
  catch(e){ console.error(e); tbody.innerHTML='<tr><td colspan="4">Erro ao carregar equipes.</td></tr>'; }
}

async function deleteTeam(id, name){
  if(!id) return;
  if(!confirm(`Deseja excluir a equipe ${name}? As avaliações já enviadas dessa equipe não serão apagadas.`)) return;
  try { await deleteDoc(doc(db, 'equipes', id)); await loadTeams(); }
  catch(e){ console.error(e); alert('Erro ao excluir equipe. Confira as regras do Firestore.'); }
}
window.deleteTeam = deleteTeam;

async function createTeam(e){
  e.preventDefault(); const msg=document.getElementById('teamMsg'); msg.textContent='Salvando equipe...'; const name=document.getElementById('teamNameInput').value.trim(); const room=document.getElementById('teamRoomInput').value.trim();
  if(!name){ msg.textContent='Preencha o nome da equipe.'; return; } if(!db){ msg.textContent='Firebase não inicializado.'; return; }
  try { const snap=await getDocs(collection(db,'equipes')); const exists=snap.docs.some(d=>String(d.data().name||'').trim().toLowerCase()===name.toLowerCase()); if(exists){ msg.textContent='Já existe uma equipe cadastrada com esse nome.'; return; } await addDoc(collection(db,'equipes'), { name, room, active:true, createdAt:serverTimestamp(), createdAtLocal:new Date().toLocaleString('pt-BR') }); msg.textContent='Equipe cadastrada com sucesso!'; e.target.reset(); loadTeams(); }
  catch(err){ console.error(err); msg.textContent='Erro ao salvar equipe. Confira as regras do Firestore.'; }
}

function render(){
  const team=document.getElementById('filterTeam').value.toLowerCase(); const type=document.getElementById('filterType').value; const tb=document.querySelector('#table tbody'); tb.innerHTML='';
  const filtered=rows.filter(r=>(!type || r.type===type) && (!team || `${teamNameOf(r)}`.toLowerCase().includes(team)));
  if(!filtered.length){ tb.innerHTML='<tr><td colspan="10">Nenhuma avaliação encontrada.</td></tr>'; return; }
  filtered.forEach(r=>{ const originalIndex=rows.indexOf(r); const total=calcTotal(r); tb.insertAdjacentHTML('beforeend', `<tr><td>${esc(r.createdAtLocal)}</td><td>${esc(r.typeTitle || r.type)}</td><td><b>${esc(teamNameOf(r))}</b></td><td>${esc(r.room)}</td><td>${questionScores(r)}</td><td>${r.generalComment ? esc(r.generalComment) : '<span class="muted">Sem comentário</span>'}</td><td><b>${esc(total)}</b></td><td><button type="button" class="small-btn" onclick="openDetails(${originalIndex})">Ver rubrica</button></td><td><button type="button" class="small-btn pdf-btn" onclick="downloadEvaluationPdf(${originalIndex})">Baixar PDF</button></td><td><button type="button" class="small-btn danger" onclick="deleteEvaluation('${esc(r.id)}')">Apagar</button></td></tr>`); });
}

function csv(){
  const visibleRows=rows.filter(r=>{ const team=document.getElementById('filterTeam').value.toLowerCase(); const type=document.getElementById('filterType').value; return (!type || r.type===type) && (!team || `${teamNameOf(r)}`.toLowerCase().includes(team)); });
  let out='Data;Tipo;Equipe;Sala;Comentário Geral;Q1;Q2;Q3;Q4;Q5;Q6;Q7;Q8;Q9;Q10;Total;Respostas Detalhadas\n';
  visibleRows.forEach(r=>{ const answers=getAnswers(r); const qScores=Array.from({length:10},(_,i)=>{ const found=answers.find(a=>Number(a.row)===i+1); return found ? `${found.score ?? ''}${found.special?' ⚙️':''}` : ''; }); const detailed=answers.map(a=>`${a.section} linha ${a.row}: ${a.score}${a.special?' ⚙️ Core Values':' Critério Técnico'}${a.comment?' - '+a.comment:''}`).join(' | '); out += [r.createdAtLocal,r.typeTitle,teamNameOf(r),r.room,r.generalComment || '',...qScores,calcTotal(r),detailed].map(v=>`"${String(v ?? '').replaceAll('"','""')}"`).join(';')+'\n'; });
  const blob=new Blob(['\ufeff'+out],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='avaliacoes-fll.csv'; a.click();
}

async function createJudge(e){
  e.preventDefault(); const msg=document.getElementById('judgeMsg'); msg.textContent='Criando usuário...'; const userName=document.getElementById('judgeUserInput').value.trim(); const password=document.getElementById('judgePassInput').value.trim();
  if(!userName || !password){ msg.textContent='Preencha usuário e senha.'; return; } if(!db){ msg.textContent='Firebase não inicializado.'; return; }
  try { const snap=await getDocs(collection(db,'usuarios')); const exists=snap.docs.some(d=>String(d.data().user||'').trim()===userName); if(exists){ msg.textContent='Já existe um usuário com esse login.'; return; } await addDoc(collection(db,'usuarios'), { user:userName, name:userName, password, role:'judge', active:true, createdAt:serverTimestamp(), createdAtLocal:new Date().toLocaleString('pt-BR') }); msg.textContent='Usuário criado com sucesso!'; e.target.reset(); loadJudges(); }
  catch(err){ console.error(err); msg.textContent='Erro ao criar usuário. Confira as regras do Firestore.'; }
}

document.getElementById('load').addEventListener('click', load);
document.getElementById('exportCsv').addEventListener('click', csv);
document.getElementById('filterTeam').addEventListener('input', render);
document.getElementById('filterType').addEventListener('change', render);
document.getElementById('judgeForm').addEventListener('submit', createJudge);
document.getElementById('teamForm').addEventListener('submit', createTeam);
document.getElementById('closeModal').addEventListener('click', () => document.getElementById('detailModal').classList.add('hidden'));
document.getElementById('detailModal').addEventListener('click', e=>{ if(e.target.id==='detailModal') e.currentTarget.classList.add('hidden'); });
load(); loadJudges(); loadTeams();

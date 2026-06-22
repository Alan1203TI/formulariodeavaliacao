import { collection, addDoc, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from './firebase-config.js';
import { rubrics } from './data.js';

const storedUser = sessionStorage.getItem('fllUser') || localStorage.getItem('fllUser') || 'null';
const user = JSON.parse(storedUser);
if (!user || user.role !== 'judge') location.href = 'index.html';

function sair(){ sessionStorage.removeItem('fllUser'); localStorage.removeItem('fllUser'); location.replace('index.html'); }
document.getElementById('judgeName').textContent = user ? ' | ' + user.name : '';
document.getElementById('logout').addEventListener('click', sair);


const type = document.getElementById('type');
const rubricEl = document.getElementById('rubric');
const teamSelect = document.getElementById('teamSelect');
let teams = [];

function esc(v){ return String(v ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }


async function loadTeams() {
  teamSelect.innerHTML = '<option value="">Carregando equipes...</option>';
  try {
    const snap = await getDocs(collection(db, 'equipes'));
    teams = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(t => t.active !== false)
      .sort((a,b)=>String(a.number||'').localeCompare(String(b.number||''), 'pt-BR', {numeric:true}));
    if (!teams.length) {
      teamSelect.innerHTML = '<option value="">Nenhuma equipe cadastrada no painel admin</option>';
      return;
    }
    teamSelect.innerHTML = '<option value="">Selecione a equipe</option>' + teams.map(t => `<option value="${esc(t.id)}">${esc(t.number)} - ${esc(t.name)}</option>`).join('');
  } catch (e) {
    console.error(e);
    teamSelect.innerHTML = '<option value="">Erro ao carregar equipes</option>';
  }
}

teamSelect.addEventListener('change', () => {
  const selected = teams.find(t => t.id === teamSelect.value);
  document.getElementById('teamNumber').value = selected ? (selected.number || '') : '';
  document.getElementById('teamName').value = selected ? (selected.name || '') : '';
  const roomInput = document.getElementById('room');
  if (selected && selected.room && !roomInput.value.trim()) roomInput.value = selected.room;
});

function renderRubric() {
  const r = rubrics[type.value];
  if (!r) { rubricEl.innerHTML = '<section class="panel"><p class="msg">Rubrica não encontrada.</p></section>'; return; }
  let html = `<section class="panel ${r.color}"><h2>${esc(r.title)}</h2><p>Marque uma opção de <b>1 a 4</b> em cada linha: Fase Inicial, Em Desenvolvimento, Finalizado ou Excelente. As linhas com <b>⚙️</b> são os critérios especiais do PDF e entram também na pontuação dobrada de premiações.</p></section>`;
  let idx = 0;
  r.items.forEach(item => {
    html += `<section class="panel rubric"><h3>${esc(item.section)}</h3><p>${esc(item.description)}</p>`;
    item.rows.forEach(rowObj => {
      idx++;
      const texts = Array.isArray(rowObj) ? rowObj : rowObj.texts;
      const special = !!rowObj.special;
      html += `<div class="row" data-row="${idx}" data-section="${esc(item.section)}" data-special="${special}"><div class="row-title">${special ? '<span class="gear">⚙️ Critério especial</span>' : '<span>Critério normal</span>'}</div><div class="criteria">`;
      texts.forEach((text, i) => {
        const score = i + 1;
        const level = ['Fase Inicial','Em Desenvolvimento','Finalizado','Excelente'][i];
        html += `<label><input type="radio" name="score_${idx}" value="${score}" required><b>${score}</b> ${level}<small>${esc(text)}</small></label>`;
      });
      html += `</div><textarea name="comment_${idx}" placeholder="Comentário da linha. Obrigatório se marcar 4 - Excelente."></textarea></div>`;
    });
    html += '</section>';
  });
  rubricEl.innerHTML = html;
}

type.addEventListener('change', renderRubric);
renderRubric();
loadTeams();

document.getElementById('evalForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('saveMsg');
  msg.textContent = '';

  const teamNumber = document.getElementById('teamNumber').value.trim();
  const teamName = document.getElementById('teamName').value.trim();
  if (!teamNumber || !teamName) { msg.textContent = 'Informe número e nome da equipe.'; return; }

  const answers = [];
  let valid = true;
  document.querySelectorAll('.row').forEach(row => {
    const n = row.dataset.row;
    const checked = row.querySelector(`input[name="score_${n}"]:checked`);
    const comment = row.querySelector(`textarea[name="comment_${n}"]`).value.trim();
    const special = row.dataset.special === 'true';
    if (!checked || (checked.value === '4' && !comment)) { valid = false; row.classList.add('error'); }
    else row.classList.remove('error');
    answers.push({ row: Number(n), section: row.dataset.section, special, score: checked ? Number(checked.value) : null, comment });
  });
  if (!valid) { msg.textContent = 'Confira as linhas em vermelho. Todas precisam de nota e as notas 4 precisam de comentário.'; return; }

  const total = answers.reduce((s, a) => s + (a.score || 0), 0);
  const awardTotal = answers.reduce((s, a) => s + ((a.score || 0) * (a.special ? 2 : 1)), 0);
  const specialTotal = answers.filter(a => a.special).reduce((s, a) => s + (a.score || 0), 0);
  const avg = (total / answers.length).toFixed(2);
  const payload = {
    type: type.value,
    typeTitle: rubrics[type.value].title,
    teamNumber,
    teamName,
    room: document.getElementById('room').value.trim(),
    judge: user.name,
    judgeUser: user.user,
    answers,
    total,
    specialTotal,
    awardTotal,
    avg,
    generalNotes: document.getElementById('generalNotes').value.trim(),
    createdAt: serverTimestamp(),
    createdAtLocal: new Date().toLocaleString('pt-BR')
  };

  try {
    if (!db) throw new Error('Firebase não inicializado');
    await addDoc(collection(db, 'avaliacoes'), payload);
    msg.textContent = 'Avaliação enviada com sucesso!';
    e.target.reset();
    document.getElementById('teamNumber').value = '';
    document.getElementById('teamName').value = '';
    renderRubric();
    loadTeams();
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    msg.textContent = 'Erro ao salvar. Confira as regras do Firestore e a conexão com o Firebase.';
  }
});

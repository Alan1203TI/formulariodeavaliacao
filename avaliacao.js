import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { rubrics } from './data.js';

const user = JSON.parse(sessionStorage.getItem('fllUser') || 'null');
if (!user || user.role !== 'judge') location.href = 'index.html';

document.getElementById('judgeName').textContent = user ? ' | ' + user.name : '';
document.getElementById('logout').addEventListener('click', () => { sessionStorage.removeItem('fllUser'); location.replace('index.html'); });

let db = null;
try { db = getFirestore(initializeApp(firebaseConfig)); } catch (e) { console.warn('Firebase não inicializado', e); }

const type = document.getElementById('type');
const rubricEl = document.getElementById('rubric');

function esc(v){ return String(v ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

function renderRubric() {
  const r = rubrics[type.value];
  if (!r) { rubricEl.innerHTML = '<section class="panel"><p class="msg">Rubrica não encontrada.</p></section>'; return; }
  let html = `<section class="panel ${r.color}"><h2>${esc(r.title)}</h2><p>Marque uma opção de 1 a 4 em cada linha. Se marcar <b>4 - Excelente</b>, o comentário da linha será obrigatório.</p></section>`;
  let idx = 0;
  r.items.forEach(item => {
    html += `<section class="panel rubric"><h3>${esc(item.section)}</h3><p>${esc(item.description)}</p>`;
    item.rows.forEach(row => {
      idx++;
      html += `<div class="row" data-row="${idx}" data-section="${esc(item.section)}"><div class="criteria">`;
      row.forEach((text, i) => {
        const score = i + 1;
        const label = score === 4 ? 'Excelente' : esc(text);
        html += `<label><input type="radio" name="score_${idx}" value="${score}" required><b>${score}</b> ${label}<small>${score === 4 ? esc(text) : ''}</small></label>`;
      });
      html += `</div><textarea name="comment_${idx}" placeholder="Comentário da linha. Obrigatório se marcar 4 - Excelente."></textarea></div>`;
    });
    html += '</section>';
  });
  rubricEl.innerHTML = html;
}

type.addEventListener('change', renderRubric);
renderRubric();

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
    if (!checked || (checked.value === '4' && !comment)) { valid = false; row.classList.add('error'); }
    else row.classList.remove('error');
    answers.push({ row: Number(n), section: row.dataset.section, score: checked ? Number(checked.value) : null, comment });
  });
  if (!valid) { msg.textContent = 'Confira as linhas em vermelho. Todas precisam de nota e as notas 4 precisam de comentário.'; return; }

  const total = answers.reduce((s, a) => s + (a.score || 0), 0);
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
    avg,
    generalNotes: document.getElementById('generalNotes').value.trim(),
    createdAt: serverTimestamp(),
    createdAtLocal: new Date().toLocaleString('pt-BR')
  };

  try {
    if (!db) throw new Error('Firebase não inicializado');
    await addDoc(collection(db, 'avaliacoes_fll'), payload);
    msg.textContent = 'Avaliação enviada com sucesso!';
    e.target.reset();
    renderRubric();
    window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    msg.textContent = 'Erro ao salvar. Confira as regras do Firestore e a conexão com o Firebase.';
  }
});

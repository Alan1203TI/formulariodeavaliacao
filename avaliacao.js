import { collection, addDoc, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from './firebase-config.js';
import { rubrics } from './data.js';

const storedUser = sessionStorage.getItem('fllUser') || localStorage.getItem('fllUser') || 'null';
const user = JSON.parse(storedUser);
if (!user || user.role !== 'judge') location.href = 'index.html';
function sair(){ sessionStorage.removeItem('fllUser'); localStorage.removeItem('fllUser'); location.replace('index.html'); }
document.getElementById('logout').addEventListener('click', sair);

const type = document.getElementById('type');
const rubricEl = document.getElementById('rubric');
const teamSelect = document.getElementById('teamSelect');
let teams = [];
let activeRecognition = null;
function esc(v){ return String(v ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m])); }

async function loadTeams(){
  teamSelect.innerHTML='<option value="">Carregando equipes...</option>';
  try { const snap=await getDocs(collection(db,'equipes')); teams=snap.docs.map(d=>({id:d.id,...d.data()})).filter(t=>t.active!==false).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))); teamSelect.innerHTML = teams.length ? '<option value="">Selecione a equipe</option>'+teams.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('') : '<option value="">Nenhuma equipe cadastrada no painel admin</option>'; }
  catch(e){ console.error(e); teamSelect.innerHTML='<option value="">Erro ao carregar equipes</option>'; }
}
teamSelect.addEventListener('change',()=>{ const selected=teams.find(t=>t.id===teamSelect.value); const roomInput=document.getElementById('room'); roomInput.value = selected ? (selected.room || '') : ''; });

function getSpeechRecognition(){
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function setupSpeechButtons(){
  const SpeechRecognition = getSpeechRecognition();
  document.querySelectorAll('[data-mic-target]').forEach(btn=>{
    const targetId = btn.dataset.micTarget;
    const textarea = document.getElementById(targetId);
    if(!SpeechRecognition || !textarea){
      btn.disabled = true;
      btn.title = 'Microfone não compatível neste navegador. Use o Google Chrome.';
      btn.textContent = '🎙️ Microfone indisponível';
      return;
    }
    btn.addEventListener('click', ()=>{
      if(activeRecognition){
        activeRecognition.stop();
        activeRecognition = null;
        document.querySelectorAll('[data-mic-target]').forEach(b=>b.classList.remove('recording'));
        if(btn.dataset.running === 'true'){
          btn.dataset.running = 'false';
          btn.textContent = '🎙️ Falar comentário';
          return;
        }
      }
      const recognition = new SpeechRecognition();
      activeRecognition = recognition;
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;
      let finalText = '';
      const originalText = textarea.value.trim();
      btn.dataset.running = 'true';
      btn.classList.add('recording');
      btn.textContent = '⏹️ Parar gravação';
      recognition.onresult = (event)=>{
        let interim = '';
        for(let i = event.resultIndex; i < event.results.length; i++){
          const text = event.results[i][0].transcript;
          if(event.results[i].isFinal) finalText += text + ' ';
          else interim += text;
        }
        const combined = [originalText, finalText.trim(), interim.trim()].filter(Boolean).join(' ');
        textarea.value = combined.trim();
      };
      recognition.onerror = ()=>{
        btn.textContent = '🎙️ Falar comentário';
        btn.dataset.running = 'false';
        btn.classList.remove('recording');
        activeRecognition = null;
      };
      recognition.onend = ()=>{
        btn.textContent = '🎙️ Falar comentário';
        btn.dataset.running = 'false';
        btn.classList.remove('recording');
        activeRecognition = null;
      };
      recognition.start();
    });
  });
}

function renderRubric(){
  const r=rubrics[type.value]; if(!r){ rubricEl.innerHTML='<section class="panel"><p class="msg">Rubrica não encontrada.</p></section>'; return; }
  let html=`<section class="panel ${r.color}"><div class="rubric-head"><div><h2>${esc(r.title)}</h2><p>Marque uma opção de <b>1 a 4</b> em cada linha: Fase Inicial, Em Desenvolvimento, Finalizado ou Excedente. As linhas com <b>⚙️</b> são Core Values e contam com o mesmo peso dos Critérios Técnicos.</p></div></div></section>`;
  let idx=0;
  r.items.forEach(item=>{ html += `<section class="panel rubric"><h3>${esc(item.section)}</h3><p>${esc(item.description)}</p>`; item.rows.forEach(rowObj=>{ idx++; const texts=Array.isArray(rowObj)?rowObj:rowObj.texts; const special=!!rowObj.special; html += `<div class="row" data-row="${idx}" data-section="${esc(item.section)}" data-special="${special}"><div class="row-title">${special?'<span class="gear">⚙️ Core Values</span>':'<span>Critério Técnico</span>'}</div><div class="criteria">`; texts.forEach((text,i)=>{ const score=i+1; const level=['Fase Inicial','Em Desenvolvimento','Finalizado','Excedente'][i]; html += `<label><input type="radio" name="score_${idx}" value="${score}" required><b>${score}</b> ${level}<small>${esc(text)}</small></label>`; }); html += `</div><textarea name="comment_${idx}" placeholder="Comentário da linha. Obrigatório se marcar 4 - Excedente."></textarea></div>`; }); html += '</section>'; });
  html += `<section class="panel"><h3>Comentário geral da avaliação</h3><p class="hint">Escreva um resumo final da avaliação. Você também pode clicar no microfone e falar para transcrever automaticamente.</p><textarea id="generalComment" name="generalComment" class="general-comment" placeholder="Comentário geral sobre a equipe nesta avaliação..."></textarea><div class="mic-actions"><button id="generalCommentMic" type="button" class="secondary mic-btn" data-mic-target="generalComment">🎙️ Falar comentário</button><small class="muted">A transcrição por voz depende do navegador. No computador, use preferencialmente o Google Chrome e permita o acesso ao microfone.</small></div></section>`;
  rubricEl.innerHTML=html;
  setupSpeechButtons();
}


type.addEventListener('change', renderRubric); renderRubric(); loadTeams();


document.getElementById('evalForm').addEventListener('submit', async (e)=>{
  e.preventDefault(); const msg=document.getElementById('saveMsg'); msg.textContent='';
  const selected=teams.find(t=>t.id===teamSelect.value); if(!selected){ msg.textContent='Selecione uma equipe cadastrada.'; return; }
  const answers=[]; let valid=true;
  document.querySelectorAll('.row').forEach(row=>{ const n=row.dataset.row; const checked=row.querySelector(`input[name="score_${n}"]:checked`); const comment=row.querySelector(`textarea[name="comment_${n}"]`).value.trim(); const special=row.dataset.special==='true'; if(!checked || (checked.value==='4' && !comment)){ valid=false; row.classList.add('error'); } else row.classList.remove('error'); answers.push({ row:Number(n), section:row.dataset.section, special, score:checked?Number(checked.value):null, comment }); });
  if(!valid){ msg.textContent='Confira as linhas em vermelho. Todas precisam de nota e as notas 4 precisam de comentário.'; return; }
  const total=answers.reduce((s,a)=>s+(a.score||0),0);
  const generalComment=document.getElementById('generalComment')?.value.trim() || '';
  const payload={ type:type.value, typeTitle:rubrics[type.value].title, teamName:selected.name || '', teamId:selected.id, room:selected.room || '', judgeUser:user.user, answers, generalComment, total, awardTotal:total, createdAt:serverTimestamp(), createdAtLocal:new Date().toLocaleString('pt-BR') };
  try { if(!db) throw new Error('Firebase não inicializado'); await addDoc(collection(db,'avaliacoes'), payload); msg.textContent='Avaliação enviada com sucesso!'; e.target.reset(); document.getElementById('room').value=''; renderRubric(); loadTeams(); window.scrollTo(0,0); }
  catch(err){ console.error(err); msg.textContent='Erro ao salvar. Confira as regras do Firestore e a conexão com o Firebase.'; }
});

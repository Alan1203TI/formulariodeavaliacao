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

function capitalizeSentences(text){
  return text.replace(/(^|[.!?]\s+)([a-záàâãéêíóôõúç])/g, (m, sep, chr) => sep + chr.toUpperCase());
}

function removeRepeatedWords(text){
  return text.replace(/\b([\p{L}]+)(\s+\1\b)+/giu, '$1');
}

function refineTranscript(text){
  if(!text) return '';
  let refined = String(text)
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([,.!?;:])([^\s])/g, '$1 $2')
    .trim();

  const replacements = [
    [/\bcore values?\b/gi, 'Core Values'],
    [/\bcor values?\b/gi, 'Core Values'],
    [/\bco values?\b/gi, 'Core Values'],
    [/\bprojeto de inova[cç][aã]o\b/gi, 'Projeto de Inovação'],
    [/\bdesign do rob[oô]\b/gi, 'Design do Robô'],
    [/\brob[oô]\b/gi, 'robô'],
    [/\blego\b/gi, 'LEGO'],
    [/\bfll\b/gi, 'FLL'],
    [/\bfirst\b/gi, 'FIRST'],
    [/\bspike\b/gi, 'SPIKE'],
    [/\bprot[oó]tipo\b/gi, 'protótipo'],
    [/\bitera[cç][aã]o\b/gi, 'iteração'],
    [/\bprograma[cç][aã]o\b/gi, 'programação'],
    [/\bengenharia\b/gi, 'engenharia'],
    [/\bmiss[aã]o\b/gi, 'missão'],
    [/\bsensor\b/gi, 'sensor'],
    [/\bestrat[eé]gia\b/gi, 'estratégia']
  ];
  replacements.forEach(([regex, value]) => { refined = refined.replace(regex, value); });

  refined = removeRepeatedWords(refined);

  // Pontuação simples para deixar o comentário mais legível quando a fala vier em uma frase longa.
  refined = refined
    .replace(/\s+por[eé]m\s+/gi, ', porém ')
    .replace(/\s+mas\s+/gi, ', mas ')
    .replace(/\s+entretanto\s+/gi, ', entretanto ')
    .replace(/\s+al[eé]m disso\s+/gi, '. Além disso, ')
    .replace(/\s+tamb[eé]m\s+/gi, '. Também ')
    .replace(/\s+observa-se que\s+/gi, '. Observa-se que ')
    .replace(/\s+a equipe\s+/gi, '. A equipe ')
    .replace(/^\.\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();

  refined = capitalizeSentences(refined);
  if(refined && !/[.!?]$/.test(refined)) refined += '.';
  return refined;
}

function createSpeechSession(textarea, statusEl, startBtn, pauseBtn, finishBtn){
  const SpeechRecognition = getSpeechRecognition();
  if(!SpeechRecognition || !textarea) return null;

  const session = {
    recognition: null,
    baseText: textarea.value.trim(),
    finalText: '',
    running: false,
    paused: false,
    manualStop: false,
    restartTimer: null,
    start(){
      if(session.running) return;
      session.manualStop = false;
      session.paused = false;
      session.baseText = refineTranscript(textarea.value.trim()).replace(/[.]$/, '');
      const recognition = new SpeechRecognition();
      session.recognition = recognition;
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 5;

      recognition.onstart = () => {
        session.running = true;
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        finishBtn.disabled = false;
        startBtn.classList.add('recording');
        statusEl.textContent = '🎙️ Gravando... fale em frases curtas e naturais.';
      };

      recognition.onresult = (event)=>{
        let interim = '';
        for(let i = event.resultIndex; i < event.results.length; i++){
          const transcript = event.results[i][0].transcript;
          if(event.results[i].isFinal){
            session.finalText += transcript + ' ';
          } else {
            interim += transcript + ' ';
          }
        }
        const combined = [session.baseText, session.finalText.trim(), interim.trim()].filter(Boolean).join(' ');
        textarea.value = combined.replace(/\s+/g, ' ').trim();
      };

      recognition.onerror = (event)=>{
        if(event.error === 'not-allowed' || event.error === 'service-not-allowed'){
          statusEl.textContent = 'Permita o acesso ao microfone no navegador para usar a transcrição.';
          session.manualStop = true;
        } else if(event.error === 'no-speech'){
          statusEl.textContent = 'Não detectei fala. Pode continuar falando ou clique em finalizar.';
        } else {
          statusEl.textContent = 'A transcrição pausou. Clique em continuar se precisar gravar mais.';
        }
      };

      recognition.onend = () => {
        session.running = false;
        startBtn.classList.remove('recording');
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        if(!session.manualStop && !session.paused){
          statusEl.textContent = 'Retomando gravação automaticamente...';
          session.restartTimer = setTimeout(()=>session.start(), 350);
        } else if(session.paused){
          statusEl.textContent = 'Gravação pausada. Clique em continuar para falar mais.';
          startBtn.textContent = '▶️ Continuar';
        }
      };
      recognition.start();
    },
    pause(){
      if(!session.recognition) return;
      session.paused = true;
      session.manualStop = true;
      try{ session.recognition.stop(); }catch(e){}
      statusEl.textContent = 'Gravação pausada. Clique em continuar para falar mais.';
      startBtn.textContent = '▶️ Continuar';
    },
    finish(){
      session.manualStop = true;
      session.paused = false;
      clearTimeout(session.restartTimer);
      try{ session.recognition?.stop(); }catch(e){}
      textarea.value = refineTranscript(textarea.value);
      session.baseText = textarea.value.replace(/[.]$/, '');
      session.finalText = '';
      startBtn.textContent = '🎙️ Iniciar fala';
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      finishBtn.disabled = true;
      startBtn.classList.remove('recording');
      statusEl.textContent = 'Comentário refinado. Você ainda pode editar o texto manualmente.';
    }
  };
  return session;
}

function setupSpeechButtons(){
  const SpeechRecognition = getSpeechRecognition();
  const startBtn = document.getElementById('generalCommentMicStart');
  const pauseBtn = document.getElementById('generalCommentMicPause');
  const finishBtn = document.getElementById('generalCommentMicFinish');
  const textarea = document.getElementById('generalComment');
  const statusEl = document.getElementById('generalCommentMicStatus');
  if(!startBtn || !pauseBtn || !finishBtn || !textarea || !statusEl) return;

  if(!SpeechRecognition){
    startBtn.disabled = true;
    pauseBtn.disabled = true;
    finishBtn.disabled = true;
    statusEl.textContent = 'Microfone não compatível neste navegador. Use preferencialmente o Google Chrome.';
    return;
  }

  const session = createSpeechSession(textarea, statusEl, startBtn, pauseBtn, finishBtn);
  startBtn.addEventListener('click', ()=>session.start());
  pauseBtn.addEventListener('click', ()=>session.pause());
  finishBtn.addEventListener('click', ()=>session.finish());
}

function renderRubric(){
  const r=rubrics[type.value]; if(!r){ rubricEl.innerHTML='<section class="panel"><p class="msg">Rubrica não encontrada.</p></section>'; return; }
  let html=`<section class="panel ${r.color}"><div class="rubric-head"><div><h2>${esc(r.title)}</h2><p>Marque uma opção de <b>1 a 4</b> em cada linha: Fase Inicial, Em Desenvolvimento, Finalizado ou Excedente. As linhas com <b>⚙️</b> são Core Values e contam com o mesmo peso dos Critérios Técnicos.</p></div></div></section>`;
  let idx=0;
  r.items.forEach(item=>{ html += `<section class="panel rubric"><h3>${esc(item.section)}</h3><p>${esc(item.description)}</p>`; item.rows.forEach(rowObj=>{ idx++; const texts=Array.isArray(rowObj)?rowObj:rowObj.texts; const special=!!rowObj.special; html += `<div class="row" data-row="${idx}" data-section="${esc(item.section)}" data-special="${special}"><div class="row-title">${special?'<span class="gear">⚙️ Core Values</span>':'<span>Critério Técnico</span>'}</div><div class="criteria">`; texts.forEach((text,i)=>{ const score=i+1; const level=['Fase Inicial','Em Desenvolvimento','Finalizado','Excedente'][i]; html += `<label><input type="radio" name="score_${idx}" value="${score}" required><b>${score}</b> ${level}<small>${esc(text)}</small></label>`; }); html += `</div><textarea name="comment_${idx}" placeholder="Comentário da linha. Obrigatório se marcar 4 - Excedente."></textarea></div>`; }); html += '</section>'; });
  html += `<section class="panel"><h3>Comentário geral da avaliação</h3><p class="hint">Escreva um resumo final da avaliação. Você também pode usar o microfone para transcrever a fala com mais fluidez e refinamento automático.</p><textarea id="generalComment" name="generalComment" class="general-comment" placeholder="Comentário geral sobre a equipe nesta avaliação..."></textarea><div class="mic-actions"><button id="generalCommentMicStart" type="button" class="secondary mic-btn">🎙️ Iniciar fala</button><button id="generalCommentMicPause" type="button" class="secondary" disabled>⏸️ Pausar</button><button id="generalCommentMicFinish" type="button" class="secondary" disabled>■ Finalizar e refinar</button><small id="generalCommentMicStatus" class="muted">Use frases curtas. Ao finalizar, o texto será pontuado e corrigido com termos da FLL.</small></div></section>`;
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
  const generalComment=refineTranscript(document.getElementById('generalComment')?.value.trim() || '');
  const payload={ type:type.value, typeTitle:rubrics[type.value].title, teamName:selected.name || '', teamId:selected.id, room:selected.room || '', judgeUser:user.user, answers, generalComment, total, awardTotal:total, createdAt:serverTimestamp(), createdAtLocal:new Date().toLocaleString('pt-BR') };
  try { if(!db) throw new Error('Firebase não inicializado'); await addDoc(collection(db,'avaliacoes'), payload); msg.textContent='Avaliação enviada com sucesso!'; e.target.reset(); document.getElementById('room').value=''; renderRubric(); loadTeams(); window.scrollTo(0,0); }
  catch(err){ console.error(err); msg.textContent='Erro ao salvar. Confira as regras do Firestore e a conexão com o Firebase.'; }
});

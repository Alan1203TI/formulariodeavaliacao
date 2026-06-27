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

function normalizeSpeechChunk(text){
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordOverlapSuffixPrefix(existing, incoming){
  const a = normalizeSpeechChunk(existing).split(' ').filter(Boolean);
  const b = normalizeSpeechChunk(incoming).split(' ').filter(Boolean);
  const max = Math.min(a.length, b.length, 18);
  for(let n = max; n >= 1; n--){
    if(a.slice(-n).join(' ') === b.slice(0, n).join(' ')) return n;
  }
  return 0;
}

function appendWithoutDuplication(current, incoming){
  const cleanIncoming = String(incoming || '').replace(/\s+/g, ' ').trim();
  if(!cleanIncoming) return current || '';
  const cleanCurrent = String(current || '').replace(/\s+/g, ' ').trim();
  if(!cleanCurrent) return cleanIncoming;

  const normCurrent = normalizeSpeechChunk(cleanCurrent);
  const normIncoming = normalizeSpeechChunk(cleanIncoming);
  if(!normIncoming) return cleanCurrent;

  // Android/Chrome às vezes devolve o mesmo trecho completo repetido ou uma versão maior do trecho anterior.
  if(normCurrent === normIncoming || normCurrent.endsWith(normIncoming)) return cleanCurrent;
  if(normIncoming.startsWith(normCurrent)){
    return cleanIncoming;
  }

  const overlap = wordOverlapSuffixPrefix(cleanCurrent, cleanIncoming);
  if(overlap > 0){
    const incomingWords = cleanIncoming.split(/\s+/);
    return (cleanCurrent + ' ' + incomingWords.slice(overlap).join(' ')).replace(/\s+/g, ' ').trim();
  }

  // Evita repetir frases curtas finalizadas várias vezes pelo reconhecimento do Android.
  const recentCurrent = normCurrent.split(' ').slice(-14).join(' ');
  if(recentCurrent.includes(normIncoming)) return cleanCurrent;

  return (cleanCurrent + ' ' + cleanIncoming).replace(/\s+/g, ' ').trim();
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


function normalizeSpacesAndPunctuation(text){
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([,.!?;:])([^\s])/g, '$1 $2')
    .replace(/\s+\)/g, ')')
    .replace(/\(\s+/g, '(')
    .trim();
}

function improveCommentText(text){
  let corrected = normalizeSpacesAndPunctuation(text);
  if(!corrected) return '';

  const replacements = [
    [/\bnao\b/gi, 'não'],
    [/\bn\s*[aã]o\b/gi, 'não'],
    [/\besta\b/gi, 'está'],
    [/\bestao\b/gi, 'estão'],
    [/\btambem\b/gi, 'também'],
    [/\bporem\b/gi, 'porém'],
    [/\bporque\s+que\b/gi, 'porque'],
    [/\bmas\s+mais\b/gi, 'mas'],
    [/\bmais\s+precisa\b/gi, 'mas precisa'],
    [/\bequipe\s+demostrou\b/gi, 'equipe demonstrou'],
    [/\bdemostrou\b/gi, 'demonstrou'],
    [/\bdesenvolvel\b/gi, 'desenvolveu'],
    [/\bapresentaçao\b/gi, 'apresentação'],
    [/\bapresentacao\b/gi, 'apresentação'],
    [/\bexplicaçao\b/gi, 'explicação'],
    [/\bexplicacao\b/gi, 'explicação'],
    [/\borganizaçao\b/gi, 'organização'],
    [/\borganizacao\b/gi, 'organização'],
    [/\bevidencias\b/gi, 'evidências'],
    [/\bsoluçao\b/gi, 'solução'],
    [/\bsolucao\b/gi, 'solução'],
    [/\bprototipo\b/gi, 'protótipo'],
    [/\bprogramaçao\b/gi, 'programação'],
    [/\bprogramacao\b/gi, 'programação'],
    [/\biteracao\b/gi, 'iteração'],
    [/\brobo\b/gi, 'robô'],
    [/\bcore values?\b/gi, 'Core Values'],
    [/\bfll\b/gi, 'FLL'],
    [/\blego\b/gi, 'LEGO'],
    [/\bfirst\b/gi, 'FIRST'],
    [/\bspike\b/gi, 'SPIKE'],
    [/\bprojeto de inova[cç][aã]o\b/gi, 'Projeto de Inovação'],
    [/\bdesign do rob[oô]\b/gi, 'Design do Robô'],
    [/\bdesempenho do rob[oô]\b/gi, 'Desempenho do Robô']
  ];
  replacements.forEach(([regex, value]) => { corrected = corrected.replace(regex, value); });

  corrected = removeRepeatedWords(corrected);
  corrected = corrected
    .replace(/\b(a|o|as|os) equipe\b/gi, 'a equipe')
    .replace(/\b(a|o) aluno\b/gi, 'o aluno')
    .replace(/\b(a|o) alunos\b/gi, 'os alunos')
    .replace(/\b(a|o) integrantes\b/gi, 'os integrantes')
    .replace(/\bprecisa melhorar em\b/gi, 'precisa melhorar')
    .replace(/\s+mas\s+/gi, ', mas ')
    .replace(/\s+porém\s+/gi, ', porém ')
    .replace(/\s+além disso\s+/gi, '. Além disso, ')
    .replace(/\s+também\s+/gi, '. Também ')
    .replace(/\s+a equipe\s+/gi, '. A equipe ')
    .replace(/^\.\s*/, '');

  corrected = normalizeSpacesAndPunctuation(capitalizeSentences(corrected));
  if(corrected && !/[.!?]$/.test(corrected)) corrected += '.';
  return corrected;
}

function buildAiCorrectionBox(textarea){
  const wrap = document.createElement('div');
  wrap.className = 'ai-correct-box';
  wrap.innerHTML = `
    <button type="button" class="secondary ai-correct-btn">✨ Corrigir texto com IA</button>
    <div class="ai-preview hidden" aria-live="polite">
      <small class="muted">Sugestão de correção:</small>
      <div class="ai-preview-text"></div>
      <div class="ai-preview-actions">
        <button type="button" class="small-btn ai-use-btn">Usar texto corrigido</button>
        <button type="button" class="small-btn ghost ai-cancel-btn">Manter original</button>
      </div>
    </div>`;

  const btn = wrap.querySelector('.ai-correct-btn');
  const preview = wrap.querySelector('.ai-preview');
  const previewText = wrap.querySelector('.ai-preview-text');
  const useBtn = wrap.querySelector('.ai-use-btn');
  const cancelBtn = wrap.querySelector('.ai-cancel-btn');
  let suggestion = '';

  btn.addEventListener('click', ()=>{
    const original = textarea.value.trim();
    if(!original){
      preview.classList.remove('hidden');
      previewText.textContent = 'Digite um comentário antes de usar a correção.';
      useBtn.disabled = true;
      return;
    }
    suggestion = improveCommentText(original);
    preview.classList.remove('hidden');
    previewText.textContent = suggestion === original ? 'O texto já parece estar corrigido.' : suggestion;
    useBtn.disabled = suggestion === original;
  });

  useBtn.addEventListener('click', ()=>{
    if(suggestion){
      textarea.value = suggestion;
      textarea.focus();
    }
    preview.classList.add('hidden');
  });

  cancelBtn.addEventListener('click', ()=>{
    preview.classList.add('hidden');
  });

  textarea.addEventListener('input', ()=>{
    preview.classList.add('hidden');
  });

  return wrap;
}

function setupAiCorrectionButtons(){
  document.querySelectorAll('textarea[name^="comment_"], #generalComment').forEach(textarea=>{
    if(textarea.dataset.aiCorrectionReady === 'true') return;
    textarea.dataset.aiCorrectionReady = 'true';
    textarea.insertAdjacentElement('afterend', buildAiCorrectionBox(textarea));
  });
}

function createSpeechSession(textarea, statusEl, startBtn, pauseBtn, finishBtn){
  const SpeechRecognition = getSpeechRecognition();
  if(!SpeechRecognition || !textarea) return null;

  const isAndroid = /Android/i.test(navigator.userAgent || '');
  const session = {
    recognition: null,
    baseText: textarea.value.trim(),
    finalText: '',
    liveInterim: '',
    running: false,
    paused: false,
    manualStop: false,
    isAndroid,
    restartTimer: null,
    lastFinalNorm: '',
    lastFinalAt: 0,
    start(){
      if(session.running) return;
      session.manualStop = false;
      session.paused = false;
      session.liveInterim = '';
      session.baseText = refineTranscript(textarea.value.trim()).replace(/[.!?]$/, '');
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
        statusEl.textContent = session.isAndroid
          ? '🎙️ Gravando no Android... fale pausadamente, em frases curtas.'
          : '🎙️ Gravando... fale em frases curtas e naturais.';
      };

      recognition.onresult = (event)=>{
        let interim = '';
        for(let i = event.resultIndex; i < event.results.length; i++){
          const result = event.results[i];
          const transcript = (result[0]?.transcript || '').replace(/\s+/g, ' ').trim();
          if(!transcript) continue;

          if(result.isFinal){
            const norm = normalizeSpeechChunk(transcript);
            const now = Date.now();
            const veryRecentDuplicate = norm && norm === session.lastFinalNorm && (now - session.lastFinalAt) < 2500;
            if(!veryRecentDuplicate){
              session.finalText = appendWithoutDuplication(session.finalText, transcript);
              session.lastFinalNorm = norm;
              session.lastFinalAt = now;
            }
            session.liveInterim = '';
          } else {
            // No Android, o resultado provisório costuma duplicar muito. Mantemos apenas para visualização.
            interim = transcript;
          }
        }

        session.liveInterim = interim;
        const stableText = appendWithoutDuplication(session.baseText, session.finalText);
        const preview = session.isAndroid ? '' : session.liveInterim;
        textarea.value = [stableText, preview].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
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
          clearTimeout(session.restartTimer);
          session.restartTimer = setTimeout(()=>session.start(), session.isAndroid ? 800 : 350);
        } else if(session.paused){
          statusEl.textContent = 'Gravação pausada. Clique em continuar para falar mais.';
          startBtn.textContent = '▶️ Continuar';
        }
      };
      try { recognition.start(); } catch(e) { console.warn(e); }
    },
    pause(){
      if(!session.recognition) return;
      session.paused = true;
      session.manualStop = true;
      clearTimeout(session.restartTimer);
      try{ session.recognition.stop(); }catch(e){}
      textarea.value = refineTranscript(appendWithoutDuplication(session.baseText, session.finalText || textarea.value));
      session.baseText = textarea.value.replace(/[.!?]$/, '');
      session.finalText = '';
      statusEl.textContent = 'Gravação pausada. Clique em continuar para falar mais.';
      startBtn.textContent = '▶️ Continuar';
    },
    finish(){
      session.manualStop = true;
      session.paused = false;
      clearTimeout(session.restartTimer);
      try{ session.recognition?.stop(); }catch(e){}
      const stableText = appendWithoutDuplication(session.baseText, session.finalText || textarea.value);
      textarea.value = refineTranscript(stableText);
      session.baseText = textarea.value.replace(/[.!?]$/, '');
      session.finalText = '';
      session.liveInterim = '';
      startBtn.textContent = '🎙️ Iniciar fala';
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      finishBtn.disabled = true;
      startBtn.classList.remove('recording');
      statusEl.textContent = 'Comentário finalizado. Você ainda pode editar o texto manualmente.';
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
  html += `<section class="panel"><h3>Comentário geral da avaliação</h3><p class="hint">Escreva um resumo final da avaliação. Você pode usar o microfone para transcrever e o botão de IA para revisar o texto antes de decidir se deseja usar a correção.</p><textarea id="generalComment" name="generalComment" class="general-comment" placeholder="Comentário geral sobre a equipe nesta avaliação..."></textarea><div class="mic-actions"><button id="generalCommentMicStart" type="button" class="secondary mic-btn">🎙️ Iniciar fala</button><button id="generalCommentMicPause" type="button" class="secondary" disabled>⏸️ Pausar</button><button id="generalCommentMicFinish" type="button" class="secondary" disabled>■ Finalizar</button><small id="generalCommentMicStatus" class="muted">Use frases curtas. Ao finalizar, o texto será organizado e corrigido com termos da FLL.</small></div></section>`;
  rubricEl.innerHTML=html;
  setupSpeechButtons();
  setupAiCorrectionButtons();
}


type.addEventListener('change', renderRubric); renderRubric(); loadTeams();


document.getElementById('evalForm').addEventListener('submit', async (e)=>{
  e.preventDefault(); const msg=document.getElementById('saveMsg'); msg.textContent='';
  const selected=teams.find(t=>t.id===teamSelect.value); if(!selected){ msg.textContent='Selecione uma equipe cadastrada.'; return; }
  const answers=[]; let valid=true;
  document.querySelectorAll('.row').forEach(row=>{ const n=row.dataset.row; const checked=row.querySelector(`input[name="score_${n}"]:checked`); const comment=row.querySelector(`textarea[name="comment_${n}"]`).value.trim(); const special=row.dataset.special==='true'; if(!checked || (checked.value==='4' && !comment)){ valid=false; row.classList.add('error'); } else row.classList.remove('error'); answers.push({ row:Number(n), section:row.dataset.section, special, score:checked?Number(checked.value):null, comment }); });
  if(!valid){ msg.textContent='Confira as linhas em vermelho. Todas precisam de nota e as notas 4 precisam de comentário.'; return; }
  const total=answers.reduce((s,a)=>s+(a.score||0),0);
  const generalComment=improveCommentText(document.getElementById('generalComment')?.value.trim() || '');
  const payload={ type:type.value, typeTitle:rubrics[type.value].title, teamName:selected.name || '', teamId:selected.id, room:selected.room || '', judgeUser:user.user, answers, generalComment, total, awardTotal:total, createdAt:serverTimestamp(), createdAtLocal:new Date().toLocaleString('pt-BR') };
  try { if(!db) throw new Error('Firebase não inicializado'); await addDoc(collection(db,'avaliacoes'), payload); msg.textContent='Avaliação enviada com sucesso!'; e.target.reset(); document.getElementById('room').value=''; renderRubric(); loadTeams(); window.scrollTo(0,0); }
  catch(err){ console.error(err); msg.textContent='Erro ao salvar. Confira as regras do Firestore e a conexão com o Firebase.'; }
});

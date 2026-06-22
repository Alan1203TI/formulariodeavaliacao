import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { rubrics } from './data.js';
const user=JSON.parse(sessionStorage.getItem('fllUser')||'null'); if(!user||user.role!=='judge') location.href='index.html';
document.getElementById('judgeName').textContent=' | '+user.name; document.getElementById('logout').onclick=()=>{sessionStorage.clear();location.href='index.html'};
let db; try{db=getFirestore(initializeApp(firebaseConfig));}catch(e){console.warn(e)}
const type=document.getElementById('type'), rubricEl=document.getElementById('rubric');
function render(){ const r=rubrics[type.value]; rubricEl.innerHTML=`<section class="panel ${r.color}"><h2>${r.title}</h2><p>Marque uma opção de 1 a 4 em cada linha. Ao marcar Excelente, preencha o comentário.</p></section>`; let idx=0; r.items.forEach(item=>{let html=`<section class="panel rubric"><h3>${item.section}</h3><p>${item.description}</p>`; item.rows.forEach(row=>{idx++; html+=`<div class="row" data-row="${idx}"><div class="criteria">${row.slice(0,3).map((t,i)=>`<label><input type="radio" name="score_${idx}" value="${i+1}" required><b>${i+1}</b> ${t}</label>`).join('')}<label><input type="radio" name="score_${idx}" value="4" required><b>4</b> Excelente</label></div><textarea name="comment_${idx}" placeholder="Comentário para Excelente / observações da linha"></textarea></div>`}); html+='</section>'; rubricEl.insertAdjacentHTML('beforeend',html); }); }
type.onchange=render; render();
document.getElementById('evalForm').addEventListener('submit',async e=>{e.preventDefault(); const msg=document.getElementById('saveMsg'); msg.textContent='';
 const teamNumber=document.getElementById('teamNumber').value.trim(), teamName=document.getElementById('teamName').value.trim(); if(!teamNumber||!teamName){msg.textContent='Informe equipe e nome.';return;}
 const answers=[]; let valid=true; document.querySelectorAll('.row').forEach(row=>{const n=row.dataset.row; const checked=row.querySelector(`input[name="score_${n}"]:checked`); const comment=row.querySelector(`textarea[name="comment_${n}"]`).value.trim(); if(checked&&checked.value==='4'&&!comment){valid=false; row.classList.add('error')} else row.classList.remove('error'); answers.push({row:Number(n),score:checked?Number(checked.value):null,comment});});
 if(!valid){msg.textContent='Preencha o comentário das linhas marcadas como Excelente.';return;}
 const total=answers.reduce((s,a)=>s+(a.score||0),0); const avg=(total/answers.length).toFixed(2);
 const payload={type:type.value,typeTitle:rubrics[type.value].title,teamNumber,teamName,room:document.getElementById('room').value.trim(),judge:user.name,judgeUser:user.user,answers,total,avg,generalNotes:document.getElementById('generalNotes').value.trim(),createdAt:serverTimestamp(),createdAtLocal:new Date().toLocaleString('pt-BR')};
 try{await addDoc(collection(db,'avaliacoes_fll'),payload); msg.textContent='Avaliação enviada com sucesso!'; e.target.reset(); render(); window.scrollTo(0,0);}catch(err){console.error(err); msg.textContent='Erro ao salvar. Confira o firebase-config.js e as regras do Firestore.';}
});

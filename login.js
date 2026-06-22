import { judges, adminUser } from './data.js';
const form=document.getElementById('loginForm'), msg=document.getElementById('msg');
form.addEventListener('submit',e=>{e.preventDefault(); const u=document.getElementById('user').value.trim(); const p=document.getElementById('password').value.trim();
 if(u===adminUser.user && p===adminUser.password){sessionStorage.setItem('fllUser',JSON.stringify({...adminUser,role:'admin'})); location.href='admin.html'; return;}
 const judge=judges.find(j=>j.user===u&&j.password===p); if(judge){sessionStorage.setItem('fllUser',JSON.stringify({...judge,role:'judge'})); location.href='avaliacao.html'; return;}
 msg.textContent='Usuário ou senha inválidos.';
});

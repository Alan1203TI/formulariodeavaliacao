import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from './firebase-config.js';
import { defaultAdmin } from './data.js';

const form = document.getElementById('loginForm');
const msg = document.getElementById('msg');

function enter(user) {
  const data = JSON.stringify(user);
  sessionStorage.setItem('fllUser', data);
  localStorage.setItem('fllUser', data);
  location.replace(user.role === 'admin' ? 'admin.html' : 'avaliacao.html');
}

async function findFirebaseUser(username, password) {
  if (!db) return null;
  const snap = await getDocs(collection(db, 'usuarios'));
  for (const doc of snap.docs) {
    const data = doc.data();
    if (String(data.user || '').trim() === username && String(data.password || '').trim() === password && data.active !== false) {
      return { user: data.user, name: data.name || data.user, role: data.role || 'judge' };
    }
  }
  return null;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = 'Entrando...';
  const u = document.getElementById('user').value.trim();
  const p = document.getElementById('password').value.trim();

  if (u === defaultAdmin.user && p === defaultAdmin.password) return enter(defaultAdmin);

  try {
    const fbUser = await findFirebaseUser(u, p);
    if (fbUser) return enter(fbUser);
  } catch (err) {
    console.warn('Erro Firestore:', err);
    msg.textContent = 'Erro ao consultar usuários. Verifique se as regras do Firestore foram publicadas.';
    return;
  }
  msg.textContent = 'Usuário ou senha inválidos.';
});

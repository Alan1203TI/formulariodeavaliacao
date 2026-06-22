import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getFirestore, collection, getDocs, query, where, limit } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { defaultAdmin, fallbackJudges } from './data.js';

const form = document.getElementById('loginForm');
const msg = document.getElementById('msg');
let db = null;
try { db = getFirestore(initializeApp(firebaseConfig)); } catch (e) { console.warn('Firebase não inicializado', e); }

function enter(user) {
  sessionStorage.setItem('fllUser', JSON.stringify(user));
  location.href = user.role === 'admin' ? 'admin.html' : 'avaliacao.html';
}

async function findFirebaseUser(username, password) {
  if (!db) return null;
  const q = query(collection(db, 'usuarios_fll'), where('user', '==', username), where('active', '==', true), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  if (String(data.password) !== password) return null;
  return { user: data.user, name: data.name || data.user, role: data.role || 'judge' };
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
    console.warn('Não foi possível consultar usuários no Firestore', err);
  }

  const localJudge = fallbackJudges.find(j => j.user === u && j.password === p);
  if (localJudge) return enter(localJudge);

  msg.textContent = 'Usuário ou senha inválidos.';
});

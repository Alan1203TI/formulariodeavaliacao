// firebase-config.js
// Configuração Firebase usando SDK modular.
// Compatível com os arquivos login.js, admin.js e avaliacao.js carregados com type="module".

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: "AIzaSyDErBE9cC4ec7b2DR5b3iwq1bYtuOOgNGs",
  authDomain: "formulario-de-avaliacao.firebaseapp.com",
  projectId: "formulario-de-avaliacao",
  storageBucket: "formulario-de-avaliacao.firebasestorage.app",
  messagingSenderId: "201340679544",
  appId: "1:201340679544:web:777cd8809fafc27210848d"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

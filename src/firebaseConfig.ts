import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Suas chaves de acesso
const firebaseConfig = {
  apiKey: "AIzaSyBvsfHXWoMUN4ZoPNzrIkVOV08EWjk1Uzc",
  authDomain: "organize-se-93883.firebaseapp.com",
  projectId: "organize-se-93883",
  storageBucket: "organize-se-93883.firebasestorage.app",
  messagingSenderId: "1066862688874",
  appId: "1:1066862688874:web:ca9841b15718a3e4122813",
  measurementId: "G-PT852D86HJ"
};

// Aqui a gente "liga" o motor do Firebase
const app = initializeApp(firebaseConfig);

// E aqui exportamos as ferramentas para o App usar
export const auth = getAuth(app);
export const db = getFirestore(app);
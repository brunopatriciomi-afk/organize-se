import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

export interface AccountSession {
  auth: Auth;
  db: Firestore;
}

const appForAccount = (email: string | null): FirebaseApp => {
  const name = email ? `account:${email}` : '[DEFAULT]';
  const existing = getApps().find(app => app.name === name);
  if (existing) return existing;
  return email ? initializeApp(firebaseConfig, name) : initializeApp(firebaseConfig);
};

// Cada conta tem sua propria instancia do Firebase, com sessao persistida separadamente.
export const getAccountSession = (email: string | null): AccountSession => {
  const app = appForAccount(email);
  return { auth: getAuth(app), db: getFirestore(app) };
};

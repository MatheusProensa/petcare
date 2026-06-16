import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithCredential, signOut as fbSignOut, onAuthStateChanged as fbOnAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, set, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyCyQKL3Bgy5alVD5J_Elk_QISKyyuQ_1yw',
  authDomain: 'petcare-d09ea.firebaseapp.com',
  projectId: 'petcare-d09ea',
  storageBucket: 'petcare-d09ea.firebasestorage.app',
  messagingSenderId: '33584582520',
  appId: '1:33584582520:android:aa2ea631a77fe607e0428d',
  databaseURL: 'https://petcare-d09ea-default-rtdb.firebaseio.com',
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

export const auth = getAuth();
export const db = getDatabase();

export function getCurrentUser() {
  return auth.currentUser;
}

export function onAuthStateChanged(callback: (user: any) => void) {
  return fbOnAuthStateChanged(auth, callback);
}

export async function signInWithGoogleCredential(idToken: string, accessToken?: string) {
  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  return signInWithCredential(auth, credential);
}

export async function signOut() {
  return fbSignOut(auth);
}

// ─── Realtime Database ────────────────────────────────────────────────────────

export async function pushToCloud(uid: string, data: object) {
  await set(ref(db, `users/${uid}`), { backup: data, syncedAt: new Date().toISOString() });
}

export async function pullFromCloud(uid: string): Promise<object | null> {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.val();
}

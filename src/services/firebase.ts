import auth from '@react-native-firebase/auth';
import database from '@react-native-firebase/database';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Web client ID from google-services.json (client_type: 3)
const WEB_CLIENT_ID = '33584582520-9vcp6efel05f73neav4080ij3776r9re.apps.googleusercontent.com';

export function initFirebase() {
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
}

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices();
  const { data } = await GoogleSignin.signIn();
  const credential = auth.GoogleAuthProvider.credential(data!.idToken);
  return auth().signInWithCredential(credential);
}

export async function signOut() {
  await GoogleSignin.signOut();
  await auth().signOut();
}

export function getCurrentUser() {
  return auth().currentUser;
}

export function onAuthStateChanged(callback: (user: any) => void) {
  return auth().onAuthStateChanged(callback);
}

// ─── Realtime Database helpers ────────────────────────────────────────────────

function userRef(uid: string) {
  return database().ref(`users/${uid}`);
}

export async function pushToCloud(uid: string, allData: object) {
  await userRef(uid).set(allData);
}

export async function pullFromCloud(uid: string): Promise<object | null> {
  const snap = await userRef(uid).once('value');
  return snap.val();
}

export function onCloudDataChanged(uid: string, callback: (data: object | null) => void) {
  const ref = userRef(uid);
  ref.on('value', snap => callback(snap.val()));
  return () => ref.off('value');
}

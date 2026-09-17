import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// We add scopes so we can read emails if they connect Gmail. 
// Note: Requesting restricted scopes like gmail.readonly requires Google App Verification (or adding your email to Test Users).
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');

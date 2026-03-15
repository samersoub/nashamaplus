import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDataConnect } from 'firebase/data-connect';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const dc = getDataConnect(app, {
  connector: 'default',
  service: 'nashamaplus',
  location: 'us-central1'
});

import { nativePersistence } from './authPersistence';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import firebaseConfig from '@/config/firebase';

for (const key of ['apiKey', 'projectId', 'appId'] as const) {
  if (!firebaseConfig[key]) throw new Error(`Missing Firebase ${key}. Check src/config/firebase.ts and .env.local.`);
}
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
if (app.options.projectId !== firebaseConfig.projectId || app.options.appId !== firebaseConfig.appId) throw new Error("Firebase app/project changed during reload. Restart Expo before continuing.");
export const auth = (() => {
  if (Platform.OS === 'web') return getAuth(app);
  try { return initializeAuth(app, { persistence: nativePersistence() }); }
  catch (error) {
    if ((error as { code?: string }).code === 'auth/already-initialized') return getAuth(app);
    throw error;
  }
})();
export const db = getFirestore(app);
if (auth.app !== app || db.app !== app) {
  throw new Error('Firebase service initialization mismatch: Authentication and Firestore must share the same app.');
}

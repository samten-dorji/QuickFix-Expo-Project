import { browserLocalPersistence } from 'firebase/auth';
export function nativePersistence() { return browserLocalPersistence; }

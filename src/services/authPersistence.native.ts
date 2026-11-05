import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FirebaseAuth from 'firebase/auth';
import type { Persistence } from 'firebase/auth';
// Firebase 12's default TypeScript barrel omits this documented RN-only export.
// Metro selects Firebase's react-native entry; keep the cast local to this native module.
export function nativePersistence(): Persistence {
  const native = FirebaseAuth as typeof FirebaseAuth & { getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence };
  return native.getReactNativePersistence(AsyncStorage);
}

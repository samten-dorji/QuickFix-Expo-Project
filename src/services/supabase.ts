import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { auth } from './firebase';
import { PHOTO_UPLOADS_AVAILABLE, PHOTO_UPLOAD_UNAVAILABLE_MESSAGE, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../config/photoStorage';

export async function photoIdentity() {
  if (!PHOTO_UPLOADS_AVAILABLE) throw new Error(PHOTO_UPLOAD_UNAVAILABLE_MESSAGE);
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before accessing photos.');
  const token = await user.getIdTokenResult(true);
  const project = auth.app.options.projectId;
  if (token.claims.aud !== project || token.claims.iss !== `https://securetoken.google.com/${project}` || token.claims.role !== 'authenticated') throw new Error('Photo access has not been enrolled. Ask the project owner to enroll your Firebase UID for Supabase storage, then retry.');
  if (auth.currentUser?.uid !== user.uid) throw new Error('Account changed. Retry after signing in.');
  return user.uid;
}
export function photoClient(signal?: AbortSignal) {
  if (!PHOTO_UPLOADS_AVAILABLE) throw new Error(PHOTO_UPLOAD_UNAVAILABLE_MESSAGE);
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    accessToken: async () => auth.currentUser ? auth.currentUser.getIdToken() : null,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    ...(signal ? { global: { fetch: (input, init) => fetch(input, { ...init, signal }) } } : {}),
  });
}

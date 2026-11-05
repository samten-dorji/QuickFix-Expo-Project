import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './firebase';
import type { PhotoAttachment } from '../types';
const key = (uid: string) => 'quickfix:supabase-photo-cleanup:' + uid;
export interface QueuedPhoto { photo: PhotoAttachment; createdAt: number }
// Serialize queue changes so concurrent cleanup/upload cannot lose an entry.
let queue = Promise.resolve();
export function mutatePhotoQueue(change: (entries: QueuedPhoto[]) => QueuedPhoto[]) {
  const uid = auth.currentUser?.uid;
  if (!uid) return Promise.reject(new Error('Sign in before managing photos.'));
  const task = queue.then(async () => {
    const entries = JSON.parse(await AsyncStorage.getItem(key(uid)) ?? '[]') as QueuedPhoto[];
    await AsyncStorage.setItem(key(uid), JSON.stringify(change(entries)));
  });
  queue = task.catch(() => {});
  return task;
}
export function rememberPhoto(photo: PhotoAttachment) {
  const uid = auth.currentUser?.uid;
  if (!uid || !photo.path.startsWith(`requests/${uid}/`)) throw new Error('Cannot track another account’s photo.');
  return mutatePhotoQueue(entries => entries.some(entry => entry.photo.path === photo.path) ? entries : [...entries, { photo, createdAt: Date.now() }]);
}
export const forgetPhoto = (photo: PhotoAttachment) => mutatePhotoQueue(entries => entries.filter(entry => entry.photo.path !== photo.path));
export async function queuedPhotos(uid: string): Promise<QueuedPhoto[]> {
  await queue;
  return JSON.parse(await AsyncStorage.getItem(key(uid)) ?? '[]');
}

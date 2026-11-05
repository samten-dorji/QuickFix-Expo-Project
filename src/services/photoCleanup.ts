import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
import { queuedPhotos, forgetPhoto } from './photoQueue';
import { removePhoto } from './photos';
export async function cleanupUnusedPhotos() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in before cleaning up photos.');
  let remaining = 0;
  for (const entry of await queuedPhotos(uid)) {
    if (auth.currentUser?.uid !== uid) throw new Error('Account changed. Retry cleanup.');
    const parts = entry.photo.path.split('/');
    if (parts.length !== 4 || parts[0] !== 'requests' || parts[1] !== uid) continue;
    // Allow interrupted uploads time to settle. Never use an offline cache to decide deletion.
    if (Date.now() - entry.createdAt < 60000) { remaining++; continue; }
    try {
      const request = await getDocFromServer(doc(db, 'requests', parts[2]));
      if (request.data()?.photo?.path !== entry.photo.path) await removePhoto(entry.photo);
      await forgetPhoto(entry.photo);
    } catch { remaining++; }
  }
  if (remaining) throw new Error(`${remaining} photo(s) still need cleanup. Wait a minute, reconnect and retry. No attached photo was intentionally removed.`);
}

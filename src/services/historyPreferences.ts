import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { normalizeStatus } from '../constants/badges';
import { isTerminal } from '../constants/workflow';

async function setHistoryHidden(requestId: string, hidden: boolean, expectedUid = auth.currentUser?.uid) {
  if (!requestId || requestId.includes('/')) throw new Error('Invalid request reference.');
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid || (expectedUid && expectedUid !== uid)) throw new Error('Account changed. Sign in again.');
  await runTransaction(db, async transaction => {
    const profile = await transaction.get(doc(db, 'users', uid));
    const role = profile.data()?.role;
    if (!['student','admin'].includes(role)) throw new Error('Sign in as a student or approved administrator.');
    if (hidden) {
      const request = (await transaction.get(doc(db, 'requests', requestId))).data();
      const status = normalizeStatus(request?.status);
      if (!request || !status || !isTerminal(status) || (role === 'student' && request.ownerId !== uid)) throw new Error('Only your permitted Finished or Rejected entries can be removed from history.');
    }
    if (auth.currentUser?.uid !== uid) throw new Error('Account changed. Retry after signing in.');
    const preference = doc(db, 'users', uid, 'historyPreferences', requestId);
    if (hidden) transaction.set(preference, { requestId, hidden: true, updatedAt: serverTimestamp() });
    else transaction.delete(preference);
  });
}
export function hideHistoryRequest(requestId: string, expectedUid?: string) { return setHistoryHidden(requestId, true, expectedUid); }
export function restoreHistoryRequest(requestId: string, expectedUid?: string) { return setHistoryHidden(requestId, false, expectedUid); }

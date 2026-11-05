import { collection, doc, getDoc, getDocFromServer, getDocs, query, where, orderBy, serverTimestamp, runTransaction, deleteDoc, type DocumentReference, type DocumentData, type Transaction } from 'firebase/firestore';
import { auth, db } from './firebase';
import { removePhoto } from './photos';
import { forgetPhoto, rememberPhoto } from './photoQueue';
import { decodeUserProfile } from './userProfile';
import { normalizeStatus } from '../constants/badges';
import { canTransition, isTerminal } from '../constants/workflow';
import { validateStudentRequestChanges } from './requestValidation';
import type { MaintenanceRequest, RequestStatus, RequestPriority, User } from '@/types';
export type { MaintenanceRequest, RequestFilters } from '@/types';

async function requireAdmin(transaction: Transaction, uid: string) {
  const profile = await transaction.get(doc(db, 'users', uid));
  if (auth.currentUser?.uid !== uid) throw new Error('Account changed. Sign in again before managing requests.');
  if (profile.data()?.role !== 'admin') throw new Error('Only approved administrators can manage request priority or status. Ask the project owner to review your account.');
}
async function adminWrite(operation: string, id: string, write: (uid: string) => Promise<void>) {
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in as an approved administrator first.');
  try { await write(uid); }
  catch (error) {
    if ((error as { code?: string }).code === 'permission-denied') {
      throw new Error(`${operation} was denied in project ${db.app.options.projectId}. Confirm users/${uid}.role is admin and publish the complete current Firestore rules for requests/${id} and its history. Both writes must be permitted; no partial request/history change was saved.`, { cause: error });
    }
    throw error;
  }
}

function historyEvent(writer: { set: (target: DocumentReference, data: DocumentData) => unknown }, id: string, status: string, action: string, before?: DocumentData, after?: DocumentData, notes: string | null = null) {
  const actorId = auth.currentUser?.uid;
  if (!actorId) throw new Error('Sign in before updating a request.');
  const event = doc(collection(db, 'requests', id, 'history'));
  writer.set(event, { actorId, status, action, notes, createdAt: serverTimestamp(), previousStatus: before?.status ?? null, priorityBefore: before?.priority ?? null, priorityAfter: after?.priority ?? before?.priority ?? null });
  return event.id;
}
function date(value: unknown): Date | null {
  if (!value) return null;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') return (value as { toDate: () => Date }).toDate();
  return new Date(value as string);
}
export function decodeRequest(id: string, data: DocumentData): MaintenanceRequest {
  return {
    ...data, id, rawStatus: data.rawStatus ?? data.status, status: normalizeStatus(data.status) ?? 'Unknown status',
    completionNotes: data.completionNotes ?? data.resolutionNotes ?? null, rejectionReason: data.rejectionReason ?? null,
    createdAt: date(data.createdAt) ?? new Date(0), updatedAt: date(data.updatedAt) ?? new Date(0),
    statusChangedAt: date(data.statusChangedAt), approvedAt: date(data.approvedAt), startedAt: date(data.startedAt),
    finishedAt: date(data.finishedAt ?? data.resolvedAt), rejectedAt: date(data.rejectedAt),
  } as MaintenanceRequest;
}
export const allocateRequestId = () => 'REQ-' + doc(collection(db, 'requests')).id;
export async function createRequest(data: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>, requestId = allocateRequestId()): Promise<string> {
  await auth.authStateReady();
  if (auth.currentUser?.uid !== data.ownerId) throw new Error('Sign in as the request owner.');
  await runTransaction(db, async transaction => {
    const target = doc(db, 'requests', requestId);
    const existing = await transaction.get(target);
    if (existing.exists()) {
      if (existing.data().ownerId !== data.ownerId) throw new Error('Request identity conflict.');
      return; // Retry of an acknowledged or ambiguously committed creation never overwrites it.
    }
    if (auth.currentUser?.uid !== data.ownerId) throw new Error('Account changed.');
    const fields = { ...validateStudentRequestChanges({ category: data.category, title: data.title, description: data.description, hostel: data.hostel, roomNumber: data.roomNumber, priority: data.priority }), ownerId: data.ownerId, status: 'Pending', photo: data.photo ?? null, photoPath: null, photoUrl: null, completionNotes: null, rejectionReason: null };
    const lastEventId = historyEvent(transaction, requestId, 'Pending', 'Submitted', undefined, fields);
    transaction.set(target, { ...fields, id: requestId, lastEventId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
  return requestId;
}
export async function getRequestFromServer(id: string) {
  const snapshot = await getDocFromServer(doc(db, 'requests', id));
  return snapshot.exists() ? decodeRequest(snapshot.id, snapshot.data()) : null;
}
export async function getRequest(id: string) {
  const snapshot = await getDoc(doc(db, 'requests', id));
  return snapshot.exists() ? decodeRequest(snapshot.id, snapshot.data()) : null;
}
export async function getUserRequests(uid: string) { return readList(query(collection(db, 'requests'), where('ownerId', '==', uid), orderBy('createdAt', 'desc'))); }
export async function getAllRequests() { return readList(query(collection(db, 'requests'), orderBy('createdAt', 'desc'))); }
async function readList(q: ReturnType<typeof query>) {
  const snapshot = await getDocs(q);
  return snapshot.docs.map(item => decodeRequest(item.id, item.data() as DocumentData));
}
export async function updateRequest(id: string, updates: Partial<MaintenanceRequest>) {
  const changes = validateStudentRequestChanges(updates);
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Sign in before editing a request.');
  return runTransaction(db, async transaction => {
    const target = doc(db, 'requests', id);
    const snapshot = await transaction.get(target);
    const old = snapshot.data();
    if (auth.currentUser?.uid !== uid) throw new Error('Account changed. Retry after signing in.');
    // The rules enforce the student role; avoid a redundant profile read in this transaction.
    if (!old || normalizeStatus(old.status) !== 'Pending' || old.ownerId !== uid) throw new Error('Only the student owner can edit a Pending request.');
    if (!Object.entries(changes).some(([key,value]) => old[key] !== value)) return false;
    const lastEventId = historyEvent(transaction, id, old.status, 'Updated', old, { ...old, ...changes });
    transaction.update(target, { ...changes, lastEventId, updatedAt: serverTimestamp() });
    return true;
  });
}
export async function updateRequestStatus(id: string, status: RequestStatus, notes?: string) {
  const text = notes?.trim() ?? '';
  if (text.length > 4000) throw new Error('Use at most 4000 characters.');
  if (status === 'Finished' && !text) throw new Error('Add completion notes first.');
  if (status === 'Rejected' && !text) throw new Error('Add a rejection reason first.');
  await adminWrite(status === 'Finished' ? 'Mark Finished' : 'Update request status', id, uid => runTransaction(db, async transaction => {
    await requireAdmin(transaction, uid);
    const target = doc(db, 'requests', id);
    const snapshot = await transaction.get(target);
    const old = snapshot.data();
    const from = normalizeStatus(old?.status);
    if (!old || !from || !canTransition(from, status)) throw new Error('Invalid status transition. Refresh the request.');
    if (auth.currentUser?.uid !== uid) throw new Error('Account changed. Retry after signing in.');
    const fields: DocumentData = { status, statusChangedBy: uid, statusChangedAt: serverTimestamp() };
    const prefix = status === 'Approved' ? 'approved' : status === 'In Progress' ? 'started' : status === 'Finished' ? 'finished' : 'rejected';
    fields[prefix + 'By'] = uid; fields[prefix + 'At'] = serverTimestamp();
    if (status === 'Finished') fields.completionNotes = text;
    if (status === 'Rejected') fields.rejectionReason = text;
    const action = status === 'In Progress' ? 'Started' : status;
    const lastEventId = historyEvent(transaction, id, status, action, old, { ...old, ...fields }, status === 'Finished' || status === 'Rejected' ? text : null);
    transaction.update(target, { ...fields, lastEventId, updatedAt: serverTimestamp() });
  }));
}
export async function deleteRequest(id: string) {
  const request = await getRequest(id);
  if (!request || request.status !== 'Pending' || request.ownerId !== auth.currentUser?.uid) throw new Error('Only the owner can delete a request awaiting review.');
  if (request.photo) await rememberPhoto(request.photo);
  await deleteDoc(doc(db, 'requests', id));
  if (request.photo) {
    try { await removePhoto(request.photo); await forgetPhoto(request.photo); }
    catch { throw new Error('Request deleted. Its photo needs cleanup; retry from photo cleanup after reconnecting.'); }
  }
}
export async function changeRequestPriority(id: string, priority: RequestPriority) {
  if (!['Low','Medium','High'].includes(priority)) throw new Error('Choose Low, Medium, or High priority.');
  await adminWrite('Save Priority', id, uid => runTransaction(db, async transaction => {
    await requireAdmin(transaction, uid);
    const target = doc(db, 'requests', id);
    const snapshot = await transaction.get(target);
    const before = snapshot.data();
    if (auth.currentUser?.uid !== uid) throw new Error('Account changed. Retry after signing in.');
    const status = normalizeStatus(before?.status);
    if (!before || !status || isTerminal(status)) throw new Error('Cannot reprioritize a terminal or unknown request.');
    if (before.priority === priority) return;
    const lastEventId = historyEvent(transaction, id, before.status, 'Priority changed', before, { ...before, priority });
    transaction.update(target, { priority, lastEventId, updatedAt: serverTimestamp() });
  }));
}
export async function getRequestStudent(uid: string): Promise<User | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? decodeUserProfile(snapshot.id, snapshot.data()) : null;
}
export { filterRequests } from '@/utils/requestFilters';

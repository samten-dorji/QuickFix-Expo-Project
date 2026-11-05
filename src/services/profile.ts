import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { StudentUser } from '../types/index';

export type StudentProfileInput = Pick<StudentUser, 'displayName' | 'studentId' | 'hostel' | 'roomNumber'>;

/** A client may request approval, never grant an active role or overwrite a profile. */
export async function createMissingPendingAdminProfile(
  db: Firestore, uid: string, email: string, displayName: string,
  assertCurrentUser: () => void = () => {},
): Promise<boolean> {
  const name = displayName.trim();
  if (!email || !name || name.length > 120) throw new Error('Enter your full name and use an email account.');
  assertCurrentUser();
  return runTransaction(db, async transaction => {
    assertCurrentUser();
    const target = doc(db, 'users', uid);
    const existing = await transaction.get(target);
    assertCurrentUser();
    if (existing.exists()) {
      if (!['pending_admin', 'admin'].includes(existing.data().role)) throw new Error('Your existing profile is preserved. Ask the project owner to review your account for administrator approval.');
      return false;
    }
    transaction.set(target, {
      uid, email, displayName: name, role: 'pending_admin',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return true;
  });
}

/** Create only when missing. Concurrent attempts can never overwrite a stored role. */
export async function createMissingStudentProfile(
  db: Firestore,
  uid: string,
  email: string,
  input: StudentProfileInput,
  assertCurrentUser: () => void = () => {},
): Promise<boolean> {
  const values: StudentProfileInput = {
    displayName: input.displayName.trim(),
    studentId: input.studentId.trim(),
    hostel: input.hostel.trim(),
    roomNumber: input.roomNumber.trim(),
  };
  if (!email || Object.values(values).some(value => !value || value.length > 120)) {
    throw new Error('Use an email account and complete all profile fields (maximum 120 characters each).');
  }

  assertCurrentUser();
  return runTransaction(db, async transaction => {
    assertCurrentUser();
    const target = doc(db, 'users', uid);
    const existing = await transaction.get(target);
    assertCurrentUser();
    if (existing.exists()) return false;
    transaction.set(target, {
      ...values,
      uid,
      email,
      role: 'student',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return true;
  });
}

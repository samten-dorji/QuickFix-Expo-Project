import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { decodeUserProfile } from './userProfile';
import { createMissingStudentProfile, createMissingPendingAdminProfile } from './profile';
import { errorMessage } from './errors';

export async function registerAdmin(email: string, password: string, displayName: string) {
  const address = email.trim();
  if (!displayName.trim() || displayName.trim().length > 120) throw new Error('Enter your full name (maximum 120 characters).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || address.length > 320) throw new Error('Enter a valid email address.');
  if (password.length < 6) throw new Error('Password must contain at least 6 characters.');
  await auth.authStateReady();
  // Authenticate existing accounts first; provisioning retries never recreate them.
  try { await signInWithEmailAndPassword(auth, address, password); }
  catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'auth/user-not-found' && code !== 'auth/invalid-credential') throw error;
    // Enumeration protection intentionally makes a new account indistinguishable
    // from a wrong password. A duplicate create cannot overwrite an existing user.
    try { await createUserWithEmailAndPassword(auth, address, password); }
    catch (creationError) {
      if ((creationError as { code?: string }).code === 'auth/email-already-in-use') throw new Error('This account already exists. Enter its correct password to retry administrator setup.');
      throw creationError;
    }
  }
  const current = auth.currentUser;
  if (!current) throw new Error('Sign in again to finish administrator registration.');
  try {
    await createMissingPendingAdminProfile(db, current.uid, current.email ?? '', displayName, () => {
      if (auth.currentUser?.uid !== current.uid) throw new Error('Account changed. Retry registration.');
    });
  }
  catch (error) {
    if ((error as { code?: string }).code === 'permission-denied') {
      throw new Error('Your sign-in account is preserved, but pending profile setup was denied. Ask the project owner to publish the updated Firestore rules, then retry with the same email and password.', { cause: error });
    }
    throw error;
  }
  if (auth.currentUser?.uid !== current.uid) throw new Error('Account changed. Retry registration.');
  const snapshot = await getDocFromServer(doc(db, 'users', current.uid));
  const profile = snapshot.exists() ? decodeUserProfile(current.uid, snapshot.data()) : null;
  if (!profile || !['pending_admin', 'admin'].includes(profile.role) || profile.email.toLowerCase() !== address.toLowerCase()) throw new Error('Administrator profile setup did not complete. Retry with the same email and password.');
}

export async function completeProfile(displayName: string, studentId: string, hostel: string, roomNumber: string) {
  await auth.authStateReady();
  const current = auth.currentUser;
  if (!current) throw new Error('Sign in before completing your profile.');
  if (!current.email) throw new Error('An authenticated email account is required to complete your profile.');
  // Wait for the existing sign-in token before making a protected Firestore request.
  await current.getIdToken();
  try {
    await createMissingStudentProfile(db, current.uid, current.email, { displayName, studentId, hostel, roomNumber }, () => {
      if (auth.currentUser?.uid !== current.uid) throw new Error('Your account changed. Sign in again before completing your profile.');
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'permission-denied') {
      throw new Error(`Signed in, but Firestore denied profile completion at users/${current.uid} in project ${db.app.options.projectId}. Publish this workspace's firestore.rules in that project's Firestore Rules tab, then retry Complete Profile. Your Authentication account has not been recreated.`, { cause: error });
    }
    throw error;
  }
}
export async function registerUser(email: string, password: string, displayName: string, studentId: string, hostel: string, roomNumber: string) {
  await createUserWithEmailAndPassword(auth, email.trim(), password);
  try { await completeProfile(displayName, studentId, hostel, roomNumber); }
  catch (error) { throw new Error(`Your sign-in account was created, but profile setup failed. Do not register again; retry Complete Profile. ${errorMessage(error)}`, { cause: error }); }
}
export async function loginUser(email: string, password: string) { await signInWithEmailAndPassword(auth, email.trim(), password); }
export async function resetPassword(email: string) {
  if (!email.trim()) throw new Error('Enter your account email first.');
  await sendPasswordResetEmail(auth, email.trim());
}
export async function editProfile(displayName: string, hostel: string, roomNumber: string) {
  const current = auth.currentUser;
  if (!current) throw new Error('Sign in first.');
  const fields = { displayName: displayName.trim(), hostel: hostel.trim(), roomNumber: roomNumber.trim() };
  if (Object.values(fields).some(value => !value || value.length > 120)) throw new Error('Complete all profile fields (maximum 120 characters each).');
  await runTransaction(db, async transaction => {
    const target = doc(db, 'users', current.uid);
    if (!(await transaction.get(target)).exists()) throw new Error('Your profile is missing. Complete your profile first.');
    transaction.update(target, { ...fields, updatedAt: serverTimestamp() });
  });
}

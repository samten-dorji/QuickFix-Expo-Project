const { randomBytes, createHash } = require('node:crypto');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');

const normalizeEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
function validatedName(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) throw new HttpsError('invalid-argument', 'Enter a name of 1 to 120 characters.');
  return value.trim();
}
function tokenId(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new HttpsError('permission-denied', 'Invalid invitation.');
  return createHash('sha256').update(token).digest('hex');
}
function buildProvisioning(db, auth) {
  async function verifiedIdentity(request) {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in first.');
    const account = await auth.getUser(request.auth.uid);
    if (account.disabled || !account.email || !account.emailVerified) throw new HttpsError('failed-precondition', 'Verify your account email before continuing.');
    return { uid: account.uid, email: normalizeEmail(account.email) };
  }
  async function createInvitation(request) {
    const identity = await verifiedIdentity(request);
    const email = normalizeEmail(request.data?.email);
    const role = request.data?.role;
    const hours = request.data?.expiresHours ?? 24;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320 || !['admin','staff'].includes(role) || !Number.isInteger(hours) || hours < 1 || hours > 72) {
      throw new HttpsError('invalid-argument', 'Choose an email, admin/staff role, and expiry of 1 to 72 hours.');
    }
    const token = randomBytes(32).toString('hex');
    const expiresAt = Timestamp.fromMillis(Date.now() + hours * 3600000);
    await db.runTransaction(async transaction => {
      const issuer = await transaction.get(db.doc('users/' + identity.uid));
      if (issuer.data()?.role !== 'admin') throw new HttpsError('permission-denied', 'Only an administrator can issue invitations.');
      transaction.create(db.doc('invitations/' + tokenId(token)), { email, role, expiresAt, createdBy: identity.uid, createdAt: FieldValue.serverTimestamp(), usedBy: null, usedAt: null });
    });
    // Returned once to the authorized issuer. Never store or log this raw token.
    return { token, email, role, expiresAt: expiresAt.toDate().toISOString() };
  }
  async function redeemInvitation(request) {
    const identity = await verifiedIdentity(request);
    const displayName = validatedName(request.data?.displayName);
    const id = tokenId(request.data?.token);
    const expectedRole = request.data?.role;
    if (!['admin','staff'].includes(expectedRole)) throw new HttpsError('invalid-argument', 'Choose an invitation role.');
    return db.runTransaction(async transaction => {
      const invitationRef = db.doc('invitations/' + id);
      const profileRef = db.doc('users/' + identity.uid);
      const invitation = await transaction.get(invitationRef);
      const profile = await transaction.get(profileRef);
      const grant = invitation.data();
      if (!grant || grant.usedBy !== null || !grant.expiresAt || grant.expiresAt.toMillis() <= Date.now() || grant.email !== identity.email || grant.role !== expectedRole) {
        throw new HttpsError('permission-denied', 'Invitation is invalid, expired, already used, or belongs to another email/role.');
      }
      const existing = profile.data();
      if (existing && !['student', expectedRole].includes(existing.role)) throw new HttpsError('failed-precondition', 'This invitation cannot replace your existing privileged role.');
      transaction.set(profileRef, {
        ...existing, uid: identity.uid, email: identity.email,
        displayName: existing?.displayName ?? displayName, role: grant.role,
        createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(invitationRef, { usedBy: identity.uid, usedAt: FieldValue.serverTimestamp() });
      transaction.create(db.collection('roleAudit').doc(), { uid: identity.uid, actorId: identity.uid, authorizedBy: grant.createdBy, invitationId: id, fromRole: existing?.role ?? null, toRole: grant.role, createdAt: FieldValue.serverTimestamp() });
      return { role: grant.role };
    });
  }
  return { createInvitation, redeemInvitation };
}
module.exports = { buildProvisioning, tokenId };


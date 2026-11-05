// Trusted workstation only. No Cloud Function, service-role key or email verification required.
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
async function main() {
  const args = process.argv.slice(2);
  const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
  const uid = value('--uid');
  if (value('--project') !== 'fixquickproject' || !uid || uid.startsWith('--') || value('--confirm-project') !== 'fixquickproject') throw new Error('Usage: node functions/scripts/enroll-photos.cjs --project fixquickproject --confirm-project fixquickproject --uid YOUR_FIREBASE_UID');
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Unset emulator variables before trusted production enrollment.');
  const app = initializeApp({projectId:'fixquickproject',credential:applicationDefault()});
  const account = await getAuth(app).getUser(uid);
  const profile = (await getFirestore(app).doc('users/'+uid).get()).data();
  if (account.disabled || !['student','admin'].includes(profile?.role)) throw new Error('Only enabled Auth accounts with an existing student or manually approved admin profile can be enrolled.');
  const claims = account.customClaims ?? {};
  if (claims.role && claims.role !== 'authenticated') throw new Error('Existing custom role claim conflicts. Review it manually before enrollment.');
  await getAuth(app).setCustomUserClaims(uid, {...claims,role:'authenticated'});
  const quoted = "'" + uid.replaceAll("'", "''") + "'";
  const table = profile.role === 'admin' ? 'photo_admins' : 'photo_students';
  console.log('Firebase storage claim set. This does not change Firestore role. Paste this SQL in Supabase SQL Editor:');
  console.log(`begin;\ndelete from quickfix_private.photo_students where firebase_uid = ${quoted};\ndelete from quickfix_private.photo_admins where firebase_uid = ${quoted};\ninsert into quickfix_private.${table}(firebase_uid) values (${quoted});\ncommit;`);
  console.log('The mobile app refreshes Firebase ID tokens before accessing photos.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
